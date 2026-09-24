# Guía de edición de RePoMIt

Entra en **Edición**, el enlace al pie de la página, con tu correo y contraseña. La mesa de trabajo reúne Manuscritos, Poemas y Textos de la web. Los visitantes pueden consultar el repertorio sin cuenta y solo ven las versiones publicadas.

## Incorporar un manuscrito

1. Abre **Manuscritos → Incorporar manuscrito**.
2. Introduce su sigla, ciudad, institución y signatura. Completa la descripción, datación, enlace y bibliografía cuando estén disponibles.
3. Pulsa **Guardar y añadir poemas**. El manuscrito queda en borrador y se abre la ficha del primer poema con el manuscrito ya seleccionado.
4. Introduce el íncipit, orden original y demás datos. **Guardar y añadir siguiente** guarda la ficha como borrador y propone el número posterior al mayor ya catalogado. Puedes cambiarlo: se respetan los saltos por composiciones en otras lenguas.
5. Cuando esté revisado el conjunto, vuelve a la ficha del manuscrito, abre **Publicar el manuscrito completo**, confirma la revisión y pulsa **Publicar manuscrito y poemas**.

El sistema comprueba todas las fichas antes de completar la publicación. Si falla una, identifica el poema y no publica ningún cambio del conjunto. No debes escribir a mano el contenido topográfico: se construye con sus poemas y folios.

## Corregir una ficha existente

Todas las páginas de edición incluyen **Cómo rellenar y revisar esta ficha**, con instrucciones y ejemplos. En manuscritos y poemas también aparecen los enlaces a las plantillas de importación.

Busca por íncipit, sigla o título. En Poemas también puedes filtrar por manuscrito, borradores o fichas sin transcripción. Abre la ficha, corrige los datos y guarda.

La búsqueda admite palabras sin tildes, nombres de autores y folios. Puedes combinar términos, por ejemplo `gongora 3v`. Al filtrar por manuscrito, los poemas aparecen en orden topográfico; el selector **Ordenar por** también permite ver las últimas ediciones. La mesa de trabajo ofrece enlaces para retomar los borradores pendientes.

Dentro de un poema puedes volver al manuscrito o pasar al poema anterior y siguiente. Al crear un poema desde el listado general, selecciona el manuscrito y usa **Usar siguiente orden disponible** si quieres continuar después del último: el botón no rellena huecos ni cambia el orden por su cuenta.

- **Guardar borrador** conserva el trabajo sin cambiar lo que ven los visitantes.
- **Vista previa guardada** abre la ficha con sus últimos cambios guardados. Guarda antes de abrirla; no muestra lo que todavía estás escribiendo.
- **Publicar ficha** sustituye su versión pública inmediatamente. Para publicar un poema, su manuscrito debe estar publicado.

Al corregir una sigla en la ficha del manuscrito y publicarla, cambia automáticamente en todos sus poemas. Los enlaces no cambian. Al corregir el orden de un poema, el ítem visible se actualiza sin cambiar su enlace. No se admite que dos poemas del mismo manuscrito ocupen el mismo número.

## Incorporar muchas fichas desde Excel

Para una corrección o un poema suelto, usa su ficha. Si tienes muchos poemas ya preparados en una tabla, entra en **Importar Excel**.

1. Descarga la **plantilla vacía** y consulta el **ejemplo rellenado**. El ejemplo contiene datos inventados: no lo importes al repertorio real. Ambos incluyen las pestañas Instrucciones y Campos.
2. En **Testimonios**, escribe una fila por manuscrito nuevo. En **Poemas**, una fila por poema; repite la misma sigla en `testimonio`. Si el manuscrito ya está creado, basta la pestaña Poemas con su sigla actual.
3. Conserva los nombres de pestañas y los encabezados en la primera fila. Rellena desde la segunda fila, sin combinar celdas. Se necesita `testimonio` para el manuscrito, y `testimonio`, `orden` e `incipit` para el poema. El resto puede completarse después.
4. El orden es un entero positivo (hasta 999999) y no puede repetirse dentro del manuscrito; los saltos son válidos. Folios, siglas, signaturas y dataciones deben ser texto. Si Excel convirtió un dato en fecha, cambia el formato a Texto y vuelve a escribirlo.
5. Responde `sí`, `no` o `—` en estructura y estribillo. Si respondes sí, completa el campo asociado; el panel avisa de lo pendiente. Escribe por su nombre cualquier forma métrica nueva: se revisará antes de añadirla a la lista.
6. Guarda como `.xlsx`, sin fórmulas, macros ni contraseña. Se conservan cursivas y negritas en los campos con formato y los saltos de verso dentro de la celda. No escribas HTML. Máximo 5 MB y 2.000 fichas; divide los lotes mayores.
7. Sube el archivo y pulsa **Analizar archivo**. La vista previa no crea fichas: muestra cada fila, los errores que impiden importar y los avisos sobre datos pendientes. Corrige los errores en el archivo y vuelve a subirlo.
8. Revisa las filas, marca la confirmación y acepta expresamente las formas nuevas si las hay. **Importar como borradores** guarda todo el lote en una sola operación. Nada se publica.
9. Abre las fichas importadas, completa los datos y revisa la vista previa del manuscrito antes de publicar.

Si un manuscrito ya existe, su fila se usa como referencia y sus datos no se sustituyen. Un poema con el mismo manuscrito y orden que otro existente bloquea la importación: quita esa fila y haz la corrección desde la ficha. Si otra persona cambia los datos relevantes antes de confirmar, vuelve a subir el Excel para revisar una vista previa actualizada. Cada vista previa caduca a las dos horas.

También se reconocen los encabezados largos de los Excel antiguos. La columna antigua Contenido se ignora porque se calcula a partir de los poemas. Los textos de la web se editan en el panel.

Si sales de una vista previa sin confirmar, puedes retomarla desde **Importar Excel → Continuar una importación pendiente**. Tras importar, encontrarás enlaces directos a los poemas incorporados para revisarlos.

## Versos, atribuciones y estructura

Los campos incluyen ayudas breves basadas en las instrucciones de catalogación del proyecto:

- Íncipit, segundo verso y éxplicit conservan las convenciones de transcripción y los corchetes de las conjeturas.
- Folios admite valores como `3v-5r`, `6rv` o `[3r-4v]` sin convertirlos en fechas.
- Atribución sigue `Apellidos, Nombre`, con corchetes para las atribuciones reconstruidas y punto y coma entre varias. **Sin atribución conocida** introduce `[anónimo]`.
- **Sin epígrafe** introduce `[anepígrafo]`.
- Forma se selecciona del vocabulario del repertorio. Si falta, pulsa **Añadir nueva forma**, escribe el nombre y elige **Crear y seleccionar**. Se guarda en la lista de todas las fichas sin perder los cambios pendientes. No se crean duplicados por mayúsculas, tildes o espacios: si ya existe, pulsa **Usar forma existente**. Después guarda o publica la ficha.
- Al responder Sí a desarrollo, composiciones internas o estribillo, aparece el campo correspondiente. Si ya contiene texto y cambias a No, el texto permanece visible para que puedas revisarlo; nunca se borra automáticamente.
- Los campos no pertinentes pueden marcarse con `—`. No es necesario completar una transcripción para publicar la ficha.

Los borradores permiten dejar pendientes detalles de estructura. Para publicarlos, las respuestas y los textos correspondientes deben ser coherentes. Los saltos de numeración no son errores.

## Añadir o completar una transcripción

Busca la ficha, baja a **Transcripción y responsables** y escribe o pega el texto. Usa los botones **Cursiva** y **Negrita** sobre el fragmento seleccionado. Enter introduce un salto; conserva la separación de versos y estrofas. El pegado conserva formato básico y elimina fuentes, imágenes y estilos de origen.

Añade los responsables de la transcripción y revisa la vista previa guardada. La cursiva también está disponible en esquema métrico y otros campos textuales. La fecha de revisión se actualiza automáticamente al publicar.

## Modificar los textos de la web

En **Textos de la web**, cada fila representa un párrafo de portada o una sección de Presentación, Criterios o Manuscritos. Edita el título y el texto con el mismo editor visual. Puedes añadir secciones y elegir su posición, siempre que no esté ocupada.

En Manuscritos, las posiciones son fijas: 1 es la introducción, 2 el título del mapa y 3 su descripción. En el título del mapa solo se muestra texto, sin formato.

## Recuperar trabajo

**Historial y recuperación de versiones** muestra quién guardó o publicó cada versión y cuándo. Recuperar una versión la guarda como borrador; revísala antes de publicar.

**Retirar de la web pública** oculta una ficha, pero conserva sus datos y su historial. Antes de retirar un manuscrito deben retirarse sus poemas publicados. No hay eliminación definitiva desde el panel.

Si otra persona ha guardado la misma ficha mientras la editabas, el sistema impide sobrescribirla y conserva tus valores en el formulario. Copia tus cambios pendientes, recarga y compáralos con la revisión más reciente.

## Cuentas

Cada persona debe tener su propia cuenta. Administración puede crear, desactivar, reactivar y restablecer accesos. Edición permite trabajar en el catálogo y publicar, pero no gestionar otras cuentas. Todos pueden cambiar su propia contraseña. Al cambiar o restablecer una contraseña se cierran las sesiones de esa cuenta.

Las copias de seguridad se gestionan en el ordenador donde funciona la aplicación mediante `npm run db:backup`; no se descargan desde la web pública.
