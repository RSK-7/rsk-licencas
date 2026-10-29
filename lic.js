// Núcleo do emissor de licenças do RSK Tools (ferramentas RSK para Rhino, entre elas o RSK Align), no navegador.
// Gera o mesmo .lic que tools/RskLicenseTool (LicenseFile.cs): mesmo texto assinado, RSA 2048,
// SHA-256, PKCS#1 v1.5. A chave privada nunca sai do aparelho e fica guardada cifrada com senha
// (PBKDF2-SHA256 + AES-GCM). Este arquivo não contém chave privada nenhuma.
var RskLic = (function () {
  "use strict";

  // A 1ª linha do .lic é só título (não é assinada nem conferida). O texto assinado continua
  // "RskAlign-licenca-v1": vale no RSK Align instalado hoje e no RSK Tools, que o substitui.

  // Chave PÚBLICA do plug-in (src/Licensing/License.cs, PublicModulus). Serve para conferir que a
  // chave importada é a certa e que cada licença emitida passa na verificação do plug-in.
  var PUBLIC_MODULUS =
    "2GaCCk0sXtHcL+KN9ZVFfb4OXyTcFBqFAplruoi0C/Kxgnv35cUWwJD1+RklXOIiE1rOGd637TFBaiaMZr/bwldiI3u8PRJ4Nx8K0Vzux/onSGrT4mizl1vgfR5ynkTHUlhuPLTsOL5vMHfyCuRRHXYC1AFMeDaUIcD3SHc+dtmCBuaciNT8wHl6iQZYMYI+71DAsM44WWiMIlg9cS7dRiYYzsWCO12Nvnj0Do0DlvvruBX/HPN5iedj6g954+sIuzjlXZ7ambPhEW4qnhHbioeVaex47VTlQhajAG1s+t4NzXpYApAAh7jyWZ6Ve+PFqy3dd0cjiUSSq6oYn6BwAQ==";

  var KEY_FORMAT = "rskkey-v1";
  var PBKDF2_ITER = 600000;
  var ALG = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  var subtle = (self.crypto || {}).subtle;

  // ---- Base64 ----
  function b64ToBytes(b64) {
    var s = atob(b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, ""));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function bytesToB64(bytes) {
    bytes = new Uint8Array(bytes);
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function bytesToB64url(bytes) {
    return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // JWK pede inteiros sem zeros à esquerda; o XML do .NET às vezes os tem.
  function stripZeros(bytes) {
    var i = 0;
    while (i < bytes.length - 1 && bytes[i] === 0) i++;
    return bytes.subarray(i);
  }

  // ---- Chave ----
  /** chave-privada.xml (RSA.ToXmlString(true)) → JWK. */
  function xmlToJwk(xml) {
    function tag(name) {
      var m = new RegExp("<" + name + ">([^<]+)</" + name + ">").exec(xml);
      if (!m) throw new Error("arquivo de chave incompleto (falta " + name + ").");
      return bytesToB64url(stripZeros(b64ToBytes(m[1])));
    }
    return {
      kty: "RSA", alg: "RS256", ext: true,
      n: tag("Modulus"), e: tag("Exponent"), d: tag("D"),
      p: tag("P"), q: tag("Q"), dp: tag("DP"), dq: tag("DQ"), qi: tag("InverseQ"),
    };
  }

  /** true se a chave é a par da chave pública que está no plug-in. */
  function matchesPlugin(jwk) {
    return bytesToB64(stripZeros(b64ToBytes(jwk.n))) === PUBLIC_MODULUS;
  }

  function passwordKey(password, salt, iter) {
    return subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" },
          base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      });
  }

  /** Cifra a chave com a senha → objeto do arquivo .rskkey. */
  function encryptKey(jwk, password, iter) {
    iter = iter || PBKDF2_ITER;
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return passwordKey(password, salt, iter).then(function (aes) {
      return subtle.encrypt({ name: "AES-GCM", iv: iv }, aes, new TextEncoder().encode(JSON.stringify(jwk)));
    }).then(function (ct) {
      return { formato: KEY_FORMAT, iter: iter, salt: bytesToB64(salt), iv: bytesToB64(iv), dados: bytesToB64(ct) };
    });
  }

  /** Decifra o .rskkey; senha errada → erro "senha incorreta". */
  function decryptKey(blob, password) {
    if (!blob || blob.formato !== KEY_FORMAT) return Promise.reject(new Error("arquivo de chave desconhecido."));
    return passwordKey(password, b64ToBytes(blob.salt), blob.iter).then(function (aes) {
      return subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(blob.iv) }, aes, b64ToBytes(blob.dados));
    }).then(function (plain) {
      return JSON.parse(new TextDecoder().decode(plain));
    }, function () {
      throw new Error("senha incorreta.");
    });
  }

  // ---- Licença (igual a LicenseFile.cs) ----
  function normalizeMachine(code) {
    return (code || "").trim().toUpperCase().replace(/ /g, "");
  }
  function validMachine(code) {
    return /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/.test(code);
  }
  function ymd(d) {
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function addDays(d, days) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  }

  function payload(lic) {
    return "RskAlign-licenca-v1\n" +
      "Cliente=" + lic.customer.trim() + "\n" +
      "Maquina=" + normalizeMachine(lic.machine) + "\n" +
      "Emitida=" + ymd(lic.issued) + "\n" +
      "Expira=" + ymd(lic.expires) + "\n";
  }

  function toText(lic) {
    return "RSK Tools - licença de uso (não edite: qualquer alteração invalida o arquivo)\r\n" +
      "Cliente=" + lic.customer.trim() + "\r\n" +
      "Maquina=" + normalizeMachine(lic.machine) + "\r\n" +
      "Emitida=" + ymd(lic.issued) + "\r\n" +
      "Expira=" + ymd(lic.expires) + "\r\n" +
      "Assinatura=" + lic.signature + "\r\n";
  }

  /** Mesmo nome de arquivo que o RskLicenseTool. */
  function fileName(lic) {
    var safe = lic.customer.replace(/[^\p{L}\p{N}]/gu, "_");
    return safe + "_" + normalizeMachine(lic.machine).substring(0, 4) + "_" + ymd(lic.expires) + ".lic";
  }

  /** Assina e confere com a chave pública do plug-in antes de devolver. */
  function sign(jwk, lic) {
    var data = new TextEncoder().encode(payload(lic));
    return subtle.importKey("jwk", jwk, ALG, false, ["sign"]).then(function (priv) {
      return subtle.sign(ALG, priv, data);
    }).then(function (sig) {
      lic.signature = bytesToB64(sig);
      return verify(lic);
    }).then(function (ok) {
      if (!ok) throw new Error("a licença gerada não passou na conferência com a chave do plug-in.");
      return lic;
    });
  }

  function verify(lic) {
    var pub = { kty: "RSA", e: "AQAB", n: bytesToB64url(b64ToBytes(PUBLIC_MODULUS)), alg: "RS256", ext: true };
    return subtle.importKey("jwk", pub, ALG, false, ["verify"]).then(function (k) {
      return subtle.verify(ALG, k, b64ToBytes(lic.signature), new TextEncoder().encode(payload(lic)));
    });
  }

  return {
    available: !!subtle,
    xmlToJwk: xmlToJwk, matchesPlugin: matchesPlugin,
    encryptKey: encryptKey, decryptKey: decryptKey,
    normalizeMachine: normalizeMachine, validMachine: validMachine,
    today: today, addDays: addDays, ymd: ymd,
    toText: toText, fileName: fileName, sign: sign, verify: verify,
  };
})();
