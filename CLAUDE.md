# CLAUDE.md — emissor de licenças do RSK Tools

Contexto para continuar este trabalho em outro computador (PC pessoal). Leia inteiro antes de agir.

## O que é

- Site/app que emite licenças do plug-in Rhino **RSK Tools**: https://rsk-7.github.io/rsk-licencas/
  (GitHub Pages, branch `main`, pasta raiz; push no `main` publica em ~1 minuto).
- **RSK Tools** é o plug-in novo que vai juntar o **RSK Align** (alinhamento, que já existe e está em
  uso) com outra ferramenta, e substituí-lo. Uma licença libera todas as ferramentas.
- O código do plug-in fica só na máquina do serviço (sem remoto). Aqui há apenas o emissor.
- **Repositório público.** Nunca commitar chave, `.rskkey`, `.lic`, nomes de clientes ou códigos de
  máquina. O `.gitignore` bloqueia `*.xml`, `*.rskkey`, `*.lic`, `*.pem`, `*.key`.

## Como funciona

- `lic.js` gera o mesmo `.lic` do emissor de PC (`RskLicenseTool`) e do plug-in
  (`src/Licensing/LicenseFile.cs`): RSA 2048, SHA-256, PKCS#1 v1.5.
- A chave privada é importada em cada aparelho e guardada **cifrada com senha** (PBKDF2-SHA256
  600 000 iterações + AES-GCM) no `localStorage`. A assinatura é feita no próprio aparelho.
- Cada licença emitida é conferida com a chave pública do plug-in (`PUBLIC_MODULUS` em `lic.js`)
  antes de ser entregue. Importar uma chave que não confere com ela é recusado.
- `index.html` = tela; `sw.js` + `manifest.webmanifest` + ícones = app de Tela de Início e uso
  offline (ao mudar arquivos, subir a versão do cache em `sw.js`).

## NÃO mudar (quebra as licenças das máquinas)

- O texto assinado começa com `RskAlign-licenca-v1` e tem `Cliente/Maquina/Emitida/Expira`, com
  `\n`, nessa ordem (`payload()` em `lic.js`). É invisível para o usuário e foi mantido de propósito:
  licenças emitidas hoje valem no RSK Align instalado e vão valer no RSK Tools, que deve aceitar
  exatamente este formato.
- `PUBLIC_MODULUS` (= `PublicModulus` do plug-in). Trocar a chave invalida todas as licenças.
- O código da máquina (`XXXX-XXXX-XXXX-XXXX`) é calculado pelo plug-in a partir do MachineGuid do
  Windows com o sal `RskAlign|`. O RSK Tools deve manter o mesmo cálculo para os códigos não mudarem.
- Pode mudar: textos da tela e a 1ª linha do `.lic` ("RSK Tools - licença de uso…"), que é só título
  — o plug-in ignora linhas sem `=` e não assina essa linha.

## Situação (29/10/2026)

- Site no ar, todo com o nome RSK Tools. Testado no Chrome do PC: emissão de ponta a ponta com a
  chave real passou na verificação. **Ainda não testado num iPhone de verdade.**
- O usuário levou a pasta da chave (`RskAlign-Licencas`, com `chave-privada.xml` e o histórico
  `emitidas\`) da máquina do serviço num pendrive. **Ela não existe mais lá** — é a única chave.
- A chave ainda não foi importada em nenhum aparelho.

## Tarefa no PC pessoal (passo a passo para o usuário)

1. Copiar a pasta do pendrive para `C:\Users\<usuário>\RskAlign-Licencas\` (mesmo nome de antes: é
   onde o emissor de PC procura, se um dia for usado aqui). Manter **outra cópia** num segundo
   pendrive guardado à parte — perdeu a chave, não emite mais.
2. Abrir o site no Chrome/Edge → **Chave de emissão → Gerenciar chave → Importar chave…** → escolher
   `chave-privada.xml` → criar uma senha (mín. 8 caracteres) e anotar → **Guardar chave**
   (bolinha verde).
3. **Exportar para outro aparelho (.rskkey)** → baixa `RskTools.rskkey` (cifrado) em Downloads.
   Mandar para si mesmo por e-mail/iCloud. **Nunca** mandar o `.xml`.
4. iPhone: abrir o site no **Safari** → **Compartilhar → Adicionar à Tela de Início** → abrir **pelo
   ícone** (o app da Tela de Início guarda dados separado do Safari) → **Importar chave…** → escolher
   o `.rskkey` → mesma senha.
5. Teste de ponta a ponta: no Rhino da máquina do serviço, `RskLicense → CopiarCodigo`; emitir pelo
   iPhone uma licença de 30 dias para esse código → **Enviar arquivo .lic** → no Rhino,
   `RskLicense → Instalar`. Se aceitar, funciona. Depois reinstalar a licença longa normal.
   Conferir: o Enviar anexa o arquivo? o WhatsApp mantém a extensão `.lic`?

## Regras para o Claude aqui

- Não pedir ao usuário a senha nem o conteúdo da chave. Se precisar testar com a chave real, fazer em
  pasta temporária fora do repositório e apagar os arquivos de teste no fim.
- Testar a assinatura sem o `RskLicenseTool` (que não existe aqui): servir a página por
  `http://localhost` (o `file://` não tem `localStorage`) e conferir o `.lic` com a chave pública em
  PowerShell — `RSA.ImportParameters` com `Modulus = PUBLIC_MODULUS`, `Exponent = 1,0,1`, e
  `VerifyData(payload UTF-8, assinatura, SHA256, Pkcs1)`.
- Commit no `main` publica o site. Pedir antes de dar push.

## Pendências (fora deste repositório)

- Escolher qual ferramenta entra no RSK Tools com o alinhamento (candidatas na máquina do serviço:
  RskFechamento, RskCurveRepair, RskRoubaPeso, RskPinos) e criar o plug-in, levando o código de
  licença do RSK Align sem mudar o formato acima.
- Opcional: opção **Colar** no `RskLicense` (instalar a licença colando o texto).
- Adiado por decisão do usuário: reforçar a proteção contra mudar o relógio do computador.
