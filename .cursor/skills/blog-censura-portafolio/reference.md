# Referencia — censura blog (antes / después)

## Repos y paths

**Mal**
```markdown
En `ssgg/src/modules/order-orchestration/order-orchestration.service.ts` se arma el payload.
El panel en `panel-admin-ag360ai/src/config/env.ts` lee `VITE_PRINT_BRIDGE_DOWNLOAD_URL`.
```

**Bien**
```markdown
El **orquestador de pedidos** (API principal) arma el payload al aceptar la orden.
El **panel admin** embebe la URL del instalador en el build (variable de entorno del CI del panel).
```

---

## Dominios y URLs

**Mal**
```markdown
Callback: `https://api.agiliza360.ai/api/v3/delivery-webhooks/yango`
Imagen OG: `https://res.cloudinary.com/mi-cuenta-real/image/upload/…`
```

**Bien**
```markdown
Callback: `https://{URL_PUBLICA_API}/api/v3/delivery-webhooks/yango`
Imagen OG: URL del CDN configurada en el portafolio (sin cuenta real en el post).
```

---

## Variables de entorno

**Mal**
```markdown
Configura `VITE_API_BASE_URL=https://ssgg-production.up.railway.app/api/v3` y `YANGO_API_KEY=…`.
```

**Bien**
```markdown
| Concepto | Dónde |
|---|---|
| URL base del API | build del panel admin (CI / environment production) |
| Token Yango | credenciales de integración de la marca en el API principal |
```

---

## Clientes y marcas

**Mal**
```markdown
Dominio Rest.pe `2148`, local Perucho's, orden PERUCHOS-20260523-0004.
```

**Bien**
```markdown
`{dominioId}` de Rest.pe, local demo, orden `ORD-2026-001234`.
```

---

## Meta / WhatsApp dev

**Mal**
```markdown
WA Tools: https://developers.facebook.com/apps/123456789/.../?business_id=987654
```

**Bien**
```markdown
Meta for Developers → tu app → WhatsApp → WA Tools / API Setup  
Enlace genérico: https://developers.facebook.com/apps/
```

---

## Tabla «Archivos clave»

**Mal**
| Qué | Dónde |
|---|---|
| Webhook | `ssgg/src/modules/.../yango-webhook.service.ts` |

**Bien**
| Qué | Dónde |
|---|---|
| Webhook + mapeo a orden | servicio webhook Yango (API principal) |

---

## Payload JSON (integraciones)

**Mal**
- IDs de producción copiados de Postman interno con dominio real
- Tokens en query: `?token=abc123real`

**Bien**
```http
POST …/registrarDelivery/{dominioId}?quipupos=0&token={token_restpe}
```
```json
{ "delivery_codigointegracion": "ORD-2026-001234", "local_id": 1 }
```

---

## GitHub releases

**Mal**
```markdown
Repo: https://github.com/usuario-real/print-bridge/releases/…
```

**Bien**
```markdown
https://github.com/{org}/print-bridge/releases/download/print-bridge-1.3.0/maxy-print-bridge-setup.exe
```

---

## Tags frontmatter

**Mal**
```yaml
tags: ["backend", "panel-admin", "ssgg", "maxy-food-internal"]
```

**Bien**
```yaml
tags: ["agiliza360", "api", "panel", "nestjs", "yango"]
```
