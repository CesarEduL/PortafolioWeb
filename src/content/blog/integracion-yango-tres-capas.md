---
title: "Nota para mí: integración Yango en tres capas"
description: "Cómo el API habla con Yango Delivery: capa HTTP, capa intermedia, orquestación de negocio, estados Yango → Agiliza y campos mínimos para crear claims."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "nestjs", "yango", "delivery", "webhooks", "restpe"]
locale: es
draft: false
---

Cuando un pedido sale con partner **Yango**, Agiliza no solo “manda un courier”: hay que cotizar, crear un **claim**, guardarlo en Mongo, recibir webhooks, mapear estados y sincronizar la orden del panel/WhatsApp. En el **API principal** eso está partido en **tres capas** a propósito — si mezclo HTTP con reglas de pedido, vuelvo a enredarme.

## Las tres capas (de abajo arriba)

```
┌─────────────────────────────────────────────────────────────┐
│  NEGOCIO                                                     │
│  Orquestador de pedidos  ·  servicio webhook Yango         │
│  (pre-claim desde orden, build payload, sync OrderFood)      │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  INTERMEDIA                                                  │
│  Servicio delivery  +  repositorio  +  tarea cron            │
│  (createClaimAndDelivery, accept/cancel, pre-claim local)  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  API (HTTP puro)                                             │
│  Cliente HTTP Yango  →  POST /claims/create, /check-price, …   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                         Yango B2B API
```

### 1. Capa API — cliente HTTP Yango

Solo HTTP. No toca Mongo ni órdenes.

- Base URL: config **URL API Yango** (default público `https://b2b.delivery.yango.tech/.../v2`)
- Auth: `Authorization: Bearer {token}` — token global de plataforma o por marca en credenciales de integración
- Convierte camelCase ↔ snake_case en los bordes (la capa intermedia usa DTOs en camelCase del proyecto)
- Endpoints que usamos: `POST /check-price`, `POST /claims/create?request_id=…`, `GET /claims/info`, confirm/cancel

**Controlador proxy:** rutas `/yango/api/*` — operaciones directas contra Yango, sin persistir.

### 2. Capa intermedia — servicio delivery Yango

Orquesta **API + repositorio local** (`YangoDelivery` en Mongo).

Responsabilidades típicas:

- `createClaimAndDelivery`: genera `request_id` único, llama API, mapea respuesta a entidad local, crea/actualiza documento
- `acceptClaim` / `cancelClaim`: necesitan `version` del claim en Yango
- `saveOrderNumberAndTimeToConfirm`: guarda **pre-claim** con `status: no_claim` y `dataForClaim` — aún no enviado a Yango
- Consultas: por `claimId`, `orderNumber`, filtros, export Excel
- Emite eventos WebSocket al panel (`yango_delivery_created`, `yango_delivery_updated`)

**Controlador:** `YangoDeliveryController` (`/yango/deliveries/*`) — solo BD local.

**Cron:** `YangoTaskService` envía a Yango los pre-claims cuando vence `timeToConfirm` (calculado desde `minimumDeliveryTime` del local).

### 3. Capa negocio — orquestación de pedidos

Aquí entra la **regla de cuándo** crear Yango y **cómo** impacta la orden Agiliza.

**Al aceptar pedido con partner Yango** (orquestador → crear claim si aplica):

1. Comprueba que `deliveryInfo.partnerId` apunte a un partner cuyo nombre incluye `"yango"`
2. Lee credenciales de marca (integración Yango) — si `enabled: false`, no hace nada
3. Valida coordenadas del local y del cliente
4. Builder de claim desde orden + local → DTO de creación
5. Guarda pre-claim local (`no_claim`) con `timeToConfirm = max(1, minimumDeliveryTime - 10)` minutos

**Al llegar webhook** (servicio webhook Yango):

1. Idempotencia por `claim_id:status` (cache 5 min)
2. Si status `ready_for_approval` → auto-accept vía servicio delivery
3. `getClaimInfo` para payload completo (en terminales, fallback al webhook si falla)
4. Mapea estado Yango → `YangoDeliveryStatus` interno
5. Actualiza Mongo + emite eventos → listener webhook → orquestador de pedidos

**Controlador webhook:** ruta pública `POST …/delivery-webhooks/yango`.

---

## Dos niveles de estado (no confundirlos)

Guardamos **tres strings** distintos en el flujo:

| Nivel | Dónde | Ejemplo |
|---|---|---|
| Raw Yango | `yangoStatus` en Mongo | `performer_lookup`, `pickuped`, `delivered_finish` |
| Interno delivery | `YangoDelivery.status` | `searching`, `picked_up`, `delivered` |
| Orden Agiliza | `OrderFood.status` | `EN_CAMINO`, `ENTREGADO`, `CANCELADO` |

### Yango raw → estado interno (`YangoDeliveryStatus`)

Documentado en la entidad delivery y duplicado en el mapeo de estados (servicio + webhook):

| Fase | Estados Yango (raw) | Estado interno |
|---|---|---|
| Inicial | `new`, `estimating`, `ready_for_approval`, `accepted` | `pending` |
| Búsqueda | `performer_lookup`, `performer_draft` | `searching` |
| Asignado | `performer_found` | `confirmed` |
| En local | `pickup_arrived`, `ready_for_pickup_confirmation` | `pickup_arrived` |
| Recogido | `pickuped` | `picked_up` |
| En destino | `delivery_arrived`, `ready_for_delivery_confirmation`, `pay_waiting` | `delivery_arrived` |
| Entregado | `delivered` | `delivered` |
| Cierre | `delivered_finish` | `completed` |
| Retorno / fallo | `returning`, `returned`, `failed`, `performer_not_found`, … | `failed` |
| Cancelación | `cancelled`, `cancelled_by_taxi`, `cancelled_with_payment`, … | `cancelled` |
| Pre-claim local | (sin claim en Yango aún) | `no_claim` |

Estados **terminales** (liberan nuevo pre-claim manual): `cancelled`, `completed`, `failed`, `delivered`. Utilidad: `isLiveYangoDeliveryStatus` / `isTerminalYangoDeliveryStatus`.

### Estado interno → orden Agiliza (`OrderFoodStatus`)

**Importante:** no todos los estados de delivery mueven la orden. En la sincronización webhook → orden:

| `YangoDelivery.status` | `OrderFood.status` | ¿Notifica WhatsApp? |
|---|---|---|
| `picked_up` | `EN_CAMINO` | Sí (vía orchestration) |
| `delivered` | `ENTREGADO` | Sí |
| `cancelled`, `failed` | `CANCELADO` | Sí |
| `searching`, `confirmed`, `pickup_arrived`, `delivery_arrived`, … | *(sin cambio)* | Solo **tracking** |

En estados intermedios se actualiza `deliveryTracking` (motorizado, teléfono, `sharingLink`, `pickupCode`, ETA) pero **no** el status principal del pedido — evita saltar a “entregado” antes de tiempo.

Eventos:

- Cambio de status de orden → evento interno de delivery
- Solo tracking → evento de solo tracking

---

## Campos necesarios para las peticiones

### Cotizar (`POST /check-price`)

Mínimo en `CheckYangoPriceDto` (camelCase; la API recibe snake_case):

```ts
{
  brandId?: string,           // token por marca (opcional)
  clientRequirements: {
    taxiClass: 'courier',     // express / same-day
    cargoOptions?: ['thermobag']
  },
  routePoints: [
    { coordinates: [lng, lat] },  // origen (local)
    { coordinates: [lng, lat] }   // destino (cliente)
  ]
}
```

**Nota:** coordenadas en orden **`[longitud, latitud]`** — Yandex lo exige así.

### Crear claim (`POST /claims/create?request_id=…`)

Payload completo en `CreateYangoClaimDto`. Obligatorios para que Yango no rechace:

**Items** (al menos uno):

- `extraId`, `pickupPoint`, `droppofPoint` (índices en `routePoints`)
- `title`, `size` (length/width/height en metros), `weight` (kg)
- `costValue`, `costCurrency`, `quantity`

**Route points** (origen + destino):

- `pointId`, `visitOrder`, `type`: `'source'` | `'destination'`
- `contact`: `name`, `phone` en **E.164** (`+51987654321`), `email` (Yango lo exige — `resolveYangoContactEmail` genera uno si falta)
- `address`: `fullname`, `country`, `city`, `coordinates: [lng, lat]`
- Opcional útil: `comment`, `externalOrderId` (= `orderNumber`)

**Resto obligatorio:**

- `emergencyContact`: `name`, `phone`
- `callbackProperties.callbackUrl`: URL absoluta hacia el webhook de delivery del API (depende de la **URL pública del API**)

**Recomendados en producción** (builder de claim desde pedido):

- `orderNumber` — clave para Mongo (`unique` en `orderNumber`)
- `clientRequirements`: `{ taxiClass: 'courier', cargoOptions: ['thermobag'] }`
- `referralSource`, flags `skipConfirmation: true` en puntos
- `brandId` en el documento pre-claim para resolver token al enviar

**Validaciones de negocio antes de armar el payload:**

- Local con `locationLatitude` / `locationLongitude` válidos (≠ 0)
- Cliente con GPS en `deliveryInfo.latitude/longitude` (o geocoding inverso para `fullname`)
- URL pública del API configurada con `https://`
- Partner de delivery identificado como Yango

### Headers / auth

```
Authorization: Bearer {token global o token de marca}
Content-Type: application/json
Accept-Language: es
```

`request_id` único por intento de creación (permite reintentos y “pedir otro Yango” tras cancelar).

---

## Payload outbound (campos que enviamos a Yango)

Referencia consolidada del body que sale hacia `POST /claims/create` (camelCase en código; snake_case en wire).

### Raíz del claim

| Campo (camelCase) | Obligatorio | Origen / valor típico Agiliza |
|---|---|---|
| `orderNumber` | Recomendado | `order.orderNumber` — clave Mongo (`YangoDelivery`) |
| `items[]` | Sí | Al menos 1 ítem (ver abajo) |
| `routePoints[]` | Sí | Origen (local) + destino (cliente) |
| `emergencyContact` | Sí | Teléfono local o supervisor |
| `callbackProperties.callbackUrl` | Sí | `{URL_PUBLICA_API}/…/delivery-webhooks/yango` |
| `clientRequirements` | Recomendado | `{ taxiClass: 'courier', cargoOptions: ['thermobag'] }` |
| `referralSource` | Opcional | `'API_YOUR-COMPANY-NAME'` |
| `skipClientNotify`, `skipDoorToDoor`, etc. | Opcional | Flags booleanos del DTO |
| `sameDayData`, `due`, `comment` | Opcional | Programados / notas |

### `items[]`

| Campo | Obligatorio | Ejemplo Agiliza |
|---|---|---|
| `extraId` | Sí | `orderNumber` |
| `pickupPoint` | Sí | `1` (índice en routePoints) |
| `droppofPoint` | Sí | `2` |
| `title` | Sí | Resumen pedido o `"Pedido de comida"` |
| `size.length/width/height` | Sí | Metros (ej. 0.3 × 0.3 × 0.3) |
| `weight` | Sí | kg (ej. 1.0) |
| `costValue` | Sí | Subtotal como string (`"45.00"`) |
| `costCurrency` | Sí | `"PEN"`, etc. |
| `quantity` | Sí | `1` |

### `routePoints[]` (por punto)

| Campo | Obligatorio | Origen Agiliza |
|---|---|---|
| `pointId` | Sí | 1 origen, 2 destino |
| `visitOrder` | Sí | 1, 2 |
| `type` | Sí | `'source'` \| `'destination'` |
| `contact.name` | Sí | Nombre comercial / cliente |
| `contact.phone` | Sí | E.164 `+51…` (`normalizePhoneForYango`) |
| `contact.email` | Sí | Email real o generado (`resolveYangoContactEmail`) |
| `address.fullname` | Sí | Dirección branch o reverse-geocode destino |
| `address.country` | Sí | Label país marca (ej. `"Peru"`) |
| `address.city` | Sí | Provincia branch |
| `address.coordinates` | Sí | **`[lng, lat]`** — orden Yandex |
| `address.comment` | Opcional | Referencia entrega / “Recoger pedido …” |
| `externalOrderId` | Opcional | `orderNumber` |
| `skipConfirmation` | Opcional | `true` en producción |

### Cotizar (`POST /check-price`) — subset

| Campo | Obligatorio |
|---|---|
| `clientRequirements.taxiClass` | Sí (`courier`) |
| `clientRequirements.cargoOptions` | Opcional |
| `routePoints[].coordinates` | Sí — solo coords, sin contacto |

### Query / headers (create)

| Param / header | Valor |
|---|---|
| Query `request_id` | UUID tipo `claim-{timestamp}-{random}` |
| Header `Authorization` | Bearer token marca o env |

### Ejemplo JSON raw (wire hacia Yango)

Petición HTTP tal como sale del cliente HTTP hacia la API de Yango (body en **snake_case**; el orquestador arma camelCase y la capa intermedia convierte antes del POST):

```http
POST https://{YANGO_API_HOST}/claims/create?request_id=claim-1718123456789-abc123
Authorization: Bearer {token_marca_o_global}
Content-Type: application/json
Accept-Language: es
```

```json
{
  "order_number": "ORD-2026-001234",
  "items": [
    {
      "extra_id": "ORD-2026-001234",
      "pickup_point": 1,
      "droppof_point": 2,
      "title": "2x Lomo saltado, 1x Chicha morada",
      "size": {
        "length": 0.3,
        "width": 0.3,
        "height": 0.3
      },
      "weight": 1.0,
      "cost_value": "45.00",
      "cost_currency": "PEN",
      "quantity": 1
    }
  ],
  "route_points": [
    {
      "point_id": 1,
      "visit_order": 1,
      "type": "source",
      "contact": {
        "name": "Restaurante Demo",
        "phone": "+51987654321",
        "email": "local+51987654321@orders.example.com"
      },
      "address": {
        "fullname": "Av. Principal 100, Miraflores",
        "coordinates": [-77.0282, -12.1201],
        "city": "Lima",
        "country": "Peru",
        "comment": "Recoger pedido ORD-2026-001234"
      },
      "external_order_id": "ORD-2026-001234",
      "skip_confirmation": true
    },
    {
      "point_id": 2,
      "visit_order": 2,
      "type": "destination",
      "contact": {
        "name": "María López",
        "phone": "+51912345678",
        "email": "maria.lopez@email.com"
      },
      "address": {
        "fullname": "Calle Secundaria 456, San Isidro, Lima",
        "coordinates": [-77.0350, -12.0980],
        "city": "Lima",
        "country": "Peru",
        "comment": "Entregar pedido ORD-2026-001234\nReferencia: Edificio azul, piso 3"
      },
      "external_order_id": "ORD-2026-001234",
      "skip_confirmation": true
    }
  ],
  "emergency_contact": {
    "name": "Restaurante Demo",
    "phone": "+51987654321"
  },
  "client_requirements": {
    "taxi_class": "courier",
    "cargo_options": ["thermobag"]
  },
  "callback_properties": {
    "callback_url": "https://{URL_PUBLICA_API}/api/v3/delivery-webhooks/yango?"
  },
  "referral_source": "API_YOUR-COMPANY-NAME",
  "optional_return": false,
  "skip_act": false,
  "skip_client_notify": false,
  "skip_door_to_door": false,
  "skip_emergency_notify": false,
  "comment": "Pedido ORD-2026-001234 - 2x Lomo saltado, 1x Chicha morada"
}
```

> **Notas:** `coordinates` van `[longitud, latitud]`. El campo `droppof_point` (con typo) es el nombre que espera Yango en wire. `request_id` va en query, no en el body. Para cotizar sin crear claim, el subset mínimo va a `POST /check-price` (solo `client_requirements` + `route_points[].coordinates`).

---

## Otros payloads y respuestas raw

### Cotizar — `POST /check-price`

**Request (wire snake_case):**

```http
POST https://{YANGO_API_HOST}/check-price
Authorization: Bearer {token_marca_o_global}
Content-Type: application/json
Accept-Language: es
```

```json
{
  "client_requirements": {
    "taxi_class": "courier",
    "cargo_options": ["thermobag"]
  },
  "route_points": [
    { "coordinates": [-77.0282, -12.1201] },
    { "coordinates": [-77.0350, -12.0980] }
  ]
}
```

**Response típica (sin crear claim):**

```json
{
  "offer_id": "offer-abc123",
  "price": "15.50",
  "price_with_vat": "18.30",
  "valid_until": "2026-06-11T15:45:00+00:00"
}
```

### Crear claim — respuesta Yango

Tras `POST /claims/create`, Yango devuelve el claim en estado inicial (a menudo `ready_for_approval` o `estimating`). Normalizamos `id` → `claim_id`:

```json
{
  "id": "claim-uuid-abc123",
  "claim_id": "claim-uuid-abc123",
  "status": "ready_for_approval",
  "version": 1,
  "offer": {
    "offer_id": "offer-abc123",
    "price": "15.50",
    "valid_until": "2026-06-11T15:45:00+00:00"
  }
}
```

### Aceptar claim — `POST /claims/accept?claim_id=…`

Cuando el webhook llega con `ready_for_approval`, Agiliza auto-acepta. También se puede llamar manualmente:

```http
POST https://{YANGO_API_HOST}/claims/accept?claim_id=claim-uuid-abc123
Authorization: Bearer {token_marca_o_global}
Content-Type: application/json
```

```json
{
  "version": 1
}
```

**Response típica:**

```json
{
  "id": "claim-uuid-abc123",
  "status": "performer_lookup",
  "version": 2
}
```

> Si Yango responde **409**, suele significar que ya estaba aceptado; el cliente HTTP hace fallback a `GET /claims/info`.

### Info y cancelación

**Info del claim** — body vacío, `claim_id` en query:

```http
POST https://{YANGO_API_HOST}/claims/info?claim_id=claim-uuid-abc123
Authorization: Bearer {token_marca_o_global}
Content-Type: application/json
```

**Términos de cancelación** (`POST /claims/cancel-info?claim_id=…`, body `{}`):

```json
{
  "cancel_state": "free",
  "price": "0.00",
  "currency": "PEN"
}
```

Valores de `cancel_state`: `free` (sin cargo) o `paid` (con cargo). Agiliza consulta esto antes de cancelar desde panel u orquestador.

**Cancelar claim:**

```http
POST https://{YANGO_API_HOST}/claims/cancel?claim_id=claim-uuid-abc123
Authorization: Bearer {token_marca_o_global}
Content-Type: application/json
```

```json
{
  "claim_id": "claim-uuid-abc123",
  "cancel_state": "free",
  "version": 2
}
```

**Response típica:**

```json
{
  "id": "claim-uuid-abc123",
  "status": "cancelled",
  "version": 3
}
```

### Posición del courier — `GET /claims/performer-position?claim_id=…`

Disponible desde `performer_found` hasta estados intermedios. Devuelve GPS y `sharing_link` por punto:

```json
{
  "position": {
    "lat": -12.0975,
    "lon": -77.0342,
    "timestamp": 1718123456
  },
  "route_points": [
    {
      "id": 2,
      "sharing_link": "https://{dominio_seguimiento_yango}/track/abc"
    }
  ]
}
```

> **404 / 409** aquí es normal si aún no hay courier o el claim ya terminó — no se trata como error fatal.

### Webhook inbound (Yango → Agiliza)

Yango llama a la URL configurada en `callback_properties.callback_url`:

```http
POST https://{URL_PUBLICA_API}/api/v3/delivery-webhooks/yango
Content-Type: application/json
```

**Payload mínimo (siempre presente):**

```json
{
  "claim_id": "claim-uuid-abc123",
  "updated_ts": "2026-06-11T15:30:00.000+00:00",
  "status": "pickuped"
}
```

**Payload enriquecido** (ej. `performer_found` — puede traer tracking antes del `getClaimInfo`):

```json
{
  "claim_id": "claim-uuid-abc123",
  "updated_ts": "2026-06-11T15:30:00.000+00:00",
  "status": "performer_found",
  "route_points": [
    {
      "id": 2,
      "uuid": "point-uuid-dest",
      "type": "destination",
      "visit_status": "pending",
      "sharing_link": "https://{dominio_seguimiento_yango}/track/abc"
    }
  ],
  "performer_info": {
    "courier_name": "Carlos M.",
    "legal_name": "Carlos Mendoza"
  }
}
```

**Respuesta de Agiliza (200 OK):**

```json
{
  "success": true,
  "message": "Webhook procesado",
  "claimId": "claim-uuid-abc123",
  "status": "performer_found"
}
```

Idempotencia interna: clave `claim_id:status`, TTL 5 min. Tras recibir webhook, Agiliza suele llamar `claims/info` (+ a veces `performer-position`) para completar tracking.

### Error típico de Yango (4xx)

```json
{
  "code": "validation_error",
  "message": "Invalid phone format"
}
```

Causas frecuentes: teléfono sin prefijo `+`, coordenadas `[lat, lng]` invertidas, `callback_url` no absoluta.

---

## Comparación rápida con Rest.pe

| | Yango | Rest.pe |
|---|---|---|
| Payload | `items` + `routePoints` + callback | `delivery` + `cliente` + `listaPedidos` |
| Productos | Metadatos genéricos | IDs Rest.pe + modificadores |
| ID persistido | `claimId` | `delivery_id` → `erpIntegration` |
| Post detalle ERP | — | [integracion-restaurant-pe-tres-capas](/blog/integracion-restaurant-pe-tres-capas/) |

---

## Flujo resumido (pedido real)

1. Operador acepta pedido delivery con partner Yango → **pre-claim** `no_claim` en Mongo
2. Cron o acción manual → crear claim en Yango + estado `pending`/`searching`…
3. Webhooks → actualizan delivery + tracking; en `pickuped` / `delivered` / cancel → **orden Agiliza**
4. Panel e inbox reciben WS; cliente puede recibir link de seguimiento (`sharingLink` desde `performer_found`)

---

## Archivos clave

| Qué | Módulo |
|---|---|
| Cliente HTTP | capa API Yango |
| Lógica intermedia + BD | servicio delivery + repositorio |
| Webhook + mapeo a orden | servicio webhook |
| Pre-claim desde pedido | orquestador + builder de claim |
| DTO campos claim | contrato create-claim |
| Enum estados internos | entidad delivery |
| Terminales / claim vivo | utilidades de estado |
| Doc módulo | documentación interna delivery |

Si algo falla al crear claim, el log del cliente HTTP trae status + body de Yango + payload enviado — casi siempre es teléfono sin `+`, coordenadas al revés, o callback URL relativa.
