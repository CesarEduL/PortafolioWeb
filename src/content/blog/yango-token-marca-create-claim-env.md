---
title: "Nota para mí: Yango usaba token global en create-claim"
description: "El token de integración se guardaba bien y cotizaba OK, pero activar claims seguía con la API key de plataforma. Causa, diagnóstico y fix en la capa intermedia."
pubDate: 2026-06-15
tags: ["agiliza360", "api", "nestjs", "yango", "delivery", "panel"]
locale: es
draft: false
---

En el panel, **Integraciones → Delivery partners**, la marca guarda su token de Yango en credenciales de integración (`brand_integration_credentials`, campo `credentials.apiToken`). La UI muestra “Al menos una integración configurada” y el GET de settings devuelve el token. Aun así, al **cotizar** desde Claims Yango a veces fallaba con 403, y al **activar** un pre-claim el claim se creaba bajo la **cuenta de plataforma** (token global de runtime), no bajo la cuenta Yango del restaurante.

No era un problema de migración del registro padre `Integration` (PRP de registro declarativo por tipo `erp` / `delivery` / `payment`). Ese modelo no almacena API keys; solo dice qué integraciones están activas. Las keys siguen en credenciales por marca.

Contexto general de capas: [integracion-yango-tres-capas](/blog/integracion-yango-tres-capas/).

---

## Síntoma

| Qué veía el operador | Qué pasaba en realidad |
|---|---|
| Token visible en Integraciones | Guardado correctamente en Mongo |
| Cotizar con marca seleccionada → 403 | Yango rechazaba **ese** token (expirado, revocado o mal copiado) |
| Cotizar sin token de marca / con token global → OK | Fallback a `{API_KEY}` de plataforma en runtime |
| Activar claim desde panel → claim creado | Pero bajo `corpClientId` de Agiliza, no del restaurante |

Dos bugs distintos mezclados en la misma pantalla:

1. **Token de marca inválido ante Yango** (403) — dato/credencial del cliente, no del código de lectura.
2. **Rutas create/accept/cancel sin resolver token de marca** — bug de código aunque el token fuera válido.

---

## Diagnóstico (evidencia runtime)

Pruebas contra el API en producción con JWT de superadmin (sin pegar tokens reales en esta nota):

```http
POST {URL_PUBLICA_API}/yango/deliveries/check-price
Authorization: Bearer {JWT_PANEL}
Content-Type: application/json

{
  "brandId": "{ID_MARCA_DEMO}",
  "clientRequirements": { "taxiClass": "courier", "cargoOptions": ["thermobag"] },
  "routePoints": [
    { "coordinates": [-77.027, -12.094] },
    { "coordinates": [-77.030, -12.098] }
  ]
}
```

- **Con `brandId`:** respuesta 403 de Yango → el token guardado para esa marca no era aceptado por la API B2B.
- **Sin `brandId`:** precio OK (~S/ 5.67 en ruta Lima demo) → el token global de plataforma sí funciona en la misma ruta.

Luego, `POST …/yango/deliveries/create-claim` con payload de orden demo **creaba** el claim aunque la marca tuviera token propio, porque esa ruta **nunca** pasaba el token de integraciones al cliente HTTP.

Conclusión: el sistema **sí leía** el token para `check-price` cuando venía `brandId`, pero **no** para create / accept / cancel.

---

## Qué rutas usaban qué token (antes del fix)

| Flujo | Resolvía token de marca |
|---|---|
| `POST /yango/deliveries/check-price` + `brandId` | Sí — obligatorio si hay marca |
| Cron pre-claims (`YangoTaskService`) | Sí — vía `preClaim.brandId` |
| Cotización delivery en orquestador de precios | Sí |
| `POST /yango/deliveries/create-claim` | **No** → `{API_KEY}` env |
| `POST /yango/deliveries/:claimId/accept` | **No** |
| `POST /yango/deliveries/:claimId/cancel` | **No** |
| `GET …/cancel-info` | **No** |

La capa API (`YangoApiService`) siempre hace `effectiveKey = apiToken ?? config.get('YANGO_API_KEY')`. Si la capa intermedia no pasa `apiToken`, gana el global.

`YANGO_API_URL` sigue siendo única para todo el runtime (URL B2B de Yango). Lo que debe ser **por marca** es el **Bearer token**, no la URL.

---

## Causa raíz (código)

1. **Asimetría intencional olvidada:** `check-price` recibió `brandId` y resolución de credenciales; `create-claim` quedó llamando `createClaimAndDelivery(claimData)` sin segundo argumento.
2. **Accept/cancel/info** cargaban el delivery de Mongo (que ya tenía `brandId` en pre-claims del orquestador) pero no usaban ese campo para el Bearer.
3. **Panel:** `buildActivateClaimPayload` no enviaba `brandId` en el body (secundario; el backend puede inferirlo por `orderNumber`).

El registro padre `Integration` no interviene en el Bearer. Tampoco hace falta migrar credenciales a otra colección.

---

## Fix aplicado

En el **servicio delivery Yango** (capa intermedia):

### 1. Resolver `brandId` al crear claim

Orden de resolución:

1. `claimData.brandId` si el panel lo manda.
2. Si no, `orderNumber` → orden en Mongo → `brandSubdomain` → `_id` de la marca.

### 2. Obligar token de integraciones cuando hay marca

Si hay `brandId`, se llama a credenciales de integración (`getYangoApiToken`). Si no hay token → `400` con mensaje claro (mismo criterio que `check-price`).

Si **no** se puede resolver marca (flujos legacy / superadmin global), se mantiene fallback a `{API_KEY}` de plataforma.

### 3. Persistir `brandId` en el documento `YangoDelivery`

Al crear o actualizar desde claim, guardar `brandId` para accept/cancel posteriores.

### 4. Accept, cancel, cancel-info

Tras cargar el delivery por `claimId`, resolver token con `delivery.brandId` antes de cada llamada HTTP a Yango.

### 5. Panel

`CreateClaimRequest` y `buildActivateClaimPayload` incluyen `brandId` opcional cuando el delivery local ya lo tiene.

---

## Diagrama del fix

```
Panel → POST /yango/deliveries/create-claim
              │
              ▼
    ¿brandId en body o inferido por orderNumber?
              │
              ├─ Sí → getYangoApiToken(brandId) ──► Bearer marca
              │         (400 si falta token)
              │
              └─ No → Bearer {API_KEY} plataforma (legacy)

YangoApiService.createClaim(..., apiToken)
              │
              ▼
         Yango B2B API
```

---

## Checklist post-fix

- [ ] Token de marca **válido** en Yango B2B (regenerar si 403 en check-price).
- [ ] Guardar en Integraciones del panel (PATCH settings → credenciales).
- [ ] Cotizar en Claims con marca activa → precio OK.
- [ ] Activar pre-claim → claim con `corpClientId` del restaurante, no de plataforma.
- [ ] Cancelar claim de prueba si fue solo verificación.

Si check-price con `brandId` sigue en 403, el fix de código no ayuda: hay que renovar el token en el panel B2B de Yango y pegarlo de nuevo (case-sensitive).

---

## Archivos clave (por rol)

| Qué | Dónde (rol funcional) |
|---|---|
| Cliente HTTP + fallback env | capa API Yango |
| Resolución token + create/accept/cancel | servicio delivery Yango |
| Credenciales por marca | servicio credenciales de integración |
| Guardado token desde panel | PATCH settings marca → upsert credenciales |
| Cotizar con marca | controlador deliveries + `check-price` |
| Activar claim | panel Claims → `create-claim` |
| Pre-claim automático | cron tareas Yango (ya usaba `brandId`) |

---

## Lección

Cuando una integración tiene **token global de plataforma** y **token por marca**, hay que auditar **todas** las rutas que llaman a la API externa, no solo la primera que se implementó (`check-price`). Un fallback silencioso a env hace que “funcione” en demo pero facture al cliente equivocado en producción.
