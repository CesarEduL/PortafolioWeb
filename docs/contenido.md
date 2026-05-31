# Guía de contenido — dónde escribir

[← Volver al README](../README.md) · [Personalización rápida](personalizacion.md)

El sitio **no tiene panel de administración**: todo el contenido se edita en archivos del repo. Después de guardar, haz `npm run dev` para previsualizar y `git push` a `main` para publicar (GitHub Actions despliega solo).

## Resumen rápido

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

## 1. Datos personales — `src/config/site.ts`

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

## 2. Experiencia y certificados — `src/data/experience.ts`

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

## 3. Proyectos destacados — `src/data/featured-projects.ts`

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

## 4. Blog y notas — `src/content/blog/`

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

## 5. Textos en español e inglés — `src/i18n/ui.ts`

Menú, hero, contacto, botones de proyectos, etc. Cada clave tiene versión `es` y `en`:

```ts
// Dentro de ui.es y ui.en (mismas claves en ambos):
"hero.greeting": "Hola 👋, soy",     // en: "Hi 👋, I'm"
"sections.contact": "Contacto",       // en: "Contact"
"projects.thisProject": "Este Proyecto", // en: "This Project"
```

Tras editar, recarga el sitio y prueba el botón **EN** en el header.

---

## 6. Sobre Mí (párrafos largos) — `src/i18n/ui.ts`

Los párrafos de la sección About no están en `About.astro`; usan claves:

- `about.p1`, `about.p2` — textos principales
- `about.specialization`, `about.skill.*`, `about.cleanCode.*`, `about.collab.*`

Edita **las dos versiones** (`ui.es` y `ui.en`) para cada clave.

---

## 7. Publicar cambios

```bash
# 1. Previsualizar en local
npm run dev

# 2. Subir a GitHub (dispara el deploy en Pages)
git add src/data/experience.ts src/content/blog/mi-nota.md
git commit -m "content: añadir certificado Excel y nota de blog"
git push
```
