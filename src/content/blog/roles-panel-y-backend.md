---
title: "Nota para mí: roles del panel y cómo se conectan con el API"
description: "SUPERADMIN, owner, manager/worker, motorized: JWT, UserAccess, permisos granulares y cómo el panel admin (React) y el API NestJS comparten la misma lógica."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "panel", "auth", "roles", "permisos"]
locale: es
draft: false
---

El **panel admin** (React) y el **API principal** (NestJS) no tienen dos sistemas de roles distintos: el panel **consume** lo que devuelve el login de NestJS y refuerza rutas en React. Si me pierdo, vuelvo a este mapa.

## Conexión en una frase

```
Login POST /auth/signin  →  JWT (rol + branchIds)  +  userAccess (brandId, permissions)
        ↓
Panel guarda token + permisos en localStorage
        ↓
Cada API: Authorization: Bearer …  →  JwtStrategy  →  RolesGuard  →  controller
Cada ruta /app/*: guard de rutas por rol + hook de permisos (solo manager/worker/supervisor)
```

---

## Roles en el API (`RoleType`)

Definidos en el enum de roles del módulo de auth:

| Rol Mongo / JWT | Quién es |
|---|---|
| `SUPERADMIN` | Operaciones globales Agiliza (marcas, billing, config plataforma) |
| `OWNER` | Dueño de marca(s); config completa de su negocio |
| `MANAGER` | Supervisor de local(es); operaciones + permisos configurables |
| `WORKER` | Operador con permisos más acotados; puede tener `supervisorId` |
| `MOTORIZED` | Partner / motorizado de delivery (vista acotada en operaciones) |

No existe `SUPERVISOR` como rol en Mongo: en el panel **supervisor** es alias de UI para quien en el API es `MANAGER` (o el mismo usuario mostrado con otro label en Datos de marca).

---

## Roles en el panel (frontend)

En el contexto de auth del panel los roles se guardan en **minúsculas** (`superadmin`, `owner`, `manager`, `worker`, `motorized`, `supervisor`).

- El JWT trae `SUPERADMIN` → panel usa `superadmin`
- El guard de rutas trata `supervisor` ↔ `manager` como equivalentes

### Bypass de permisos granulares (panel)

En `usePermissions`, estos roles **no** pasan por módulos/acciones:

`superadmin`, `owner`, `motorized`, `admin`

Solo **manager / supervisor / worker** usan el objeto `permissions` del login para ocultar menú y bloquear rutas.

---

## Capa 1 — Autenticación (JWT)

**API:** servicio de login

1. Valida email/password
2. Lee `UserAccess` (colección de accesos por usuario)
3. Firma JWT con: `sub`, `email`, `role`, `supervisorWorkerId`, `branchIds`, `supervisorId`
4. Devuelve `accessToken` + `user` + opcionalmente `userAccess`

**Para MANAGER y WORKER**, el response incluye:

```ts
userAccess: {
  brandId,
  brandSubdomain,
  branchIds,        // locales permitidos; [] = todos
  supervisorId,     // solo WORKER
  permissions,      // merge efectivo (ver abajo)
  defaultRoute,     // ej. /app/operaciones
}
```

**OWNER** con una sola marca: también recibe `brandId` + `brandSubdomain`.

**Panel:** login guarda token JWT, rol, permisos y marca seleccionada en almacenamiento local.

---

## Capa 2 — Autorización por rol (`RolesGuard`)

Cada endpoint protegido usa `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(...)`.

Lógica en el guard de roles:

1. Sin metadata `@Roles` → pasa
2. `SUPERADMIN` → **siempre** pasa
3. Comprueba que `user.role` esté en la lista del decorador
4. Si la ruta tiene `brandId` / `branchId` en params → valida `UserAccess` contra ese negocio
5. Si `user.branchIds` no está vacío → el `branchId` debe estar en la lista

`@RolesWithoutBrandCheck` — para endpoints superadmin o sin scope de marca (ej. bloqueo global del bot).

---

## Capa 3 — Permisos granulares (módulos y acciones)

Fuente de verdad: catálogo central de permisos (módulos, acciones, rutas)

### Módulos

`operaciones`, `reportes`, `clientes`, `menu`, `locales`, `galeria`, `chats`, `whatsapp_mensajes_rapidos`, `carta_digital`, `agilink`

Cada uno tiene:

- **actions** — ej. operaciones: `change_status`, `cancel_order`, `toggle_integrations`, …
- **routes** — paths del panel que cubre (espejo en el hook de permisos del panel)

### Merge de permisos efectivos

`resolveEffectivePermissions` en el API:

1. Plantilla del catálogo según `RoleType` (`MANAGER_DEFAULT_PERMISSIONS`, `WORKER_DEFAULT_PERMISSIONS`)
2. Override en `Role.permissions` (Mongo, opcional)
3. Override en `UserAccess.permissions` (por usuario, editable en Datos de marca → `PermissionsEditor`)

El login calcula el merge y lo manda al panel; el API **aún confía sobre todo en `@Roles`** en la mayoría de endpoints — los permisos finos son críticos en **UI** y en endpoints que los validen explícitamente.

### Catálogo para el editor del panel

Endpoint del catálogo de permisos — devuelve módulos, acciones, rutas y defaults MANAGER/WORKER.

El panel (editor de permisos) usa ese catálogo al crear/editar supervisores y workers.

---

## Contexto de marca en el panel (`RoleContext`)

Además del rol, muchas pantallas necesitan **qué marca** estás viendo:

| Rol | Cómo resuelve `brandId` |
|---|---|
| `superadmin` (real) | Sin marca global; dashboard plataforma |
| `superadmin` simulando owner | `switchToOwnerMode` → marca elegida + `?brandId=` en URL |
| `owner` | URL → contexto → localStorage sellado por `user_id` |
| `manager` / `worker` / `supervisor` | Igual; además `branchId` en URL/LS para workers |

`getCurrentRole()` devuelve rol temporal (`owner`) si superadmin está simulando — **solo afecta UI**; el JWT sigue siendo `SUPERADMIN` y el backend no “se convierte” en owner.

---

## Qué ve cada rol (rutas principales)

Resumen de rutas del panel + sidebar (no exhaustivo):

| Rol | Acceso típico |
|---|---|
| **superadmin** | Dashboard global, marcas, billing, usuarios admin, catálogo plataforma, config |
| **owner** | Todo de su marca: menú, locales, Yango, integraciones, marketing, carta, workers |
| **manager / supervisor** | Operaciones, reportes, clientes, menú (según permisos), chats |
| **worker** | Subconjunto de manager; a menudo solo view en menú/locales |
| **motorized** | Operaciones (sus pedidos), perfil partner; sin config de marca |

Rutas sensibles solo owner/superadmin: `integraciones`, `gestion-delivery`, `yango/claims`, `zonas-entrega`, etc.

---

## Modelo de datos que une todo (`UserAccess`)

Colección en Mongo (entidad de accesos):

| Campo | Uso |
|---|---|
| `userId` | Usuario login |
| `roleId` / `role` | Rol asignado |
| `brandId` | Marca (manager/worker/owner scope) |
| `branchId` | Acceso a sucursal concreta (opcional) |
| `branchIds[]` | Lista de locales; vacío = todos los de la marca |
| `supervisorId` | Worker → manager responsable |
| `supervisorWorkerId` | Enlace entidad supervisor/worker en Datos marca |
| `permissions` | Override JSON `{ defaultRoute, modules: { … } }` |

Jerarquía operativa:

```
OWNER (marca)
  └── MANAGER / supervisor (locales vía branchIds)
        └── WORKER (hereda branches del supervisor; permisos más restrictivos)
```

---

## Flujo completo: crear un worker con permisos custom

1. Owner abre Datos de marca → supervisores/workers
2. Panel llama APIs de `access` / `users` (crear usuario, asignar rol WORKER, `branchIds`, `permissions`)
3. Worker hace login → API merge permisos → panel guarda permisos locales
4. Sidebar filtra con `canAccessRoute`; botones usan `canPerformAction('operaciones', 'cancel_order')`
5. Si intenta API prohibida por `@Roles`, el API responde 401 aunque la UI falle

---

## Diferencias panel vs API (trampas)

- **Supervisor** es label del panel; en JWT es `MANAGER`
- **Simular owner** no cambia el JWT — no usar solo UI para probar seguridad del API
- **Permisos granulares** pueden bloquear una ruta en React pero un endpoint abierto a `MANAGER` seguiría respondiendo; diseño actual: guard fuerte en `@Roles`, fino en UX
- **branchIds** en JWT: operaciones del panel filtran pedidos por local; guard valida params `branchId` en rutas con scope

---

## Piezas clave

| Capa | API principal | Panel admin |
|---|---|---|
| Login + permisos | servicio auth | contexto auth |
| JWT validate | estrategia JWT | verificación token |
| Guard rol + marca | guard `@Roles` | rutas por rol |
| Permisos módulo/acción | catálogo + merge | hook permisos + editor |
| Contexto marca | — | contexto de rol |
| Rutas | controladores | router + sidebar |
| Accesos CRUD | módulo access | Datos marca / usuarios |

Con esto, cuando alguien pregunte “¿por qué este worker no ve Galería?” reviso: permiso del módulo galería, `branchIds`, y que la ruta `/app/galeria` permita su rol.
