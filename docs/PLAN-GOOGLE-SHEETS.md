# Plan futuro: Google Sheets

La versión local actual de RePoMIt usa archivos Excel en `data/excel/` como fuente de datos. Este flujo se mantiene por ahora para conservar control sobre la importación, la validación y los JSON generados.

## Flujo previsto

En una fase posterior, Antonietta editará los datos en Google Sheets. La hoja podrá mantener una estructura equivalente a los Excel actuales: una tabla para poemas y otra para testimonios.

Apps Script podrá encargarse de validar y publicar los datos. Ese script podría comprobar campos obligatorios, valores controlados, relaciones entre poemas y testimonios, y generar una salida JSON estable para la aplicación.

Vercel reconstruirá la web cuando haya datos publicados o cambios en el repositorio. La aplicación seguirá consumiendo datos estáticos, pero esos datos podrán proceder de Google Sheets en lugar de Excel locales.

## Alcance de esta fase

Este plan no implementa todavía la conexión con Google Sheets, Apps Script ni Vercel. Solo deja documentado el flujo futuro:

1. Edición académica en Google Sheets.
2. Validación/publicación mediante Apps Script.
3. Generación de JSON.
4. Reconstrucción de RePoMIt en Vercel.

Hasta que se implemente ese flujo, la fuente de verdad seguirá siendo `data/excel/` y los comandos locales:

```bash
npm run build:data
npm run validate:data
npm run build
```
