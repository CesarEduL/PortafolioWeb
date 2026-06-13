---
title: "Nota para mí: proveedor Meta (WhatsApp Cloud API) y páginas para desarrollo"
description: "Microservicio NestJS entre Meta y Agiliza: webhooks, OAuth Embedded Signup, instancias por marca, envío desde el API principal y qué pantallas de Meta/panel/local necesitas."
pubDate: 2026-06-11
tags: ["agiliza360", "api", "panel", "whatsapp", "meta", "webhooks", "oauth"]
locale: es
draft: false
---

En Agiliza360 el WhatsApp **oficial (Meta Cloud API)** no vive dentro del **API principal** monolítico: hay un **microservicio NestJS dedicado** (proveedor Meta) que habla con Graph API, recibe webhooks y guarda credenciales por restaurante. El API principal lo usa como gateway de salida; el **panel admin** conecta marcas vía **Embedded Signup**.

Si me pierdo, repaso este mapa antes de tocar tokens o webhooks.

## Rol en el ecosistema

```
                    ┌─────────────────────────────────┐
                    │  Meta (Graph API + Webhooks)     │
                    └───────────────┬─────────────────┘
                                    │
          inbound webhook entrante
          outbound  Graph API messages
                                    │
                    ┌───────────────▼─────────────────┐
                    │  Proveedor Meta (NestJS)         │
                    │  · instancias Mongo (por marca)  │
                    │  · OAuth / credenciales          │
                    │  · media (blob + transcripción)  │
                    └───────┬─────────────┬───────────┘
                            │             │
         POST mensaje bot   │             │ POST envío WA …
                            │             │
              ┌─────────────▼──┐    ┌─────▼──────────────┐
              │ API principal  │    │ Panel admin        │
              │ agente, chats  │    │ Embedded Signup    │
              │ capa envío WA  │    │ Operaciones / chats│
              └────────────────┘    └────────────────────┘
```

| Dirección | Quién | Cómo |
|---|---|---|
| **Cliente → bot** | Meta → proveedor → API | Webhook → redirector → endpoint de procesamiento de mensajes del agente |
| **Bot → cliente** | API → proveedor → Meta | Capa de envío WA (provider Meta) → `POST /whatsapp/send` |
| **Conectar número** | Panel → proveedor → Meta OAuth | Embedded Signup → rutas de inicialización + intercambio de código |

---

## Módulos del proveedor Meta

### 1. WhatsApp (rutas `/whatsapp/*`)

**Salida (Cloud API):**

- Texto, templates, multimedia, botón URL (ventana 24 h), quick reply, listas, ubicación, typing, etc.

Resolución de credenciales: si el body trae **subdomain** de marca, busca token + phone number ID + WABA en Mongo; si no, usa credenciales de **config local del proveedor** (modo mono-número para pruebas).

**Entrada (webhooks):**

- `GET …/webhook` — verificación Meta (`hub.verify_token` = mismo valor que configuraste como *verify token* del proveedor)
- `POST …/webhook` — responde 200 al instante y procesa async

El procesador extrae:

- mensajes de cliente (`messages`)
- ecos del dueño (`message_echoes`)
- estados (`statuses`: sent, delivered, read, failed)
- tipos: text, image, audio, location, interactive, catálogo, órdenes, **respuesta a Story**

### 2. OAuth / credenciales (rutas dedicadas por subdomain)

| Operación | Uso |
|---|---|
| Inicializar credenciales | Tras Embedded Signup: guarda business ID, WABA ID, phone number ID |
| Intercambiar código OAuth | Código → token largo (~60 d) |
| Consultar / actualizar / refrescar / desconectar | Mantenimiento por marca |

Documento Mongo por instancia: subdomain, teléfono, provider `meta`, tokens y metadatos OAuth.

### 3. Redirector de mensajes

1. Resuelve instancia por número destino del webhook
2. Normaliza payload (texto, media, ubicación, catálogo…)
3. Audio → descarga Meta + transcripción → texto
4. Imagen → almacenamiento blob (opcional)
5. Reenvía al **API principal** (endpoint de mensajes entrantes del agente)

Si falta la **URL base del API** en la config del proveedor, el webhook se recibe pero **no llega al bot**.

### 4. Media

Descarga de adjuntos Meta, blob storage y transcripción — para que el agente reciba texto aunque el cliente mande voz.

---

## Cómo entra y sale en el API principal

**Salida:** capa unificada de proveedores WA → cliente HTTP al host del proveedor Meta (local `:3000` o despliegue remoto).

**Entrada:** Meta golpea primero al proveedor; este reenvía al agente. Luego el orquestador de chats guarda mensaje y emite WebSocket al panel.

**Impresión en caja:** independiente; ver [impresión local](/blog/print-bridge-impresion-local/).

---

## Panel admin — pantallas y configuración dev

### Ruta principal: configuración WhatsApp

**`/app/whatsapp`**

- Carga **Meta JS SDK** (App ID y versión Graph desde config de build del panel)
- Botón **Conectar con Meta** → Embedded Signup (`FB.login`):
  - `config_id` de la app Meta
  - redirect URI registrada en Meta
  - scopes: business + WhatsApp management + messaging
  - coexistencia con app WA Business del restaurante
- Escucha eventos `WA_EMBEDDED_SIGNUP` (postMessage desde facebook.com)
- Llama al proveedor: inicializar credenciales + intercambiar código OAuth

### Otras pantallas relacionadas

| Ruta panel | Para qué en dev |
|---|---|
| **`/app/operaciones`** | Chat en vivo, mensajes vía socket |
| **`/app/chatbot-configuration`** | Reglas del bot, comprobante, flujos del agente |
| **`/app/comercial/plantillas-whatsapp`** | Templates (aprobación en Meta Business) |
| **`/app/whatsapp-groups`** | Solo superadmin — otro flujo |

### Config del panel (build / entorno local)

| Concepto | Ejemplo dev |
|---|---|
| URL base del proveedor Meta | `http://localhost:3000` |
| App ID Meta | desde developers.facebook.com |
| Configuration ID (Embedded Signup) | desde la app Meta |
| Versión Graph API | `v21.0` |
| Redirect URI OAuth | URL del panel o túnel HTTPS |
| URL base del API principal | `http://localhost:PUERTO/api/v3` |

El panel **no** persiste el token de Meta para enviar mensajes: el proveedor lo guarda en Mongo.

### Config del API principal

| Concepto | Ejemplo dev |
|---|---|
| URL del proveedor Meta | `http://localhost:3000` |

---

## Config del proveedor Meta (dev)

| Concepto | Notas |
|---|---|
| Token + phone number ID (fallback) | Pruebas mono-número sin Embedded Signup |
| Verify token webhook | Debe coincidir con Meta → Configuration |
| Versión Graph API | Alineada con Meta App |
| App ID + App Secret | OAuth Embedded Signup |
| Redirect URI OAuth | Igual que panel + app Meta |
| URL base del API principal | Sin sufijo de ruta del agente; el redirector añade el path |
| MongoDB | Colección de instancias por marca |
| Blob + transcripción (opcional) | Media entrante |
| Puerto HTTP | Típico `3000` |

Swagger local: `http://localhost:3000/api/docs` · health: `/health`.

---

## Páginas de Meta que necesitas (checklist desarrollo)

Todo en [developers.facebook.com](https://developers.facebook.com/) salvo templates (Business Manager).

### 1. Crear / elegir App

- Tipo **Business**
- Anotar **App ID** y **App Secret**

### 2. Producto WhatsApp

| Sección Meta | Para qué |
|---|---|
| **API Setup** | Token temporal, Phone number ID, número sandbox |
| **Configuration** | Callback URL webhook, verify token, campos suscritos |
| **Getting Started** | Primeros envíos de prueba |
| **WA Tools** (ver abajo) | Número de prueba mientras desarrollas sin marcas en prod |

### Número de desarrollo (portafolio / sin prod)

Mientras no hay restaurantes conectados en prod, Meta te deja usar un **número de prueba** de tu app: ahí sacas el token temporal, el **Phone number ID** y los destinatarios permitidos para mandar/recibir en local.

Entrada genérica (iniciar sesión y elegir tu app):

**[Meta for Developers — Mis apps](https://developers.facebook.com/apps/)**

Ruta en consola: **tu app → WhatsApp → herramientas (WA Tools) / API Setup** (el menú exacto varía un poco según la versión de la consola).

Desde ahí:

- Ves el número de prueba asignado por Meta (o lo regeneras).
- Copias **Phone number ID** y token temporal.
- Añades tu WhatsApp personal como número de prueba para recibir mensajes mientras pruebas el proveedor + panel en local.

### 3. Webhook

| Campo | Valor dev típico |
|---|---|
| Callback URL | `https://{túnel}/whatsapp/webhook` |
| Verify token | Mismo valor que en config del proveedor |

**Suscribir:** `messages`, `message_status`; opcional `message_echoes`.

HTTPS obligatorio → **ngrok** o Cloudflare Tunnel al puerto del proveedor.

### 4. Embedded Signup

- **Valid OAuth Redirect URIs** = redirect del panel
- **Configuration ID** → config del panel
- Permisos WA Business

### 5. Business Manager (prod)

[business.facebook.com](https://business.facebook.com/) — WABA, templates, system user + token permanente.

### 6. Docs Meta

- [Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup)

---

## Flujo dev local recomendado

```
1. Mongo + proveedor Meta (:3000) + API principal + panel Vite
2. Túnel HTTPS → puerto del proveedor → pegar URL en Meta Webhook
3. Proveedor: URL base del API apuntando al API local
4. API principal: URL del proveedor Meta = localhost:3000
5. Panel: URL proveedor + credenciales Meta de la app
6. Prueba rápida: token + phone number ID desde WA Tools / API Setup + POST /whatsapp/send
7. Flujo real: /app/whatsapp → Embedded Signup → instancia Mongo → mensaje al número
8. Cliente escribe → webhook → redirector → agente → respuesta vía proveedor
```

**Formato teléfono al enviar:** código país + número, sin `+` (ej. `51987654321`).

---

## Multi-marca vs token único

| Modo | Cuándo | Credenciales |
|---|---|---|
| **Dev mono-número** | Postman, primeras pruebas | Config local del proveedor |
| **Prod / restaurantes** | Cada marca | Embedded Signup → Mongo por subdomain |

El API casi siempre manda subdomain en el envío; el proveedor elige token de BD o fallback local.

---

## Errores frecuentes

| Síntoma | Revisar |
|---|---|
| Webhook OK pero sin mensajes | Suscripción `messages`; número correcto |
| 403 en GET webhook | Verify token ≠ Meta Configuration |
| Bot mudo con webhook OK | URL base del API vacía o API caído |
| SDK no cargado en panel | App ID, bloqueadores, dominio en app Meta |
| Embedded Signup sin WABA | config_id, redirect URI, permisos |
| 401 al enviar | Token expirado; repetir OAuth |
| Invalid parameter | Teléfono mal formateado o fuera ventana 24 h |

---

## Piezas clave (por rol)

| Qué | Proveedor Meta | API principal | Panel |
|---|---|---|---|
| Webhook entrante | controlador + procesador | — | — |
| Redirect al agente | redirector de mensajes | endpoint mensajes entrantes | — |
| Envío saliente | servicio Graph API | capa proveedores WA | — |
| OAuth / instancias | módulo credenciales | — | pantalla WhatsApp + hook signup |
| UI conectar | — | — | `/app/whatsapp` |

Posts relacionados: [roles panel ↔ API](/blog/roles-panel-y-backend/), [pagos dinámicos agente](/blog/cuentas-bancarias-dinamicas-artemis/).

Checklist debug «no llega el WA»: webhook Meta → proveedor → URL base del API → instancia `meta` con token vigente en Mongo.
