# Portafolio Web — Cesar Eduardo

Portafolio estático construido con **Astro + Tailwind CSS**. Se puede desplegar gratis en **GitHub Pages**, **Vercel** o **Netlify**.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) 20 o superior
- Cuenta en [GitHub](https://github.com)
- (Opcional) Cuenta en [Web3Forms](https://web3forms.com/) para el formulario de contacto

---

## 1. Configuración local

```bash
# Ya estás en la carpeta PortafolioWeb
npm install
cp .env.example .env
# Solo si usas Avast y npm falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE:
cp .npmrc.example .npmrc
```

Edita `.env` con tus valores reales (ver sección de variables más abajo).

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

---

## 2. Variables de entorno

| Variable | ¿Obligatoria? | Dónde se usa | Descripción |
|----------|---------------|--------------|-------------|
| `PUBLIC_GITHUB_USERNAME` | Sí | Build + cliente | Tu usuario de GitHub (`cesaredul`) |
| `PUBLIC_SITE_URL` | Sí (prod) | SEO / URLs | URL pública del sitio, sin `/` final |
| `GH_API_TOKEN` | Recomendada | Solo build | Token para cargar repos sin límite estricto |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Para contacto | Cliente | Access key de Web3Forms |
| `PUBLIC_CONTACT_EMAIL` | Opcional | Cliente | Correo donde recibes mensajes |
| `BASE_PATH` | Solo GH Pages | Build | Ruta base (`/PortafolioWeb` o `/`) |

> Las variables con prefijo `PUBLIC_` son visibles en el navegador. **Nunca** pongas el token de GitHub con prefijo `PUBLIC_`.

---

## 3. Cómo obtener cada variable

### `PUBLIC_GITHUB_USERNAME`

Tu nombre de usuario en GitHub. Ejemplo: `cesaredul`.

- URL: https://github.com/cesaredul → el username es la parte final.

### `GH_API_TOKEN` (Personal Access Token)

Sirve para que Astro consulte la API de GitHub al generar el sitio y liste tus repositorios en la sección **Proyectos**.

**Sin token:** funciona, pero la API limita a ~60 peticiones/hora por IP.  
**Con token:** hasta 5 000 peticiones/hora.

#### Pasos para crearlo

1. Entra a GitHub → **Settings** (tu perfil, no del repo).
2. En el menú lateral: **Developer settings**.
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
4. Nombre sugerido: `portafolio-build`.
5. Expiración: 90 días o "No expiration" (menos seguro).
6. Permisos mínimos:
   - **`public_repo`** — leer repos públicos (suficiente si todos tus proyectos son públicos).
   - O **`repo`** — solo si necesitas listar repos privados (no recomendado para un portafolio).
7. Genera y **copia el token** (`ghp_...`). No podrás verlo de nuevo.

**Dónde configurarlo:**

- Local: archivo `.env` → `GH_API_TOKEN=ghp_...`
- GitHub Actions: **New repository secret** → nombre **`GH_API_TOKEN`** (valor: tu `ghp_...`)

> GitHub **no permite** secrets que empiecen por `GITHUB_` (error *"Secret names must not start with GITHUB_"*). Usa siempre **`GH_API_TOKEN`**.

### `PUBLIC_SITE_URL`

URL final donde vivirá el sitio:

| Plataforma | Ejemplo |
|------------|---------|
| GitHub Pages (repo `PortafolioWeb`) | `https://cesaredul.github.io/PortafolioWeb` |
| GitHub Pages (usuario `cesaredul.github.io`) | `https://cesaredul.github.io` |
| Vercel / Netlify | `https://tu-dominio.vercel.app` |

En GitHub Actions: **Settings** → **Secrets and variables** → **Actions** → pestaña **Variables** → `PUBLIC_SITE_URL`.

### `PUBLIC_WEB3FORMS_ACCESS_KEY`

Servicio gratuito para el formulario de contacto (250 envíos/mes en plan free).

#### Pasos

1. Ve a https://web3forms.com/
2. Ingresa tu correo y haz clic en **Create Access Key**.
3. Revisa tu email y confirma.
4. Copia el **Access Key** que te dan.

**Dónde configurarlo:**

- Local: `.env` → `PUBLIC_WEB3FORMS_ACCESS_KEY=tu-key`
- GitHub Actions: **Secrets** → `PUBLIC_WEB3FORMS_ACCESS_KEY` (como secret, no variable)

### `PUBLIC_CONTACT_EMAIL`

El correo donde quieres recibir los mensajes del formulario. Es el mismo que registraste en Web3Forms.

---

## 4. Despliegue en GitHub Pages (gratis)

### Paso A — Subir el repo

```bash
git init
git add .
git commit -m "feat: portafolio Astro con integración GitHub"
git branch -M main
git remote add origin https://github.com/cesaredul/PortafolioWeb.git
git push -u origin main
```

> Si el repo en GitHub tiene otro nombre, cambia `BASE_PATH` en el workflow y en `.env` para que coincida (`/NombreDelRepo`).

### Paso B — Configurar secrets y variables en GitHub

En el repo → **Settings** → **Secrets and variables** → **Actions**:

**Secrets (New repository secret):**

| Nombre | Valor |
|--------|-------|
| `GH_API_TOKEN` | Tu PAT (`ghp_...`) |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Access key de Web3Forms |

**Variables (New repository variable):**

| Nombre | Valor |
|--------|-------|
| `PUBLIC_SITE_URL` | `https://cesaredul.github.io/PortafolioWeb` |
| `PUBLIC_GITHUB_USERNAME` | `cesaredul` |
| `PUBLIC_CONTACT_EMAIL` | tu@email.com |

### Paso C — Activar GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. Haz push a `main` o ejecuta el workflow manualmente (**Actions** → **Deploy to GitHub Pages** → **Run workflow**)

Tu sitio quedará en: `https://cesaredul.github.io/PortafolioWeb`

---

## 5. Despliegue en Vercel (gratis, alternativa)

1. Sube el repo a GitHub.
2. Entra a https://vercel.com → **Add New Project** → importa el repo.
3. Framework preset: **Astro** (auto-detectado).
4. Variables de entorno en Vercel → **Settings** → **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `PUBLIC_GITHUB_USERNAME` | `cesaredul` |
| `PUBLIC_SITE_URL` | `https://tu-proyecto.vercel.app` |
| `GH_API_TOKEN` | `ghp_...` |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | tu key |
| `PUBLIC_CONTACT_EMAIL` | tu@email.com |
| `BASE_PATH` | `/` |

5. Deploy.

> En Vercel/Netlify usa `BASE_PATH=/` (raíz). En GitHub Pages con repo nombrado usa `/PortafolioWeb`.

---

## 6. Despliegue en Netlify (gratis, alternativa)

1. https://app.netlify.com → **Add new site** → **Import an existing project**
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Agrega las mismas variables de entorno que en Vercel.
5. `BASE_PATH=/`

---

## 7. Estadísticas de GitHub

La sección **Estadísticas** usa servicios públicos gratuitos (no requieren token):

- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
- [github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats)

Solo necesitas `PUBLIC_GITHUB_USERNAME` configurado correctamente.

---

## 8. Estructura del proyecto

```
PortafolioWeb/
├── src/
│   ├── components/     # Secciones del portafolio
│   ├── config/site.ts  # Datos del sitio y URLs de stats
│   ├── lib/github.ts   # Fetch de repos en build time
│   ├── layouts/        # Layout base
│   ├── pages/          # Rutas (index.astro)
│   └── styles/         # Tailwind + utilidades
├── public/             # Assets estáticos
├── .github/workflows/  # CI/CD para GitHub Pages
├── astro.config.mjs
├── tailwind.config.mjs
├── .env.example
└── DEPLOY.md
```

---

## 9. Personalización rápida

| Qué cambiar | Archivo |
|-------------|---------|
| Nombre, links, imágenes | `src/config/site.ts` |
| Texto "Sobre Mí" | `src/components/About.astro` |
| Colores / tema | `tailwind.config.mjs` |
| Repos mostrados | Automático vía API; edita filtros en `src/lib/github.ts` |

---

## 10. Solución de problemas

### Error `UNABLE_TO_VERIFY_LEAF_SIGNATURE` al hacer `npm i`

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

### Otros problemas

| Problema | Solución |
|----------|----------|
| CSS/JS no carga en GitHub Pages | Verifica que `BASE_PATH=/PortafolioWeb` coincida con el nombre del repo |
| No aparecen proyectos | Revisa `PUBLIC_GITHUB_USERNAME` y el secret `GH_API_TOKEN` en Actions |
| Error *Secret names must not start with GITHUB_* | El secret debe llamarse **`GH_API_TOKEN`** |
| Formulario no envía | Configura `PUBLIC_WEB3FORMS_ACCESS_KEY` y confirma el email en Web3Forms |
| Stats no cargan | GitHub username incorrecto o servicio externo temporalmente caído |

---

## Comandos útiles

```bash
npm run dev      # http://localhost:4320/PortafolioWeb
npm run build    # Genera carpeta dist/
npm run preview  # Previsualiza dist/
```
