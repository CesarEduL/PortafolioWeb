# Solución de problemas

[← Volver al README](../README.md) · [Configuración local](configuracion-local.md)

## Error `UNABLE_TO_VERIFY_LEAF_SIGNATURE` al hacer `npm i`

**Causa habitual en Windows:** tu antivirus (en tu PC es **Avast**) intercepta conexiones HTTPS hacia `registry.npmjs.org` y presenta un certificado propio que Node.js no reconoce.

**Solución en tu PC (Avast):** copia `.npmrc.example` → `.npmrc` y exporta `certs/avast-root.pem` (ver `certs/README.md`). Esos archivos **no van al repo** — en GitHub Actions no hace falta Avast.

```bash
cp .npmrc.example .npmrc
npm install
```

**Si sigue fallando**, elige una de estas opciones:

| Opción | Qué hacer |
|--------|-----------|
| A (recomendada) | Avast → **Configuración** → **Protección** → **Escudo Web** → desactiva **Escaneo HTTPS** o añade excepción para `node.exe` |
| B | Regenera `certs/avast-root.pem` siguiendo `certs/README.md` |
| C (último recurso) | Solo en tu máquina: `npm config set strict-ssl false` — reduce seguridad, no lo uses en CI |

**Comprobar quién intercepta HTTPS:**

```bash
node -e "const tls=require('tls');tls.connect(443,'registry.npmjs.org',{servername:'registry.npmjs.org',rejectUnauthorized:false},()=>{console.log(tls.connect(443,'registry.npmjs.org',{servername:'registry.npmjs.org',rejectUnauthorized:false}).getPeerCertificate().issuer)});"
```

Si ves `Avast Web/Mail Shield`, la causa es Avast.

## Otros problemas

| Problema | Solución |
|----------|----------|
| CSS/JS no carga en GitHub Pages | Verifica que `BASE_PATH=/PortafolioWeb` coincida con el nombre del repo |
| No aparecen proyectos | Revisa `PUBLIC_GITHUB_USERNAME` y el secret `GH_API_TOKEN` en Actions |
| Error *Secret names must not start with GITHUB_* | El secret debe llamarse **`GH_API_TOKEN`** |
| Formulario no envía | Configura `PUBLIC_WEB3FORMS_ACCESS_KEY` y confirma el email en Web3Forms |
| Stats no cargan | GitHub username incorrecto o servicio externo temporalmente caído |
| «Descargar CV» no abre nada | Falta `public/cv.pdf` o `PUBLIC_CV_FILENAME` no coincide con el archivo |
