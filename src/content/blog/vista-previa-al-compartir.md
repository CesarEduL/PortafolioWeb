---
title: "Nota para mí: la imagen al compartir en redes"
description: "Cómo configuré la vista previa (Open Graph) al compartir el portafolio en WhatsApp, LinkedIn o X — y el extra multi-marca de la carta digital (SPA + Azure Function)."
pubDate: 2026-06-10
tags: ["agiliza360", "astro", "seo", "open-graph", "cloudinary", "spa", "azure"]
locale: es
draft: false
---

Cuando compartes un enlace en WhatsApp, LinkedIn o X, no sale una miniatura mágica: el bot de la red lee el HTML de tu página y busca etiquetas **Open Graph** y **Twitter Card**. Si no están, o la imagen es mala, la vista previa queda vacía o fea.

En este portafolio lo resolví con una URL fija en la config y unas meta etiquetas en el layout.

## 1. Subir la imagen (y que sea pública)

La imagen tiene que ser una **URL absoluta** con `https://`. No sirve una ruta relativa tipo `/og.png` para muchos crawlers si no resuelven bien el dominio.

Yo la tengo en **Cloudinary** con optimización automática:

```
https://res.cloudinary.com/{cloud_name}/image/upload/q_auto/f_auto/v{version}/og-portafolio.png
```

- `q_auto` y `f_auto`: calidad y formato según el navegador o bot.
- Tamaño recomendado para tarjeta grande: **1200 × 630 px** (ratio 1.91:1). Si es cuadrada también funciona, pero LinkedIn y X se ven mejor con horizontal.

## 2. Apuntar la URL en la config del sitio

En `src/config/site.ts` está `ogImageUrl`:

```ts
ogImageUrl:
  "https://res.cloudinary.com/{cloud_name}/image/upload/q_auto/f_auto/v{version}/og-portafolio.png",
```

Un solo sitio centralizado: si cambio la imagen, solo toco aquí (y subo la nueva a Cloudinary).

## 3. Meta etiquetas en el layout

`src/layouts/Layout.astro` lee esa URL y la inyecta en el `<head>`:

```astro
const ogImage = siteConfig.ogImageUrl;
```

```html
<meta property="og:image" content={ogImage} />
<meta property="og:image:secure_url" content={ogImage} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={ogImage} />
```

También van `og:title`, `og:description`, `og:url` y el equivalente en Twitter. Sin `twitter:card` con `summary_large_image`, en X a veces solo sale texto.

El layout ya hace `preconnect` a `res.cloudinary.com` para que la imagen cargue rápido cuando alguien abre el enlace en el navegador; los bots de redes suelen pedir la URL de `og:image` directamente.

## 4. Comprobar que funciona

Después de desplegar:

1. **LinkedIn:** [Post Inspector](https://www.linkedin.com/post-inspector/) — pega la URL y fuerza re-scrape.
2. **Facebook / Meta:** [Sharing Debugger](https://developers.facebook.com/tools/debug/) — útil también para WhatsApp (mismo ecosistema).
3. **X:** a veces cachea fuerte; si cambias la imagen, cambia la URL (nuevo `v` en Cloudinary) o espera.

Si la vista previa sigue siendo la vieja, casi siempre es **caché del bot**, no que Astro esté mal.

## 5. Errores que me hicieron perder tiempo

- Imagen en `localhost` o detrás de login → el bot no la ve.
- URL sin `https` → algunas redes la ignoran.
- Olvidar redeploy después de cambiar `ogImageUrl` → en local ves bien, en producción no.
- Usar la misma URL con otro archivo encima → el caché no se entera; sube con versión nueva (`v1780...` en Cloudinary).

## Resumen para el yo del futuro

1. Diseña o exporta una imagen ~1200×630.
2. Súbela a Cloudinary (o CDN público).
3. Pega la URL en `siteConfig.ogImageUrl`.
4. Verifica que `Layout.astro` siga emitiendo `og:image` y `twitter:image`.
5. Prueba con los inspectores de LinkedIn/Meta tras el deploy.

Con eso, al mandar la URL pública del portafolio por chat, sale la tarjeta con título, descripción e imagen — como debe ser.

---

## Extra: carta digital multi-marca (SPA + Azure Function)

En el portafolio basta con **una imagen fija** en `siteConfig.ogImageUrl` porque el sitio es el mismo para todos. En la **app de carta digital** (SPA React/Vite, `carta.ejemplo-saas.com`) cada restaurante tiene su propio nombre, descripción y logo: al compartir `https://carta.ejemplo-saas.com/api/p/demo-restaurant` la tarjeta debe mostrar el nombre de esa marca, no un genérico “Carta Digital”.

Ahí el problema es otro: es una **SPA en React/Vite**. El HTML inicial trae meta tags genéricos en `index.html`; WhatsApp, Meta y LinkedIn **no ejecutan JavaScript** — leen solo el primer HTML. Actualizar `og:image` con un hook de React (`useDynamicMetaTags`) sirve para el título de la pestaña y el favicon en el navegador, **pero no para el preview al pegar el enlace**.

### Enfoque: misma URL, respuesta distinta según quién pide

La URL canónica para compartir es:

```
https://menu.agiliza360.ai/api/p/{subdomain}
```

En Azure Static Web Apps esa ruta la atiende una **Azure Function** (`api/p/index.js`):

1. **Crawler** (User-Agent tipo `facebookexternalhit`, `WhatsApp`, `Twitterbot`, `LinkedInBot`, etc.): la función llama al backend (`/public/business/all/{subdomain}`), obtiene nombre, descripción y logo de la marca, y devuelve un HTML mínimo con Open Graph y Twitter Card ya rellenados.
2. **Usuario en navegador**: en la misma URL recibe el `index.html` de la SPA (sin redirigir a otra ruta que rompa el enlace compartido).

Detección simplificada del bot:

```js
const CRAWLER_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|Pinterest|Embedly|ia_archiver/i;
```

HTML que se genera para el bot (logo con fallback en Cloudinary si la marca no tiene):

```html
<meta property="og:title" content="Nombre del local">
<meta property="og:description" content="Descripción del local">
<meta property="og:url" content="https://carta.ejemplo-saas.com/api/p/demo-restaurant">
<meta property="og:image" content="https://.../logo-del-restaurante.jpg">
<meta property="og:image:secure_url" content="https://.../logo-del-restaurante.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://.../logo-del-restaurante.jpg">
```

Los datos de marca se cachean **5 minutos** en memoria para no martillar la API en cada scrape.

### Capas client-side (complemento, no sustituto)

Para quien sí ejecuta JS:

- **`index.html`**: script inline que, si hay datos en `localStorage` (`businessData_{subdomain}`), actualiza meta tags antes de montar React (útil en recargas, no en el primer scrape de WhatsApp).
- **`use-dynamic-meta-tags.tsx`**: hook que sincroniza título, `og:*`, `description` y favicon cuando llega la respuesta de la API — mismo patrón que el script inline, pero desde React.

Rutas legacy `/{subdomain}` se normalizan a `/api/p/{subdomain}` (`getCartaUrl` en `src/utils/domain.ts`) para que el botón “compartir” siempre apunte a la URL que la Function entiende.

### Qué aprendí comparando con el portafolio

| | Portafolio (Astro) | Carta digital (React SPA) |
|---|---|---|
| Meta tags | SSR/SSG en `Layout.astro` | Function server-side para bots |
| Imagen OG | Una URL fija en config | Logo por marca desde API |
| URL al compartir | Cualquier página del sitio | Siempre `/api/p/{subdomain}` |
| Client-side | No hace falta | Hook + inline para pestaña/favicon |

Errores que evité en carta:

- **Rewrite `/p/:slug` en SWA** — Azure no soporta bien parámetros en rewrites; devolvía 404. La Function en `/api/p/` es la ruta nativa.
- **Redirigir al crawler** — si el bot sigue redirects, pierde contexto; por eso los humanos reciben la SPA en la misma URL y solo se hace 302 en fallback legacy.
- **Confiar solo en React para OG** — el Sharing Debugger de Meta seguirá viendo “Carta Digital” genérico hasta que exista HTML server-side para bots.

### Comprobar la carta

Mismo flujo que arriba, pero con la URL del local:

1. [Sharing Debugger](https://developers.facebook.com/tools/debug/) → `https://menu.agiliza360.ai/api/p/{subdomain}`
2. [Post Inspector](https://www.linkedin.com/post-inspector/) con la misma URL
3. En navegador normal: abrir esa URL debe cargar la carta (SPA), no una página en blanco

Si cambias el logo en el panel, espera el TTL del caché de la Function (~5 min) o prueba con un subdomain distinto antes de culpar a WhatsApp.
