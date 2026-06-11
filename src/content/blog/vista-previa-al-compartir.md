---
title: "Nota para mí: la imagen al compartir en redes"
description: "Cómo configuré la vista previa (Open Graph) cuando pegas el enlace del portafolio en WhatsApp, LinkedIn o X."
pubDate: 2026-06-10
tags: ["astro", "seo", "open-graph", "cloudinary"]
locale: es
draft: false
---

Cuando compartes un enlace en WhatsApp, LinkedIn o X, no sale una miniatura mágica: el bot de la red lee el HTML de tu página y busca etiquetas **Open Graph** y **Twitter Card**. Si no están, o la imagen es mala, la vista previa queda vacía o fea.

En este portafolio lo resolví con una URL fija en la config y unas meta etiquetas en el layout.

## 1. Subir la imagen (y que sea pública)

La imagen tiene que ser una **URL absoluta** con `https://`. No sirve una ruta relativa tipo `/og.png` para muchos crawlers si no resuelven bien el dominio.

Yo la tengo en **Cloudinary** con optimización automática:

```
https://res.cloudinary.com/drcphk36t/image/upload/q_auto/f_auto/v1780218404/imagen_2026-05-31_040642543_pxovz9.png
```

- `q_auto` y `f_auto`: calidad y formato según el navegador o bot.
- Tamaño recomendado para tarjeta grande: **1200 × 630 px** (ratio 1.91:1). Si es cuadrada también funciona, pero LinkedIn y X se ven mejor con horizontal.

## 2. Apuntar la URL en la config del sitio

En `src/config/site.ts` está `ogImageUrl`:

```ts
ogImageUrl:
  "https://res.cloudinary.com/drcphk36t/image/upload/q_auto/f_auto/v1780218404/imagen_2026-05-31_040642543_pxovz9.png",
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

Con eso, al mandar `https://cesareduL.github.io/...` por chat, sale la tarjeta con título, descripción e imagen — como debe ser.
