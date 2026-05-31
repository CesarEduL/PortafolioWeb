# CV en PDF (botón «Descargar CV»)

[← Volver al README](../README.md)

El botón del inicio apunta a un archivo estático en la carpeta `public/`. No hace falta tocar código cada vez que actualices tu currículum.

## Primera vez (subir tu CV)

1. Exporta tu CV desde Word, Google Docs, Canva, etc. como **PDF**.
2. Copia el archivo a esta ruta del proyecto:

   ```
   public/cv.pdf
   ```

3. Arranca o reconstruye el sitio:

   ```bash
   npm run dev
   # o, para producción:
   npm run build
   ```

4. Comprueba el enlace:
   - En local: `http://localhost:4320/PortafolioWeb/cv.pdf` (la ruta incluye `BASE_PATH` si lo tienes en `.env`).
   - En GitHub Pages: `https://TU-USUARIO.github.io/PortafolioWeb/cv.pdf`

5. Sube los cambios a GitHub (el PDF va en el commit):

   ```bash
   git add public/cv.pdf
   git commit -m "docs: actualizar CV"
   git push
   ```

   Si usas GitHub Actions, el workflow volverá a desplegar el sitio con el PDF nuevo.

## Cuando actualices tu CV (mismo nombre)

1. Sustituye el archivo **`public/cv.pdf`** por la versión nueva (mismo nombre, contenido nuevo).
2. `git add public/cv.pdf`, commit y push (o solo vuelve a ejecutar `npm run build` si pruebas en local).

No necesitas cambiar `src/config/site.ts`: la URL se genera sola con `BASE_URL` + nombre del archivo.

## Opcional: otro nombre de archivo

Si quieres conservar versiones con fecha en el nombre del PDF:

1. Guarda el archivo, por ejemplo: `public/cv-2026-05.pdf`
2. En `.env` (y en **Variables** de GitHub Actions si despliegas ahí):

   ```env
   PUBLIC_CV_FILENAME=cv-2026-05.pdf
   ```

3. Vuelve a hacer build o deploy.

La lógica está en `src/config/env.ts` (`cvUrl`). El botón sigue en `src/components/Hero.astro`.

> **Tip:** Mantén siempre el mismo nombre `cv.pdf` y solo reemplaza el archivo; es la forma más simple de actualizar sin tocar variables de entorno.
