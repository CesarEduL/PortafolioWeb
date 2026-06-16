---
title: "Nota para mí: buscador de marca en el header (SuperAdmin)"
description: "Cómo carga el listado de marcas, filtra en cliente, enlaza con modo temporal Owner, almacenamiento local sellado por usuario y sincronización con brandId en la URL."
pubDate: 2026-06-09
tags: ["agiliza360", "panel", "superadmin", "marcas", "auth", "ux"]
locale: es
draft: false
---

Solo el **SuperAdmin** ve en el header el combo **«Seleccionar marca»** con caja **«Buscar marca…»** y el botón **«Actuar como Owner»**. No es el mismo control que el **selector de local/sucursal** del header que usan owner, manager o worker.

Esta nota describe el flujo de punta a punta para no confundir «buscar en el dropdown» con «ya estoy operando como esa marca».

## Vista rápida en el header

```
[Badge SuperAdmin]  [Seleccionar marca ▼]  [Actuar como Owner]
                           │
                           ▼ (popover)
                    [ Buscar marca... ]
                    ─────────────────
                    Marca Demo Norte
                    Marca Demo Sur
                    …
                    🔄 Recargar marcas
```

| Elemento | Qué hace |
|---|---|
| Badge morado **SuperAdmin** | Indica rol real del JWT (no simulación) |
| Combo **Seleccionar marca** | Abre popover; la elección queda en **estado local del componente** |
| **Buscar marca…** | Filtra la lista **en el navegador** (sin llamar al API por cada tecla) |
| **Actuar como Owner** | Activa **modo temporal** con la marca elegida y redirige a Operaciones |
| **Recargar marcas** | Invalida caché de React Query y vuelve a pedir el listado al API |

---

## Quién lo ve y quién no

| Usuario | Selector de marca en header |
|---|---|
| SuperAdmin (vista global) | Sí — selector dedicado en el header |
| SuperAdmin en modo temporal (simula owner) | No el combo; muestra badge naranja + nombre de marca + **Volver a SuperAdmin** |
| Owner / manager / worker / supervisor | No — usan marca fija del login + selector de local si aplica |
| Motorizado | No — otro flujo de marcas en header |

El componente solo se renderiza si el rol efectivo del JWT es SuperAdmin.

---

## De dónde salen las marcas (API)

Hook del panel que carga el catálogo global de marcas activas:

```
Caché React Query (listado SuperAdmin)
    ↓
GET /brand/all?status=true   (solo marcas activas)
    ↓
JWT SuperAdmin → API principal devuelve todas las marcas de la plataforma
```

| Parámetro de caché | Valor | Motivo |
|---|---|---|
| Habilitado | SuperAdmin **sin** modo temporal + sesión válida | En simulación owner no hace falta recargar el catálogo global |
| Tiempo en fresco | ~15 min | El listado cambia poco; evita spam al abrir el popover |
| Refetch al foco | desactivado | No refrescar al cambiar de pestaña |

El endpoint exige JWT y rol **SUPERADMIN** u **OWNER** en el API; el selector del header solo lo usa el SuperAdmin.

---

## Cómo funciona la búsqueda

La búsqueda es **100 % cliente** sobre el array ya cargado en memoria.

Campos que coinciden (substring, `toLowerCase()`):

1. Nombre comercial de la marca
2. Subdominio técnico
3. Descripción
4. Categoría de negocio

Lógica (misma idea que en la pantalla de Locales):

1. Descartar ítems sin identificador válido
2. Si el cuadro de búsqueda está vacío → todas las marcas válidas
3. Si no hay coincidencias → mensaje *«No se encontraron marcas.»*

**Importante:** escribir en «Buscar marca…» **no** filtra el Dashboard ni Operaciones mientras sigas en vista SuperAdmin global. Solo reduce la lista del popover.

---

## Dos pasos: elegir marca ≠ actuar como Owner

Confusión frecuente: hacer clic en una fila del listado **no** cambia el contexto de la app todavía.

### Paso 1 — Selección en el popover

- Guarda el id de marca en **estado local** del selector (aún no en el contexto global)
- Cierra el popover y limpia el texto de búsqueda
- Habilita el botón verde **Actuar como Owner**

### Paso 2 — Activar modo temporal owner

**Contexto de roles del panel:**

```
Vaciar caché de queries ligadas a marca (operaciones, sucursales, onboarding, etc.)
Rol temporal efectivo = owner
Persistir id, nombre y subdominio de marca → contexto + almacenamiento local
Navegar a Operaciones con brandId en la URL
```

Persistencia típica en almacenamiento local del navegador:

| Concepto | Contenido |
|---|---|
| Rol temporal | Simulación `owner` |
| Marca activa | Identificador de la marca |
| Nombre visible | Para badges en header |
| Subdominio | Para APIs que filtran por restaurante |
| Sello de usuario | Vincula la marca al `user_id` de la sesión actual |

A partir de ahí el rol efectivo en UI es **owner** aunque el JWT siga siendo SuperAdmin. El sidebar pasa a menú owner; Operaciones filtra por subdominio de esa marca.

### Volver atrás — Salir de simulación

- Limpia rol temporal, marca y sellos en almacenamiento local
- Quita `brandId` de la URL
- Navega al dashboard global de SuperAdmin
- Vuelve la vista agregada (métricas de todas las marcas)

---

## Marca «de confianza» y sesiones cruzadas

Util del panel para no mezclar marcas entre cuentas en el mismo navegador:

- Solo restaura la marca guardada si el sello de usuario coincide con la sesión actual
- Evita que un SuperAdmin cierre sesión, entre otro usuario y herede la marca anterior
- Al guardar marca: actualiza el sello del usuario actual
- Al logout o salir de simulación: borra el sello

SuperAdmin en **vista global** además limpia marca residual en contexto/URL para no disparar APIs con un `brandId` obsoleto mientras navega el dashboard global.

---

## URL con `brandId` vs contexto

| Modo | Quién manda |
|---|---|
| SuperAdmin global | Sin marca en contexto; si la URL trae un id obsoleto, se limpia |
| SuperAdmin simulando owner | **Contexto gana** — si la URL tiene otro id, se reescribe sin añadir historial |
| Owner / manager / worker / supervisor | **URL gana** — enlaces compartidos y F5 alinean contexto + almacenamiento local |

Esto evita que el historial del navegador deje un `brandId` de otra marca al simular owner.

---

## Qué pantallas usan la marca activa

Tras **Actuar como Owner**:

- Operaciones: filtro por subdominio de la marca simulada
- Dashboard de ventas (vista owner): métricas de un solo restaurante, no agregado global
- Queries de sucursales, onboarding, settings de marca, etc. se invalidan al cambiar de marca

Mientras **no** actúes como Owner:

- Dashboard SuperAdmin: métricas globales de toda la plataforma
- El buscador del header es solo para **preparar** la simulación

---

## Recargar marcas

Pie del popover → **Recargar marcas**:

1. Invalidar caché global de marcas y sucursales
2. Volver a pedir el listado al API
3. Toast: *Recargando marcas…*

Útil si acabas de crear o desactivar una marca en otra pestaña.

---

## Errores típicos al depurar

| Síntoma | Causa probable |
|---|---|
| Lista vacía | Sesión expirada, API caído, o no eres SuperAdmin real |
| Busco pero no cambia el dashboard | Normal: falta clic en **Actuar como Owner** |
| **Actuar como Owner** deshabilitado | No elegiste fila en el popover |
| Tras F5 sigo como owner simulado | El rol temporal persiste en almacenamiento local — es intencional |
| Datos de otra marca en Operaciones | `brandId` en URL desincronizado; en modo temp el contexto debería corregirlo |
| Marca de otro usuario tras login | Sello de usuario distinto — el util limpia en login |

---

## Dónde vive cada pieza

| Qué | Capa | Rol |
|---|---|---|
| UI popover + búsqueda | Panel admin | Selector SuperAdmin en header |
| Listado de marcas activas | API principal | Endpoint de marcas (`/brand/all`) |
| Modo temporal owner | Panel admin | Contexto de roles + almacenamiento local |
| Sello usuario ↔ marca | Panel admin | Util de persistencia de marca |
| Guard de rutas con marca | Panel admin | Exige marca seleccionada en simulación |
| Métricas globales vs por marca | Panel admin | Dashboard según rol efectivo y modo temporal |

Mapa de roles JWT y bypass: [roles panel ↔ API](/blog/roles-panel-y-backend/).

---

## Posts relacionados

- [Roles del panel y API](/blog/roles-panel-y-backend/)
- [Copiar texto de orden al portapapeles](/blog/copiar-portapapeles-operaciones-panel/)
