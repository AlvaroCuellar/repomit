<script lang="ts">
  export let data;
  $: ({ site } = data);
</script>

<section class="home-header">
  <div class="home-title">
  <h1>RePoMIt</h1>
  <p class="subtitle">
    <strong>Re</strong>pertorio de la <strong>po</strong>esía en castellano en
    <strong>m</strong>anuscritos <strong>it</strong>alianos
  </p>
  </div>

</section>

<section class="intro">
  {#each site.home.intro as paragraph}
    <div class="paragraph">{@html paragraph}</div>
  {/each}
</section>

<nav class="featured-links" aria-label="Accesos principales">
  <a href="/busqueda">
    <strong>Búsqueda</strong>
    <span>Buscar por íncipit, verso, epígrafe, estribillo, autor o texto libre.</span>
  </a>
  <a href="/repertorio">
    <strong>Repertorio</strong>
    <span>Consultar las composiciones en orden alfabético.</span>
  </a>
  <a href="/manuscritos">
    <strong>Manuscritos</strong>
    <span>Acceder a las fichas de testimonios y sus composiciones catalogadas.</span>
  </a>
</nav>

<div class="visits-area">
  {#if data.publicStatistics}
    <div class="visitor-counter">
      <strong>{data.publicStatistics.total.toLocaleString('es-ES')}</strong>
      <span class="counter-label">Visitas al repertorio</span>
    </div>
  {/if}
</div>

<style>
  .visits-area { display: flex; justify-content: flex-end; margin: 0 0 1.5rem; }
  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e4dfd4;
  }

  .home-title { min-width: 0; }
  .visitor-counter {
    width: max-content;
    max-width: 100%;
    display: flex;
    align-items: baseline;
    gap: .4rem;
    border-left: 1px solid #d8ceb9;
    padding: .25rem 0 .25rem .8rem;
    color: #61513a;
  }
  .visitor-counter strong { font-size: 1rem; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .counter-label { font-size: .8rem; }

  .subtitle {
    margin: 0;
    color: #4c463d;
    font-size: 1.15rem;
  }

  .subtitle strong {
    color: #23201d;
    font-weight: 800;
  }

  .intro {
    max-width: none;
    margin-top: 1.5rem;
  }

  .featured-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }

  .featured-links a {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border: 1px solid #e4dfd4;
    border-radius: 4px;
    background: #fffefb;
    text-decoration: none;
  }

  .featured-links span {
    color: #4c463d;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    .home-header { flex-direction: column; align-items: stretch; gap: 1.2rem; }
    .visitor-counter { flex-basis: auto; padding-left: 1rem; }
    .visitor-counter strong { font-size: 1rem; }
    .featured-links {
      grid-template-columns: 1fr;
    }
  }
</style>
