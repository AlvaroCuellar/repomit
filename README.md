# RePoMIt

RePoMIt es una aplicación SvelteKit para un repertorio digital de poesía áurea conservada en manuscritos italianos. Los datos se importan desde archivos Excel locales o, si se configura `GOOGLE_SHEETS_ID`, desde Google Sheets. Después se publican como JSON estáticos consumidos por la web.

## Estructura del proyecto

- `data/excel/`: archivos `.xlsx` fuente. Cada testimonio se ficha en un Excel.
- `data/generated/`: datos JSON generados para la aplicación.
- `scripts/`: importador y validador de datos.
- `src/lib/`: tipos, datos y utilidades compartidas.
- `src/lib/search/`: utilidades de búsqueda y repertorio.
- `src/routes/`: páginas de la aplicación SvelteKit.
- `docs/`: documentación de planificación y mantenimiento.

## Comandos principales

```bash
npm install
npm run build:data
npm run export:sheets
npm run validate:data
npm run dev
npm run build
```

`npm run build:data` lee los Excel de `data/excel/` y genera:

- `data/generated/poemas.json`
- `data/generated/testimonios.json`
- `data/generated/site.json`
- `data/generated/diagnostico.json`

Si se ejecuta con `GOOGLE_SHEETS_ID`, el importador lee las pestañas `Poemas`, `Testimonios` y `Contenido web` de Google Sheets en lugar de los Excel locales:

```bash
GOOGLE_SHEETS_ID="ID_DE_LA_HOJA" npm run build:data
```

`npm run export:sheets` genera un único `.xlsx` de partida para importarlo en Google Drive como una sola Google Sheet con varias pestañas. El flujo completo está explicado en `docs/GOOGLE-SHEETS.md`.

`npm run validate:data` revisa la integridad de los JSON generados y completa el diagnóstico con un informe de calidad.

## Añadir un nuevo testimonio Excel

1. Copiar el archivo `.xlsx` en `data/excel/`.
2. Ejecutar:

```bash
npm run build:data
npm run validate:data
```

3. Revisar `data/generated/diagnostico.json`.
4. Comprobar la aplicación con:

```bash
npm run dev
```

5. Si todo es correcto, hacer commit y push de los cambios.

## Diagnóstico de datos

`data/generated/diagnostico.json` resume la importación y la validación. Incluye Excel leídos e ignorados, testimonios detectados, formas, canonicalizaciones, campos condicionales, recuentos de HTML generado, avisos no bloqueantes y errores bloqueantes si los hubiera.

Este archivo debe revisarse después de cada importación porque permite detectar problemas de catalogación, variantes de siglas, campos vacíos o inconsistencias entre poemas y testimonios.

## Datos en Google Sheets

La prueba de edición desde Google Sheets está implementada de forma optativa. En local y producción se activa con la variable `GOOGLE_SHEETS_ID`; si no existe, la fuente de verdad sigue siendo `data/excel/`.
