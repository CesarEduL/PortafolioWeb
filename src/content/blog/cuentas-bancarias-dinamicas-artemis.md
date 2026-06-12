---
title: "Nota para mí: cuentas bancarias dinámicas en el agente de pedidos"
description: "Cómo el agente de pedidos construye medios de pago y cuentas bancarias por local, valida transferencias y envía los datos correctos al cliente."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "nestjs", "langchain", "agente", "pagos", "whatsapp"]
locale: es
draft: false
---

En Agiliza360 cada local configura sus medios de pago en el panel: efectivo, tarjeta, Yape, Plin, transferencias a BCP, BBVA, un banco “otro” con código custom, etc. El **agente de pedidos** no puede tener una lista fija en el prompt: tiene que leer lo que trae la sucursal, decírselo al LLM, validar lo que el cliente elige y, al confirmar el pedido, mandar **solo la cuenta que corresponde**.

Esta nota resume la lógica del módulo del agente y utilidades compartidas de pago.

## De dónde salen los datos

Todo parte del **branch efectivo** en sesión: la sucursal que el cliente eligió o la única disponible.

En `branch.paymentMethods` hay flags (`acceptsCashOnDelivery`, `acceptsBankTransfer`, `acceptsDigitalWallets`, …) y un array **`bankAccounts`**. Cada cuenta tiene:

- `type`: billetera (`YAPE`, `PLIN`, …), banco tradicional (`BANK`) u “otro banco” (`BANK_OTHERS`)
- `isActive`, `bankName`, `accountNumber`, `cciNumber`, `accountHolderName`, `qrCodeUrl`, etc.
- En `BANK_OTHERS`: un `bankcode` tipo `bank_banreservas` que el agente usa como clave de pago

Si el flag de transferencia está activo pero **no hay cuentas BANK activas**, no se ofrece transferencia. Misma idea con billeteras: el flag `acceptsDigitalWallets` no basta; tiene que existir al menos una cuenta wallet activa.

## Capa 1: texto para el LLM (prompt)

En cada turno, el orquestador del agente arma el bloque `branch_info` del prompt con:

```ts
utilidad de medios de pago del branch (...)
```

Eso genera la sección **Medios de pago** que ve el modelo (prompt principal del agente). Incluye:

- Métodos genéricos activos (efectivo, tarjeta, pago online)
- **Transferencias bancarias** con número, CCI, titular, IBAN/SWIFT si aplica
- **Billeteras digitales** con teléfono/correo/cashtag y aviso de QR si existe

Filtros importantes:

- Las billeteras se filtran por **país de la marca** (`getWalletTypesForCountry`): un restaurante en PE no ve Nequi en el prompt aunque alguien lo haya cargado mal en otra sucursal del grupo.
- En multilocal sin sucursal elegida, el texto es genérico: *“Varía por local; usa LOCALES_DISPONIBLES…”* — no se inventan cuentas.

El prompt también tiene reglas explícitas: si el cliente dice solo «transferencia» y hay **más de una** cuenta bancaria listada, el agente debe preguntar **qué banco** usar, citando solo las opciones del contexto.

## Capa 2: asignar cada cuenta a una clave `bank_*`

El catálogo base de métodos de pago trae decenas de claves `bank_bcp`, `bank_bbva`, … pero **qué claves son válidas en un pedido concreto** depende del local.

La función central está en la utilidad de mapeo cuenta → clave de pago:

```ts
buildTransferBankMethodAssignments(accounts)
// → [{ account, method: 'bank_bcp' }, { account, method: 'bank_bbva' }, …]
```

Lógica resumida:

1. Solo cuentas activas con `type === BANK` o `BANK_OTHERS`
2. Si es `BANK`: se mapea `bankName` normalizado → clave del catálogo (`BANK_PAYMENT_METHOD_BY_BANK_NAME`)
3. Si el nombre es “Otro banco” → `bank_otro`
4. Si es `BANK_OTHERS`: se usa el `bankcode` persistido (`bank_*` literal)

Eso alimenta el helper de assignments en todo el agente.

## Capa 3: enum dinámico de la tool de guardar pedido

La tool de guardar pedido no acepta cualquier string. Su schema Zod se construye **por conversación**:

```ts
const transferAssignments = findTransferBankMethodAssignments(effBranch);
const paymentLiterals = transferAssignments.map((a) => a.method);
// enum = métodos fijos + bank_* del local + alias compactos (bank_ban_reservas → bank_banreservas)
```

Así el LLM solo puede devolver códigos que existen en ese local. Antes de ejecutar, se normaliza con `resolveBankPaymentMethodToCanonical` para tolerar variantes sin guiones bajos.

## Capa 4: validar la elección del cliente

En el ejecutor de guardado de pedido, al validar `paymentMethod`:

1. Resuelve alias → clave canónica del assignment
2. Comprueba whitelist fija **o** clave presente en assignments del branch
3. Si es transferencia bancaria, llama a `resolveTransferBankMethodForOrder`:

| Cuentas activas | Comportamiento |
|---|---|
| 0 | Error si el cliente pidió banco |
| 1 | Se asigna sola aunque el cliente diga solo «transferencia» |
| 2+ | Exige banco concreto; si no, mensaje listando opciones |

Ejemplo de error útil cuando hay BCP y BBVA:

> *Hay varias cuentas bancarias en este local. Indica cuál usar para la transferencia: BCP, BBVA.*

En paralelo, el validador de mensajes usa matching texto → banco: si el cliente ya dijo «transferencia» y en el siguiente mensaje escribe «por BCP», se detecta el banco por nombre (sin acentos, tokens ≥ 3 letras) y se prellena el método en sesión antes de que el LLM guarde el pedido.

## Capa 5: enviar al cliente la cuenta correcta (post-orden)

Al crear la orden, **no** se reutiliza el bloque genérico del prompt. Se calcula texto específico del medio elegido:

```ts
utilidad que formatea solo la cuenta del método confirmado(...)
```

- Para `bank_bcp`: filtra assignments y formatea **solo** esa cuenta (número, CCI, titular)
- Para `yape` / `plin`: filtra wallets del mismo `type` activas
- Efectivo/tarjeta: cadena vacía (no hay cuenta que mostrar)

Además, el orquestador resuelve QR de billetera activos y los manda como **imágenes separadas** en WhatsApp (no URLs sueltas en el texto), una por cuenta si hay varias.

## Flujo mental en una sola frase

**Panel → `bankAccounts` del branch → texto resumido al LLM → enum `bank_*` dinámico en la tool → validación/desambiguación → datos de cuenta + QR solo del método confirmado.**

## Errores que ya nos mordieron (y cómo se evitan)

- **Ofrecer transferencia sin cuentas BANK activas** → `hasActiveBankTransferAccount` antes de listar o validar.
- **Confundir banco con tarjeta** → palabras clave de tarjeta (`visa`, `datáfono`) no incluyen nombres de banco; transferencia va por otro camino.
- **Varias cuentas, cliente vago** → prompt + `resolveTransferBankMethodForOrder` obligan a elegir banco; el validator puede inferirlo del texto.
- **Modelo inventa `bank_santander` en un local que solo tiene Interbank** → el enum de la tool no incluye claves que no estén en assignments; la validación devuelve error claro.
- **Multilocal sin sucursal** → no hay cuentas en contexto hasta elegir sucursal.

## Piezas clave

| Qué | Dónde (conceptual) |
|---|---|
| Texto MEDIOS DE PAGO en prompt | utilidad de info de pago |
| Cuenta concreta al confirmar | builder por método de pago |
| Mapeo cuenta → `bank_*` | utilidad transferencias |
| Enum dinámico de pago | tool guardar pedido |
| Validación al guardar | ejecutor de orden |
| Inferir banco del mensaje | matcher de texto |
| Reglas al LLM (transferencia) | prompt del agente |

Con esto, un mismo agente sirve para un local con solo Yape, otro con BCP + BBVA + Plin, y otro con un banco custom — sin redeploy ni prompts por cliente.
