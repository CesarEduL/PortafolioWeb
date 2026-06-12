---
name: blog-censura-portafolio
description: >-
  Reglas de censura y formato al crear o editar posts del blog en este repo
  (src/content/blog/). Usar siempre que redactes un blog nuevo, amplies una nota
  técnica del portafolio, documentes Agiliza360 para uso personal, o el usuario
  mencione blog, portafolio web o notas para mí.
---

# Blog PortafolioWeb — censura y convenciones

Al **crear o editar** cualquier archivo en `src/content/blog/*.md`, aplicar estas reglas **antes de entregar**. Son obligatorias aunque el usuario no las repita.

Idioma del post: **español** (`locale: es`).

> Copia equivalente en el monorepo: `Negocio/.cursor/skills/blog-censura-portafolio/` (mismo contenido).

## Cuándo aplicar

- Nuevo post en `src/content/blog/`
- Ampliar secciones (payloads, releases, integraciones) en posts existentes
- Copiar contenido desde docs internas del monorepo (API principal, PRPs, README privados)

**No** aplicar censura agresiva a código fuente del producto — solo al **contenido publicable del blog**.

## Frontmatter obligatorio

```yaml
---
title: "Nota para mí: …"
description: "…"
pubDate: YYYY-MM-DD
tags: ["agiliza360", …]
locale: es
draft: false
---
```

- Título en formato **Nota para mí:** salvo que el usuario pida otro estilo.
- Incluir tag **`agiliza360`** siempre.
- Tags preferidos: `api`, `panel`, `nestjs`, `agente` — evitar `backend`, `panel-admin`, nombres de repos.

## Tier A — nunca publicar

Si aparece en borrador, **sustituir o eliminar** antes de guardar:

| Prohibido | Sustituto |
|---|---|
| Dominios prod reales (`*.agiliza360.ai`, Railway/Render/Azure URLs reales) | `{URL_PUBLICA_API}`, `{URL_PANEL}`, `https://api.ejemplo.com` |
| Tokens, API keys, JWT, `lsv2_…`, secrets de Meta/WhatsApp/Yango/Rest.pe | `{token}`, `{API_KEY}`, placeholders genéricos |
| Emails reales del equipo o clientes | `usuario@email.com`, `local+519…@orders.example.com` |
| Cloudinary / storage URLs reales con cuenta | `{CDN}/…` o descripción sin URL |
| Nombres comerciales reales de clientes/marcas en prod | `Marca Demo`, `Restaurante Demo`, `Local Demo` |
| App ID / Business ID personales de Meta en URLs | Enlace genérico [Meta for Developers — Mis apps](https://developers.facebook.com/apps/) |
| IPs, ngrok personales, subdominios de demo ligados a personas | `{SUBDOMINIO}`, `{URL_TUNEL}` |
| Credenciales Mongo, connection strings | No incluir |

## Repos y rutas internas

El blog es **nota personal publicable**, no mapa del monorepo.

| En código interno | En el blog |
|---|---|
| `ssgg` | **API principal** |
| `panel-admin-ag360ai` | **panel admin** |
| `wsp-provider-meta` | **proveedor Meta** |
| `print-bridge` | **Print Bridge** / app local (OK nombre producto) |
| `backend/src/modules/.../foo.service.ts` | Rol funcional: «orquestador de pedidos», «cliente HTTP Yango» |
| Rutas absolutas del workspace | No citar; tabla «Qué \| Dónde» con descripción funcional |

**Excepción:** nombres de **artefactos públicos** en GitHub Releases (`maxy-print-bridge-setup.exe`) si el post es operativo de despliegue — usar `{org}/print-bridge` para el repo, no el org real salvo que el usuario lo pida.

## Variables de entorno

- **No** pegar literales `VITE_*`, `WHATSAPP_*`, `YANGO_*`, `LANGSMITH_*`, `RESTPE_*`, etc. en el cuerpo.
- Usar tabla **Concepto → dónde configurarlo** (panel build, credenciales de marca, runtime API).
- Si hace falta un nombre técnico unavoidable, una mención entre backticks + explicación en español, sin valor real.

## Código y payloads de ejemplo

- JSON/HTTP de integraciones: datos **ficticios** (`ORD-2026-001234`, coords Lima genéricas, IDs Rest.pe `87`, `5`, `16` como placeholders).
- Enlaces entre posts del portafolio: `/blog/slug-del-post/` (rutas relativas al sitio).
- Nombres de agente producto (**Artemis**, **Print Bridge**) — OK.
- Clases/archivos internos (`YangoApiService.ts`, `AuthContext.tsx`) → preferir rol («cliente HTTP», «contexto de auth del panel») salvo que el usuario quiera trazabilidad explícita.

## Tono y estructura

- Segunda persona implícita («nota para mí»): técnico, directo, en español.
- Diagramas ASCII o tablas cuando ayuden; evitar dumps enormes de código interno.
- Enlaces externos: URLs genéricas oficiales (docs LangSmith, Meta Developers, smith.langchain.com).
- No commits ni push salvo petición explícita del usuario.

## Checklist antes de terminar

Repasar el `.md` y confirmar:

- [ ] Sin Tier A (dominios, keys, clientes reales, URLs privadas)
- [ ] Repos renombrados (API principal / panel admin)
- [ ] Sin env vars crudas con valores
- [ ] Tag `agiliza360` en frontmatter
- [ ] Título «Nota para mí» (si aplica el estilo del portafolio)
- [ ] Ejemplos JSON con placeholders coherentes
- [ ] Tabla final «Archivos clave» por **capa/rol**, no por path del repo

## Ejemplos rápidos

Ver transformaciones antes/después en [reference.md](reference.md).

## Posts de referencia (estilo ya censurado)

Usar como plantilla de tono y nivel de detalle:

- `integracion-yango-tres-capas.md`
- `integracion-restaurant-pe-tres-capas.md`
- `proveedor-meta-whatsapp-y-desarrollo.md`
- `langsmith-trazas-agentes.md`
- `print-bridge-impresion-local.md`

Si un post existente viola estas reglas (p. ej. cita `ssgg` o paths), **al editarlo** alinear con esta skill.
