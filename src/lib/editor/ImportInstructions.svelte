<script lang="ts">
  import { importFields, importRequired } from './import-schema';
</script>

<details class="panel">
  <summary>Cómo preparar el Excel y qué significa cada columna</summary>
  <p>
    Usa la <a href="/plantillas/repomit-plantilla.xlsx" download>plantilla vacía</a> para introducir
    tus datos. El <a href="/plantillas/repomit-ejemplo.xlsx" download>ejemplo rellenado</a> contiene un
    manuscrito y dos poemas inventados: sirve para ver la estructura, no para incorporarlo al repertorio
    real.
  </p>
  <ol>
    <li>
      Conserva los nombres de las pestañas <strong>Testimonios</strong> y <strong>Poemas</strong>.
      Escribe los encabezados en la primera fila y los datos a partir de la segunda. Una fila por
      ficha, sin celdas combinadas.
    </li>
    <li>
      En <strong>Testimonios</strong>, añade una fila por manuscrito nuevo. En
      <strong>Poemas</strong>, repite su sigla en la columna <code>testimonio</code>. Para añadir
      poemas a un manuscrito existente basta la pestaña Poemas con su sigla actual.
    </li>
    <li>
      <strong>Obligatorios para importar:</strong> sigla en Testimonios; sigla, orden e íncipit en Poemas.
      Conserva todas las columnas de la plantilla; los demás datos pueden completarse en el panel.
    </li>
    <li>
      <strong>Orden:</strong> número entero entre 1 y 999999. Se permiten saltos, pero dos poemas del
      mismo manuscrito no pueden compartir número. No cambies el orden original para rellenar huecos.
    </li>
    <li>
      <strong>Folios, siglas y dataciones:</strong> usa formato Texto. Ejemplos: <code>3v-5r</code>,
      <code>[6rv]</code>, <code>ca. 1620</code>. Si Excel los convirtió en fechas, cambia el formato
      y vuelve a escribir el dato.
    </li>
    <li>
      <strong>Formato:</strong> las cursivas y negritas de Excel se conservan en los campos textuales
      que admiten formato. Los saltos de línea dentro de una celda se conservan. No escribas etiquetas
      HTML ni fórmulas; pega solo valores.
    </li>
    <li>
      <strong>Estructura:</strong> escribe <code>sí</code>, <code>no</code> o <code>—</code>. Si
      contestas sí, completa el íncipit de desarrollo, íncipit interno o estribillo correspondiente.
      Puedes dejarlo pendiente como borrador, pero habrá que revisarlo antes de publicar.
    </li>
    <li>
      <strong>Forma nueva:</strong> escribe su nombre. Aparecerá en la vista previa y tendrás que confirmar
      su incorporación al vocabulario. Revisa primero que no sea una errata.
    </li>
    <li>
      Guarda como <strong>.xlsx</strong>, sin contraseña ni macros. Máximo
      <strong>5 MB y 2.000 fichas por archivo</strong>. Divide los lotes mayores. Las pestañas de
      instrucciones no se importan.
    </li>
  </ol>
  <p>
    Los encabezados largos de las plantillas antiguas de RePoMIt también se reconocen. La antigua
    columna «Contenido» se ignora porque el contenido topográfico se genera a partir de los poemas.
    No se importan los textos de portada, presentación o criterios desde Excel: se editan en <a
      href="/admin?kind=textos">Textos de la web</a
    >.
  </p>
  {#each ['testimonios', 'poemas'] as kind}
    <h3>{kind === 'testimonios' ? 'Pestaña Testimonios' : 'Pestaña Poemas'}</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Encabezado</th><th>Dato</th><th>Para importar</th></tr></thead><tbody
          >{#each importFields[kind as 'testimonios' | 'poemas'] as [key, label]}<tr
              ><td><code>{key}</code></td><td>{label}</td><td
                >{importRequired[kind as 'testimonios' | 'poemas'].includes(key)
                  ? 'Obligatorio'
                  : 'Puede completarse después'}</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
  {/each}
</details>
