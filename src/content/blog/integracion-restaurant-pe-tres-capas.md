---
title: "Nota para mí: integración Restaurant.pe (Rest.pe) en tres capas"
description: "Cómo el API envía pedidos al ERP Restaurant.pe: capas API/intermedia/negocio, erpIntegration, webhook pendiente y payload completo de registrarDelivery."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "nestjs", "restpe", "restaurant-pe", "erp", "integraciones", "yango"]
locale: es
draft: false
---

Cuando una marca tiene **Restaurant.pe** (Rest.pe) conectado, al aceptar un pedido en Agiliza hay que traducir la orden Mongo → payload del ERP, registrar el delivery, guardar el `delivery_id` y (cuando Rest.pe lo habilite) recibir cambios de estado inbound. Misma filosofía que Yango: **tres capas**, parser explícito y campos documentados.

## Las tres capas

```
┌─────────────────────────────────────────────────────────────┐
│  NEGOCIO                                                     │
│  Orquestador → envío Rest.pe si aplica                        │
│  (al aceptar pedido: pending → success/fail en erpIntegration)│
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  INTERMEDIA                                                  │
│  Servicio Rest.pe + parser de orden                           │
│  (enriquecer externalIds, validar modificadores, parsear)    │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  API (HTTP puro)                                             │
│  Cliente HTTP Rest.pe → api.restaurant.pe                         │
└───────────────────────────────┬─────────────────────────────┘
                                │
                         Rest.pe API
```

### 1. Capa API — cliente HTTP Rest.pe

Solo HTTP. No lee órdenes ni catálogo Agiliza.

- Base: config **URL API Rest.pe** (default `https://api.restaurant.pe`)
- Auth: query param `?token={token}` (token Rest.pe, guardado en credenciales de integración de la marca)
- Endpoints usados:
  - `POST .../rest/delivery/registrarDelivery/{dominioId}?quipupos=&token=`
  - `POST .../rest/delivery/cancelarDelivery/{dominioId}` body `{ delivery_id, delivery_motivocancelacion }`
  - `GET .../readonly/rest/delivery/obtenerCartaPorLocal/{dominioId}/{localId}` (sync menú)
  - `GET .../readonly/rest/delivery/obtenerInformacionDominio/{dominioId}`

**Controlador “proxy”:** `POST /integraciones-erp/restpe/raw/:dominioId` — reenvía payload sin parsear (dev/Postman).

### 2. Capa intermedia — servicio Rest.pe + parser

Orquesta **orden Agiliza → payload Rest.pe**:

1. Credenciales marca: `dominioId`, `token`, `quipupos`
2. `branch.externalId` → `local_id` (número Rest.pe)
3. Batch lookup: `Product.externalId`, `Modifier.externalId` (grupo), `Option.externalId` (selección)
4. Valida que todo modificador tenga `groupId` + `modificatorId` y externalId configurado
5. `OrderParserHelper.parse(parseableOrder)` → `{ delivery, cliente, listaPedidos }`
6. Cliente HTTP → `registrarDelivery(...)`
7. Éxito si respuesta `tipo === "1"` y hay `delivery_id` (`extractRestpeDeliveryId`)

**Controlador:** `POST /integraciones-erp/restpe/orders?brandId=` (por `orderNumber`), retry y cancel.

### 3. Capa negocio — orquestador de pedidos

**Cuándo se dispara:** al aceptar pedido, si la marca tiene Rest.pe habilitado:

- Marca tiene credenciales Rest.pe (`dominioId` + `token`) y `enabled !== false`
- Existe al menos un local vinculado (`hasLinkedRestpeBranch`)
- Fire-and-forget: `erpIntegration.status = pending` → envío al ERP → `success` + `externalOrderId` o `fail` + `errorMessage`

**Cancelación:** al pasar orden a Cancelado, orquestador cancela en Rest.pe si `erpIntegration.status === 'success'` y hay `externalOrderId`.

---

## Estados: qué sincroniza hoy

### Outbound (Agiliza → Rest.pe)

| Campo en orden | Valores | Significado |
|---|---|---|
| `erpIntegration.status` | `pending` / `success` / `fail` | Resultado del envío a Rest.pe |
| `erpIntegration.externalOrderId` | `delivery_id` numérico | ID del pedido en Rest.pe (necesario para cancelar) |
| `erpIntegration.erpSystem` | `restaurant_pe` | Proveedor ERP |

La orden Agiliza **no cambia de estado** solo por enviar a Rest.pe; el panel sigue manejando `Aceptado`, `En cocina`, etc.

### Inbound (Rest.pe → Agiliza) — diseñado, no operativo

Rest.pe puede llamar `POST /integraciones-erp/restpe/webhook` con:

```json
{ "deliveryId": 4273, "statusCode": "5" }
```

Mapeo **estimado** (pendiente confirmar con Rest.pe):

| `statusCode` | Rest.pe (probable) | `OrderFoodStatus` Agiliza |
|---|---|---|
| `"1"` | Aceptado | `ACEPTADO` |
| `"2"` | En cocina | `EN_COCINA` |
| `"3"` | Para recoger | `PARA_RECOGER` |
| `"4"` | En camino | `EN_CAMINO` |
| `"5"` | Entregado | `ENTREGADO` |
| `"6"` | Anulado | `CANCELADO` |

> El endpoint webhook **aún no está implementado** (Rest.pe lo está mejorando). Ver doc interna del módulo Rest.pe (webhook pendiente).

---

## Payload que enviamos a Rest.pe

`POST registrarDelivery/{dominioId}` — cuerpo JSON con tres bloques.

### Query params

| Param | Origen |
|---|---|
| `token` | credenciales Rest.pe de la marca |
| `quipupos` | `credentials.quipupos` (0 o 1, default 0) |

### `delivery` (cabecera del pedido)

| Campo Rest.pe | Origen Agiliza | Notas |
|---|---|---|
| `local_id` | `branch.externalId` (parseInt) | Obligatorio |
| `canaldelivery_id` | `null` | Hardcoded |
| `delivery_costoenvio` | `totals.deliveryCost` | |
| `delivery_pagocon` | `totals.total` | |
| `delivery_montodescuento` | `totals.discountAmount` | |
| `delivery_tipopago` | `paymentInformation.paymentType` | 1 efectivo, 2 tarjeta, 5 online, 8 Yape, 9 Plin, 7 resto |
| `tarjeta_id` | `null` | Hardcoded |
| `delivery_modalidad` | `deliveryInfo.mode` | 1 delivery, 2 recojo/dine-in, 3 programado |
| `delivery_direccionenvio` | `deliveryInfo.address` | |
| `delivery_referencia` | `deliveryInfo.addressRef` | |
| `delivery_latitud` | `deliveryInfo.latitude` | |
| `delivery_longitud` | `deliveryInfo.longitude` | |
| `delivery_personareferencia` | `customerSnapshot` nombre | |
| `delivery_notageneral` | `content.specialNotes` | |
| `delivery_personarecoje` | `null` | Hardcoded |
| `delivery_horarecojo` | programado o now | `"YYYY-MM-DD HH:mm:ss"` |
| `delivery_horaentrega` | programado o now | idem |
| `delivery_rangofinfechaentregarecojo` | = hora entrega | |
| `delivery_minutosalerta` | `60` | Hardcoded |
| `delivery_comprobante` | `billingInformation.receipt` | 1 boleta, 2 factura |
| `delivery_razonsocialfacturar` | `billingName` | |
| `delivery_dnirucreferencia` | `billingDniRuc` | |
| `delivery_direccionfacturacion` | `billingAddress` | |
| `motorizado_id` | `null` | Hardcoded |
| `emitSocket` | `true` | Hardcoded |
| `delivery_codigointegracion` | `orderNumber` | Trazabilidad Agiliza ↔ Rest.pe |

### `cliente`

| Campo Rest.pe | Origen Agiliza | Notas |
|---|---|---|
| `cliente_nombres` | `customerSnapshot.firstName` | |
| `cliente_apellidos` | `customerSnapshot.lastName` | |
| `cliente_dniruc` | `customerSnapshot.dniOrRuc` | |
| `cliente_direccion` | dirección cliente o delivery | |
| `cliente_email` | email o sintético | `pedido+{tel}@orders.example.com` si falta |
| `cliente_telefono` | teléfono sin +51 | normalizador de teléfono Rest.pe |
| `cliente_tipo` | `0` | Hardcoded |
| `validacion_cliente` | `1` | Hardcoded |

### `listaPedidos[]` (por ítem)

| Campo Rest.pe | Origen Agiliza | Notas |
|---|---|---|
| `pedido_productoid` | `Product.externalId` | Obligatorio numérico |
| `pedido_cantidad` | `item.quantity` | |
| `pedido_precio` | `item.price` | Moneda display de la orden |
| `pedido_descuento` | `item.discount` | |
| `pedido_nota` | `item.customization` | |
| `pedido_escombo` | `'0'` \| `'1'` | |
| `modificadorseleccionList[]` | `item.modifiers` | Ver abajo |
| `lista_productocombo[]` | `comboProductList` | Mismos campos pedido |
| `adicionalListAdded[]` | `additionalListAdded` | `adicionalcombo_*` |

**Por modificador** (`modificadorseleccionList`):

| Campo | Origen |
|---|---|
| `modificador_id` | `Modifier.externalId` (desde `groupId`) |
| `modificadorseleccion_id` | `Option.externalId` (desde `modificatorId`) |
| `pedido_precio` | precio en línea o fallback catálogo + VES |
| `modificadorseleccion_cantidad` | `mod.quantity` |

### Ejemplo JSON raw (`registrarDelivery`)

Petición HTTP tal como la envía el cliente HTTP Rest.pe (token y dominio en query; body con los tres bloques):

```http
POST https://api.restaurant.pe/restaurant/public/v2/rest/delivery/registrarDelivery/{dominioId}?quipupos=0&token={token_restpe}
Content-Type: application/json
```

```json
{
  "delivery": {
    "local_id": 1,
    "canaldelivery_id": null,
    "delivery_costoenvio": 5.00,
    "delivery_pagocon": 11.00,
    "delivery_montodescuento": 0,
    "delivery_tipopago": 1,
    "tarjeta_id": null,
    "delivery_modalidad": 1,
    "delivery_direccionenvio": "Av. Ejemplo 123",
    "delivery_referencia": "Frente al parque",
    "delivery_latitud": -12.0464,
    "delivery_longitud": -77.0428,
    "delivery_personareferencia": "Juan Pérez",
    "delivery_notageneral": "",
    "delivery_personarecoje": null,
    "delivery_horarecojo": "2026-06-11 15:00:00",
    "delivery_horaentrega": "2026-06-11 15:45:00",
    "delivery_rangofinfechaentregarecojo": "2026-06-11 15:45:00",
    "delivery_minutosalerta": 60,
    "delivery_comprobante": 1,
    "delivery_razonsocialfacturar": "",
    "delivery_dnirucreferencia": "",
    "delivery_direccionfacturacion": "",
    "motorizado_id": null,
    "emitSocket": true,
    "delivery_codigointegracion": "ORD-2026-001234"
  },
  "cliente": {
    "cliente_nombres": "Juan",
    "cliente_apellidos": "Pérez",
    "cliente_dniruc": "12345678",
    "cliente_direccion": "Av. Ejemplo 123",
    "cliente_email": "juan@email.com",
    "cliente_telefono": "987654321",
    "cliente_tipo": 0,
    "validacion_cliente": 1
  },
  "listaPedidos": [
    {
      "pedido_productoid": 87,
      "pedido_cantidad": 2,
      "pedido_precio": 3.00,
      "pedido_descuento": 0,
      "pedido_nota": "",
      "pedido_escombo": "0",
      "modificadorseleccionList": [
        {
          "modificador_id": 5,
          "modificadorseleccion_id": 16,
          "pedido_precio": 0.00,
          "modificadorseleccion_cantidad": 1
        }
      ],
      "lista_productocombo": [],
      "adicionalListAdded": []
    }
  ]
}
```

> **Notas:** `pedido_productoid`, `modificador_id` y `modificadorseleccion_id` deben existir en la carta Rest.pe del local (`obtenerCartaPorLocal`). Agiliza los resuelve desde `Product.externalId` y `Modifier`/`Option.externalId`. `delivery_codigointegracion` = `orderNumber` de Agiliza. `emitSocket: true` es lo que manda el parser en producción (Postman manual a veces usa `false`).

**Response exitosa de `registrarDelivery`:**

```json
{
  "tipo": "1",
  "mensajes": ["Se agregó tu Pedido con éxito."],
  "data": "4273",
  "totalregistros": 0,
  "statusRequest": "200"
}
```

> **`data`** es el `delivery_id` en Rest.pe (string numérico). Agiliza lo guarda en `erpIntegration.externalOrderId`. Éxito cuando `tipo === "1"`.

### Combo — solo `listaPedidos[]` (referencia)

Cuando `pedido_escombo: "1"`, el ítem raíz usa el `producto_id` del combo; bases y adicionales van en sub-arrays:

```json
[
  {
    "pedido_productoid": 301,
    "pedido_cantidad": 1,
    "pedido_precio": 29.90,
    "pedido_descuento": 0,
    "pedido_nota": "",
    "pedido_escombo": "1",
    "modificadorseleccionList": [],
    "lista_productocombo": [
      {
        "pedido_productoid": 78,
        "pedido_cantidad": 1,
        "pedido_precio": 4.50,
        "pedido_descuento": 0,
        "pedido_nota": ""
      }
    ],
    "adicionalListAdded": [
      {
        "adicionalcombo_productoid": 104,
        "adicionalcombo_cantidad": 1,
        "adicionalcombo_precio": 2.00,
        "adicionalcombo_descuento": 0,
        "adicionalcombo_nota": ""
      }
    ]
  }
]
```

### Cancelación outbound

```http
POST https://api.restaurant.pe/restaurant/public/v2/rest/delivery/cancelarDelivery/{dominioId}?quipupos=0&token={token_restpe}
Content-Type: application/json
```

```json
{
  "delivery_id": 4273,
  "delivery_motivocancelacion": "Cancelado desde la plataforma"
}
```

**Response exitosa:**

```json
{
  "data": {},
  "mensajes": [["Pedido Online anulado"]],
  "tipo": "1"
}
```

---

## Otros payloads y respuestas raw

### Catálogo — `GET obtenerCartaPorLocal/{dominioId}/{localId}`

Sin body. Auth: `?quipupos=0&token={token_restpe}`. Fuente de `pedido_productoid` y IDs de modificadores.

**Envelope de respuesta:**

```json
{
  "tipo": "1",
  "data": [],
  "listaInsumos": [],
  "listaCategorias": [],
  "totalregistros": 123,
  "mensajes": ["Carta obtenida..."]
}
```

**Producto simple dentro de `data[]` (fragmento):**

```json
{
  "productogeneral_id": "76",
  "productogeneral_descripcion": "Agua embotellada",
  "productogeneral_escombo": "0",
  "categoria_id": "8",
  "categoria_descripcion": "Bebidas",
  "lista_presentacion": [
    {
      "producto_id": "87",
      "producto_presentacion": "625 ml",
      "producto_precio": "3.00",
      "producto_delivery": "1"
    }
  ],
  "lista_agrupadores": [
    {
      "modificador_id": "5",
      "modificador_nombre": "Temperatura",
      "listaModificadores": [
        {
          "modificadorseleccion_id": "16",
          "modificadorseleccion_nombre": "Helada",
          "modificadorseleccion_precio": "0.00"
        }
      ]
    }
  ]
}
```

> Enviar el `producto_id` de la **presentación** elegida, no el `productogeneral_id`. Categorías con `categoria_delivery: "0"` no aplican a delivery.

### Dominio — `GET obtenerInformacionDominio/{dominioId}`

Sin body. Devuelve locales, salones y mesas; el `local_id` de aquí es el que va en `delivery.local_id`.

**Respuesta resumida:**

```json
{
  "tipo": "1",
  "mensajes": [],
  "data": {
    "locales": [
      {
        "local_id": "1",
        "local_descripcion": "Local Demo",
        "local_aceptadelivery": "1",
        "salones": [],
        "almacenes": [
          { "almacen_id": "1", "almacen_descripcion": "Almacén principal" }
        ]
      }
    ]
  }
}
```

### Webhook inbound (Rest.pe → Agiliza)

Rest.pe llama a la URL pública configurada en su panel de integraciones:

```http
POST https://{URL_PUBLICA_API}/integraciones-erp/restpe/webhook
Content-Type: application/json
```

```json
{
  "deliveryId": 4273,
  "statusCode": "5"
}
```

| Campo | Significado |
|---|---|
| `deliveryId` | Mismo valor que `erpIntegration.externalOrderId` |
| `statusCode` | Estado en Rest.pe — mapeo a `OrderFoodStatus` pendiente de confirmar |

**Respuesta esperada:** `200 OK` (body libre). El endpoint **aún no está implementado** en Agiliza; cuando lo esté, debe evitar loop si la cancelación ya vino de nuestro lado.

### Error típico Rest.pe (4xx / body de error)

Rest.pe no siempre usa el mismo envelope en error; a veces el body es texto plano o JSON opaco. Agiliza persiste el detalle en `erpIntegration.errorMessage` cuando `tipo !== "1"`.

---

## Prerrequisitos de catálogo (errores típicos)

- Branch sin `externalId` → no hay `local_id`
- Producto sin `externalId` Rest.pe → falla parse
- Modifier/Option sin `externalId` → BadRequest con mensaje al panel de menú
- Modifier en orden sin `groupId` / `modificatorId` → no se puede enriquecer

---

## Archivos clave

| Qué | Dónde |
|---|---|
| Cliente HTTP | capa API Rest.pe |
| Parseo + envío | capa intermedia + parser de orden |
| Trigger al aceptar | orquestador de pedidos |
| DTO payload | contrato registrarDelivery |
| Doc Postman | colección interna Rest.pe |
| Webhook (futuro) | diseño documentado, sin implementar |

---

## Anexo: qué manda cada integración (resumen)

| | **Yango** (delivery) | **Rest.pe** (ERP) |
|---|---|---|
| **Cuándo** | Pedido con partner Yango | Marca con Rest.pe + local vinculado |
| **Endpoint** | `POST .../claims/create` | `POST .../registrarDelivery/{dominioId}` |
| **Identificador guardado** | `claimId` en `YangoDelivery` | `delivery_id` en `erpIntegration.externalOrderId` |
| **Bloque principal** | `items` + `routePoints` + `callbackProperties` | `delivery` + `cliente` + `listaPedidos` |
| **Geo** | `[lng, lat]` en cada punto | `delivery_latitud` / `delivery_longitud` |
| **Productos** | genérico (título, peso, costValue) | IDs Rest.pe + modificadores + combos |
| **Estados inbound** | Webhook Yango → tracking + 3 status críticos | Webhook Rest.pe (pendiente implementar) |
| **Post relacionado** | [integracion-yango-tres-capas](/blog/integracion-yango-tres-capas/) | este |

Para el detalle campo a campo de Yango, ver la sección **Payload outbound** en el post de Yango.
