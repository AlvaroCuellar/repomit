<script lang="ts">
  import ItalyMap from '$lib/map/ItalyMap.svelte';
  import { cityKey, coordinatesFor } from '$lib/map/geography';
  export let data;
  $: ({ poemas, site, testimonios } = data);

  $: manuscritos = [...testimonios].sort(
    (a, b) =>
      a.ciudad.localeCompare(b.ciudad, 'es') ||
      a.institucion.localeCompare(b.institucion, 'es') ||
      a.testimonio.localeCompare(b.testimonio, 'es')
  );

  let poemasPorTestimonio = new Map<string, number>();
  $: {
    poemasPorTestimonio = new Map<string, number>();
    for (const poema of poemas) {
      poemasPorTestimonio.set(
        poema.testimonio_id,
        (poemasPorTestimonio.get(poema.testimonio_id) ?? 0) + 1
      );
    }
  }

  $: textosTranscritos = poemas.filter((poema) => hasText(poema.transcripcion)).length;
  $: cityMarkers = buildCityMarkers(manuscritos);
  let activeCityKey = '';

  $: activeMarker = cityMarkers.find((marker) => marker.key === activeCityKey);

  function countPoemas(testimonioId: string) {
    return poemasPorTestimonio.get(testimonioId) ?? 0;
  }

  function hasText(value: string | undefined) {
    const normalized = String(value ?? '').trim();
    return normalized !== '' && normalized !== '—' && normalized !== '-';
  }

  function buildCityMarkers(entries: typeof manuscritos) {
    const byCity = new Map<
      string,
      { city: string; count: number; testimonios: typeof manuscritos }
    >();

    for (const manuscrito of entries) {
      if (!hasText(manuscrito.ciudad)) {
        continue;
      }

      const key = cityKey(manuscrito.ciudad);
      const marker = byCity.get(key) ?? { city: manuscrito.ciudad, count: 0, testimonios: [] };
      marker.count += 1;
      marker.testimonios.push(manuscrito);
      byCity.set(key, marker);
    }

    return Array.from(byCity.entries())
      .map(([key, marker]) => ({
        ...marker,
        key,
        coordinates: coordinatesFor(marker.city, data.mapSettings)
      }))
      .sort((a, b) => a.city.localeCompare(b.city, 'es'));
  }

  function toggleCity(key: string) {
    activeCityKey = activeCityKey === key ? '' : key;
  }
</script>

<h1>Manuscritos catalogados</h1>

<div class="intro">
  {@html site.manuscritos.intro}
</div>

<div class="summary" aria-label="Resumen de manuscritos catalogados">
  <p><strong>{manuscritos.length}</strong> testimonios</p>
  <p><strong>{poemas.length}</strong> poemas catalogados</p>
  <p><strong>{textosTranscritos}</strong> textos transcritos</p>
</div>

{#if data.mapSettings.visible}
  <section class="map-section" aria-labelledby="map-title">
    <div>
      <h2 id="map-title">{site.manuscritos.mapTitle}</h2>
      <div class="map-description">
        {@html site.manuscritos.mapDescription}
      </div>
    </div>

    <div>
      <ItalyMap
        cities={cityMarkers.map((marker) => marker.city)}
        settings={data.mapSettings}
        active={activeCityKey}
        select={(city) => toggleCity(cityKey(city))}
      />
      {#if activeMarker}
        <div class="selected-city" aria-live="polite">
          <h3>{activeMarker.city} ({activeMarker.count})</h3>
          <ul>
            {#each activeMarker.testimonios as manuscrito}<li>
                <a href={`/testimonios/${manuscrito.id}`}>{manuscrito.testimonio}</a> · {manuscrito.institucion}
              </li>{/each}
          </ul>
        </div>
      {/if}
      <p class="map-credit">
        Cartografía: <a href="https://www.naturalearthdata.com/">Natural Earth</a>.
      </p>
    </div>
  </section>
{/if}

<div class="manuscript-list">
  {#each manuscritos as manuscrito}
    <article class="manuscript-card">
      <h2><a href={`/testimonios/${manuscrito.id}`}>{manuscrito.testimonio}</a></h2>
      <dl>
        <div>
          <dt>Ciudad</dt>
          <dd>{manuscrito.ciudad || '—'}</dd>
        </div>
        <div>
          <dt>Institución</dt>
          <dd>{manuscrito.institucion || '—'}</dd>
        </div>
        <div>
          <dt>Signatura</dt>
          <dd>{manuscrito.signatura || '—'}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{manuscrito.fecha || '—'}</dd>
        </div>
        <div>
          <dt>Composiciones catalogadas</dt>
          <dd>{countPoemas(manuscrito.id)}</dd>
        </div>
      </dl>
      <p class="card-link">
        <a href={`/testimonios/${manuscrito.id}`}>Abrir ficha del testimonio</a>
      </p>
    </article>
  {/each}
</div>

<style>
  .intro {
    max-width: 46rem;
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 1.25rem 0 1.5rem;
    padding: 0.85rem 0;
    border-top: 1px solid #e4dfd4;
    border-bottom: 1px solid #e4dfd4;
  }

  .summary p {
    margin: 0;
  }

  .map-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
    gap: 2rem;
    align-items: center;
    margin: 1.5rem 0 2rem;
    padding: 1.5rem 0;
    border-top: 1px solid #e4dfd4;
    border-bottom: 1px solid #e4dfd4;
  }

  .map-section h2 {
    margin-top: 0;
  }

  .map-credit {
    font-size: 0.75rem;
    color: #6c6256;
  }
  .selected-city {
    padding: 0.75rem;
    border: 1px solid #d8d0c2;
  }
  .manuscript-list {
    display: grid;
    gap: 1rem;
  }

  .manuscript-card {
    padding: 1rem 0;
    border-bottom: 1px solid #e4dfd4;
  }

  .manuscript-card h2 {
    margin: 0 0 0.75rem;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem 1.25rem;
    margin: 0;
  }

  dt {
    color: #6c6256;
    font-size: 0.88rem;
  }

  dd {
    margin: 0.18rem 0 0;
    line-height: 1.5;
  }

  .card-link {
    margin: 0.85rem 0 0;
  }

  @media (max-width: 760px) {
    .map-section {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
