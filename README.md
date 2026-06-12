# RePoMIt

RePoMIt es una aplicación SvelteKit para un repertorio digital de poesía áurea conservada en manuscritos italianos. En esta fase, los datos se importan desde archivos Excel locales y se publican como JSON estáticos consumidos por la web.

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
npm run validate:data
npm run dev
npm run build
```

`npm run build:data` lee los Excel de `data/excel/` y genera:

- `data/generated/poemas.json`
- `data/generated/testimonios.json`
- `data/generated/diagnostico.json`

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

## Datos futuros en Google Sheets

La versión actual usa Excel locales en `data/excel/`. En una fase posterior, los datos podrán pasar a Google Sheets para facilitar la edición colaborativa. El flujo previsto está documentado en `docs/PLAN-GOOGLE-SHEETS.md`.
