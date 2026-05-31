# Despliegue

[← Volver al README](../README.md) · [Variables de entorno](variables-entorno.md)

---

## GitHub Pages (gratis)

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

## Vercel (gratis, alternativa)

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

## Netlify (gratis, alternativa)

1. https://app.netlify.com → **Add new site** → **Import an existing project**
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Agrega las mismas variables de entorno que en Vercel.
5. `BASE_PATH=/`
