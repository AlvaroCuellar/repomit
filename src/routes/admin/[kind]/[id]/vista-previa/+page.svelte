<script lang="ts">
  import Poema from '../../../../poemas/[id]/+page.svelte';
  import Testimonio from '../../../../testimonios/[id]/+page.svelte';
  import Presentacion from '../../../../presentacion/+page.svelte';
  import Criterios from '../../../../criterios/+page.svelte';
  import Home from '../../../../+page.svelte';
  import Manuscritos from '../../../../manuscritos/+page.svelte';
  export let data;
</script>

<div class="notice">
  <strong>Vista previa privada del borrador guardado.</strong> Los visitantes siguen viendo la
  versión publicada. <a href={'/admin/' + data.kind + '/' + data.recordId}>Volver a editar</a>
</div>
{#if data.kind === 'poemas'}<Poema {data} />{:else if data.kind === 'testimonios'}<Testimonio
    {data}
  />{:else if data.previewPage === 'presentacion'}<Presentacion
    {data}
  />{:else if data.previewPage === 'criterios'}<Criterios
    {data}
  />{:else if data.previewPage === 'home'}<Home {data} />{:else}<Manuscritos {data} />{/if}
