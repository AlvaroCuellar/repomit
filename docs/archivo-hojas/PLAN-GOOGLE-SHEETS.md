# Plan: Google Sheets

La versión local de RePoMIt mantiene los Excel de `data/excel/` como fuente por defecto. La prueba de Google Sheets ya esta implementada de forma optativa con `GOOGLE_SHEETS_ID`.

## Flujo previsto

Antonietta podra editar los datos en Google Sheets. La hoja mantiene una estructura equivalente a los Excel actuales: una tabla para poemas, otra para testimonios y una tercera para los textos publicos de la web.

Apps Script podrá encargarse de validar y publicar los datos. Ese script podría comprobar campos obligatorios, valores controlados, relaciones entre poemas y testimonios, y generar una salida JSON estable para la aplicación.

Vercel reconstruirá la web cuando haya datos publicados o cambios en el repositorio. La aplicación seguirá consumiendo datos estáticos, pero esos datos podrán proceder de Google Sheets en lugar de Excel locales.

## Alcance de esta fase

El flujo implementado queda documentado en `docs/GOOGLE-SHEETS.md`:

1. Edición académica en Google Sheets.
2. Validación/publicación mediante Apps Script.
3. Generación de JSON.
4. Reconstrucción de RePoMIt en Vercel.

Si no se define `GOOGLE_SHEETS_ID`, la fuente de verdad sigue siendo `data/excel/` y los comandos locales:

```bash
npm run build:data
npm run validate:data
npm run build
```
