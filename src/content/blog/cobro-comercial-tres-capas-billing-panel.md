---
title: "Nota para mí: cobro comercial en tres capas (billing → API → panel)"
description: "Cómo una app de cobranzas empuja snapshots a la API principal, el panel muestra gracia/bloqueo, sube comprobantes y corta el agente — patrón replicable para otros negocios."
pubDate: 2026-09-05
tags: ["agiliza360", "api", "panel", "nestjs", "billing", "cobranza"]
locale: es
draft: false
---

Cuando un SaaS cobra cuota mensual a marcas, **no conviene** que el panel lea Firestore/contratos en vivo ni que la API de producto sea el ERP. El patrón que usamos: **la app de cobranzas decide**, la **API principal ejecuta y guarda un snapshot**, el **panel solo muestra y sube comprobante**. Así puedo replicar el mismo esquema en otro negocio sin acoplar UI al ledger.

## Tres capas (quién hace qué)

```
┌─────────────────────────────────────────────────────────────┐
│  APP DE COBRANZAS (fuente de verdad comercial)               │
│  Contratos · cuotas · Tesorería · dunning · cola vouchers    │
│  Decide: status, paymentDue, cuentas, suspend/activate       │
└───────────────────────────────┬─────────────────────────────┘
                                │ webhooks autenticados
┌───────────────────────────────▼─────────────────────────────┐
│  API PRINCIPAL                                               │
│  Snapshot en Brand.commercialEntitlement                     │
│  Lock del agente (lockedBySuperadmin)                        │
│  Notificaciones category=payments · relay de voucher         │
│  GET billing/status → flags de UI                            │
└───────────────────────────────┬─────────────────────────────┘
                                │ JWT + brandId activo
┌───────────────────────────────▼─────────────────────────────┐
│  PANEL ADMIN                                                 │
│  Banner gracia · gate fullscreen · Mi plan · Estado cuentas  │
│  Subir comprobante · bloquear edición si uiLock              │
└─────────────────────────────────────────────────────────────┘
```

**Regla de oro:** el panel **nunca** consulta la app de cobranzas directo. Solo lee el snapshot que la API ya denormalizó en la marca.

### Puente de identidad: `subDomain`

Alta manual (no automatizada en v1):

1. Se cobra el setup fuera del producto (WhatsApp / transferencia).
2. En cobranzas: cliente + contrato con **`subDomain` = mismo string** que `Brand.subdomain` en la API.
3. Se entregan credenciales del panel.
4. El cron/dunning ya puede empujar consecuencias a esa marca.

Sin ese string compartido, suspend/activate y el snapshot no encuentran marca.

---

## Datos en cobranzas (qué modelar)

| Concepto | Rol |
|---|---|
| Cliente | Marca comercial + `subDomain` |
| Contrato | Plan, moneda, cuotas, vendedor, **IDs de cajas de cobro** |
| Cuotas (`installments`) | `Pending` / `Paid` / … con fecha y monto |
| Tesorería (`accounts`) | Cajas bancarias; flag **visible al cliente** |
| `paymentAccountIds` | Qué cajas del contrato se proyectan al gate |

### Cuentas de cobro = Tesorería

Una sola colección de cajas (PEN/USD, RUC, métodos tipo Yape/Plin). En el contrato se asignan IDs (`paymentAccountIds`). Al publicar snapshot, se **proyectan** a un DTO público:

```json
{
  "legalName": "Empresa Demo SAC",
  "taxId": "20XXXXXXXXX",
  "bankPen": { "bankName": "Banco Demo", "account": "000-000000", "cci": "…" },
  "bankUsd": { "bankName": "Banco Demo", "account": "000-000001" },
  "methods": [
    { "label": "Yape", "value": "999888777", "holder": "Empresa Demo" }
  ]
}
```

Compat: si un método se llama Yape, también se puede proyectar campo `yape` legacy. El panel renderiza `methods[]` y cae a `yape` si hace falta.

**Asignación masiva:** script que marca `paymentAccountIds` por moneda del contrato (PEN → caja soles, USD → caja dólares), o ambas si el producto lo pide.

---

## Snapshot `commercialEntitlement` (Mongo en la marca)

No copiar el contrato entero. Solo lo que el panel necesita:

| Campo | Uso |
|---|---|
| `status` | `ok` · `grace` · `overdue` · `suspended` · `pending_review` |
| `paymentDue` | `{ dueDate, amount, currency, contractId, installmentNumber, installmentStatus }` |
| `accounts` | Cuentas proyectadas (arriba) |
| `plan` | Resumen inicio/fin del contrato activo |
| `voucherPending` | Cliente ya subió comprobante; falta aprobación en cobranzas |
| `source` | Siempre la app de cobranzas |
| `updatedAt` | Último push |

**Separar** de cualquier `Brand.billing` fiscal (tipos de documento de factura del agente). Son dominios distintos.

### Endpoints que empuja cobranzas → API

| Acción | Efecto en API |
|---|---|
| Suspender | `lockedBySuperadmin=true` + status `suspended` (o el del snapshot) |
| Activar | unlock + status `ok` (conserva `plan` si existía) |
| Upsert snapshot | Actualiza entitlement **sin** tocar el lock del agente |
| Notificación D-n | Crea notif idempotente `category=payments` → socket panel |
| Voucher (relay) | Storage + marca `voucherPending` + reenvío a cola de cobranzas |

Auth: clave de servicio en header (no pegar el valor en notas). La API valida origen y `subDomain`.

---

## Línea de tiempo de mora (producto)

```
D-4 … D-1   gracia + paymentDue en snapshot
            → notifs panel (idempotentes por contrato:cuota:Dn)
            → banner “Pago pendiente… antes del {fecha}”
            → gate fullscreen SOLO bajo demanda (Subir comprobante)

Día 0 / overdue
            → uiLock = true (edición pausada)
            → gate fullscreen automático (sin dismiss fácil)
            → copy “Servicio suspendido… adjunta comprobante”

Corte agente
            → suspend: lockBySuperadmin + status suspended
            → el bot no opera hasta activate

Pago OK en cobranzas
            → activate + snapshot limpio (ok)
```

Días calendario en zona **America/Lima** (`daysUntilDue`). No mezclar con “días hábiles” salvo que el negocio lo pida.

### Flags de UI que calcula la API (`GET …/billing/status`)

| Flag | Significado |
|---|---|
| `uiLock` | Pausar edición de marca; permitir pagar |
| `showFullscreen` | Mostrar gate a pantalla completa |
| `canDismiss` | Owner puede cerrar el gate (gracia / SA); en vencido no |
| `canUpload` / `canViewAccounts` | Solo roles pagadores (Owner / SuperAdmin) |

Heurística útil:

- **Gracia** (`status=grace` + `paymentDue`): banner sticky; gate solo si el usuario fuerza abrir.
- **Vencido / suspendido / pending_review / dueReached**: `uiLock` + fullscreen.
- Supervisores (manager): ven mensaje de cuenta impaga **sin** cuentas ni upload.

El panel traduce copy (i18n). Ejemplo gracia:

> Pago pendiente. Adjunta tu comprobante antes del **{fecha}** para evitar la suspensión de tu agente.

Ejemplo bloqueo:

> Servicio suspendido. Adjunta tu comprobante de pago para reactivar tu agente.

---

## Panel: superficies

| Superficie | Quién | Qué |
|---|---|---|
| Banner sticky | Owner en marca | Gracia o uiLock; CTAs Subir / Ver plan; dismiss local |
| Gate fullscreen | Owner/SA | Monto, vencimiento, cuentas, dropzone voucher |
| Mi plan / Welcome | Owner multi-marca | Lista de estados por marca |
| Estado de cuentas | SuperAdmin | Listado filtrable de entitlements |
| Guard de escritura | Cualquier rol en marca | Bloquea mutaciones de config si `uiLock` (salvo apagar agente) |

### Upload de comprobante

1. Panel `POST` voucher (imagen) a la API con `brandId`.
2. API guarda archivo, marca `voucherPending`, relay a cobranzas.
3. Operador aprueba/rechaza en la cola de cobranzas.
4. Si aprueba y registra pago → activate + limpiar snapshot.
5. Si rechaza → quitar pending; el cliente puede re-subir.

Idempotencia: clave tipo `billing:{subDomain}:{contractId}:{n}:D{n}`.

---

## Flujo completo (ASCII)

```
[App cobranzas]  dunning cron
       │
       ├─ D-4..D-1 ──► POST notifications ──► panel campana
       │                 POST snapshot (grace + paymentDue + accounts)
       │
       ├─ Día 0 ─────► POST snapshot (overdue) ──► uiLock + gate
       │
       └─ Corte ─────► POST suspend ──► lock agente
                              │
[Panel] Owner sube voucher ───┤
                              ▼
                         API relay ──► cola vouchers (cobranzas)
                              │
                     Operador confirma pago
                              ▼
                         POST activate ──► unlock + status ok
```

---

## Cómo replicarlo en otro negocio

Checklist mínimo:

1. **ERP/cobranzas** con contratos, cuotas y cajas “visibles al cliente”.
2. **Clave compartida** marca ↔ contrato (`subDomain` o equivalente).
3. **API producto** con documento snapshot en la entidad marca + endpoints suspend / activate / snapshot / notify / voucher.
4. **Flags de UI** derivados del snapshot (no del ledger live).
5. **Panel**: banner + gate + upload + lista SuperAdmin; guard de escritura.
6. **Cron** en cobranzas: recordatorios + push snapshot; nunca “polling” desde el panel.
7. **Zona horaria** explícita para días hasta vencimiento.
8. **Roles**: quién paga vs quién solo ve aviso.

Anti-patrones que ya dolieron:

- Leer Tesorería en vivo desde el panel (el gate debe usar la copia del snapshot).
- Mezclar billing fiscal del agente con entitlement comercial.
- Auto-abrir gate en gracia (ruido); mejor banner + abrir a demanda.
- Auto-seleccionar siempre el primer contrato en UI de cobranzas (rompe filtros mentales); lista limpia + detalle bajo demanda.

---

## Archivos / capas clave (por rol, no paths)

| Capa | Responsabilidad |
|---|---|
| App cobranzas — contratos / Tesorería | Fuente de verdad; proyección de cuentas |
| App cobranzas — dunning / cron | Timelines D-n, suspend, activate, snapshot |
| App cobranzas — cola vouchers | Aprobación humana del comprobante |
| API — enforcement | Snapshot en marca, lock agente, flags UI |
| API — notificaciones | Idempotencia payments → socket |
| API — relay voucher | Storage + forward a cobranzas |
| Panel — billing status hook | Consume GET status |
| Panel — banner / gate / guards | UX gracia vs suspensión |
| Panel — i18n billing | Copy de banners y gate |

---

## Relacionado

- Roles y quién ve qué en el panel: [roles-panel-y-backend](/blog/roles-panel-y-backend/).
- Cuentas dinámicas hacia el agente (otro dominio, no confundir con cobro SaaS): [cuentas-bancarias-dinamicas-artemis](/blog/cuentas-bancarias-dinamicas-artemis/).
