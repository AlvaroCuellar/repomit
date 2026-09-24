# Edicion desde una unica Google Sheet

RePoMIt puede construirse desde una sola Google Sheet cuando existe la variable `GOOGLE_SHEETS_ID`. Si esa variable no existe, el sitio sigue usando los Excel locales de `data/excel/`.

## Hoja creada para la prueba

Google Sheet:

```text
https://docs.google.com/spreadsheets/d/1AMWTxYMyQz70u16ccgkMa9exDaUBPLTtKsKi3FHi198/edit
```

ID:

```text
1AMWTxYMyQz70u16ccgkMa9exDaUBPLTtKsKi3FHi198
```

Esta es la unica hoja que hay que enlazar. Dentro de ella hay varias pestanas.

## Pestañas de la hoja

La web lee solo estas tres pestanas, con estos nombres exactos:

- `Testimonios`
- `Poemas`
- `Contenido web`

La pestana `Instrucciones` es solo para orientar a quien edite la hoja. La web no la lee.

## Crear otra hoja unica desde cero

Si se quiere regenerar una hoja inicial con los datos actuales:

```bash
npm run build:data
npm run export:sheets
```

El comando genera un solo archivo:

```text
docs/google-sheets-template/RePoMIt-Google-Sheets.xlsx
```

Ese `.xlsx` se puede subir a Google Drive e importar como Google Sheets. Al abrirlo como Google Sheets, conserva las pestanas `Instrucciones`, `Poemas`, `Testimonios` y `Contenido web`.

## Enlazar la web con la hoja

En local:

```bash
GOOGLE_SHEETS_ID="1AMWTxYMyQz70u16ccgkMa9exDaUBPLTtKsKi3FHi198" npm run build:data
npm run validate:data
npm run dev
```

En Vercel hay que configurar la misma variable:

```text
GOOGLE_SHEETS_ID=1AMWTxYMyQz70u16ccgkMa9exDaUBPLTtKsKi3FHi198
```

Importante: para que `npm run build:data` y Vercel puedan leer la hoja por CSV, la Google Sheet debe estar compartida como `Cualquiera con el enlace puede ver`. Si la hoja esta privada, Google devuelve `401`.

## Que puede editar Antonietta

En `Poemas` puede modificar los campos catalograficos de cada composicion:

```text
incipit, segundo_verso, explicit, testimonio, orden, folios, epigrafe, atribucion, forma, esquema_metrico, estructura_cabeza, incipit_desarrollo, estructura_interna, incipit_interno, estribillo, estribillo_entero, autores_ficha, transcripcion, autores_transcripcion
```

En `Testimonios` puede modificar los datos de cada manuscrito:

```text
testimonio, ciudad, institucion, signatura, recopilador, fecha, enlace, bibliografia, autores_ficha
```

El antiguo campo `contenido` ya no es necesario: la sección «Contenido (orden topográfico)»
de cada testimonio se genera automáticamente a partir de las filas de `Poemas`. El importador
sigue aceptando hojas antiguas que conserven esa columna, pero la ignora en la interfaz pública.

La sigla escrita en `Testimonios` es la forma canónica. El Apps Script sincroniza un cambio de
sigla con todas las filas asociadas de `Poemas`, por lo que no hay que corregirlas una a una.

En `Contenido web` puede modificar textos publicos de portada, manuscritos, presentacion y criterios:

```text
pagina, seccion, orden, titulo, texto
```

Ejemplos:

- portada: `pagina = home`, `seccion = intro`
- manuscritos: `pagina = manuscritos`, secciones `intro`, `mapa titulo`, `mapa texto`
- presentacion: `pagina = presentacion`
- criterios: `pagina = criterios`

## Formato dentro de las celdas

La lectura por CSV no conserva cursivas visuales de Google Sheets. Usa marcas sencillas:

- `*texto en cursiva*`
- `**texto en negrita**`
- `[texto del enlace](/criterios)`
- `[correo](mailto:antonietta.molinaro@uniecampus.it)`

En campos largos se pueden usar saltos de linea dentro de la celda.

## Publicar cambios

Despues de editar la hoja, Vercel tiene que reconstruir la web para convertir esos datos en JSON. Para que Antonietta pueda hacerlo sin tocar GitHub:

1. Crea un Deploy Hook en Vercel.
2. Copia en la Google Sheet el Apps Script de `docs/apps-script-publicacion.js`.
3. Sustituye en el script:

```javascript
const DEPLOY_HOOK_URL = 'URL_DEL_DEPLOY_HOOK_DE_VERCEL';
```

Con esto, Antonietta tendra en Google Sheets:

- `RePoMIt > Publicar ahora`
- `RePoMIt > Activar publicacion automatica`

La publicacion automatica incluye una espera de 5 minutos entre publicaciones para no lanzar un despliegue por cada correccion menor.

La primera vez que una cuenta ejecuta el script, Google solicita autorización y puede mostrar
el aviso de aplicación no verificada. Para este script de uso interno, la autorización se concede
una sola vez por cuenta y no se repite en cada edición, salvo que cambien los permisos solicitados
o se revoque el acceso. El script incluye `@OnlyCurrentDoc` para limitar el acceso a esta hoja.
Eliminar por completo el aviso requeriría un proyecto estándar de Google Cloud y completar el
proceso de verificación OAuth de Google.

## Añadir un testimonio preparado en Excel

No hay que importar el libro completo ni sustituir las pestañas:

1. En la hoja `Testimonios` del Excel, copiar únicamente la fila de datos del manuscrito y pegarla
   como nueva fila en la pestaña `Testimonios` de Google Sheets.
2. En la hoja `Poemas` del Excel, copiar todas las filas de poemas con datos, sin la cabecera, y
   pegarlas al final de la pestaña `Poemas`.
3. Comprobar que la sigla del testimonio coincide y que los números de orden no están duplicados.
4. Usar `RePoMIt > Publicar ahora` y revisar la web después del despliegue.

No hay inconveniente técnico en esperar hasta agosto para incorporar los dos testimonios pendientes.

## Limites de esta prueba

La hoja unica facilita la edicion, pero no elimina la validacion. Despues de importar datos desde Google Sheets, siguen siendo obligatorios:

```bash
npm run validate:data
npm run build
```

Para mantener la hoja privada en una fase final, habria que sustituir la lectura CSV publica por Google Sheets API con cuenta de servicio.
