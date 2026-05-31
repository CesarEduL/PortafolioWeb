# Estructura del sitio y del proyecto

[← Volver al README](../README.md)

## Páginas del sitio

| Ruta | Contenido |
|------|-----------|
| `/` | Hero, Sobre Mí, Tecnologías, Contacto |
| `/proyectos/` | Proyectos destacados + más repos |
| `/experiencia/` | Timeline académico y laboral |
| `/blog/` | Artículos (Content Collections) |
| `/estadisticas/` | Stats de GitHub + trofeos |

Rutas definidas en `src/lib/navigation.ts` (respetan `BASE_PATH`).

## Estadísticas de GitHub

La sección **Estadísticas** usa servicios públicos gratuitos (no requieren token):

- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
- [github-readme-streak-stats](https://github.com/DenverCoder1/github-readme-streak-stats)

Solo necesitas `PUBLIC_GITHUB_USERNAME` configurado correctamente (ver [Variables de entorno](variables-entorno.md)).

## Árbol del repositorio

```
PortafolioWeb/
├── docs/               # Documentación del proyecto
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
└── README.md
```
