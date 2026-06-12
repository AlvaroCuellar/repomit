<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>RePoMIt</title>
  <meta
    name="description"
    content="Repertorio digital de poesía áurea en manuscritos italianos"
  />
</svelte:head>

<header class="site-header">
  <a class="brand" href="/">RePoMIt</a>
  <nav aria-label="Navegación principal">
    <a href="/presentacion">Presentación</a>
    <a href="/manuscritos">Manuscritos</a>
    <a href="/repertorio">Repertorio</a>
    <a href="/busqueda">Búsqueda</a>
  </nav>
</header>

<main>
  {@render children()}
</main>

<style>
  :global(body) {
    margin: 0;
    color: #23201d;
    background: #fbfaf7;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  :global(a) {
    color: #674c19;
  }

  :global(h1) {
    margin: 0 0 1rem;
    font-size: 2rem;
    line-height: 1.15;
  }

  :global(h2) {
    margin-top: 2rem;
    font-size: 1.25rem;
  }

  :global(p) {
    line-height: 1.6;
  }

  .site-header {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e4dfd4;
    background: #fffefb;
  }

  .brand {
    color: #23201d;
    font-weight: 700;
    text-decoration: none;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    font-size: 0.95rem;
  }

  nav a {
    text-decoration: none;
  }

  main {
    width: min(960px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  @media (max-width: 640px) {
    .site-header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
