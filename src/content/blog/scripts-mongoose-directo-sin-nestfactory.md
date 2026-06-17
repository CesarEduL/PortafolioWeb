---
title: "Nota para mí: scripts de migración sin NestFactory — mongoose directo"
description: "Por qué NestFactory arranca cronjobs que explotan al cerrar y cómo evitarlo con mongoose.createConnection() directo, sin levantar ningún módulo NestJS."
pubDate: 2026-06-17
tags: ["agiliza360", "nestjs", "mongodb", "mongoose", "scripts", "migracion", "backend"]
locale: es
draft: false
---

Cuando quería correr un script de migración en `ssgg`, lo primero que escribí fue `NestFactory.createApplicationContext(AppModule)` porque así tenía acceso a los repositorios de Mongoose ya configurados. Funcionaba — pero producía una avalancha de logs de arranque de NestJS y, al cerrar el contexto, explotaban los cronjobs:

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [InstanceLoader] MongooseModule dependencies initialized
... (100+ líneas más)

MongoExpiredSessionError: Cannot use a session that has ended
    at ClientSession.endSession (node_modules/mongodb/...)
```

El error viene de `MassCampaignsCronService`, `NpsSurveyJobProcessorService` y otros `@Cron()` que se disparan cuando NestJS levanta el contexto, y luego intentan usar la conexión que ya se cerró cuando el script termina. No es un bug del script — es que NestFactory arranca toda la app.

---

## La raíz del problema

`NestFactory.createApplicationContext(AppModule)` bootstrapea **todos** los módulos registrados en la app: auth, cache, webhooks, crons, WebSockets, todo. El script no necesita nada de eso — solo conexión a MongoDB y una colección.

---

## La solución: mongoose directo

```typescript
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB;
const DB_NAME     = process.env.DB_NAME;

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Variables de entorno requeridas: MONGODB, DB_NAME');
  process.exit(1);
}

async function run(): Promise<void> {
  const conn = await mongoose.createConnection(MONGODB_URI!, {
    dbName: DB_NAME,
  }).asPromise();

  const col = conn.db!.collection('mi_coleccion');

  try {
    // lógica del script...
  } finally {
    await conn.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
```

`import 'dotenv/config'` al inicio — antes de cualquier otro import — carga el `.env` del proyecto. El comando en `package.json` es simplemente:

```json
"migrate:yango-return-states": "ts-node -r tsconfig-paths/register src/scripts/migrate-yango-return-states.ts"
```

Sin flags raros. Sin `dotenv/register` extra. El script arranca, hace lo suyo y termina. Nada de logs de NestJS, nada de crons explotando.

---

## Comparación directa

| | `NestFactory.createApplicationContext` | `mongoose.createConnection` |
|---|---|---|
| Módulos cargados | Todos (~100+) | Ninguno |
| Tiempo de arranque | 3-8 segundos | < 1 segundo |
| Logs de NestJS | Sí (muchos) | No |
| Cronjobs disparados | Sí | No |
| `MongoExpiredSessionError` al cerrar | Sí | No |
| Inyección de dependencias | Disponible | No disponible |
| Cuándo lo necesito | Si el script usa lógica de servicios NestJS | Operaciones directas sobre colecciones |

---

## Cuándo SÍ necesito NestFactory

Si el script necesita lógica de negocio que vive en un servicio NestJS (validaciones, eventos, transformaciones complejas), ahí tiene sentido `createApplicationContext`. Pero entonces hay que asumir los crons: desactivar el `TasksModule` antes de correr el script, o ejecutarlo en un entorno separado.

Para el 90% de los casos — migraciones de datos, backfills, limpieza de colecciones — mongoose directo es suficiente.

---

## Cómo leer la colección sin los decoradores de Mongoose

El truco es que `conn.db!.collection('nombre')` devuelve un `Collection` nativo de MongoDB, sin tipos. Funciona igual para `find`, `updateMany`, `bulkWrite`, `countDocuments`:

```typescript
const col = conn.db!.collection('yangodeliveries');

// Contar
const total = await col.countDocuments({ status: 'failed' });

// bulkWrite en lotes
const ops = docs.map((doc) => ({
  updateOne: {
    filter: { _id: doc._id },
    update: { $set: { status: 'nuevo', updatedAt: new Date() } },
  },
}));
await col.bulkWrite(ops, { ordered: false });
```

Si necesito los tipos de TypeScript del schema, puedo importar la interface directamente (sin decoradores de Mongoose) y hacer cast: `const doc = row as unknown as YangoDeliveryDocument`.

---

## Por qué `import 'dotenv/config'` debe ir primero

```typescript
// ✅ Correcto — dotenv corre antes de que ningún módulo lea process.env
import 'dotenv/config';
import mongoose from 'mongoose';

// ❌ Incorrecto — si algún import lee process.env antes de dotenv, las vars estarán vacías
import mongoose from 'mongoose';
import 'dotenv/config';
```

En NestJS con `ConfigModule`, el `.env` se carga durante el bootstrap — por eso `NestFactory` no necesita `import 'dotenv/config'`. Los scripts no tienen bootstrap, así que hay que cargarlo explícitamente.

---

## Ejemplos canónicos en ssgg

- `src/scripts/sync-prod-to-dev.ts` — el original, copia colecciones enteras entre BDs
- `src/scripts/migrate-yango-return-states.ts` — migración de estados con `bulkWrite` en lotes de 100

Los scripts que usan `NestFactory` (como `migrate-owner-brands.ts`) son legado. No usarlos como referencia para scripts nuevos.

---

## Posts relacionados

- [Yango estados de retorno granulares](/blog/yango-estados-retorno-granulares/)
- [Integración Yango en tres capas](/blog/integracion-yango-tres-capas/)
