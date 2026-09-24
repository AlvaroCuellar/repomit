# Validación del flujo editorial

Comprobación local del 9 de septiembre de 2026. Las pruebas utilizan bases temporales o `.local/e2e/test.sqlite`; no crean fichas de prueba en el catálogo de trabajo.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | Sin errores ni advertencias de Svelte/TypeScript |
| `npm test` | 22 pruebas superadas |
| `npm run test:e2e` | 11 pruebas de navegador superadas |
| `npm run build` | Compilación correcta para Node |
| `npm run test:production` | Acceso, Excel de más de 500 KB, borradores privados, publicación, reinicio y cierre de sesión correctos |
| `npm audit --omit=dev` | Sin vulnerabilidades conocidas informadas |
| `git diff --check` | Sin errores de espacios |

## Recorridos cubiertos

- Acceso protegido, contraseñas, intentos fallidos, sesiones y permisos de edición/administración.
- Alta de manuscrito, incorporación de varios poemas, saltos de numeración, orden duplicado y publicación conjunta con cancelación completa si falla una ficha.
- Corrección de fichas, conservación de cursivas y saltos de verso, transcripciones opcionales, edición simultánea, recuperación de historial y retirada de publicación.
- Formas métricas nuevas, detección de variantes del mismo nombre, selección sin perder trabajo pendiente y publicación posterior.
- Importación con vista previa sin crear fichas, confirmación de formas nuevas, guardado atómico, repetición de la confirmación sin duplicar, propiedad y caducidad del lote, y cambios del catálogo entre revisión y confirmación.
- Plantilla vacía y ejemplo rellenado procesados por el importador real; encabezados antiguos, columnas reordenadas, cursivas parciales, filas vacías, fechas accidentales, fórmulas, celdas combinadas, HTML literal, macros y límites de archivo/descompresión.
- Búsqueda sin tildes por íncipit, autor, manuscrito o folios; orden topográfico; navegación anterior/siguiente; aviso de salida con cambios pendientes; sugerencia de numeración.
- Navegación pública y edición en pantalla de 390 píxeles, sin desbordamiento horizontal en los recorridos probados. Revisión visual de las pantallas de manuscrito e importación y de las hojas de las plantillas.

## Fallos encontrados y corregidos

- Al navegar entre poemas sin recargar, el editor con formato podía conservar visualmente el texto anterior. Ahora sincroniza el contenido entrante y conserva el cursor durante la escritura ordinaria; el recorrido de navegador comprueba el cambio entre fichas.
- El aviso después de «Guardar y añadir» podía describir una publicación aunque se había guardado un borrador. Ahora identifica correctamente la ficha anterior como borrador.
- El lector no reconocía los espacios de nombres XML utilizados por el exportador de las plantillas. Se normalizan mediante un analizador XML antes de leer el libro, sin reemplazar texto de las celdas.
- El límite por defecto del servidor compilado impedía subir archivos mayores de 500 KB. El arranque permite los 5 MB documentados más el envoltorio del formulario.
- Se añadieron ayudas, recuperación de importaciones pendientes, enlaces a los poemas importados, navegación dentro del manuscrito y protección frente a publicar el conjunto dejando cambios locales sin guardar.

## Prueba de volumen y archivos históricos

Un lote aislado de 2.000 fichas (un manuscrito y 1.999 poemas) se analizó en unos 8 segundos y se confirmó en unos 15 segundos en este ordenador. Se guardó completo y ninguna ficha quedó publicada. Son mediciones locales, no una garantía de rendimiento en otros equipos.

Se leyeron los cinco libros de `data/excel/` sin modificarlos. Los errores de sus datos siguen requiriendo revisión editorial: entre ellos, falta el encabezado de Íncipit en un libro, hay folios convertidos en fechas y siglas que no coinciden entre pestañas en otro. El importador los señala; no reconstruye valores ni asigna manuscritos por conjetura.

Esta validación cubre el entorno local Node/Chromium. No constituye una comprobación de un despliegue remoto ni de todas las versiones de Excel y navegadores.
