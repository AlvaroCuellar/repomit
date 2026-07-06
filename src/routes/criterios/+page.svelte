<script lang="ts">
  import { site } from '$lib/data/repomit';
</script>

<h1>Criterios de catalogación</h1>

{#each site.criterios as section (section.key)}
  <section>
    <h2>{section.title}</h2>
    {#each section.paragraphs as paragraph}
      <p>{@html paragraph}</p>
    {/each}
  </section>
{/each}
