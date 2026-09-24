<script lang="ts">
  import { page } from '$app/stores';
  import { recordCitation } from '$lib/citations';
  import type { Poema, Testimonio } from '$lib/data/repomit';
  export let kind: 'poemas' | 'testimonios';
  export let record: Poema | Testimonio;
  const consulted = new Date().toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  $: citation = recordCitation(kind, record, $page.url.origin, consulted);
  let feedback = '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      feedback = 'Cita copiada.';
    } catch {
      feedback = 'Puedes seleccionar y copiar el texto de la cita.';
    }
  }
</script>

<details class="citation-box">
  <summary>Cómo citar esta ficha</summary>
  <p class="citation">{citation}</p>
  <p class="help">
    La cita identifica a los responsables de la ficha. Si utilizas la transcripción, reconoce
    también a sus responsables cuando consten.
  </p>
  <button type="button" on:click={copy}>Copiar cita</button>
  <span role="status">{feedback}</span>
</details>

<style>
  .citation-box {
    margin: 1.5rem 0;
    padding: 1rem;
    border: 1px solid #e4dfd4;
    background: #fffefb;
    border-radius: 4px;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  .citation {
    overflow-wrap: anywhere;
  }
  .help {
    color: #4c463d;
    font-size: 0.9rem;
  }
  button {
    font: inherit;
    padding: 0.5rem 0.8rem;
    border: 1px solid #674c19;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
  }
  span {
    margin-left: 0.5rem;
  }
</style>
