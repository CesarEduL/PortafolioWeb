---
title: "Nota para mí: KM por distancia vs polígono dibujado vs Radio"
description: "Tres productos de cobertura: kilometraje por ruta, polígono a mano, y Radio (una zona con anillos/bandas). Cómo cotiza el API, exclusión por banda, y qué no mezclar al depurar."
pubDate: 2026-07-22
tags: ["agiliza360", "api", "panel", "nestjs", "artemis", "delivery", "zonas", "kilometraje", "maps"]
locale: es
draft: false
---

Hay **tres** formas de cobro/cobertura que conviene no mezclar. Antes el panel guardaba “km” como anillos en Mongo y el API a veces cotizaba por polígono aunque el tipo dijera kilometraje. Hoy el modelo vuelve a ser claro: **KM = distancia de ruta**, **polígono = geometría** (dibujar o Radio).

> **Datos ficticios:** tarifas, calles y coordenadas de los ejemplos son placeholders.

---

## Modelo en una tabla

| Producto | `coverageType` | Qué guarda | Cómo cotiza |
|---|---|---|---|
| **Por kilómetros** | `kilometrage` | Solo `distanceRange[]` numérico (min/max km, fee, tiempo). **Sin** geometría. | Distancia de ruta local→cliente cae en una banda → `deliveryFee` |
| **Polígono Dibujar** | `polygon` | Un `polygonRoute` + `deliveryAmount` (+ `isExclusion` de zona si aplica) | Point-in-polygon → fee fijo |
| **Polígono Radio** | `polygon` | **Una** zona: `distanceRange[]` con `polygonRoute` por banda + `polygonRoute` raíz = anillo exterior | Anillo **más interno** que contiene el GPS → fee de esa banda (o exclusión) |

Radio **no** crea N zonas con nombre “0–1 km”, “1–2 km”. Es una zona con nombre único y N rangos (como el KM antiguo en UX, pero la evaluación es geométrica).

---

## Dónde vive cada pieza

```
┌──────────────────────────────────────────────────────────────────┐
│  PANEL ADMIN                                                      │
│  Cobertura → crear/editar                                         │
│  KM: bandas por km (preview de anillos solo en memoria)           │
│  Polígono: Dibujar | Radio (anillos editables + rangos)           │
│  Partners: misma semántica (KM / Dibujar / Radio)                 │
└───────────────────────────────┬──────────────────────────────────┘
                                │ POST/PATCH zonas + quotes
┌───────────────────────────────▼──────────────────────────────────┐
│  API PRINCIPAL                                                    │
│  CoverageZone / DeliveryPartnerZone                               │
│  Cotización + nearby: PIP, bandas Radio, KM por ruta              │
└──────────────────────────────────────────────────────────────────┘
```

| Pieza | Rol |
|---|---|
| Formulario KM | Bandas numéricas; no persiste `polygonRoute` |
| Formulario polígono | Toggle Dibujar / Radio; Radio usa lista de rangos + mapa multi-anillo |
| Cotización | Primero exclusiones/polígonos; si no hay match, KM por ruta |
| WhatsApp / Artemis | Consume quotes; no recalcula bandas |

---

## KM — solo distancia de ruta

Payload típico (idea):

```ts
{
  coverageType: "kilometrage",
  distanceRange: [
    { minDistance: 0, maxDistance: 2, deliveryFee: 5, estimatedTime: 25 },
    { minDistance: 2, maxDistance: 5, deliveryFee: 9, estimatedTime: 40 },
  ],
  // sin polygonRoute
}
```

Flujo:

```
GPS cliente
  → ruta Google/OSRM (distanceKm)
  → banda donde min ≤ distanceKm ≤ max
  → deliveryFee
```

En el mapa del panel los “círculos” de KM son **preview**: se generan en cliente para orientar; no definen cobertura en Mongo.

---

## Polígono Dibujar — un área, un precio

```ts
{
  coverageType: "polygon",
  polygonRoute: [/* ≥ 3 puntos */],
  deliveryAmount: 6.5,
  estimatedDeliveryTime: "25-35 min",
  isExclusion: false, // exclusión de zona completa
}
```

Si el pin cae dentro → `deliveryAmount`. Si `isExclusion: true` en la zona → rechazo de cobertura (`EXCLUDED_ZONE`), no se cae a KM.

---

## Polígono Radio — una zona, N anillos

Misma `coverageType: 'polygon'`, pero con `distanceRange` geométrico:

```ts
{
  coverageType: "polygon",
  polygonRoute: [/* anillo exterior */],
  deliveryAmount: 3, // suele alinearse con la banda más interna cobrable
  distanceRange: [
    {
      minDistance: 0,
      maxDistance: 0.4,
      deliveryFee: 0,
      estimatedTime: 0,
      isExclusion: true,
      polygonRoute: [/* anillo interno */],
    },
    {
      minDistance: 0.4,
      maxDistance: 1.2,
      deliveryFee: 7,
      estimatedTime: 35,
      isExclusion: false,
      polygonRoute: [/* anillo exterior */],
    },
  ],
}
```

### Cómo elige banda el API

1. ¿El punto está dentro del polígono exterior (`polygonRoute` raíz)? Si no → fuera de esta zona.
2. Entre las bandas con `polygonRoute`, elige la **más interna** (menor `maxDistance`) cuyo polígono contiene el GPS.
3. Si esa banda tiene `isExclusion: true` → **excluido** (no fallback a KM).
4. Si no → `deliveryFee` / tiempo de esa banda.

Orden ascendente por `maxDistance`: si el pin cae en el anillo 1 y en el 2, gana el **1**.

Deformar un anillo en el mapa (Leaflet o Google) cambia **qué banda** aplica; no confundir con km de ruta.

---

## Orden de cotización (resumen)

```
Activas + horario
    │
    ▼
Exclusiones polígono (zona isExclusion o banda Radio isExclusion)
    │ hit → EXCLUDED_ZONE
    ▼
Match polígono cobrable (Dibujar fee fijo | Radio banda)
    │ hit → quote geométrico
    ▼
Match KM por distanceKm de ruta
    │ hit → quote kilometrage_*
    ▼
Sin cobertura
```

**Importante:** exclusión por banda Radio **no** debe caer a una zona KM de la misma sucursal. Es “aquí no entregamos”, no “prueba el otro método”.

---

## Ejemplo de depuración: exclusión del anillo interno

Escenario ficticio:

- Zona Radio: 0–0,4 km exclusión; 0,4–1,2 km fee **F2**.
- Pin a ~250 m del local (dentro del anillo interno).

| Criterio | Resultado |
|---|---|
| Solo mirar km de ruta (&lt; 0,4) | Podría confundirse con “banda barata” ❌ |
| Banda más interna (exclusión) | `EXCLUDED_ZONE` ✓ |
| Pin a 800 m (solo anillo exterior) | Fee **F2** ✓ |

---

## Migración de datos híbridos

Zonas viejas `kilometrage` + `polygonRoute` (o bandas con geometría) se alinean con un script de split:

| Caso | Acción típica |
|---|---|
| KM + geometría por banda | → `polygon` formato **Radio** |
| KM + `distanceRange` sin geometría | → KM puro (quita `polygonRoute` residual) |
| KM + polígono sin bandas útiles | → `polygon` Dibujar |

Correr primero en dry-run; revisar skips ambiguos a mano.

Para QA en DEV tras un restore: seed con tag `[QA-SEED]` (KM, dibujado, Radio simple, Radio con exclusión de banda).

---

## Partners

Misma semántica que cobertura propia:

- KM → `distanceRange` numérico.
- Dibujar → `polygonRoute` + `deliveryAmount` (+ exclusión de zona).
- Radio → `distanceRange` con anillos + `isExclusion` por banda.

El modal de partners en panel admite toggle Dibujar / Radio alineado al flujo de cobertura.

---

## Errores frecuentes

1. **Tratar Radio como “varios KM”** — es polígono; cotiza por PIP de anillo, no por `distanceKm` de ruta.
2. **Deformar solo el interior y esperar menos cobertura máxima** — el alcance lo marca el anillo exterior.
3. **Esperar fallback a KM tras exclusión de banda** — no: exclusión corta el camino.
4. **Reintroducir `polygonRoute` en create KM** — el API debe rechazarlo o ignorarlo; el panel no lo envía.
5. **Olvidar guardar** tras deformar anillos — quotes leen Mongo.

---

## Checklist al depurar un “precio raro”

1. ¿`coverageType` de la zona en Mongo?
2. Si Radio: ¿qué anillo contiene el pin? ¿esa banda es exclusión?
3. Si KM: ¿`distanceKm` de la respuesta cae en qué `min`/`max`?
4. ¿Hay otra zona polígono más específica (PIP) que ganó antes que el KM?
5. ¿Seed/migración dejó un híbrido sin migrar?

---

## Archivos clave (capa / rol)

| Capa | Qué mirar |
|---|---|
| API — cotización | Quote por set de zonas; outcome Radio (`ok` / `excluded` / `miss`) |
| API — util bandas | Resolver anillo más interno + `isExclusion` |
| API — persistencia | Create/update polígono con `distanceRange` opcional; KM sin geometría |
| API — scripts | Split híbridos; seed QA cobertura |
| Panel — formularios | KM bandas; polígono Dibujar/Radio; lista de rangos Radio |
| Panel — mapas | Anillos editables (todos) en Leaflet/Google |
| Panel — listado | Labels Polígono vs Polígono Radio; badge exclusión por rango |
| Panel — partners | Create/update zonas KM / Dibujar / Radio |
| Carta pública | Solo consume endpoint de quotes (sin PIP local) |

Cuando el precio no cuadre: dibujar en el mapa **qué anillo o qué km de ruta** explica el fee **antes** de culpar al proveedor de rutas.
