---
title: "Nota para mí: microservicio web-scraper (catálogo Rappi)"
description: "Servicio Express aparte que extrae menú, local y modificadores de páginas públicas de Rappi Perú; cómo lo consume el API principal y cuándo entra Playwright."
pubDate: 2026-06-12
tags: ["agiliza360", "api", "rappi", "scraper", "integraciones", "onboarding", "express"]
locale: es
draft: false
---

Rappi no nos da un API oficial de catálogo para **onboarding** (importar menú + modificadores al crear una marca). El **API principal** no debería hacer scraping pesado ni depender de Playwright en el mismo proceso NestJS.

Por eso existe **web-scraper-backend**: microservicio **Express** independiente que expone HTTP JSON. El API principal solo lo llama por red (`POST` con URL pública de restaurante en Rappi Perú).

---

## Rol en el ecosistema

```
Panel admin (onboarding Rappi)
        │
        ▼
API principal  ──POST /api/rappi/catalog──►  Microservicio scraper  ──►  Rappi (página + APIs internas)
        │                                              │
        │                                              ├─ HTML → __NEXT_DATA__ (menú)
        │                                              ├─ token invitado → toppings API
        │                                              └─ Playwright (fallback opcional)
        ▼
Mongo: productos, categorías, modificadores, branch con GPS/dirección
```

| Quién | Qué hace |
|---|---|
| **Microservicio scraper** | Extrae datos **públicos** de `rappi.com.pe/restaurantes/…` |
| **API principal** | Cliente HTTP (`fetchCatalog`, `fetchStore`), parsea respuesta → menú Agiliza |
| **Panel admin** | Pega URL Rappi en onboarding; no habla con el scraper directamente |

El scraper **no** tiene Mongo, JWT ni lógica de negocio Agiliza. Solo transforma una URL de restaurante en JSON estructurado.

---

## Stack y arranque

- **Runtime:** Node.js (ES modules), Express 4
- **Docs:** OpenAPI embebido + Swagger UI en `/docs`
- **Navegador:** Playwright Chromium (solo si hace falta fallback de toppings)
- **Puerto default:** `3001`

Arranque local típico: `npm install` → `npx playwright install chromium` → copiar `.env.example` → `npm run dev` o `npm start`.

Health check: `GET /health` → `{ "ok": true }`.

---

## Endpoints (todos bajo `/api/rappi/`)

Cuerpo común: `{ "url": "https://www.rappi.com.pe/restaurantes/{id}-slug" }`.  
La URL se **normaliza** (solo `rappi.com.pe`, path `/restaurantes/…`, sin hash).

| Método | Ruta | Para qué |
|---|---|---|
| `POST` | `/menu` | Menú sin modificadores (rápido, sin browser) |
| `POST` | `/store` | Datos del local (dirección, GPS, horarios, RUC, estado OPEN/CLOSED) |
| `POST` | `/toppings` | Modificadores por `productIds` o todos con `hasToppings: true` |
| `POST` | `/full` | Menú + mapa de toppings aparte |
| `POST` | `/catalog` | **Recomendado** — menú con `toppings` embebidos en cada producto |
| `GET` | `/health` | Liveness |

Opcional en toppings/catalog: `fallbackToBrowser: true` si la API directa de Rappi falla.

### Cuál usa el API principal hoy

| Flujo Agiliza | Endpoint scraper |
|---|---|
| Importar catálogo completo | `POST /api/rappi/catalog` |
| Datos del local (nombre, dirección, coords) en onboarding | `POST /api/rappi/store` |

La URL base del scraper se configura en el API principal (concepto: **URL del microservicio Rappi**; default local `http://localhost:3001`).

---

## Cómo extrae datos (dos capas)

### 1. Menú — sin navegador

```
GET HTML de la página del restaurante
        │
        ▼
<script id="__NEXT_DATA__"> … JSON de Next.js … </script>
        │
        ▼
Buscar payload con corridors[] (categorías + productos)
        │
        ▼
Normalizar: id, name, price, hasToppings, imagen, horarios, location…
```

- Un solo `fetch` con User-Agent de browser.
- Si falta `__NEXT_DATA__` o no hay `corridors` → error `502` (`MENU_PAYLOAD_NOT_FOUND`).
- **store** incluye: `id`, `brandName`, `address`, `location { lat, lng }`, `status`, `ruc`, `socialReason`, schedules.

### 2. Toppings — API invitado + fallback Playwright

Flujo **normal** (rápido):

1. Volver a leer menú (o reutilizar) para `store.id` y productos con `hasToppings: true`.
2. **Sesión invitado Rappi** (cache ~20 min):
   - `GET …/api/rocket/v2/guest/passport/` → token
   - `POST …/api/rocket/v2/guest` → `access_token` + `deviceId`
3. Por cada producto: `GET …/restaurants-bus/products/toppings/{storeId}/{productId}/` con Bearer.

Si algún producto falla y `fallbackToBrowser: true`:

- Playwright abre Chromium (headless por defecto).
- Navega a la URL del restaurante, cierra overlays, **clic en cada producto**.
- Intercepta respuestas de red que contengan `/products/toppings/`.
- Cierra modal / Escape entre productos.

Variables de tuning (ver `.env.example` del scraper):

| Concepto | Efecto |
|---|---|
| Puerto del servicio | dónde escucha Express |
| Headless del browser | `false` = ver qué hace Playwright al depurar |
| Timeout navegación | ms máximos por operación |
| Espera tras clic producto | ms antes de cerrar modal |
| Ruta ejecutable Chrome/Edge | opcional en Windows si Chromium bundled no alcanza |

---

## Respuesta de `/catalog` (forma útil)

Cada producto puede traer:

| Campo | Significado |
|---|---|
| `toppings` | JSON crudo de Rappi (grupos/opciones de modificadores) o `null` |
| `toppingsStatus` | `200`, `not_required`, `api_error`, `not_requested`, etc. |
| `toppingsEndpoint` | URL interna que respondió OK |
| `toppingsError` | Mensaje si falló |

El API principal **no** re-scrapea: recibe este JSON y lo mapea a `Product`, `Category`, `Modifier`, `Option` con `externalId` = IDs numéricos Rappi en string.

---

## Ejemplos JSON raw

### Request — catálogo completo

```http
POST http://localhost:3001/api/rappi/catalog
Content-Type: application/json
```

```json
{
  "url": "https://www.rappi.com.pe/restaurantes/1234-restaurante-demo",
  "fallbackToBrowser": false
}
```

### Request — solo local (onboarding)

```http
POST http://localhost:3001/api/rappi/store
Content-Type: application/json
```

```json
{
  "url": "https://www.rappi.com.pe/restaurantes/1234-restaurante-demo"
}
```

### Response — fragmento de store

```json
{
  "sourceUrl": "https://www.rappi.com.pe/restaurantes/1234-restaurante-demo",
  "id": 1234,
  "name": "Restaurante Demo - Lima",
  "brandName": "Restaurante Demo",
  "status": "OPEN",
  "address": "Av. Ejemplo 100, Lima",
  "location": { "lat": -12.0464, "lng": -77.0428 },
  "ruc": "20123456789",
  "socialReason": "RESTAURANTE DEMO S.A.C."
}
```

### Response — producto con toppings (catalog)

```json
{
  "id": 987654,
  "name": "Hamburguesa clásica",
  "category": "Hamburguesas",
  "price": 24.9,
  "hasToppings": true,
  "toppingsStatus": 200,
  "toppings": {
    "categories": [
      {
        "description": "Elige tu proteína",
        "topping_titles": [
          { "id": 111, "description": "Res", "price": 0 },
          { "id": 112, "description": "Pollo", "price": 2 }
        ]
      }
    ]
  },
  "toppingsError": null
}
```

> La forma exacta de `toppings` es la respuesta **cruda** de Rappi — el parser del API principal debe ser tolerante a cambios de schema.

### Error HTTP del scraper

```json
{
  "error": {
    "message": "Only rappi.com.pe URLs are supported for now",
    "code": "BAD_REQUEST"
  }
}
```

---

## Errores habituales

| Síntoma | Causa probable |
|---|---|
| `Rappi scraper error` desde el panel | Microservicio caído o URL del scraper mal configurada en el API |
| `MENU_PAYLOAD_NOT_FOUND` | Rappi cambió HTML / Next.js; ya no hay `corridors` en `__NEXT_DATA__` |
| `RAPPI_AUTH_ERROR` | Falló passport/token invitado (bloqueo, cambio de endpoint) |
| Productos sin modificadores | `hasToppings: false` o toppings API en `api_error` — probar `fallbackToBrowser: true` |
| Restaurante `CLOSED` | Puede devolver datos incompletos; el panel puede mostrar warning sin bloquear |
| Import lento | Normal: un request HTTP por producto con toppings (N+1); `/catalog` tarda segundos |

---

## Qué no es este servicio

- **No** es API oficial de Rappi ni está avalado por ellos.
- **No** sincroniza pedidos ni estados de delivery Rappi (eso sería otra integración ERP).
- **No** sustituye Rest.pe/Yango — solo **importación de catálogo** desde la vitrina pública.
- Frágil ante cambios de Rappi (tokens, headers, modales, protección bot). Playwright es el plan B.

---

## Piezas clave

| Qué | Dónde |
|---|---|
| Servidor HTTP + rutas | entry Express del microservicio |
| Parseo `__NEXT_DATA__` | utilidad next-data + servicio menú |
| Token invitado Rappi | servicio auth invitado |
| Llamada toppings API | servicio toppings-api |
| Orquestación catálogo | servicio catalog (menú + toppings enriquecidos) |
| Fallback browser | servicio toppings (Playwright) |
| OpenAPI / Swagger | spec embebido + `/docs` |
| Cliente desde Agiliza | capa API Rappi en módulo integraciones ERP del API principal |

Posts relacionados: [integración Rest.pe](/blog/integracion-restaurant-pe-tres-capas/), [zonas km y polígonos](/blog/zonas-km-poligonos-cotizacion/).

Checklist operativo: scraper arriba → `GET /health` OK → URL Rappi válida `.com.pe/restaurantes/` → probar `POST /catalog` en `/docs` → import desde panel con local ya creado.
