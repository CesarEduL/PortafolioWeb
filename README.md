# Portafolio Web — Cesar Eduardo

Portafolio estático construido con **Astro + Tailwind CSS**. Se puede desplegar gratis en **GitHub Pages**, **Vercel** o **Netlify**.

## Documentación

| Tema | Archivo |
|------|---------|
| Instalación, `npm run dev` / build | [docs/configuracion-local.md](docs/configuracion-local.md) |
| Variables `.env` y cómo obtenerlas | [docs/variables-entorno.md](docs/variables-entorno.md) |
| GitHub Pages, Vercel, Netlify | [docs/despliegue.md](docs/despliegue.md) |
| Subir y actualizar el CV (PDF) | [docs/cv-pdf.md](docs/cv-pdf.md) |
| Rutas del sitio y árbol del repo | [docs/estructura.md](docs/estructura.md) |
| Editar experiencia, proyectos, blog, textos | [docs/contenido.md](docs/contenido.md) |
| Capturas y textos de proyectos destacados | [docs/capturas-proyectos.md](docs/capturas-proyectos.md) |
| Referencia rápida de personalización | [docs/personalizacion.md](docs/personalizacion.md) |
| Errores frecuentes (npm, deploy, formulario) | [docs/solucion-problemas.md](docs/solucion-problemas.md) |

## Inicio rápido

```bash
npm install
cp .env.example .env
npm run dev
```

Configura `.env` según [variables de entorno](docs/variables-entorno.md). Para publicar en producción, sigue [despliegue](docs/despliegue.md).

## Comandos

```bash
npm run dev      # http://localhost:4320/PortafolioWeb
npm run build    # Genera carpeta dist/
npm run preview  # Previsualiza dist/
```
