# Respuesta a los comentarios de Antonietta

## Resoluciones técnicas

1. El aviso de Google procede del Apps Script que llama al Deploy Hook de Vercel. No indica que
   la hoja o RePoMIt contengan código malicioso. Google muestra el aviso porque el script no ha
   pasado una verificación OAuth pública. Se ha reducido el alcance con `@OnlyCurrentDoc`.
   La autorización se realiza una sola vez por cuenta; no hay que aceptar el aviso en cada cambio.
2. Se corrige la sigla canónica a `RoLC 625`. Además, el Apps Script propaga en adelante cualquier
   cambio de sigla realizado en `Testimonios` a las filas correspondientes de `Poemas`.
3. La columna manual `contenido` deja de formar parte de la plantilla. La web genera «Contenido
   (orden topográfico)» automáticamente desde `Poemas`. El importador sigue siendo compatible con
   la hoja antigua que conserva la columna.
4. Para añadir un Excel ya fichado se pegan la fila de su pestaña `Testimonios` y las filas con
   datos de su pestaña `Poemas` al final de las pestañas homónimas de Google Sheets, sin copiar
   cabeceras. No hay inconveniente en esperar hasta agosto.
5. Los cuatro testimonios y 298 poemas ocupan aproximadamente 0,62 MB de JSON generado; todos los
   ficheros funcionales y de datos del proyecto rondan 1,3 MB, excluyendo dependencias y copias
   históricas de trabajo. Multiplicar el corpus por 10 cabe con enorme holgura; multiplicarlo por
   100 seguiría siendo plausible por volumen, aunque exigiría optimizar la carga y la búsqueda.
   El límite de Google Sheets es de 10 millones de celdas y Vercel admite cargas de fuentes
   estáticas de hasta 100 MB en el plan Hobby.
6. El Instituto Cervantes no necesita acceso de edición a Google Sheets. Para alojar o conservar
   técnicamente el proyecto bastan el repositorio, la configuración de compilación y, según el
   modelo elegido, acceso de solo lectura a los datos o una exportación estática. La edición de la
   hoja debe quedar restringida al equipo académico.

## Borrador de respuesta a Antonietta

Querida Antonietta:

muchísimas gracias por tu correo y por tus palabras. Me alegra mucho que las soluciones te estén
resultando eficaces y sencillas de utilizar. He revisado con detalle todos los puntos:

1. El aviso de Google aparece por el pequeño script que permite publicar desde la hoja y no porque
   haya detectado un problema concreto en RePoMIt. Google trata como «aplicación no verificada» los
   scripts internos que solicitan permiso para acceder a la hoja y avisar a Vercel. He limitado el
   permiso para que se refiera únicamente a este documento. La primera vez tendrás que autorizarlo
   y entrar por la opción avanzada, pero esa autorización queda guardada: no tendrás que volver a
   aceptar el «riesgo» cada vez que hagas un cambio. Solo podría volver a pedir permiso si se
   modificase el script o si se revocase la autorización. Someterlo a la verificación formal de
   Google es posible, pero exige crear y documentar una aplicación pública, verificar un dominio y
   publicar una política de privacidad; para este uso interno y con tan pocas personas no parece
   proporcionado.

2. Tienes razón: la sigla correcta es `RoLC 625`. El cambio a `RoLC 44.A.16` se produjo porque en
   el Excel la hoja de poemas decía `RoLC 625`, pero la ficha del testimonio decía `RoLC 44.A.16`,
   y el sistema tomó esta última como forma principal. Ya lo he corregido. No tienes que cambiarlo
   manualmente en todas las recurrencias. Además, he preparado la hoja para que, cuando se cambie
   una sigla en `Testimonios`, se actualicen automáticamente los poemas asociados.

3. La antigua columna «Contenido» de `Testimonios` ya no es necesaria. La sección «Contenido
   (orden topográfico)» que aparece en la web se construye automáticamente a partir de la pestaña
   `Poemas`. La he retirado de la nueva plantilla. La hoja antigua puede conservarla temporalmente
   sin causar problemas, porque la web ya no depende de ella.

4. Para incorporar un testimonio desde el Excel tradicional basta con copiar dos bloques, sin
   importar ni reemplazar el documento completo: la única fila con datos de la hoja `Testimonios`
   se pega al final de la pestaña `Testimonios` de Google Sheets, y las filas con datos de la hoja
   `Poemas`, sin copiar la cabecera, se pegan al final de `Poemas`. Después se publica y se comprueba
   el resultado. No hay ningún problema en que dejemos la prueba de los dos testimonios nuevos para
   comienzos de agosto; el sistema actual puede seguir funcionando mientras tanto.

5. Ahora mismo hay 4 testimonios y 298 poemas. Los datos que consume la web ocupan alrededor de
   0,62 MB; el conjunto funcional del proyecto y sus datos ronda 1,3 MB, sin contar dependencias
   de programación ni copias históricas. En términos prácticos, duplicar, multiplicar por diez o
   por diez el corpus actual no plantea ningún problema de almacenamiento. Cien veces los datos
   actuales serían aproximadamente 62 MB y seguirían siendo técnicamente manejables, pero en ese
   escenario sí convendría cambiar la forma de cargar y buscar los datos para mantener la web ágil.
   Estamos muy lejos del límite de Google Sheets, que admite hasta 10 millones de celdas, y del
   orden de magnitud de los límites actuales de Vercel.

6. El Instituto Cervantes no necesita acceso de edición a Google Sheets y estoy de acuerdo en que
   conviene evitar que demasiadas personas puedan modificar los datos. La hoja debe seguir bajo el
   control del equipo académico. Para estudiar el alojamiento, puedo facilitarles directamente las
   especificaciones técnicas: el código está en un repositorio público, la aplicación está hecha
   con SvelteKit y Node.js, y se compila como una aplicación web a partir de datos estáticos. Les
   propongo que les envíes el enlace actual y el correo técnico que dejo debajo; si después necesitan
   aclaraciones, puedo responderles directamente.

[Añadir aquí la respuesta real sobre si ya se produjo el contacto o pago de la clase.]

Un abrazo,

Álvaro

## Correo técnico para el Instituto Cervantes

Asunto: Especificaciones técnicas y opciones de alojamiento de RePoMIt

Estimados/as:

les escribo en relación con RePoMIt, actualmente accesible en
<https://repomit.vercel.app>, para facilitarles la información necesaria para valorar su
alojamiento institucional.

El código fuente se conserva en el repositorio público
<https://github.com/AlvaroCuellar/repomit>. Es una aplicación web desarrollada con SvelteKit,
TypeScript y Node.js. El proceso de construcción ejecuta `npm ci` y `npm run build`; durante
la construcción se validan y convierten los datos académicos a JSON y se genera la aplicación.
La versión actual está desplegada en Vercel y conectada al repositorio de GitHub.

Los datos editoriales se mantienen en una Google Sheet controlada por el equipo académico. No es
necesario conceder al personal técnico acceso de edición a esa hoja. Para un alojamiento
institucional existen dos posibilidades:

- mantener la hoja como fuente de datos de solo lectura durante la construcción, para lo cual el
  servidor de compilación necesita acceso HTTPS saliente a Google Sheets y la variable de entorno
  `GOOGLE_SHEETS_ID`;
- construir desde una copia validada de los Excel o JSON incluida en cada versión, sin conexión
  directa con la hoja. En ese caso, las actualizaciones se entregarían mediante nuevas versiones
  del repositorio o nuevos paquetes de despliegue.

La segunda opción ofrece un mayor aislamiento; la primera simplifica la actualización editorial.
En ambos casos, los permisos de edición de Google Sheets pueden permanecer restringidos al equipo
del proyecto.

El corpus actual contiene 4 testimonios y 298 poemas. Los JSON generados ocupan aproximadamente
0,62 MB y el volumen funcional del proyecto es pequeño. No se requiere base de datos ni
almacenamiento multimedia especial en la configuración actual.

Para concretar la migración necesitaríamos conocer:

- si pueden alojar una aplicación Node/SvelteKit o prefieren que preparemos una adaptación
  específicamente estática;
- versión de Node.js disponible (se recomienda Node.js 22 LTS);
- procedimiento de despliegue desde GitHub o de recepción de versiones;
- posibilidad de configurar variables de entorno y acceso HTTPS saliente durante la compilación;
- dominio o subdominio previsto y procedimiento para configurar DNS y certificado HTTPS;
- persona técnica de contacto para realizar una prueba de despliegue.

Quedo a su disposición para cualquier aclaración técnica.

Un cordial saludo,

Álvaro Cuéllar
