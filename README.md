# RSK Licenças

Emissor de licenças do plug-in **RSK Align** (Rhino), para usar no celular ou no navegador.
Gera o mesmo arquivo `.lic` que o `RskLicenseTool`.

**Este repositório não contém chave privada.** A chave é importada em cada aparelho, fica guardada
só nele e cifrada com senha (PBKDF2-SHA256 + AES-GCM). A assinatura acontece no próprio aparelho.

## Primeira vez

1. **No PC:** abrir a página → *Chave de emissão → Importar chave…* → escolher
   `%USERPROFILE%\RskAlign-Licencas\chave-privada.xml` → criar uma senha.
   Depois *Exportar para outro aparelho* → salva `RskAlign.rskkey` (cifrado).
2. Mandar o `RskAlign.rskkey` para você mesmo (iCloud Drive, e-mail, WhatsApp).
   **Nunca** mande o `chave-privada.xml`.
3. **No iPhone:** abrir a página no Safari → *Compartilhar → Adicionar à Tela de Início*.
   Abrir pelo ícone e então *Importar chave…* → escolher o `.rskkey` → digitar a senha.

## Emitir

Nome, código da máquina (o usuário obtém com `RskLicense → CopiarCodigo`), validade, senha →
**Emitir licença** → **Enviar arquivo .lic**. No Rhino do usuário: `RskLicense → Instalar`.

## Arquivos

- `index.html` — tela
- `lic.js` — formato da licença e criptografia (espelha `src/Licensing/LicenseFile.cs` do plug-in)
- `sw.js`, `manifest.webmanifest`, ícones — app de Tela de Início e uso sem internet

Se a chave do plug-in for trocada, atualizar `PUBLIC_MODULUS` em `lic.js`.
