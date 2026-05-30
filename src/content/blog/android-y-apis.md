---
title: "Nota para mí: Android y las APIs"
description: "Me apunto cómo no enredarme otra vez con la capa de red en AlertaDolar."
pubDate: 2026-03-15
tags: ["android", "kotlin", "api"]
locale: es
draft: false
---

En **AlertaDolar** aprendí que si mezclo las llamadas HTTP con la UI me arrepiento después. Separar capa de red y pantalla me salvó cuando tuve que tocar el proveedor de datos.

### Lo que me conviene repetir

- DTO y dominio separados: no acoples el JSON crudo a las vistas.
- Si falla la red, el usuario tiene que enterarse; un spinner eterno no cuenta.
- Caché ligera cuando el dato no cambia cada segundo — no sobrecompliquees de más.

Cuando vuelvas a este proyecto, añade capturas y un fragmento de código que te hayan funcionado. Tu yo del futuro te lo agradecerá.
