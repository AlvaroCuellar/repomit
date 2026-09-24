<script lang="ts">
  export let data;
  $: ({ site } = data);
</script>

<h1>Criterios de catalogación</h1>

{#each site.criterios as section (section.key)}
  <section>
    <h2>{section.title}</h2>
    {#each section.paragraphs as paragraph}
      <div class="paragraph">{@html paragraph}</div>
    {/each}
  </section>
{/each}
