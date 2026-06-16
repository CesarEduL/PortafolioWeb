---
title: "Nota para mí: copiar texto de orden al portapapeles en Operaciones"
description: "Por qué fallaba el botón Copiar en el Kanban (Clipboard API + await), qué permisos del navegador no aplican, y el patrón ClipboardItem con fallbacks y toasts en español."
pubDate: 2026-06-09
tags: ["agiliza360", "panel", "operaciones", "clipboard", "ux"]
locale: es
draft: false
---

En **Operaciones** (vista embudo / Kanban), cada tarjeta de pedido tiene un botón para **copiar el texto de notificación** — el mismo resumen que reciben los admins por WhatsApp. El flujo es: clic → petición al **orquestador de pedidos** (endpoint de texto de notificación) → pegar en el portapapeles.

En junio 2026 apareció un error en inglés al usarlo:

> *The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.*

**No era** un problema de roles (superadmin, owner, supervisor, worker) ni de los permisos del sitio (ubicación, notificaciones, pop-ups, sonido). El API respondía bien; fallaba el **último paso** en el navegador.

## Flujo que tenía el panel (roto)

```
Clic en Copiar
    ↓
await fetch texto de la orden   ← tarda (red, túnel, API)
    ↓
navigator.clipboard.writeText(texto)   ← el navegador lo rechaza
```

Los navegadores modernos solo permiten escribir en el portapapeles mientras sigue activo el **gesto del usuario** (el clic). Tras un `await`, ese gesto ya expiró → `NotAllowedError` con el mensaje en inglés.

El código antiguo solo usaba el fallback (`textarea` + `execCommand('copy')`) si **no existía** `navigator.clipboard.writeText`. En Chrome/Edge/Firefox sí existe, así que entraba en `writeText`, fallaba, y el `catch` mostraba el error crudo del motor.

## Qué permisos del navegador **no** intervienen

| Permiso en el candado del sitio | ¿Afecta copiar? |
|---|---|
| Ubicación | No |
| Notificaciones | No |
| Ventanas emergentes | No |
| Sonido | No |

El portapapeles no suele aparecer en ese menú. Lo que importa es:

1. **Contexto seguro** — HTTPS o `localhost` (HTTP plano puede bloquear Clipboard API).
2. **Gesto del usuario** — copiar en el mismo turno del clic, o registrar la operación con `ClipboardItem` antes del `await`.
3. **Foco** — la pestaña activa al copiar (menos frecuente).

## Fix — helper reutilizable en el panel admin

Se extrajo la lógica a un **util compartido de portapapeles** del panel: una función para copiar texto que llega de forma asíncrona y otra para traducir errores del navegador a mensajes en español.

### 1. Patrón `ClipboardItem` (preferido)

Al hacer clic, **antes** de esperar la red, se registra la copia con una promesa del texto:

```typescript
const item = new ClipboardItem({
  'text/plain': getText().then(
    (text) => new Blob([text], { type: 'text/plain' }),
  ),
});
await navigator.clipboard.write([item]);
```

El navegador asocia la operación al gesto; cuando la promesa resuelve, escribe el texto aunque el fetch haya tardado.

### 2. Fallback en cadena

Si `ClipboardItem` no está disponible o falla:

1. Obtener el texto con `await` y luego `clipboard.writeText`.
2. Si `writeText` falla → `textarea` oculto + `document.execCommand('copy')`.

### 3. Toasts en español

| Situación | Mensaje |
|---|---|
| Éxito | Texto copiado al portapapeles |
| Sin número de orden | No se pudo obtener el número de orden |
| API sin texto | No se pudo obtener el texto de la orden |
| Error típico del navegador (inglés) | No se pudo copiar al portapapeles. Intenta de nuevo. |
| Otro error | Error al copiar el texto |

Los mensajes en inglés del motor (`not allowed by the user agent`, `denied permission`, etc.) se mapean al toast en español; no se muestra el string crudo al usuario.

## Permisos de producto (roles)

El botón **no** consulta permisos granulares por acción en el módulo Operaciones. Quien puede entrar a la ruta de Operaciones con el módulo habilitado ve el botón y puede copiar. No hay acción `copy` en el catálogo de permisos (la más cercana es `print`, pero tampoco se usa para ocultar este botón).

Detalle de roles y bypass: [roles panel ↔ API](/blog/roles-panel-y-backend/).

## Dónde vive cada pieza

| Qué | Capa | Rol |
|---|---|---|
| Botón Copiar en tarjeta Kanban/embudo | Panel admin | UI Operaciones |
| Texto de notificación | API principal | Orquestador de pedidos |
| Copia async + mensajes de error | Panel admin | Util compartido de portapapeles |
| Acceso a la ruta Operaciones | Panel admin | Guard de rutas + módulo `operaciones` |

## Checklist si vuelve a fallar

- [ ] ¿Página en HTTPS o `localhost`?
- [ ] ¿Pestaña con foco al hacer clic?
- [ ] ¿El toast es el nuevo mensaje en español o sigue saliendo inglés? (inglés = build viejo sin el fix)
- [ ] Probar incógnito sin extensiones que bloqueen clipboard
- [ ] No buscar toggle de «portapapeles» en permisos del sitio — no aplica

## Posts relacionados

- [Roles del panel y API](/blog/roles-panel-y-backend/)
- [Print Bridge — impresión local](/blog/print-bridge-impresion-local/)
- [Buscador de marca en el header (SuperAdmin)](/blog/buscador-marca-header-superadmin/)
