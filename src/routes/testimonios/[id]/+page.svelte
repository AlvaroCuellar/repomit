<script lang="ts">
  import { page } from '$app/stores';
  import { getPoemasByTestimonio, getTestimonio, testimonios, type Testimonio } from '$lib/data/repomit';

  const sortedTestimonios = [...testimonios].sort(
    (a, b) =>
      a.ciudad.localeCompare(b.ciudad, 'es') ||
      a.institucion.localeCompare(b.institucion, 'es') ||
      a.testimonio.localeCompare(b.testimonio, 'es')
  );

  $: id = $page.params.id;
  $: testimonio = getTestimonio(id);
  $: poemas = testimonio ? sortPoemasByOrden(getPoemasByTestimonio(testimonio.id)) : [];
  $: currentIndex = testimonio ? sortedTestimonios.findIndex((entry) => entry.id === testimonio.id) : -1;
  $: previousTestimonio = currentIndex > 0 ? sortedTestimonios[currentIndex - 1] : undefined;
  $: nextTestimonio =
    currentIndex >= 0 && currentIndex < sortedTestimonios.length - 1
      ? sortedTestimonios[currentIndex + 1]
      : undefined;
  $: missingOrders = getMissingOrders(poemas.map((poema) => poema.orden));

  function hasText(value: string | undefined) {
    const normalized = String(value ?? '').trim();
    return normalized !== '' && normalized !== '—' && normalized !== '-';
  }

  function display(value: string | undefined) {
    return hasText(value) ? value : '—';
  }

  function htmlOrText(html: string | undefined, text: string | undefined) {
    return hasText(html) ? html : display(text);
  }

  function isExternalUrl(value: string | undefined) {
    return /^https?:\/\//i.test(String(value ?? '').trim());
  }

  function sortPoemasByOrden(entries: ReturnType<typeof getPoemasByTestimonio>) {
    return [...entries].sort((a, b) => {
      const aNumber = Number(a.orden);
      const bNumber = Number(b.orden);

      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return aNumber - bNumber;
      }

      return a.orden.localeCompare(b.orden, 'es') || a.sort_incipit.localeCompare(b.sort_incipit, 'es');
    });
  }

  function getMissingOrders(values: string[]) {
    const numbers = values.map((value) => Number(value)).filter((value) => Number.isInteger(value));

    if (numbers.length < 2) {
      return [];
    }

    const present = new Set(numbers);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const missing: number[] = [];

    for (let order = min; order <= max; order += 1) {
      if (!present.has(order)) {
        missing.push(order);
      }
    }

    return missing;
  }

  function href(testimonioEntry: Testimonio) {
    return `/testimonios/${testimonioEntry.id}`;
  }
</script>

{#if testimonio}
  <nav class="page-nav" aria-label="Navegación de testimonio">
    <a href="/manuscritos">Volver a manuscritos</a>
    <a href="/repertorio">Volver al repertorio</a>
    {#if previousTestimonio}
      <a href={href(previousTestimonio)}>Testimonio anterior</a>
    {/if}
    {#if nextTestimonio}
      <a href={href(nextTestimonio)}>Testimonio siguiente</a>
    {/if}
  </nav>

  <header class="record-header">
    <h1>{testimonio.testimonio}</h1>
    <dl>
      <div>
        <dt>Ciudad</dt>
        <dd>{display(testimonio.ciudad)}</dd>
      </div>
      <div>
        <dt>Institución</dt>
        <dd>{display(testimonio.institucion)}</dd>
      </div>
      <div>
        <dt>Signatura</dt>
        <dd>{display(testimonio.signatura)}</dd>
      </div>
      <div>
        <dt>Composiciones catalogadas</dt>
        <dd>{poemas.length}</dd>
      </div>
    </dl>
  </header>

  <section class="block">
    <h2>Identificación</h2>
    <dl>
      <div>
        <dt>Testimonio</dt>
        <dd>{display(testimonio.testimonio)}</dd>
      </div>
      <div>
        <dt>Ciudad</dt>
        <dd>{display(testimonio.ciudad)}</dd>
      </div>
      <div>
        <dt>Institución</dt>
        <dd>{display(testimonio.institucion)}</dd>
      </div>
      <div>
        <dt>Signatura</dt>
        <dd>{display(testimonio.signatura)}</dd>
      </div>
      <div>
        <dt>Recopilador</dt>
        <dd>{display(testimonio.recopilador)}</dd>
      </div>
      <div>
        <dt>Fecha</dt>
        <dd>{display(testimonio.fecha)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2>Contenido</h2>
    <div class="prose content-list">{@html htmlOrText(testimonio.contenido_html, testimonio.contenido)}</div>
  </section>

  <section class="block">
    <h2>Enlace</h2>
    {#if isExternalUrl(testimonio.enlace)}
      <p>
        <a href={testimonio.enlace} target="_blank" rel="noopener noreferrer">
          Ficha en catálogo externo
        </a>
      </p>
    {:else}
      <p>—</p>
    {/if}
  </section>

  <section class="block">
    <h2>Bibliografía</h2>
    <div class="prose">{@html htmlOrText(testimonio.bibliografia_html, testimonio.bibliografia)}</div>
  </section>

  <section class="block">
    <h2>Responsabilidad</h2>
    <dl>
      <div>
        <dt>Responsable(s) de la ficha</dt>
        <dd>{display(testimonio.autores_ficha)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2>Poemas asociados</h2>
    {#if missingOrders.length > 0}
      <p class="note">
        La secuencia topográfica presenta saltos ({missingOrders.join(', ')}). Pueden corresponder
        a composiciones en otras lenguas o materiales no incorporados al repertorio.
      </p>
    {/if}

    <div class="poem-table" role="table" aria-label="Poemas asociados al testimonio">
      <div class="table-head" role="row">
        <span role="columnheader">Ítem</span>
        <span role="columnheader">Íncipit</span>
        <span role="columnheader">Folios/páginas</span>
        <span role="columnheader">Atribución</span>
        <span role="columnheader">Forma</span>
      </div>
      {#each poemas as poema}
        <div class="table-row" role="row">
          <span role="cell"><a href={`/poemas/${poema.id}`}>{poema.item}</a></span>
          <span role="cell">{poema.incipit}</span>
          <span role="cell">{display(poema.folios)}</span>
          <span role="cell">{display(poema.atribucion)}</span>
          <span role="cell">{display(poema.forma)}</span>
        </div>
      {/each}
    </div>
  </section>
{:else}
  <nav class="page-nav" aria-label="Navegación de testimonio">
    <a href="/manuscritos">Volver a manuscritos</a>
    <a href="/repertorio">Volver al repertorio</a>
  </nav>

  <h1>Testimonio no encontrado</h1>
  <p>No existe una ficha de testimonio con el identificador <code>{id}</code>.</p>
{/if}

<style>
  .page-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .record-header {
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #d8d0c2;
  }

  .block {
    padding: 1.4rem 0;
    border-bottom: 1px solid #e4dfd4;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem 1.4rem;
    margin: 0;
  }

  dt {
    color: #6c6256;
    font-size: 0.88rem;
  }

  dd {
    margin: 0.2rem 0 0;
    line-height: 1.55;
  }

  .prose {
    line-height: 1.7;
  }

  .content-list {
    max-width: 54rem;
  }

  .note {
    color: #6c6256;
    font-size: 0.92rem;
  }

  .poem-table {
    display: grid;
    gap: 0;
    border-top: 1px solid #d8d0c2;
  }

  .table-head,
  .table-row {
    display: grid;
    grid-template-columns: 8rem 1.5fr 0.9fr 1.1fr 0.9fr;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e4dfd4;
  }

  .table-head {
    color: #6c6256;
    font-size: 0.88rem;
    font-weight: 700;
  }

  .table-row {
    line-height: 1.45;
  }

  @media (max-width: 860px) {
    dl,
    .table-head,
    .table-row {
      grid-template-columns: 1fr;
    }

    .table-head {
      display: none;
    }

    .table-row {
      gap: 0.35rem;
    }
  }
</style>
