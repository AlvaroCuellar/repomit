<script lang="ts">
  export let data;
  $: ({ site } = data);
</script>

<h1>Presentación</h1>

{#each site.presentacion as section (section.key)}
  <section>
    <h2>{section.title}</h2>
    {#each section.paragraphs as paragraph}
      <div class="paragraph">{@html paragraph}</div>
    {/each}
  </section>
{/each}
