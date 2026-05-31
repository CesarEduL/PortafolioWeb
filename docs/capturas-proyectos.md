# Capturas y textos de proyectos destacados

[← Volver al README](../README.md) · [Guía de contenido](contenido.md)

Esta guía explica **de dónde sale cada parte** de una tarjeta en **Proyectos destacados** (`/proyectos/`) y qué archivos debes tocar.

---

## Resumen rápido

| Qué ves en la tarjeta | Dónde se define | Archivo |
|----------------------|-----------------|---------|
| Título | Catálogo de destacados | `src/data/featured-projects.ts` → `title` |
| Descripción (ES/EN) | Mismo catálogo | `featured-projects.ts` → `description.es` / `description.en` |
| Etiquetas del stack | Mismo catálogo | `featured-projects.ts` → `stack[]` |
| Captura (imagen superior) | Archivo en `public/` + ruta en catálogo | `public/projects/...` + `image` |
| Degradado si la imagen falla | Automático o personalizado | `imageAccent` o `src/lib/featured-image.ts` |
| Enlace GitHub | API de GitHub en build | `githubRepo` + `GH_API_TOKEN` / usuario |
| Botón Demo / Sin demo | GitHub `homepage` o `demoUrl` | `demoUrl` en catálogo o repo en GitHub |
| Botón «Este Proyecto» | Solo este sitio | `isCurrentSite: true` |

La sección **Más repositorios** no usa capturas: solo nombre, descripción del README de GitHub e idioma principal.

---

## Flujo en el código

```text
src/data/featured-projects.ts     ← Tú editas: título, textos, stack, ruta de imagen
        ↓
src/pages/proyectos/index.astro   ← En build: pide repos a GitHub
        ↓
src/lib/projects.ts               ← enrichFeaturedProjects(): une datos + URLs
        ↓
src/lib/assets.ts                 ← assetUrl(): añade BASE_PATH (/PortafolioWeb)
        ↓
src/components/FeaturedProjects.astro  ← Pinta la tarjeta + fallback si la img falla
```

---

## 1. Catálogo principal — `src/data/featured-projects.ts`

Aquí declaras cada proyecto destacado. Ejemplo:

```ts
{
  id: "news-web-taller",
  githubRepo: "news-web-taller",   // debe existir en tu GitHub (salvo isCurrentSite)
  title: "News Web Taller",
  description: {
    es: "Texto en español bajo el título.",
    en: "English text under the title.",
  },
  stack: ["Vue", "Vite", "Vuex", "Vitest"],
  image: "projects/news-web-taller.svg",  // ruta relativa a public/
  imageAccent: "#1b5e20",                 // opcional: color del degradado de respaldo
},
```

- **`githubRepo`**: nombre exacto del repo en GitHub. Si el repo no existe, la tarjeta no se muestra (excepto `isCurrentSite`).
- **`description`**: no viene de GitHub; la escribes tú en el código.
- **`stack`**: también manual; son las pastillas grises bajo la descripción.

---

## 2. Archivos de captura — carpeta `public/projects/`

Las imágenes son **estáticas**: Astro las sirve tal cual desde `public/`.

| Formato | Uso recomendado |
|---------|-----------------|
| `.svg` | Placeholder con título + stack (como AlertaDolar) |
| `.png` / `.webp` | Captura real de la app |

**Convención:** el campo `image` apunta sin barra inicial:

```ts
image: "projects/news-web-taller.svg"
```

Archivo físico:

```text
public/projects/news-web-taller.svg
```

**URL en el navegador** (con GitHub Pages y `BASE_PATH=/PortafolioWeb`):

```text
https://tu-usuario.github.io/PortafolioWeb/projects/news-web-taller.svg
```

En local con `npm run dev`:

```text
http://localhost:4320/PortafolioWeb/projects/news-web-taller.svg
```

Tras añadir o cambiar una imagen, guarda el archivo y recarga; en producción haz commit + push para que el deploy la incluya.

---

## 3. Cómo se construye la URL de la imagen

En `src/lib/projects.ts`, al enriquecer el proyecto:

```ts
imageUrl: assetUrl(project.image),
```

`assetUrl` (`src/lib/assets.ts`) antepone `BASE_URL` del build (p. ej. `/PortafolioWeb/`). Por eso la ruta en `image` **no** debe llevar el prefijo del sitio, solo `projects/archivo.ext`.

---

## 4. Fallback si la captura no carga

Implementado en `src/components/FeaturedProjects.astro`:

1. Se intenta cargar `<img src={imageUrl}>`.
2. Si falla (`error` o imagen vacía), se oculta la `<img>` y se muestra un panel con **degradado + título + stack** (mismo estilo que los SVG de placeholder).

El color del degradado:

- Opcional: `imageAccent: "#1b5e20"` en `featured-projects.ts`.
- Si no lo pones: `src/lib/featured-image.ts` elige un color según la primera tecnología del `stack` (Vue → verde, Kotlin → azul, etc.).

**Causas habituales de imagen rota:**

- El archivo no existe en `public/projects/`.
- Nombre distinto entre `image:` y el archivo real (mayúsculas/minúsculas).
- SVG corrupto (caracteres inválidos); guarda en UTF-8 o usa ASCII en el SVG.
- No has hecho deploy después de subir el archivo.

---

## 5. Descripción de «Más repositorios»

Esa rejilla **no** usa `featured-projects.ts`. La descripción sale del campo `description` del **README del repo en GitHub** (API en build). Si GitHub no tiene descripción, se muestra «—».

---

## 6. Checklist al añadir un destacado

1. Crear o copiar imagen en `public/projects/mi-proyecto.svg` (o `.png`).
2. Añadir bloque en `src/data/featured-projects.ts` con `githubRepo`, textos, `stack` e `image`.
3. `npm run dev` → abrir `/proyectos/` y comprobar captura y textos.
4. Probar la URL directa de la imagen en el navegador.
5. `git add public/projects/... src/data/featured-projects.ts` y push.

---

## 7. Archivos relacionados

| Archivo | Función |
|---------|---------|
| `src/data/featured-projects.ts` | Datos de cada destacado |
| `public/projects/*` | Capturas y placeholders SVG |
| `src/lib/projects.ts` | Enlace con GitHub y `imageUrl` |
| `src/lib/assets.ts` | Prefijo `BASE_PATH` en URLs |
| `src/lib/featured-image.ts` | Colores del fallback |
| `src/components/FeaturedProjects.astro` | UI de tarjetas + fallback |
| `src/pages/proyectos/index.astro` | Página que carga todo en build |
