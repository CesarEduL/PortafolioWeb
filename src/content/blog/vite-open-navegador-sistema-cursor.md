---
title: "Nota para mí: npm run dev abre el navegador del sistema, no el de Cursor"
description: "Por qué un Vite abre Chrome/Edge y otro el Simple Browser de Cursor: server.open. Cómo alineé panel admin, carta digital y este portafolio (Astro)."
pubDate: 2026-09-07
tags: ["agiliza360", "panel", "vite", "astro", "cursor", "dx"]
locale: es
draft: false
---

Al arrancar `npm run dev` desde la terminal de **Cursor**, a veces se abre Chrome o Edge y a veces el **Simple Browser** embebido en el editor. No es magia del IDE eligiendo proyectos: es si el bundler lanza el navegador del sistema o deja que Cursor intercepte la URL `localhost`.

## Qué pasa en cada caso

```
Bundler con server.open = true
    ↓
paquete `open` → start (Windows)
    ↓
navegador por defecto del SO (Chrome, Edge, …)

Bundler sin open (default false)
    ↓
imprime Local: http://localhost:PUERTO/
    ↓
Cursor detecta el puerto / el enlace de la terminal
    ↓
Simple Browser (preview interno)
```

El Simple Browser es útil para un vistazo rápido. Para trabajar de verdad (extensiones, cookies, DevTools, varias pestañas) quiero el navegador del sistema.

## La palanca: `server.open`

En **Vite**:

```ts
export default defineConfig({
  server: {
    port: 8080,
    open: true,
  },
});
```

En **Astro** (este portafolio) es el mismo campo, en la config del sitio:

```js
export default defineConfig({
  server: {
    open: true,
  },
});
```

`true` abre la raíz. También admite un path (`open: "/login"`) si quieres aterrizar en una ruta concreta.

Equivalente puntual, sin tocar config: `npm run dev -- --open`.

## Qué quedó alineado

La **app de cobranzas** ya tenía `open: true`. El resto no, y por eso Cursor se quedaba con el preview interno.

| App | Bundler | Después del cambio |
|---|---|---|
| App de cobranzas | Vite | Ya abría el SO |
| Panel admin | Vite | `open: true` |
| Carta digital | Vite | `open: true` |
| Este portafolio | Astro | `server.open: true` |

El script `dev` del portafolio sigue siendo el wrapper de certificados locales + `astro dev`; la opción vive en la config, no hace falta pasar `--open` a mano.

## Cursor vs Vite: quién gana

| Quién abre | Mecanismo | Resultado |
|---|---|---|
| Vite / Astro con `open: true` | `open` nativo del SO | Chrome / Edge / Firefox |
| Cursor (sin `open`) | panel Ports + enlace `localhost` en la terminal | Simple Browser |
| Clic en Ports → Preview | acción del IDE | Simple Browser |
| Clic en Ports → Open in Browser | acción del IDE | navegador del SO |

Si el bundler abre el SO **y** Cursor también detecta el puerto, puedes ver las dos cosas. Lo que importa es el `open: true`: no dependes de clicar el enlace de la terminal.

Extra: un `host: "::"` (escuchar IPv6 / todas las interfaces) hace más visible el puerto en el panel Ports de Cursor. No abre el navegador por sí solo; solo facilita el preview interno si Vite no lo hizo.

## Si no quieres que Cursor robe el preview

En el panel **Ports**, clic derecho en el puerto → **Open in Browser** (externo), no Preview.

O cambia el auto-forward del puerto a `notify` / `silent` en vez de `openPreview`.

## Checklist

- [ ] `server.open: true` en la config del bundler (Vite o Astro)
- [ ] Tras `npm run dev`, se abre una pestaña en Chrome/Edge, no solo el visor del editor
- [ ] Si no abre nada: el SO no tiene navegador por defecto, o hay un `BROWSER=none` en el entorno
- [ ] Si abre Simple Browser **y** Chrome: el bundler ya hizo lo correcto; el preview extra es Cursor

## Archivos clave (capa / rol)

| Capa | Responsabilidad |
|---|---|
| Config Vite — panel admin | `server.open` + puerto del panel |
| Config Vite — carta digital | `server.open` + host/puerto de la SPA |
| Config Astro — portafolio | `server.open` en el `dev` local |
| Config Vite — cobranzas | Referencia: ya tenía `open: true` |

## Relacionado

- Configuración local de este sitio: no confundir `dev` (Astro) con el preview del build.
- Vista previa al compartir (Open Graph) es otro tema: [vista previa al compartir](/blog/vista-previa-al-compartir/).
