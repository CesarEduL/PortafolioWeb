---
title: "Nota para mí: LangSmith en Artemis (runName y debugging)"
description: "Cómo el agente Artemis registra cada turno en LangSmith, qué es el runName, qué metadata va con la traza y cómo usarlo para depurar pedidos WhatsApp."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "langchain", "langsmith", "artemis", "observabilidad", "agente", "whatsapp"]
locale: es
draft: false
---

**Artemis** es el agente LangChain de pedidos por WhatsApp. Cada turno que pasa por `agent.invoke()` puede generar un **run** en LangSmith — un registro con el prompt, las tool calls, los resultados y la latencia. Esta nota es solo sobre **cómo Artemis lo registra** y **cómo leer la UI** para debug, no sobre otros agentes del API.

---

## Cuándo Artemis manda traza (y cuándo no)

```
WhatsApp → orquestador de mensajes → Artemis.processMessage()
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │ Salida temprana SIN invoke (NO hay run LangSmith) │
                    │  · welcome forzado al primer mensaje              │
                    │  · otros returns antes del grafo LangChain         │
                    └───────────────────────────────────────────────────┘
                                              │
                    buildLangSmithInvokeConfig({ projectKey: 'artemis', ... })
                                              │
                    agent.invoke({ messages }, invokeConfig)  ← AQUÍ nace el run
                                              │
                    LangChainTracer → proyecto LangSmith "Artemis"
```

Condiciones para que exista traza:

1. El mensaje llegó a **`Artemis.processMessage`** y pasó los early returns (welcome, etc.).
2. En el `.env` del API: **`LANGSMITH_TRACING=true`** y **`LANGSMITH_API_KEY`** válida.
3. El segundo argumento de `invoke` lleva el config construido por **`buildLangSmithInvokeConfig`**.

Si tracing está apagado, Artemis responde igual; simplemente no hay callbacks.

Proyecto destino: variable **`LANGSMITH_PROJECT_ARTEMIS`** → fallback **`LANGSMITH_PROJECT`** → default `"Artemis"`.

---

## Qué registra Artemis en cada turno

Justo antes del `invoke`, el orquestador de Artemis arma el config así:

```ts
const invokeConfig = buildLangSmithInvokeConfig(configService, {
  threadId: agentState?.threadId?.toString(),
  subdomain: incomingMessage?.subDomain,
  runName: incomingMessage?.clientPhone ?? 'unknown',
  currentAgent: agentState?.currentAgent,
  projectKey: 'artemis',
});

await agent.invoke({ messages: messagesForInvoke }, invokeConfig);
```

Eso se traduce en lo que LangSmith guarda en el **run raíz** del turno:

| Campo en código | Dónde aparece en LangSmith | Valor en Artemis |
|---|---|---|
| `runName` | **Nombre del run** en la lista de trazas | Teléfono del cliente (`incomingMessage.clientPhone`) |
| `metadata.thread_id` | Metadata / filtros | `_id` del hilo Mongo (`agentState.threadId`) |
| `metadata.subdomain` | Metadata / filtros | Subdominio de la marca (`incomingMessage.subDomain`) |
| `metadata.current_agent` | Metadata / filtros | Valor de `agentState.currentAgent` en ese turno |
| `callbacks` | Proyecto al que se envía | `LangChainTracer({ projectName: 'Artemis' })` |
| *(implícito)* | Inputs del run | `messages`: historial + mensaje humano enriquecido del turno |
| *(implícito)* | Outputs del run | Respuesta final del grafo (texto + tool messages encadenados) |

**Un turno de WhatsApp = un run raíz.** Si el cliente manda cinco mensajes y los cinco pasan por `invoke`, verás **cinco runs** en LangSmith (mismo `runName` si es el mismo teléfono).

---

## Qué es el `runName` y por qué es el teléfono

En Artemis elegimos **`runName = clientPhone`** a propósito:

- Es lo primero que tienes cuando alguien reporta un bug (“el bot me confirmó mal el pedido, mi número es …”).
- En la UI de LangSmith, la columna de nombre del run muestra ese string — puedes **buscar por texto** sin abrir Mongo.
- Coincide con el log del API: `🤖 [Artemis] Simple Order para ${clientPhone}`.

Formato típico: dígitos del WhatsApp tal como llega del proveedor (`51987654321`, a veces con `+`). **No lo normalizamos** en el runName; si buscas en LangSmith, prueba con y sin `+`.

### Limitación importante

Varios runs distintos pueden compartir el **mismo runName** (mismo cliente, distintos turnos o días). El teléfono identifica **quién**, no **qué mensaje concreto**.

Para agrupar **toda una conversación**, usa metadata:

```
metadata.thread_id = "674a1b2c3d4e5f6789012345"
```

Ese `thread_id` es el documento de hilo en Mongo; se asigna una vez en el orquestador (`validateAndAssignThread`) y se reutiliza mientras dure la sesión del agente.

| Necesitas… | Filtra por… |
|---|---|
| “¿Qué pasó con el cliente X?” | `runName` / búsqueda por teléfono |
| “¿Qué pasó en **esta** conversación?” | `metadata.thread_id` |
| “¿Qué pasó en la marca Y?” | `metadata.subdomain` |
| “¿Era Artemis u otro sub-agente?” | `metadata.current_agent` |

---

## Qué muestra LangSmith por dentro (run Artemis)

Vista simplificada de un turno típico con búsqueda + carrito:

```
Run name: 51987654321                          ← runName (teléfono)
Project:  Artemis
Metadata: thread_id, subdomain, current_agent

├── Chain / Agent (grafo LangChain)
│   ├── LLM — system prompt + historial + branch_info, carrito, pagos…
│   ├── Tool: artemis_search_products_simple
│   │   └── product_search_semantic_filter_ids   ← sub-run (gpt-4o-mini filtra IDs)
│   ├── LLM — lee resultado de búsqueda
│   ├── Tool: artemis_update_cart
│   └── LLM — respuesta al cliente
```

**Sub-runs:** las tools reciben el `config` de LangChain y lo pasan como `langchainConfig` al servicio de búsqueda. Así el filtro semántico no queda invisible — aparece anidado bajo la tool con nombre fijo **`product_search_semantic_filter_ids`**.

Artemis no pone el teléfono en esos sub-runs; heredan el contexto del padre. El **runName del teléfono** solo aplica al run raíz del `invoke`.

---

## Flujo de debugging con runName (caso real)

**Entrada:** soporte dice “cliente `51912345678`, marca `demo-rest`, pidió lomo y el bot confirmó sin modificadores”.

1. Abrir [smith.langchain.com](https://smith.langchain.com) → proyecto **Artemis**.
2. Buscar en la lista de runs **`51912345678`** (o filtrar `subdomain = demo-rest` si hay muchos homónimos).
3. Ordenar por **fecha** y abrir el run del turno donde el cliente confirmó (timestamp ≈ hora del reporte).
4. En el run raíz:
   - **Inputs** → ¿el system prompt tenía sucursal, mínimo de pedido, medios de pago?
   - **Tool calls** → ¿llamó `artemis_update_cart` con los `modifierIds` correctos?
   - **Tool output** → ¿devolvió error en texto plano que el modelo ignoró?
5. Si el bug es de catálogo → expandir **`product_search_semantic_filter_ids`** y ver qué IDs devolvió el mini-modelo.
6. Si hace falta el hilo completo → copiar `thread_id` del metadata y filtrar todos los runs de esa conversación (turno anterior donde eligió mal el producto).

**Comparar antes/después de un cambio de prompt:** mismo `thread_id`, dos runs con timestamps distintos — misma metadata, distinto contenido de LLM input.

---

## Errores que Artemis deja claros en la traza

| Síntoma reportado | Dónde mirar en el run |
|---|---|
| Confirmó pedido que no quedó en carrito | Tool `artemis_update_cart` / `artemis_save_order` — output vs input |
| Precio o moneda rara | Output de `artemis_search_products_simple` + sub-run semántico |
| No ofreció local | Tool `artemis_detect_modality` / `artemis_select_branch` — ¿se llamó? |
| Ignoró voucher o pago pendiente | System prompt post-tool refresh + último LLM antes de confirmar |
| Modificadores de otro producto | Args JSON de `artemis_update_cart` — `productId` vs `modifierIds` |

Varios fixes internos nacieron de una traza concreta en proyecto Artemis (voucher pendiente, modificadores silenciosos, moneda en catálogo, etc.).

---

## Activación mínima (solo lo que Artemis necesita)

| Variable | Rol |
|---|---|
| `LANGSMITH_TRACING=true` | Enciende callbacks en `buildLangSmithInvokeConfig` |
| `LANGSMITH_API_KEY` | Auth hacia LangSmith |
| `LANGSMITH_PROJECT_ARTEMIS` | Nombre del proyecto en la UI (recomendado) |
| `LANGCHAIN_CALLBACKS_BACKGROUND=true` | Envía trazas sin bloquear la respuesta WhatsApp |

---

## Checklist “no veo el run de Artemis”

1. ¿El turno pasó por `agent.invoke` o salió antes (welcome forzado)?
2. ¿`LANGSMITH_TRACING=true` en el proceso que atendió ese webhook?
3. ¿Proyecto **Artemis** en la UI (no otro agente)?
4. ¿Buscaste el teléfono exacto como llega (`519…` vs `+519…`)?
5. ¿Probaste filtrar por `subdomain` + rango de fechas?

---

## Archivos clave

| Qué | Dónde (API principal) |
|---|---|
| Registro del invoke | orquestador Artemis → `buildLangSmithInvokeConfig` + `agent.invoke` |
| Utilidad runName / metadata | `langsmith-invoke-config.util.ts` |
| `langchainConfig` en búsqueda | tool `artemis_search_products_simple` |
| Sub-run semántico | `ProductSearchService` → `product_search_semantic_filter_ids` |
| Asignación `thread_id` | orquestador de mensajes → `validateAndAssignThread` |
| Flujo mensaje → Artemis | nota interna `BUSQUEDA-PRODUCTOS.md` |

---

## Enlaces

- Consola: [smith.langchain.com](https://smith.langchain.com)
- Lógica de agente (pagos, carrito): [cuentas-bancarias-dinamicas-artemis](/blog/cuentas-bancarias-dinamicas-artemis)

Otros agentes LangChain del API usan la misma utilidad con otro `projectKey`; para Artemis basta con proyecto **Artemis** + **`runName` = teléfono** + **`thread_id` en metadata** para el debug día a día.
