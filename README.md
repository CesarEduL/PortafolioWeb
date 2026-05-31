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
| `PUBLIC_CV_FILENAME` | Opcional | Build + cliente | Nombre del PDF en `public/` (por defecto `cv.pdf`) |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Opcional | Cliente | Dominio en Plausible Analytics |
| `PUBLIC_UMAMI_WEBSITE_ID` | Opcional | Cliente | ID del sitio en Umami |
| `PUBLIC_UMAMI_SCRIPT_URL` | Opcional | Cliente | URL del script Umami (por defecto cloud.umami.is) |
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

## 7. CV en PDF (botón «Descargar CV»)

El botón del inicio apunta a un archivo estático en la carpeta `public/`. No hace falta tocar código cada vez que actualices tu currículum.

### Primera vez (subir tu CV)

1. Exporta tu CV desde Word, Google Docs, Canva, etc. como **PDF**.
2. Copia el archivo a esta ruta del proyecto:

   ```
   public/cv.pdf
   ```

3. Arranca o reconstruye el sitio:

   ```bash
   npm run dev
   # o, para producción:
   npm run build
   ```

4. Comprueba el enlace:
   - En local: `http://localhost:4320/PortafolioWeb/cv.pdf` (la ruta incluye `BASE_PATH` si lo tienes en `.env`).
   - En GitHub Pages: `https://TU-USUARIO.github.io/PortafolioWeb/cv.pdf`

5. Sube los cambios a GitHub (el PDF va en el commit):

   ```bash
   git add public/cv.pdf
   git commit -m "docs: actualizar CV"
   git push
   ```

   Si usas GitHub Actions, el workflow volverá a desplegar el sitio con el PDF nuevo.

### Cuando actualices tu CV (mismo nombre)

1. Sustituye el archivo **`public/cv.pdf`** por la versión nueva (mismo nombre, contenido nuevo).
2. `git add public/cv.pdf`, commit y push (o solo vuelve a ejecutar `npm run build` si pruebas en local).

No necesitas cambiar `src/config/site.ts`: la URL se genera sola con `BASE_URL` + nombre del archivo.

### Opcional: otro nombre de archivo

Si quieres conservar versiones con fecha en el nombre del PDF:

1. Guarda el archivo, por ejemplo: `public/cv-2026-05.pdf`
2. En `.env` (y en **Variables** de GitHub Actions si despliegas ahí):

   ```env
   PUBLIC_CV_FILENAME=cv-2026-05.pdf
   ```

3. Vuelve a hacer build o deploy.

La lógica está en `src/config/env.ts` (`cvUrl`). El botón sigue en `src/components/Hero.astro`.

> **Tip:** Mantén siempre el mismo nombre `cv.pdf` y solo reemplaza el archivo; es la forma más simple de actualizar sin tocar variables de entorno.

---

## 8. Estadísticas de GitHub

La sección **Estadísticas** usa servicios públicos gratuitos (no requieren token):

- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
- [github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats)

Solo necesitas `PUBLIC_GITHUB_USERNAME` configurado correctamente.

---

## 9. Estructura del sitio (páginas)

| Ruta | Contenido |
|------|-----------|
| `/` | Hero, Sobre Mí, Tecnologías, Contacto |
| `/proyectos/` | Proyectos destacados + más repos |
| `/experiencia/` | Timeline académico y laboral |
| `/blog/` | Artículos (Content Collections) |
| `/estadisticas/` | Stats de GitHub + trofeos |

Rutas definidas en `src/lib/navigation.ts` (respetan `BASE_PATH`).

---

## 10. Guía de contenido — dónde escribir

El sitio **no tiene panel de administración**: todo el contenido se edita en archivos del repo. Después de guardar, haz `npm run dev` para previsualizar y `git push` a `main` para publicar (GitHub Actions despliega solo).

### Resumen rápido

| Qué quieres cambiar | Archivo o carpeta | Se ve en |
|---------------------|-------------------|----------|
| Nombre, LinkedIn, GitHub, foto | `src/config/site.ts` | Todo el sitio |
| Texto «Sobre Mí» | `src/i18n/ui.ts` (`about.*`) | Inicio → Sobre Mí |
| Experiencia, estudios, certificados | `src/data/experience.ts` | `/experiencia/` |
| Proyectos con captura y demo | `src/data/featured-projects.ts` + `public/projects/` | `/proyectos/` |
| Notas del blog | `src/content/blog/*.md` | `/blog/` |
| Menú y textos ES/EN | `src/i18n/ui.ts` | Header, botones, secciones |
| CV descargable | `public/cv.pdf` | Botón en inicio |
| Repos extra (automático) | `.env` → `PUBLIC_GITHUB_USERNAME` | `/proyectos/` (grid inferior) |

---

### 1. Datos personales — `src/config/site.ts`

Nombre, enlaces sociales, imágenes del hero y contacto.

```ts
export const siteConfig = {
  name: "Cesar Eduardo",
  role: "Android Developer | Software Developer", // también traducido vía i18n en Hero
  available: true, // badge «Disponible para trabajar»
  linkedinUrl: "https://www.linkedin.com/in/cesar-camero",
  githubUrl: "https://github.com/CesarEduL",
  profileImage: "https://...",  // URL de tu foto
  contactImage: "https://...",  // imagen sección contacto
};
```

---

### 2. Experiencia y certificados — `src/data/experience.ts`

Cada entrada del timeline. Tipos: `"education"`, `"work"`, `"certificate"`.

**Educación:**

```ts
{
  id: "edu-software",           // único, sin espacios
  type: "education",
  title: { es: "Ingeniería de Software", en: "Software Engineering" },
  organization: { es: "UTP — Piura", en: "UTP — Piura" },
  period: "2022 — En curso",
  description: {
    es: "Enfoque en desarrollo móvil y web.",
    en: "Focus on mobile and web development.",
  },
},
```

**Experiencia / proyectos:**

```ts
{
  id: "android-focus",
  type: "work",
  title: { es: "Desarrollo Android & Full-Stack", en: "Android & Full-Stack development" },
  organization: { es: "Proyectos personales", en: "Personal projects" },
  period: "2022 — Actualidad",
  description: {
    es: "Apps Android, Vue/Nuxt y backends con Node/Python.",
    en: "Android apps, Vue/Nuxt, and Node/Python backends.",
  },
},
```

**Certificado (con enlace a Google Drive o PDF):**

```ts
{
  id: "cert-excel-intermedio",
  type: "certificate",
  title: { es: "Asesor de Excel Intermedio", en: "Intermediate Excel Advisor" },
  organization: { es: "Fundación Telefónica", en: "Telefónica Foundation" },
  period: "2024",
  description: {
    es: "Certificación en Excel intermedio. Ver documento: https://drive.google.com/file/d/FILE_ID/view",
    en: "Intermediate Excel certification. View document: https://drive.google.com/file/d/FILE_ID/view",
  },
},
```

> **Drive:** el PDF debe estar en «Cualquier persona con el enlace → Lector». Prueba el enlace en incógnito antes de publicarlo.

> **PDF local (alternativa):** copia el archivo a `public/certificates/mi-cert.pdf` y pon en la descripción la ruta `/PortafolioWeb/certificates/mi-cert.pdf` (ajusta si `BASE_PATH` es `/`).

Añade entradas **al array** `experienceItems` (orden = orden en la página). Elimina o comenta las que ya no quieras mostrar.

---

### 3. Proyectos destacados — `src/data/featured-projects.ts`

Proyectos con imagen, stack y botones GitHub / Demo. El nombre del repo debe coincidir con GitHub (`githubRepo`).

**Proyecto normal (sin demo en vivo):**

```ts
{
  id: "alertadolar",
  githubRepo: "AlertaDolar",
  title: "AlertaDolar",
  description: {
    es: "App Android para tipos de cambio y alertas.",
    en: "Android app for exchange rates and alerts.",
  },
  stack: ["Kotlin", "Android", "Firebase"],
  image: "projects/alertadolar.png",  // archivo en public/projects/
},
```

**Con demo en vivo:**

```ts
{
  id: "mi-web",
  githubRepo: "MiProyecto",
  title: "Mi Proyecto",
  description: { es: "...", en: "..." },
  stack: ["Vue", "Node"],
  demoUrl: "https://mi-demo.vercel.app",
  image: "projects/mi-web.png",
},
```

**Este portafolio («Este Proyecto» en vez de «Sin demo»):**

```ts
{
  id: "portafolio",
  githubRepo: "PortafolioWeb",
  title: "Portafolio Web",
  description: { es: "Este sitio.", en: "This site." },
  stack: ["Astro", "Tailwind"],
  isCurrentSite: true,
  image: "projects/portafolio.svg",
},
```

Capturas: guarda PNG/WebP/SVG en **`public/projects/`** y usa el mismo nombre en `image` (ej. `projects/alertadolar.png`).

---

### 4. Blog y notas — `src/content/blog/`

Un archivo **`.md` por nota**. El nombre del archivo define la URL: `android-apis.md` → `/blog/android-apis/`.

**Plantilla (tono personal, como nota para ti):**

```markdown
---
title: "Nota para mí: título corto"
description: "Una línea que resume de qué va la nota."
pubDate: 2026-05-30
tags: ["android", "kotlin"]
locale: es
draft: false
---

Cesar, hoy aprendiste que separar la capa de red del UI en Android te ahorra dolores de cabeza.

## Detalle

- Punto uno
- Punto dos

Cuando vuelvas a esto, revisa el repo AlertaDolar.
```

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `title` | Sí | Título en la tarjeta y página |
| `description` | Sí | Resumen bajo el título |
| `pubDate` | Sí | Fecha `YYYY-MM-DD` |
| `tags` | No | Etiquetas `#astro`, `#android`, etc. |
| `locale` | No | `es` o `en` (por defecto `es`) |
| `draft` | No | `true` = no se publica |

Para **ocultar** una nota sin borrarla: `draft: true`.

---

### 5. Textos en español e inglés — `src/i18n/ui.ts`

Menú, hero, contacto, botones de proyectos, etc. Cada clave tiene versión `es` y `en`:

```ts
// Dentro de ui.es y ui.en (mismas claves en ambos):
"hero.greeting": "Hola 👋, soy",     // en: "Hi 👋, I'm"
"sections.contact": "Contacto",       // en: "Contact"
"projects.thisProject": "Este Proyecto", // en: "This Project"
```

Tras editar, recarga el sitio y prueba el botón **EN** en el header.

---

### 6. Sobre Mí (párrafos largos) — `src/i18n/ui.ts`

Los párrafos de la sección About no están en `About.astro`; usan claves:

- `about.p1`, `about.p2` — textos principales
- `about.specialization`, `about.skill.*`, `about.cleanCode.*`, `about.collab.*`

Edita **las dos versiones** (`ui.es` y `ui.en`) para cada clave.

---

### 7. Publicar cambios

```bash
# 1. Previsualizar en local
npm run dev

# 2. Subir a GitHub (dispara el deploy en Pages)
git add src/data/experience.ts src/content/blog/mi-nota.md
git commit -m "content: añadir certificado Excel y nota de blog"
git push
```

---

## 11. Estructura del proyecto

```
PortafolioWeb/
├── src/
│   ├── components/     # Secciones del portafolio
│   ├── config/         # site.ts, env.ts
│   ├── content/blog/   # Artículos (Content Collections)
│   ├── data/           # Proyectos destacados y experiencia
│   ├── i18n/ui.ts      # Textos ES/EN
│   ├── lib/            # GitHub API, blog, assets
│   ├── layouts/        # Layout base
│   ├── pages/          # index + blog
│   └── styles/         # Tailwind + modo claro
├── public/             # cv.pdf, projects/*, certificates/*
├── .github/workflows/  # CI/CD para GitHub Pages
├── astro.config.mjs
├── tailwind.config.mjs
├── .env.example
└── DEPLOY.md
```

---

## 12. Personalización rápida (referencia)

| Qué cambiar | Archivo |
|-------------|---------|
| Nombre, links, imágenes | `src/config/site.ts` |
| Variables de entorno (GitHub, CV, formulario, analytics) | `src/config/env.ts` y `.env` |
| PDF del CV | `public/cv.pdf` (ver sección 7) |
| **Proyectos destacados** (texto, stack, demo, captura) | `src/data/featured-projects.ts` + imágenes en `public/projects/` |
| **Experiencia / educación** (timeline) | `src/data/experience.ts` |
| **Blog / notas** | `src/content/blog/*.md` |
| Textos ES/EN del menú y secciones | `src/i18n/ui.ts` |
| Textos ES/EN del menú y secciones | `src/i18n/ui.ts` |
| Texto "Sobre Mí" | `src/i18n/ui.ts` (`about.*`) — ver sección 10 |
| Colores / tema | `tailwind.config.mjs` + `src/styles/global.css` |
| Repos adicionales (grid inferior) | Automático vía API; filtros en `src/lib/github.ts` |

> Guía detallada con ejemplos: **sección 10**.

### Proyectos destacados

1. Edita `src/data/featured-projects.ts` (título, descripción `es`/`en`, `stack`, `demoUrl`, `githubRepo`).
2. Añade capturas en `public/projects/` (PNG/WebP; actualiza el campo `image`).
3. Los repos listados ahí **no** se repiten en «Más repositorios».

### Blog (Content Collections)

Ver **sección 10.4** para plantilla completa. Resumen:

   ```yaml
   ---
   title: "Título"
   description: "Resumen"
   pubDate: 2026-05-30
   tags: ["astro"]
   locale: es
   draft: false
   ---
   ```

2. El listado aparece en la home y en `/blog/`.

### Analytics (opcional)

| Servicio | Variable en `.env` |
|----------|-------------------|
| [Plausible](https://plausible.io/) | `PUBLIC_PLAUSIBLE_DOMAIN=tudominio.com` |
| [Umami](https://umami.is/) | `PUBLIC_UMAMI_WEBSITE_ID=...` y opcional `PUBLIC_UMAMI_SCRIPT_URL` |

En GitHub Actions, añade las mismas variables en **Settings → Variables** si despliegas ahí.

### Idioma y tema

- **ES/EN:** botón en el header; preferencia en `localStorage` (`portfolio-lang`).
- **Claro/oscuro:** botón sol/luna; preferencia en `localStorage` (`portfolio-theme`).

---

## 13. Solución de problemas

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
| «Descargar CV» no abre nada | Falta `public/cv.pdf` o `PUBLIC_CV_FILENAME` no coincide con el archivo |

---

## Comandos útiles

```bash
npm run dev      # http://localhost:4320/PortafolioWeb
npm run build    # Genera carpeta dist/
npm run preview  # Previsualiza dist/
```
