# Variables de entorno

[← Volver al README](../README.md)

## Tabla de referencia

| Variable | ¿Obligatoria? | Dónde se usa | Descripción |
|----------|---------------|--------------|-------------|
| `PUBLIC_GITHUB_USERNAME` | Sí | Build + cliente | Tu usuario de GitHub (`cesaredul`) |
| `PUBLIC_SITE_URL` | Sí (prod) | SEO / URLs | URL pública del sitio, sin `/` final |
| `GH_API_TOKEN` | Recomendada | Solo build | Token para cargar repos sin límite estricto |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Para contacto | Cliente | Access key de Web3Forms |
| `PUBLIC_CONTACT_EMAIL` | Opcional | Cliente | Correo donde recibes mensajes |
| `PUBLIC_CV_FILENAME` | Opcional | Build + cliente | Nombre del PDF en `public/` (por defecto `cv.pdf`) |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Opcional | Cliente | Dominio en Plausible Analytics |
| `PUBLIC_UMAMI_WEBSITE_ID` | Opcional | Cliente | ID del sitio en Umami |
| `PUBLIC_UMAMI_SCRIPT_URL` | Opcional | Cliente | URL del script Umami (por defecto cloud.umami.is) |
| `BASE_PATH` | Solo GH Pages | Build | Ruta base (`/PortafolioWeb` o `/`) |

> Las variables con prefijo `PUBLIC_` son visibles en el navegador. **Nunca** pongas el token de GitHub con prefijo `PUBLIC_`.

---

## Cómo obtener cada variable

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
