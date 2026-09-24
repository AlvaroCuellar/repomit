<script lang="ts">
  import type { Kind } from './schema';
  export let kind: Kind;
</script>

<details class="panel" style="margin-top:1rem">
  <summary><strong>Cómo rellenar y revisar esta ficha</strong></summary>
  {#if kind === 'testimonios'}
    <ol>
      <li>
        Empieza por una sigla única, por ejemplo <strong>NaNB V.A.16</strong>. Ciudad, institución y
        signatura identifican dónde se conserva el manuscrito; complétalas antes de publicarlo.
      </li>
      <li>
        La fecha admite texto: <strong>siglo XVII</strong>, <strong>ca. 1620</strong> o
        <strong>[1600-1650]</strong>. Añade el enlace completo del catálogo y la bibliografía que
        justifica los datos.
      </li>
      <li>
        Guarda el manuscrito y utiliza «Añadir poema» en su ficha. El contenido topográfico se
        genera automáticamente a partir de sus poemas; no tienes que copiar una lista.
      </li>
      <li>
        Revisa el conjunto con la vista previa. La publicación conjunta comprueba también los
        poemas; si falta algún dato obligatorio, el aviso te indicará qué corregir.
      </li>
    </ol>
  {:else if kind === 'poemas'}
    <ol>
      <li>
        Selecciona primero el manuscrito. Para guardar un borrador necesitas también el orden
        topográfico y el íncipit. El orden es un entero positivo: puede saltar de 1 a 3, pero no
        repetirse dentro del mismo manuscrito.
      </li>
      <li>
        Indica los folios como <strong>3v-5r</strong>, <strong>6rv</strong> o
        <strong>[3r-4v]</strong>, sin «f.» ni «p.». Conserva los corchetes de las conjeturas.
      </li>
      <li>
        Escribe el primer verso en Íncipit y el último en Éxplicit. Si no hay epígrafe, usa <strong
          >[anepígrafo]</strong
        >; si no consta autor, <strong>[anónimo]</strong>. Las atribuciones bibliográficas van entre
        corchetes.
      </li>
      <li>
        Elige la forma métrico-poética. Si falta, usa la opción para añadir una forma nueva: revisa
        su nombre para evitar variantes del mismo término.
      </li>
      <li>
        Responde Sí o No a las preguntas de estructura y estribillo. Si respondes Sí, completa el
        texto que aparece debajo. Separa versos del estribillo con <strong>/</strong> e íncipits
        internos con <strong>|</strong>.
      </li>
      <li>
        La transcripción es opcional y puede añadirse después. Conserva saltos de verso y estrofa;
        usa los controles de cursiva y negrita. Responsables: <strong
          >Apellidos, Nombre; Apellidos, Nombre</strong
        >.
      </li>
    </ol>
  {:else}
    <p>
      Selecciona la página, indica el orden de la sección y escribe su título y contenido. Usa los
      controles de formato para párrafos, cursivas y enlaces. Pulsa Intro para crear un párrafo
      nuevo. Para añadir un apartado con título propio, vuelve a «Textos de la web» y pulsa «Añadir
      sección»; Presentación y Criterios admiten nuevas secciones. Elige una posición libre en el
      orden de la página. Revisa la vista previa de la página antes de publicar.
    </p>
  {/if}
  <p>
    <strong>Guardar borrador</strong> conserva el trabajo para el equipo. <strong>Publicar</strong> hace
    visibles los cambios al público. La vista previa permite revisarlos antes; el historial permite recuperar
    versiones anteriores. Los campos opcionales pueden quedar vacíos: no inventes datos para completarlos.
  </p>
  {#if kind !== 'textos'}
    <p>
      Para incorporar muchas fichas, abre <a href="/admin/importar">Importar Excel</a>: allí tienes
      instrucciones por columna, una
      <a href="/plantillas/repomit-plantilla.xlsx" download>plantilla vacía</a>
      y un <a href="/plantillas/repomit-ejemplo.xlsx" download>ejemplo rellenado</a>. Las
      correcciones de fichas existentes se hacen aquí; el Excel incorpora fichas nuevas.
    </p>
  {/if}
</details>
