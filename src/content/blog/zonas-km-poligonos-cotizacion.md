---
title: "Nota para mí: cotización por kilómetros con círculos y polígonos deformados"
description: "Cómo el panel guarda bandas de km como polígonos, cómo Artemis cotiza con cobertura exterior + precio por banda (incluidas exclusiones deformando el anillo interior), y qué no confundir con la distancia de ruta."
pubDate: 2026-06-12
tags: ["agiliza360", "api", "panel", "nestjs", "artemis", "delivery", "zonas", "kilometraje", "maps"]
locale: es
draft: false
---

Las zonas **Por kilómetros** ya no son solo “calcular distancia y buscar una banda en un array”. El panel dibuja **anillos concéntricos** (1 km, 2 km, 3 km…) como polígonos editables, puedes **deformarlos** (incluir o excluir calles) y el API cotiza en dos pasos: **¿hay cobertura?** y **¿qué precio de banda aplica?**. Esta nota es para no mezclar esas dos cosas cuando depuro un caso raro en WhatsApp.

> **Datos ficticios:** calles, distritos, tarifas y coordenadas de los ejemplos son placeholders; no corresponden a un local real publicado.

---

## Dónde vive cada pieza

```
┌──────────────────────────────────────────────────────────────────┐
│  PANEL (panel-admin-ag360ai)                                      │
│  CoverageZones → EditZoneModal / KmZoneForm                       │
│  KmCircleMap: anillos, vértices, clic en borde para nuevo punto   │
│  Guardado: zone.polygonRoute + distanceRange[].polygonRoute       │
└───────────────────────────────┬──────────────────────────────────┘
                                │ PATCH zona / POST km
┌───────────────────────────────▼──────────────────────────────────┐
│  API (ssgg)                                                       │
│  CoverageZone en Mongo (coverageType: kilometrage)                │
│  DeliveryQuoteService.quoteZoneSet → Artemis / POST quotes        │
└──────────────────────────────────────────────────────────────────┘
```

| Pieza | Repo | Rol |
|---|---|---|
| Mapa editable | `KmCircleMap.tsx` | Pinta anillos, vértices encima, inserta puntos en el borde |
| Formulario km | `EditZoneModal.tsx` | Bandas (`kmBands`), guardado por banda |
| Cotización | `delivery-quote.service.ts` | Point-in-polygon + banda más interna |
| WhatsApp | `delivery-flow.service.ts` | Llama `findQuotes` con GPS del cliente |

---

## Qué guarda el panel al editar una zona km

Al guardar en **Editar zona → Kilometraje**, el payload ordena las bandas por `maxDistanceKm` y persiste:

1. **`distanceRange[]`** — cada banda con `minDistance`, `maxDistance`, `deliveryFee`, `estimatedTime` y su propio **`polygonRoute`** (forma del anillo en el mapa).
2. **`zone.polygonRoute`** — copia del polígono de la **banda más externa** (la de mayor km). Ese polígono define **cobertura global** en el API.

```ts
// EditZoneModal — idea del guardado
const distanceRange = sortedBands.map((band, idx) => ({
  minDistance: idx === 0 ? 0 : sortedBands[idx - 1].maxDistanceKm,
  maxDistance: band.maxDistanceKm,
  deliveryFee: Number(band.deliveryFee),
  estimatedTime: Number(band.estimatedTime),
  polygonRoute: cleanPolygonRoute(band.polygonRoute),
}));
const polygonRoute = cleanPolygonRoute(outermostBand.polygonRoute);
```

Si una banda no tiene puntos válidos, se regenera un círculo perfecto con `generateCirclePolygon(centroSucursal, radioMetros)`.

**Importante:** deformar solo el Rango 1 (azul) **no cambia la cobertura máxima** si el polígono exterior (último rango) sigue siendo un círculo de 4 km. La deformación del anillo interior sí cambia **qué precio de banda** aplica cuando el API usa polígonos por banda.

---

## Mapa: círculos, deformación y vértices

`KmCircleMap` pinta en dos capas:

1. **Polígonos** — de exterior a interior (para que el anillo pequeño reciba clics).
2. **Vértices** — siempre encima (`zIndex` alto), arrastrables.

Clic en un borde → `findEdgeInsertAt` (tolerancia ~45 m) → `insertVertexAt` en el estado de la banda.

Detalles que me costaron un bug:

- Las claves de marcadores en Google Maps usan **`pt.id` estable**, no el índice del vértice (si no, al insertar un punto los demás parpadean o desaparecen).
- `branchCenter` en `EditZoneModal` va con **`useMemo`**; si no, un `useEffect` que recarga `kmBands` desde la zona se dispara en cada render y **borra** el vértice que acabas de añadir.

---

## Cómo cotiza el API (dos preguntas)

Cuando Artemis (o `POST /delivery-pricing/quotes`) pide precio para un GPS:

```
GPS cliente
    │
    ▼
¿Dentro de zone.polygonRoute (polígono EXTERIOR)?
    │ no  → OUT_OF_POLYGON
    ▼ sí
¿Zona activa, horario, exclusiones?
    │
    ▼
Calcular ruta Google/OSRM (solo para distanceKm, ETA y método)
    │
    ▼
¿Qué banda de precio?  → resolveKmBandQuote
    │
    ▼
Precio = deliveryFee de esa banda
```

### Paso 1 — Cobertura

`findPolygonCoverageZone` usa **solo** `zone.polygonRoute` (anillo exterior guardado) con Turf `booleanPointInPolygon`. Si el cliente está fuera de ese polígono, no hay cotización aunque esté “cerca” en línea recta.

### Paso 2 — Precio por banda

`resolveKmBandQuote` elige la tarifa así:

| Condición | Método |
|---|---|
| Alguna banda tiene `polygonRoute` guardado (≥ 3 puntos) | **Polígono**: banda **más interna** cuyo polígono contiene el GPS |
| Zona legacy sin polígonos por banda | **Ruta**: km de Google/OSRM contra `minDistance` / `maxDistance` |

```ts
// Banda más interna que contiene el punto
for (const band of bandsOrdenadasPorMaxKmAsc) {
  const poly = band.polygonRoute?.length >= 3
    ? band.polygonRoute
    : turf.circle(sucursal, band.maxDistance, { units: 'kilometers' });
  if (pointInPolygon(cliente, poly)) return band.deliveryFee;
}
```

Orden **ascendente** por `maxDistance`: si el punto cae en el Rango 1 y en el 2, gana el **1** (más interno). Si deformaste el Rango 1 para **sacar** una calle, ese punto no entra en el polígono del Rango 1 y el bucle sigue hasta el Rango 2.

**No usar distancia de ruta para la banda** cuando hay polígonos guardados: un cliente a ~0,95 km por carretera pero **fuera** del polígono deformado del Rango 1 debe pagar la tarifa del Rango 2, no la del 1.

La distancia de ruta sigue usándose para:

- `distanceKm` y `durationMinutes` en la respuesta de cotización
- `pricingMethod`: `kilometrage_google` / `kilometrage_osrm`
- Validación de distancia máxima del partner

---

## Ejemplo de depuración: excluir una calle del Rango 1

Escenario ficticio:

- Sucursal en **zona urbana** (coordenadas omitidas).
- Rangos: 0–1 km → **tarifa R1**, 1–2 km → **tarifa R2** (valores configurados en el panel, no publicados aquí).
- **Deformé el polígono del Rango 1** para que **no** cubra la **Calle Norte** (queda solo dentro del anillo de 2 km).
- GPS de prueba en esa calle: ruta Google ≈ **0,95 km** (por debajo del límite de 1 km en carretera).

| Criterio | Resultado |
|---|---|
| Solo km de ruta (&lt; 1 km) | Rango 1 → tarifa **R1** ❌ (incorrecto para este caso) |
| Polígono Rango 1 (deformado, sin la calle) | `inside: false` |
| Polígono Rango 2 | `inside: true` → tarifa **R2** ✓ |

Tras guardar la zona con `distanceRange[0].polygonRoute` deformado, el API debe devolver el `deliveryFee` del Rango 2 aunque `distanceKm` en la respuesta siga siendo ~0,95.

---

## Flujo Artemis

`DeliveryFlowService.getDeliveryCostForBrand` llama a `DeliveryQuoteService.findQuotes` con el subdominio de la marca y las coordenadas del cliente. Artemis no calcula bandas por su cuenta: solo muestra el `price` y `estimatedTime` del primer quote aceptado.

Si el cliente dice “me cobró mal el envío”, revisar en este orden:

1. ¿El polígono exterior incluye su GPS? (cobertura)
2. ¿`distanceRange[i].polygonRoute` del Rango 1 en Mongo coincide con lo del panel?
3. ¿La cotización usó polígono de banda o fallback por ruta? (zonas sin `polygonRoute` por banda siguen en modo legacy)

---

## Tests que me sirven de regresión

En `delivery-quote.service.spec.ts`:

- Multi-banda con `polygonRoute` exterior y `distanceRange` (precio por km de ruta en legacy).
- Polígono deformado: dentro cotiza, fuera rechaza.
- **Banda 1 excluye cliente, ruta &lt; 1 km** → precio de banda 2 (caso de exclusión por polígono).

```bash
cd ssgg && npm test -- --testPathPattern=delivery-quote.service.spec
```

---

## Errores frecuentes (checklist)

1. **Confundir cobertura con precio** — deformar el anillo interior no reduce el alcance máximo salvo que deformes también el **último rango**.
2. **Esperar Rango 2 solo porque “se ve lejos” en el mapa** — la línea recta puede ser &lt; 1 km; mira el polígono guardado, no solo la escala visual.
3. **Olvidar guardar** después de deformar — el API lee Mongo, no el estado del modal.
4. **Zona legacy sin `polygonRoute` por banda** — el API sigue emparejando por km de **ruta**; migrar guardando polígonos por banda en el panel.
5. **Hot-reload del panel** — tras cambios en `branchCenter` / efectos de carga, verificar que los vértices insertados persisten antes de cotizar.

---

## Archivos clave (para la próxima vez)

| Archivo | Qué mirar |
|---|---|
| `ssgg/.../delivery-quote.service.ts` | `quoteZoneSet`, `findInnermostKmBandByPolygon`, `resolveKmBandQuote` |
| `ssgg/.../delivery-quote.service.spec.ts` | Casos deformados y exclusión por banda |
| `panel-admin-ag360ai/.../EditZoneModal.tsx` | `kmBands`, `handleSubmit`, `insertBandVertex` |
| `panel-admin-ag360ai/.../KmCircleMap.tsx` | Capas polígono/vértices, `handleEdgeClick` |
| `panel-admin-ag360ai/.../polygonEdgeUtils.ts` | Inserción de vértice en borde |
| `ssgg/docs/migration-km-to-polygon.md` | Contexto migración km → polígono |

Cuando vuelva a tocar esto: si el precio no cuadra, dibujar en el mapa qué anillo contiene el pin del cliente **antes** de culpar a Google Routes.
