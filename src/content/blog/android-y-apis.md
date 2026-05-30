---
title: "Android y consumo de APIs"
description: "Notas sobre estructurar llamadas HTTP y mostrar datos en tiempo real."
pubDate: 2026-03-15
tags: ["android", "kotlin", "api"]
locale: es
draft: false
---

En apps como **AlertaDolar**, separar la capa de red del UI simplifica pruebas y cambios de proveedor.

### Buenas prácticas que uso

- Modelos de datos claros (DTO → dominio).
- Manejo de errores visible para el usuario.
- Caché ligera cuando el dato no cambia cada segundo.

Puedes ampliar esta nota con capturas de tu app y fragmentos de código cuando quieras.
