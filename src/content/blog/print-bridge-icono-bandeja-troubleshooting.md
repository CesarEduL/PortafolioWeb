---
title: "Nota para mí: Print Bridge — ícono de bandeja en blanco/negro"
description: "Postmortem de un bug en Electron: la bandeja mostraba un cuadrado vacío aunque los PNG estuvieran bien. Dos errores en la resolución de rutas de assets y un fallback silencioso que ocultó el problema."
pubDate: 2026-07-10
tags: ["agiliza360", "electron", "print-bridge", "impresion-local", "troubleshooting", "operaciones"]
locale: es
draft: false
---

Postmortem de un bug donde, tras reemplazar los PNG placeholder de los íconos de bandeja por el diseño real, **Print Bridge** seguía mostrando un cuadrado sólido en blanco/negro (el placeholder de «sin ícono» de Windows) en vez del glifo diseñado.

## Síntoma

- `npm run electron:dev` compilaba y copiaba los assets sin error (`[copy-electron-assets] 6 file(s) → dist/electron/assets/`).
- El tooltip del ícono (`Maxy Print Bridge — Activo`) se veía correcto al pasar el mouse.
- El ícono en sí se veía como un cuadrado sólido en blanco/negro, sin el glifo diseñado.
- El problema persistía después de: redimensionar los PNG a 16×16, quitar un `.resize()` agregado como parche, y reiniciar `explorer.exe` para descartar caché de íconos de Windows.

## Causa raíz (dos bugs en la resolución de `assetsDir()`)

El módulo del **ícono de bandeja** (shell Electron) expone una función `assetsDir()` que usa `getIconForState()` para construir la ruta a cada PNG según el estado (listo, imprimiendo, error, aviso).

### Bug 1 — detección de modo dev con `NODE_ENV`

```ts
// ANTES (incorrecto)
function assetsDir(): string {
  if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
    return path.join(__dirname, '..', 'assets');
  }
  return path.join(process.resourcesPath, 'assets');
}
```

El script `electron:dev` (`package.json`) es `"npm run build:electron && electron ."` — **nunca setea `NODE_ENV`**. Y `process.resourcesPath` **siempre está definido** en Electron, empaquetado o no (apunta a los recursos internos del propio binario de Electron). Entonces la condición completa daba `false`, y en dev caía al `else`: buscaba los assets dentro de `node_modules/electron/dist/resources/assets`, una carpeta que no existe en el proyecto.

**Fix:** usar la señal correcta que expone Electron para esto, `app.isPackaged`, en vez de inferirlo por variables de entorno que nadie setea:

```ts
if (!app.isPackaged) {
  return path.join(__dirname, 'assets');
}
return path.join(process.resourcesPath, 'assets');
```

### Bug 2 — nivel equivocado en la ruta relativa (`..` de más)

Con el Bug 1 corregido, la rama de dev seguía usando `path.join(__dirname, '..', 'assets')`. Pero el build de Electron compila el módulo de bandeja → `dist/electron/tray-state.js`, y el script de copia de assets del build deja los PNG en `dist/electron/assets/` (**hermano** de `tray-state.js`, no un nivel arriba).

`__dirname` en tiempo de ejecución es `dist/electron`. Subir un nivel con `'..'` apunta a `dist/assets`, que **no existe**:

```bash
$ ls dist/assets
ls: cannot access 'dist/assets': No such file or directory
$ ls dist/electron/assets
icon.ico icon-512.png icon-tray-error.png icon-tray-printing.png icon-tray-ready.png icon-tray-warn.png
```

**Fix:** quitar el `'..'` — los assets son hermanos del `.js` compilado, no un nivel arriba:

```ts
if (!app.isPackaged) {
  // tray-state.js compila a dist/electron/; assets van a
  // dist/electron/assets (hermano), no un nivel arriba.
  return path.join(__dirname, 'assets');
}
```

### Por qué el resultado era «cuadrado en blanco/negro» y no un crash

`getIconForState()` tiene un fallback defensivo:

```ts
const img = nativeImage.createFromPath(iconPath);
if (img.isEmpty()) return nativeImage.createEmpty();
```

Como la ruta apuntaba a un archivo inexistente, `nativeImage.createFromPath` devolvía una imagen vacía, y el fallback silencioso entregaba `nativeImage.createEmpty()` a `tray.setImage()`. Windows renderiza un ícono vacío como ese placeholder sólido — de ahí que ningún cambio en el diseño del PNG (tamaño, color, resize) tuviera efecto: **el archivo nunca se estaba leyendo**, así que no importaba cómo fuera el contenido.

Esta clase de fallback silencioso es útil para no crashear en desarrollo, pero también es lo que ocultó el bug real durante varias iteraciones — el síntoma (ícono vacío) era idéntico tanto si el PNG estaba mal diseñado como si la ruta estaba mal resuelta.

---

## Cómo verificar / reproducir

1. Confirmar el árbol de build real, no asumirlo:

   ```bash
   npm run build:electron
   find dist -maxdepth 3 -type d
   ```

   Debe existir `dist/electron/assets/`, no `dist/assets/`.

2. Si el ícono de bandeja no aparece, primero descartar que sea el archivo (tamaño, canal alfa) inspeccionando el PNG directamente:

   ```bash
   node -e "
   const fs=require('fs');
   const buf=fs.readFileSync('assets/icon-tray-ready.png');
   console.log(buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20));
   "
   ```

   Debe dar `16x16`. Los tray icons de Windows deben exportarse en ese tamaño.

3. Si el archivo está bien pero el ícono sigue sin verse, sospechar de la resolución de ruta en runtime antes que del diseño. Es fácil descartar el diseño primero y perder tiempo iterando sobre el PNG cuando el bug está en cómo se arma `iconPath`.

4. Para depurar `assetsDir()` en caliente, un `console.log` temporal alcanza:

   ```ts
   function assetsDir(): string {
     const dir = !app.isPackaged
       ? path.join(__dirname, 'assets')
       : path.join(process.resourcesPath, 'assets');
     console.log('[tray] assetsDir:', dir); // borrar antes de commitear
     return dir;
   }
   ```

---

## Lecciones para evitar que se repita

- **No inferir modo dev/prod con `NODE_ENV`** en apps Electron si el script que las lanza no lo setea explícitamente — usar siempre `app.isPackaged`, que Electron garantiza.
- **No asumir la estructura de `dist/`** al escribir rutas relativas con `__dirname` — verificarla con `find`/`ls` después de un build real, especialmente cuando un script aparte del build decide dónde caen los assets.
- Un fallback silencioso (`isEmpty() → createEmpty()`) que evita crashes en dev también puede esconder bugs de path. Si un ícono o recurso no aparece y no hay ningún error en consola, sospechar primero de la ruta antes que del contenido del archivo.

---

| Qué | Dónde (capa) |
|---|---|
| Resolver ruta de PNG por estado | Shell Electron — módulo de bandeja |
| Copiar assets al build | Script de build Electron |
| Fallback si imagen vacía | `getIconForState()` → `nativeImage` |
| PNG de bandeja (16×16) | Carpeta `assets/` del proyecto local |

Post relacionado: [Print Bridge — impresión local](/blog/print-bridge-impresion-local/).
