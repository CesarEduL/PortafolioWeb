---
title: "Nota para mí: Print Bridge — impresión local sin diálogo del navegador"
description: "App local WebSocket → impresora térmica ESC/POS: cómo el API adjunta thermalPrint, el panel lo reenvía por ws://127.0.0.1:17880 y el bridge imprime en caja."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "panel", "impresion-local", "websocket", "electron", "operaciones"]
locale: es
draft: false
---

El panel web corre en el navegador y el **API principal** en la nube, pero la **impresora térmica** está en la PC de caja (USB o red local). El navegador **no puede** mandar bytes ESC/POS en silencio: abriría el diálogo de impresión o no vería la impresora.

**Print Bridge** es la app local que cierra ese hueco: el panel (misma PC) le habla por WebSocket y el programa manda el ticket a Windows/macOS/Linux **sin ventanas del browser**.

## Flujo completo (nube → caja → papel)

```
Pedido cambia de estado en el API principal
        ↓
API adjunta thermalPrint al evento Socket.io (order_created / order_status_changed)
        ↓
Panel en Operaciones recibe el evento (misma marca / sucursal)
        ↓
Si «Prender impresión» está activo → WebSocket ws://127.0.0.1:17880
        ↓
Print Bridge: cola serial → ESC/POS o PDF → impresora del sistema
```

**Condición crítica:** panel y Print Bridge en **la misma máquina**. No hay túnel desde internet hasta la impresora.

| Pieza | Dónde vive | Puerto / rol |
|---|---|---|
| Payload del ticket | Orquestador de pedidos + mapper térmico | — |
| Auto-impresión | Contexto socket + contexto bridge del panel | Envía al bridge |
| Bridge WS | App local (servidor WebSocket) | **17880** |
| Config impresora | App local (mini servidor HTTP) | **17881** |
| Impresión manual | Detalle de pedido en Operaciones | Mismo WS |

---

## Cuándo imprime el API

El orquestador de pedidos decide si el evento lleva `thermalPrint`:

| Config chatbot (comprobante de billetera) | Estado nuevo | `triggerStatus` |
|---|---|---|
| **No** pide comprobante | Pre Orden | `PREORDER` |
| **Sí** pide comprobante | Aceptado | `ACEPTED` |
| Cualquier otro estado | — | *sin ticket* |

El mapper térmico arma el JSON: ítems, totales, cliente, dirección, layout del ticket (full/kitchen), etc.

El panel **no reconstruye** el ticket en auto-impresión: confía en lo que viene en el socket (salvo PDF para impresora regular, ver abajo).

---

## Capa panel — recibir y reenviar

### Contexto del bridge

- Lee la **URL WebSocket del bridge** desde config de build del panel (típico `ws://127.0.0.1:17880`).
- Ping periódico (`ping` → `pong`).
- Toggle **Prender impresión** persistido en el navegador (flag local).

### Auto-impresión vía socket

En `order_created` y `order_status_changed`:

1. Filtra por marca activa.
2. Si impresión desactivada → no envía.
3. **Dedupe** 8 s por `orderNumber:triggerStatus`.
4. Impresora **regular** (láser/inkjet): pide PDF al API y adjunta `pdfBase64`.
5. Abre WS, envía job `print` v1, espera `{ ok: true }`.

### Impresión manual

Desde detalle de pedido: mismo protocolo WS con payload construido en el panel.

### Descarga del instalador

En **Datos de marca → Impresión en caja**: URL del instalador **embebida en el build del panel** (no en la PC del restaurante).

---

## Capa bridge — tres piezas internas

```
┌─────────────────────────────────────────────────────────────┐
│  ENTRADA — WebSocket :17880, ping/pong, job print v1       │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  COLA + FORMATO — serial, full/kitchen/both, ESC/POS o PDF  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  SALIDA OS — spooler RAW (Windows) o CUPS (Linux/macOS)     │
└─────────────────────────────────────────────────────────────┘
```

### 1. Servidor WebSocket

- Solo `127.0.0.1:17880`.
- Valida `type: print`, `version: 1`, objeto `thermalPrint`.
- Modo auto local: ticket completo, cocina o ambos.
- Estados: `ready`, `no-printer`, `printing`, `error`.

### 2. Cola y formato

**Cola serial:** un ticket a la vez.

**Térmica:** buffer ESC/POS según layout de marca; cocina sin precios; ancho de línea 58/80/112 mm; reintentos.

**Regular:** imprime PDF (`pdfBase64`); el panel debe haberlo obtenido del API antes.

### 3. Salida al SO

| SO | Térmica | PDF |
|---|---|---|
| Windows | spooler RAW | impresión PDF |
| Linux / macOS | CUPS raw | — |

Config local en JSON del usuario; UI en `http://127.0.0.1:17881`.

---

## Electron en Windows

Bandeja del sistema, single instance, ticket de prueba, logs, autoarranque. Mac/Linux: binario consola con la misma lógica WS/UI.

---

## Protocolo WebSocket (v1)

**Ping:** `{ "type": "ping" }` → `{ "ok": true, "type": "pong" }`

**Imprimir:** `{ "type": "print", "version": 1, "thermalPrint": { … } }` → `{ "ok": true }`

Campos clave: `triggerStatus`, `ticketType` (`full` | `kitchen`), `ticketConfig`, `pdfBase64` (solo regular).

---

## Errores habituales

| Síntoma | Causa habitual |
|---|---|
| «Bridge no responde» | App no en bandeja, puerto ocupado, otra PC |
| Ticket doble | Dedupe 8 s no aplicó (distinto triggerStatus) |
| «Requiere PDF» | Impresora regular sin PDF en el payload |
| Impresora offline | Revisar log local del bridge |
| Botón descarga gris | URL del instalador no incluida en build del panel |

---

## Despliegue (resumen)

1. Publicar instalador del bridge (setup + portable).
2. Panel: en CI, URL de descarga + URL WebSocket del bridge → redeploy.
3. API: sin config extra; lógica en orquestación de pedidos.
4. Restaurante: instalar → bandeja → `:17881` → **Prender impresión** en Operaciones.

---

## Piezas clave (por capa)

| Qué | API principal | Panel | App local |
|---|---|---|---|
| Armar payload | mapper + orquestador | — | — |
| Disparo auto | — | socket + contexto bridge | — |
| WS + cola | — | — | bridge |
| Ticket ESC/POS | — | — | formateador |
| Config UI | — | Datos marca → impresión | UI :17881 |
| Manual | — | detalle pedido | — |
| Tray Windows | — | — | shell Electron |

Posts relacionados: [roles panel ↔ API](/blog/roles-panel-y-backend/), [pagos agente](/blog/cuentas-bancarias-dinamicas-artemis/).

Checklist caja: bandeja activa → misma PC → Prender impresión → impresora en :17881 → socket trae `thermalPrint` → log del bridge.
