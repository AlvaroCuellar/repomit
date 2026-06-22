<script lang="ts">
  import { poemas, testimonios } from '$lib/data/repomit';
  import {
    getFormaOptions,
    getTestimonioOptions,
    hasActiveSearch,
    searchPoemas,
    type MatchMode,
    type SearchCriteria,
    type SearchScope
  } from '$lib/search/repomit-search';

  const formaOptions = getFormaOptions(poemas);
  const testimonioOptions = getTestimonioOptions(testimonios);

  let query = '';
  let scope: SearchScope = 'incipit';
  let forma = '';
  let testimonioId = '';
  let mode: MatchMode = 'exacta';
  let appliedCriteria: SearchCriteria | null = null;

  $: results = appliedCriteria ? searchPoemas(poemas, appliedCriteria) : [];
  $: hasSearch = appliedCriteria ? hasActiveSearch(appliedCriteria) : false;

  function runSearch(event: SubmitEvent) {
    event.preventDefault();
    appliedCriteria = {
      query,
      scope,
      forma,
      testimonioId,
      mode
    };
  }

  function clearSearch() {
    query = '';
    scope = 'incipit';
    forma = '';
    testimonioId = '';
    mode = 'exacta';
    appliedCriteria = null;
  }
</script>

<h1>Búsqueda</h1>

<form class="search-form" onsubmit={runSearch}>
  <label class="full-width">
    Texto de búsqueda
    <input bind:value={query} type="search" placeholder="Íncipit, verso, epígrafe, estribillo o atribución" />
  </label>

  <label>
    Buscar en
    <select bind:value={scope}>
      <option value="incipit">íncipit</option>
      <option value="verso">verso</option>
      <option value="autor">autor</option>
      <option value="epigrafe">epígrafe</option>
      <option value="estribillo">estribillo</option>
      <option value="libre">libre</option>
    </select>
  </label>

  <label>
    Coincidencia
    <select bind:value={mode}>
      <option value="exacta">exacta normalizada</option>
      <option value="todas">todas las palabras</option>
      <option value="alguna">alguna palabra</option>
    </select>
  </label>

  <div class="actions">
    <button type="submit">Buscar</button>
    <button type="button" class="secondary" onclick={clearSearch}>Limpiar</button>
  </div>

  <div class="filters-row">
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
  </div>
</form>

{#if !appliedCriteria || !hasSearch}
  <p class="empty-state">Introduce una consulta o selecciona una forma o testimonio para buscar.</p>
{:else}
  <p class="result-count">
    {results.length}
    {results.length === 1 ? 'resultado' : 'resultados'}
  </p>

  {#if results.length > 0}
    <ol class="results">
      {#each results as result}
        <li>
          <a class="item-link" href={`/poemas/${result.poema.id}`}>{result.poema.item}</a>
          <h2>{result.poema.incipit}</h2>
          <dl class="result-preview">
            <div>
              <dt>Íncipit</dt>
              <dd>{result.poema.incipit || '—'}</dd>
            </div>
            <div>
              <dt>Segundo verso</dt>
              <dd>{result.poema.segundo_verso || '—'}</dd>
            </div>
            <div class="wide">
              <dt>Íncipit de la primera estrofa de desarrollo</dt>
              <dd>{result.poema.incipit_desarrollo || '—'}</dd>
            </div>
            <div>
              <dt>Testimonio</dt>
              <dd>{result.poema.testimonio}</dd>
            </div>
            <div>
              <dt>Forma</dt>
              <dd>{result.poema.forma || '—'}</dd>
            </div>
          </dl>
          {#if result.matchedFields.length > 0}
            <p class="matches">Coincide en: {result.matchedFields.join(', ')}</p>
          {:else}
            <p class="matches">Resultado por filtro</p>
          {/if}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="empty-state">No hay resultados para la búsqueda actual.</p>
  {/if}
{/if}

<style>
  .search-form {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e4dfd4;
  }

  label {
    display: grid;
    gap: 0.45rem;
    color: #4c463d;
    font-size: 0.95rem;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .filters-row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 0.25rem;
    padding-top: 1rem;
    border-top: 1px solid #e4dfd4;
  }

  input,
  select,
  button {
    min-height: 2.5rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid #cfc6b8;
    border-radius: 4px;
    background: #fffefb;
    color: #23201d;
    font: inherit;
  }

  button {
    border-color: #674c19;
    background: #674c19;
    color: #fff;
    cursor: pointer;
  }

  .secondary {
    border-color: #cfc6b8;
    background: #fffefb;
    color: #23201d;
  }

  .actions {
    display: flex;
    gap: 0.6rem;
    align-items: end;
  }

  .result-count {
    font-weight: 700;
  }

  .empty-state {
    color: #6c6256;
  }

  .results {
    display: grid;
    gap: 1rem;
    padding: 0;
    list-style: none;
  }

  .results li {
    padding: 1rem 0;
    border-bottom: 1px solid #e4dfd4;
  }

  .item-link {
    font-weight: 700;
  }

  h2 {
    margin: 0.35rem 0 0.75rem;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem 1rem;
    margin: 0;
  }

  .result-preview .wide {
    grid-column: 1 / -1;
  }

  dt {
    color: #6c6256;
    font-size: 0.85rem;
  }

  dd {
    margin: 0.15rem 0 0;
  }

  .matches {
    margin-bottom: 0;
    color: #5d522f;
    font-size: 0.9rem;
  }

  @media (max-width: 760px) {
    .search-form,
    .filters-row,
    dl {
      grid-template-columns: 1fr;
    }

    .actions {
      align-items: stretch;
    }
  }
</style>
