# Personalización rápida

[← Volver al README](../README.md) · [Guía de contenido (detallada)](contenido.md)

## Referencia por archivo

| Qué cambiar | Archivo |
|-------------|---------|
| Nombre, links, imágenes | `src/config/site.ts` |
| Variables de entorno (GitHub, CV, formulario, analytics) | `src/config/env.ts` y `.env` |
| PDF del CV | `public/cv.pdf` (ver [CV en PDF](cv-pdf.md)) |
| **Proyectos destacados** (texto, stack, demo, captura) | `src/data/featured-projects.ts` + imágenes en `public/projects/` |
| **Experiencia / educación** (timeline) | `src/data/experience.ts` |
| **Blog / notas** | `src/content/blog/*.md` |
| Textos ES/EN del menú y secciones | `src/i18n/ui.ts` |
| Texto "Sobre Mí" | `src/i18n/ui.ts` (`about.*`) — ver [Guía de contenido](contenido.md) |
| Colores / tema | `tailwind.config.mjs` + `src/styles/global.css` |
| Repos adicionales (grid inferior) | Automático vía API; filtros en `src/lib/github.ts` |

> Guía detallada con ejemplos: [contenido.md](contenido.md).

## Proyectos destacados

1. Edita `src/data/featured-projects.ts` (título, descripción `es`/`en`, `stack`, `demoUrl`, `githubRepo`).
2. Añade capturas en `public/projects/` (PNG/WebP; actualiza el campo `image`).
3. Los repos listados ahí **no** se repiten en «Más repositorios».

## Blog (Content Collections)

Ver [Guía de contenido § Blog](contenido.md#4-blog-y-notas--srccontentblog). Resumen:

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

El listado aparece en la home y en `/blog/`.

## Analytics (opcional)

| Servicio | Variable en `.env` |
|----------|-------------------|
| [Plausible](https://plausible.io/) | `PUBLIC_PLAUSIBLE_DOMAIN=tudominio.com` |
| [Umami](https://umami.is/) | `PUBLIC_UMAMI_WEBSITE_ID=...` y opcional `PUBLIC_UMAMI_SCRIPT_URL` |

En GitHub Actions, añade las mismas variables en **Settings → Variables** si despliegas ahí.

## Idioma y tema

- **ES/EN:** botón en el header; preferencia en `localStorage` (`portfolio-lang`).
- **Claro/oscuro:** botón sol/luna; preferencia en `localStorage` (`portfolio-theme`).
