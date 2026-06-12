<script lang="ts">
  import { poemas, testimonios } from '$lib/data/repomit';
  import {
    filterRepertorio,
    getFormaOptions,
    getTestimonioOptions,
    groupRepertorioByInitial,
    hasTextValue
  } from '$lib/search/repomit-search';

  const formaOptions = getFormaOptions(poemas);
  const testimonioOptions = getTestimonioOptions(testimonios);

  let query = '';
  let forma = '';
  let testimonioId = '';

  $: visiblePoemas = filterRepertorio(poemas, { query, forma, testimonioId });
  $: groups = groupRepertorioByInitial(visiblePoemas);
</script>

<h1>Repertorio</h1>

<form class="filters" aria-label="Filtros del repertorio">
  <label class="text-filter">
    Filtrar repertorio
    <input bind:value={query} type="search" placeholder="Íncipit, ítem, autor o testimonio" />
  </label>

  <label>
    Forma
    <select bind:value={forma}>
      <option value="">Todas</option>
      {#each formaOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>

  <label>
    Testimonio
    <select bind:value={testimonioId}>
      <option value="">Todos</option>
      {#each testimonioOptions as option}
        <option value={option.id}>{option.label}</option>
      {/each}
    </select>
  </label>
</form>

<p class="count">
  {visiblePoemas.length}
  {visiblePoemas.length === 1 ? 'entrada visible' : 'entradas visibles'}
</p>

{#if visiblePoemas.length > 0}
  <div class="alphabet">
    {#each groups as group}
      <a href={`#letra-${group.letter}`}>{group.letter}</a>
    {/each}
  </div>

  <div class="repertorio">
    {#each groups as group}
      <section id={`letra-${group.letter}`} class="letter-group">
        <h2>{group.letter}</h2>

        <ol>
          {#each group.poemas as poema}
            <li>
              <a class="incipit" href={`/poemas/${poema.id}`}>{poema.incipit}</a>

              <dl>
                <div>
                  <dt>Ítem</dt>
                  <dd>{poema.item}</dd>
                </div>
                <div>
                  <dt>Testimonio</dt>
                  <dd>{poema.testimonio}</dd>
                </div>
                <div>
                  <dt>Folios</dt>
                  <dd>{poema.folios || '—'}</dd>
                </div>
                <div>
                  <dt>Atribución</dt>
                  <dd>{poema.atribucion || '—'}</dd>
                </div>
                <div>
                  <dt>Forma</dt>
                  <dd>{poema.forma || '—'}</dd>
                </div>
              </dl>

              {#if hasTextValue(poema.incipit_desarrollo)}
                <p class="secondary-inc"><strong>Desarrollo:</strong> {poema.incipit_desarrollo}</p>
              {/if}

              {#if hasTextValue(poema.incipit_interno)}
                <p class="secondary-inc">
                  <strong>Composición interna/final:</strong> {poema.incipit_interno}
                </p>
              {/if}
            </li>
          {/each}
        </ol>
      </section>
    {/each}
  </div>
{:else}
  <p class="empty-state">No hay entradas para los filtros actuales.</p>
{/if}

<style>
  .filters {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #e4dfd4;
  }

  label {
    display: grid;
    gap: 0.45rem;
    color: #4c463d;
    font-size: 0.95rem;
  }

  input,
  select {
    min-height: 2.5rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid #cfc6b8;
    border-radius: 4px;
    background: #fffefb;
    color: #23201d;
    font: inherit;
  }

  .count {
    margin: 0 0 1rem;
    font-weight: 700;
  }

  .alphabet {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 1.5rem;
  }

  .alphabet a {
    min-width: 2rem;
    padding: 0.25rem 0.45rem;
    border: 1px solid #e4dfd4;
    border-radius: 4px;
    text-align: center;
    text-decoration: none;
  }

  .letter-group {
    scroll-margin-top: 1rem;
  }

  .letter-group h2 {
    padding-bottom: 0.35rem;
    border-bottom: 1px solid #cfc6b8;
  }

  ol {
    display: grid;
    gap: 1rem;
    padding: 0;
    list-style: none;
  }

  li {
    padding-bottom: 1rem;
    border-bottom: 1px solid #e4dfd4;
  }

  .incipit {
    font-size: 1.1rem;
    font-weight: 700;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.6rem 1rem;
    margin: 0.75rem 0 0;
  }

  dt {
    color: #6c6256;
    font-size: 0.85rem;
  }

  dd {
    margin: 0.15rem 0 0;
  }

  .secondary-inc {
    margin: 0.65rem 0 0;
  }

  .empty-state {
    color: #6c6256;
  }

  @media (max-width: 800px) {
    .filters,
    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
