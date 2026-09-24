# RePoMIt

Repertorio digital de poesía áurea conservada en manuscritos italianos, con web pública y panel privado de catalogación. La aplicación utiliza SvelteKit, Node.js y PostgreSQL en producción; SQLite queda para el desarrollo local. La edición y publicación se realizan en el panel, sin conexión a Excel ni Google Sheets. Excel es una opción para incorporar lotes de fichas nuevas.

## Empezar en local

Necesitas Node.js 24 o posterior.

```bash
npm ci
npm run db:init
npm run dev
```

Abre http://127.0.0.1:5173/admin. La primera inicialización crea una cuenta de administración con correo `admin@repomit.local` y una contraseña aleatoria. Las credenciales están en `.local/acceso.txt`, un archivo privado excluido de Git. Puedes cambiar la contraseña y crear las cuentas del equipo desde **Cuentas y acceso**. No se envían correos ni se crean cuentas externas.

`db:init` importa una sola vez la instantánea de `data/generated/`: 298 poemas, 4 manuscritos y 19 secciones de texto en el corpus actual. Conserva identificadores, relaciones, cursivas y contenido académico. También normaliza las variantes históricas `si` y `sì` a `sí`. Repetir el comando conserva las ediciones de la base de datos. La instantánea es el material local disponible; no se consulta una hoja externa para comprobar si contiene cambios posteriores.

Después de la migración, la única fuente de datos es `.local/repomit.sqlite`. Los JSON de `data/generated/`, incluido `diagnostico.json`, son una instantánea histórica: ya no se regeneran ni se leen al servir o compilar la web. Los originales y los scripts antiguos se conservan como archivo, sin dependencias operativas.

## Edición

Consulta [la guía de Antonietta](docs/GUIA-EDICION.md).

- Incorporación de manuscritos y catalogación de sus poemas en orden topográfico.
- Importación `.xlsx` desde **Importar Excel**: plantillas vacía y rellenada, vista previa por fila, errores y avisos, confirmación de formas nuevas y guardado atómico como borradores. Máximo 5 MB y 2.000 fichas. Nunca sobrescribe fichas existentes ni publica al importar.
- Campos agrupados, vocabulario de formas ampliable desde la propia ficha y ayudas basadas en las instrucciones del proyecto. Las nuevas formas se guardan en la base de datos, detectando duplicados por tildes, mayúsculas y espacios.
- Editor visual con cursiva, negrita, enlaces y conservación de saltos de verso. Al pegar desde Word o una web, se conserva el formato básico y se descartan estilos ajenos al repertorio.
- Borradores privados, vista previa de la ficha guardada y publicación inmediata.
- Publicación de un manuscrito y sus poemas en una operación: si hay un error, se cancela el conjunto.
- Corrección de siglas propagada a los poemas, manteniendo sus enlaces.
- Historial, recuperación como borrador y retirada de publicación sin borrar datos.
- Protección ante ediciones simultáneas: una ficha obsoleta no sobrescribe una revisión más reciente.
- Cuentas de edición y administración, contraseñas con scrypt, sesiones de ocho horas, control de intentos de acceso y protección de las acciones en el servidor.

La fecha de revisión se actualiza al publicar. Los saltos de numeración son válidos; no se renumeran automáticamente las composiciones. Las fichas en preparación pueden guardarse aunque falten datos de catalogación; se exigen los datos identificativos mínimos y las relaciones válidas. La publicación aplica comprobaciones adicionales de forma y estructura.

## Mapa, consultas y citas

En **Edición → Mapa** se elige una ciudad y se coloca su punto pulsando sobre el mapa, con vista previa antes de guardar. Las flechas del teclado y las coordenadas ofrecen alternativas. Las ciudades desconocidas quedan pendientes de ubicación, nunca se sitúan en un punto arbitrario.

El pie público muestra el total de páginas consultadas y desde cuándo se cuentan. **Edición → Estadísticas** conserva el desglose diario privado. Se cuentan consultas, no visitantes únicos; no se reconstruyen visitas anteriores ni se guardan IP, identificadores personales o búsquedas. Las sumas persisten en la base de datos.

Las fichas ofrecen una cita copiable. En **Textos de la web** se puede preparar una sección independiente «Cómo citar el repertorio», revisar el modelo y publicarlo sin sustituir los apartados existentes.

## Pruebas

```bash
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:production
```

Las pruebas de navegador copian la base local a `.local/e2e/test.sqlite` y utilizan cuentas y contenido de prueba solo allí. No modifican el corpus ni las cuentas de trabajo. `db:init` debe haberse ejecutado antes. El puerto 5174 debe estar disponible. Las pruebas de datos usan una base temporal independiente.

## Copias de seguridad

```bash
npm run db:backup
```

Genera una copia coherente de SQLite en `.local/backups/`, incluso con la aplicación abierta. Incluye contenido, historial y cuentas; debe guardarse en un lugar privado y copiarse periódicamente fuera de este ordenador. No copies únicamente el archivo SQLite mientras haya escrituras: utiliza el comando de copia.

Para restaurar: detén la aplicación, conserva una copia de seguridad del estado actual, y sustituye la base configurada por la copia elegida. Con la aplicación detenida, retira los archivos auxiliares `repomit.sqlite-wal` y `repomit.sqlite-shm` del destino antes de volver a arrancar. La copia incluye las cuentas y sesiones de ese momento; si procede, revoca las sesiones antes de usarla. No ejecutes `db:init` para intentar restaurar: ese comando respeta una base ya inicializada.

## Compilación y ejecución

```bash
npm run build
HOST=127.0.0.1 PORT=3000 ORIGIN=http://127.0.0.1:3000 npm start
```

El servidor consulta los datos publicados en cada petición; no requiere compilaciones para publicar cambios editoriales. `REPOMIT_DB` permite elegir otra ruta para la base de datos (por defecto `.local/repomit.sqlite`, relativa al directorio de trabajo). Para desarrollo con una ruta alternativa, exporta la variable en el terminal antes de ejecutar los comandos.

`npm start` establece `BODY_SIZE_LIMIT=6M` para permitir los 5 MB del Excel y su envoltorio multipart. Si se inicia `node build` directamente, hay que establecer esa variable. El importador limita también el tamaño descomprimido, rechaza fórmulas y archivos con macros, y reconoce encabezados de las plantillas antiguas. Las vistas previas pertenecen a la cuenta que subió el archivo, caducan a las dos horas y se vuelven a validar al confirmar. El archivo original no se guarda en disco; el historial registra el archivo y la fila de procedencia.

En Vercel, `DATABASE_URL` conecta la aplicación con PostgreSQL persistente. El proyecto de producción está desplegado en https://repomit.vercel.app y la base está vinculada a los entornos de producción, vista previa y desarrollo. Los cambios editoriales se guardan directamente allí y sobreviven a nuevos despliegues.

## Estructura

- `src/lib/server/`: base de datos, cuentas, validación, historial y publicación.
- `src/lib/editor/`: campos, ayudas y editor visual.
- `static/plantillas/`: plantilla vacía y ejemplo ficticio descargables, con instrucciones y guía por columna.
- `src/routes/admin/`: acceso y panel de edición.
- `src/routes/`: web pública que consulta los registros publicados.
- `scripts/init-db.ts`: migración única y cuenta inicial.
- `scripts/backup-db.ts`: copia coherente de la base.
- `scripts/migrate-postgres.ts`: migración controlada de una copia SQLite a PostgreSQL.
- `tests/`: pruebas de datos, seguridad y navegador.
- `docs/archivo-hojas/`: archivo del sistema anterior; no se ejecuta.
- `.local/`: base, acceso inicial y copias privadas; excluido de Git.
