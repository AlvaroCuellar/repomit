<script lang="ts">
  import { poemas, testimonios } from '$lib/data/repomit';

  const manuscritos = [...testimonios].sort(
    (a, b) =>
      a.ciudad.localeCompare(b.ciudad, 'es') ||
      a.institucion.localeCompare(b.institucion, 'es') ||
      a.testimonio.localeCompare(b.testimonio, 'es')
  );

  const italyPath =
    'M 20.3 79.7 L 22.9 80.6 L 27.7 79.9 L 30.6 78.5 L 36.6 79.8 L 41.9 75.7 L 42.2 74.3 L 41.4 72.8 L 45.3 70.9 L 45.9 69.6 L 47.6 69.2 L 48.5 70 L 48.4 73.5 L 51.6 75.8 L 55.7 76.4 L 56.2 76.9 L 54.9 78.5 L 56.9 79.2 L 57.7 80.5 L 57.5 81.6 L 59.5 81.7 L 60.7 80.2 L 59.1 78.9 L 59.8 78.3 L 59.5 77.4 L 63.9 73.6 L 64.9 71.6 L 64.2 69.5 L 65.1 68.3 L 67.1 68.9 L 68.1 68.3 L 68.3 70.8 L 70.1 72.3 L 72.8 72.4 L 73.8 71.2 L 77.7 70.8 L 80.8 73.8 L 82.4 73 L 81.1 71.7 L 82.1 70.2 L 79.8 69.3 L 79.9 67.6 L 81 66.2 L 83.1 65.8 L 85.1 67.3 L 88.1 67.5 L 88.4 65.8 L 86.6 64.9 L 88.3 61.1 L 92.1 61.1 L 93.9 61.8 L 93.6 62.6 L 99 63 L 100.9 60.1 L 102.6 59.1 L 107.3 59 L 108.5 58.2 L 113.7 59 L 122.5 56.7 L 123 57.3 L 121.1 58.5 L 121.4 60.2 L 124.2 61 L 124.2 62.6 L 126.9 64.5 L 143.3 67.2 L 148.2 67 L 152.6 67.9 L 152.1 69.2 L 150.6 69.4 L 146 72.4 L 146.9 74.1 L 151.4 74.6 L 147.9 78.1 L 148.8 78.8 L 150.7 78.5 L 149.9 81.5 L 154.2 83.3 L 156.5 85.5 L 155.5 86.4 L 152.8 86.2 L 154.7 85.8 L 150.1 82.4 L 149.1 82.9 L 149.7 83.4 L 146.7 84.6 L 146.2 84.5 L 147.3 84 L 146 83.2 L 141.1 82.7 L 140.2 84.2 L 141.7 84.1 L 140.4 85.3 L 137.6 85.5 L 127.3 89.3 L 127.5 88.4 L 129.1 88.2 L 130.4 87 L 129.6 87.4 L 129 86.6 L 127.9 87.9 L 126.8 87.3 L 127.3 88.1 L 125.1 88.3 L 123.9 89.4 L 123.2 91.7 L 122 91.8 L 122.5 92.9 L 123.2 92.2 L 123.5 94 L 125 93.4 L 125.4 96 L 125 95.5 L 124.8 96.2 L 125.7 96.4 L 126.2 97.8 L 126.2 96.7 L 129.5 98.6 L 127.7 101.6 L 127.6 100 L 127 100.2 L 127.2 101.9 L 124.2 101.4 L 123.8 103.7 L 124.5 108.1 L 126.2 112.8 L 132.6 118 L 137.3 119.5 L 143.7 123.7 L 148.1 125.5 L 149 125.1 L 150.9 126.5 L 155.3 135.1 L 157.4 141.6 L 160 145.6 L 169.6 153 L 172.6 153.9 L 173.2 155.7 L 181.6 158.9 L 200.9 159 L 201.7 159.5 L 201.8 161.8 L 196.2 165.1 L 196.1 166.6 L 197.4 168.1 L 209.9 173.1 L 219.1 175.6 L 223.4 177.6 L 227.4 180.6 L 237.9 184.2 L 238.5 186 L 242.5 188 L 246.4 191.7 L 248 194.3 L 245.9 197.5 L 245.5 200.7 L 244.5 201 L 239.2 198.8 L 237.7 197.1 L 238.1 196.3 L 237.1 195.9 L 238 195.1 L 235.1 191.4 L 228.1 191 L 221.9 188.7 L 222.8 188.3 L 222.5 187.6 L 224.4 187.2 L 221.7 187.5 L 218.9 186.8 L 217.5 187.3 L 210.1 195.4 L 210.7 197.7 L 207.9 201.5 L 209 203.8 L 213.7 204.7 L 221.1 208.8 L 220.2 211.5 L 220.9 212.7 L 220.4 215.1 L 222.1 216.3 L 221.4 217.6 L 220 218.9 L 217.1 218 L 214.8 218.5 L 209.8 220.9 L 208.8 222.8 L 209.4 228.2 L 204.2 231.2 L 201.5 233.8 L 199.7 237.9 L 193.4 238.1 L 191.9 237.6 L 190.9 236.5 L 190.9 232.3 L 194.4 230.7 L 196.5 226.4 L 194.9 223.8 L 198.2 222.3 L 201.2 222.2 L 202.5 219.7 L 202.4 218.5 L 199.8 215.4 L 198.1 208.2 L 195.7 205.9 L 194.3 203.1 L 193.7 199.2 L 190.7 195.5 L 188.9 195.5 L 186.5 197.2 L 183.5 196.5 L 183.6 195.6 L 180.9 193.7 L 179.3 193.7 L 176.6 192.3 L 177 190.4 L 178.2 189.9 L 178.3 189.2 L 174 183.8 L 169.3 184.9 L 168.2 184.5 L 165.3 185.7 L 165.2 184.7 L 168 183.3 L 167.9 182.6 L 164.4 180.4 L 162.6 181.2 L 160.2 180.6 L 160.2 181.5 L 159.5 181.4 L 159 178.8 L 155.6 174.3 L 153 172.2 L 150.5 172.2 L 149.5 173.1 L 144.4 171.4 L 139.6 172.7 L 136.6 169.3 L 131.5 168.4 L 127.8 164.7 L 123.7 162.7 L 122.3 159.8 L 119.3 157.6 L 115.5 156.7 L 112.1 151.9 L 106.6 149.4 L 103.3 149.1 L 102.8 150.2 L 101.2 149.7 L 101.1 148.7 L 102.4 148.7 L 102.8 147.9 L 102.2 146.3 L 98 142.7 L 93.8 141.5 L 94.4 139.2 L 91.8 138.4 L 89.2 138.8 L 88.8 137.8 L 90.1 134.7 L 89.8 132.7 L 85.6 127.9 L 84.3 120.8 L 81.1 117.3 L 76.2 115.7 L 76 117 L 64.1 110.8 L 63.7 111.8 L 61.5 110.4 L 54.8 109.2 L 48.9 111.8 L 47.8 114 L 44.8 115.3 L 42.7 118.1 L 43 118.7 L 41 119.9 L 34.5 121.8 L 29.8 121.9 L 29.3 120.5 L 33.5 116.5 L 32.9 114.3 L 26.6 115.4 L 19.3 112.9 L 17.3 110.6 L 18.2 109.2 L 16.6 107.2 L 18.8 105.4 L 19.1 104.3 L 21 104.2 L 20 101.4 L 14.8 99.8 L 14.4 97.7 L 13 97.3 L 12 95.9 L 14.6 94.9 L 16.8 95.4 L 22 92.9 L 21.7 91.6 L 23.1 89.9 L 19.5 87.9 L 19.1 85.3 L 16.2 84.2 L 15.6 83 L 15.9 81.6 L 18.9 81 L 20 79.8 L 20.3 79.7 Z M 188.8 230.7 L 191.3 231.2 L 189.6 232.2 L 188.3 235 L 182.6 241.4 L 181.6 245.2 L 180.2 247 L 180.4 249.9 L 183.3 251.4 L 182 252.4 L 184.4 254.5 L 184 255.5 L 184.9 256.2 L 181.5 258 L 180.2 260.4 L 181 262.9 L 180.2 263.3 L 178.5 262.4 L 176 261.8 L 174 262.4 L 168.2 260.6 L 166.4 257.6 L 164.1 255.6 L 161 254.3 L 156.4 254.5 L 152.9 253.1 L 144.2 248.7 L 142.2 246.8 L 139.3 246.7 L 137.6 245.2 L 132 245.3 L 130.4 243.6 L 128.9 243.3 L 127.4 240.7 L 128.1 240.2 L 128.7 236.2 L 132.9 234.5 L 133.4 232.8 L 136.8 236.1 L 139.9 235 L 139.8 233.9 L 140.7 232.9 L 142.8 233.2 L 145 232.3 L 146.5 234.6 L 148.9 234.5 L 151.6 236.6 L 154.4 237.2 L 158.9 235.7 L 163.9 236.4 L 168.7 235.8 L 173.1 233.5 L 176.5 232.9 L 180.1 234.1 L 181.9 233.6 L 183 231.4 L 183.2 232.4 L 184.1 232.6 L 188.5 230.8 L 188.8 230.7 Z M 48.7 215.4 L 49.3 215.5 L 47.8 217.6 L 46.5 214.9 L 48.5 214.8 L 48.7 215.4 Z M 45.1 176.1 L 44.6 177.4 L 43.8 177.3 L 45.2 175.1 L 46.1 174.7 L 46.3 176 L 45.1 176.1 Z M 75.2 186 L 75.9 186.6 L 75.3 188 L 71.9 191.8 L 72.5 194.2 L 74 195.4 L 71.4 209.8 L 72.1 211 L 70.7 212.1 L 70.7 213.9 L 69.8 214.8 L 65.3 212.5 L 63.8 212.3 L 62.8 213.1 L 59.8 211.6 L 61.1 212.4 L 59.9 214 L 60 216.9 L 56.6 219.3 L 53.9 218.2 L 52.4 219.5 L 50.8 215.7 L 49.2 215.3 L 47.1 212.5 L 48.2 210.9 L 47.1 209.4 L 47.3 207.5 L 48.9 205.4 L 48.5 201.9 L 50.9 203 L 49.7 202.6 L 50.7 200 L 48.9 198.7 L 48.3 199.9 L 47.5 198.8 L 47.7 196.6 L 47.2 196.4 L 49.4 195 L 49.1 191.3 L 47.3 190.1 L 47.2 187.8 L 45.5 185.3 L 44 185.7 L 43.5 184.8 L 42.9 185.9 L 42.6 185.3 L 43.6 183.4 L 42.3 182.6 L 43.9 179.6 L 43.5 178 L 45.8 180.2 L 50 180.7 L 56 178.3 L 59.6 174.8 L 62.3 174.2 L 62.9 172.4 L 64.1 172 L 65 173.4 L 67.9 173.7 L 68.3 175.4 L 68.8 174.3 L 70.6 174.7 L 69.6 176.9 L 72.6 177.2 L 70.8 178.5 L 72.2 178.8 L 71.7 179.3 L 73.8 180.3 L 72.5 181.2 L 75.1 185.8 L 75.2 186 Z M 88.1 140.7 L 87 142.3 L 87.5 143.4 L 86 142.3 L 83.8 142.9 L 81.4 142.4 L 81.9 141.3 L 86.2 141.5 L 87.2 140.2 L 88 140.5 L 88.1 140.7 Z';

  const poemasPorTestimonio = new Map<string, number>();
  const cityCoordinates = new Map([
    ['napoles', { x: 63, y: 56.3 }],
    ['roma', { x: 49.5, y: 49.8 }],
    ['florencia', { x: 40.1, y: 38.2 }],
    ['bolonia', { x: 40.7, y: 33.8 }],
    ['venecia', { x: 48.1, y: 27.9 }],
    ['milan', { x: 24.3, y: 27.8 }],
    ['turin', { x: 12.9, y: 30.2 }],
    ['palermo', { x: 56.1, y: 73.2 }],
    ['cagliari', { x: 23.8, y: 66.4 }]
  ]);

  for (const poema of poemas) {
    poemasPorTestimonio.set(poema.testimonio_id, (poemasPorTestimonio.get(poema.testimonio_id) ?? 0) + 1);
  }

  const textosTranscritos = poemas.filter((poema) => hasText(poema.transcripcion)).length;
  const cityMarkers = buildCityMarkers(manuscritos);
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
    const byCity = new Map<string, { city: string; count: number; testimonios: typeof manuscritos }>();

    for (const manuscrito of entries) {
      if (!hasText(manuscrito.ciudad)) {
        continue;
      }

      const key = normalizeCity(manuscrito.ciudad);
      const marker = byCity.get(key) ?? { city: manuscrito.ciudad, count: 0, testimonios: [] };
      marker.count += 1;
      marker.testimonios.push(manuscrito);
      byCity.set(key, marker);
    }

    return Array.from(byCity.entries())
      .map(([key, marker]) => ({
        ...marker,
        key,
        position: cityCoordinates.get(key) ?? { x: 50, y: 50 }
      }))
      .sort((a, b) => a.city.localeCompare(b.city, 'es'));
  }

  function toggleCity(key: string) {
    activeCityKey = activeCityKey === key ? '' : key;
  }

  function normalizeCity(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
</script>

<h1>Manuscritos catalogados</h1>

<p class="intro">
  Esta sección reúne los testimonios manuscritos actualmente incorporados a RePoMIt.
  Cada ficha incluye los datos codicológicos y bibliográficos disponibles, así como
  el listado de composiciones catalogadas.
</p>

<div class="summary" aria-label="Resumen de manuscritos catalogados">
  <p><strong>{manuscritos.length}</strong> testimonios</p>
  <p><strong>{poemas.length}</strong> poemas catalogados</p>
  <p><strong>{textosTranscritos}</strong> textos transcritos</p>
</div>

<section class="map-section" aria-labelledby="map-title">
  <div>
    <h2 id="map-title">Custodia de los manuscritos</h2>
    <p>
      Localización de las bibliotecas e instituciones que conservan los manuscritos
      catalogados.
    </p>
  </div>

  <figure class="italy-map" aria-label="Mapa de Italia con ciudades de custodia">
    <svg viewBox="0 0 260 320" role="img" aria-hidden="true">
      <path class="italy-shape" d={italyPath} />
    </svg>

    {#each cityMarkers as marker}
      <button
        type="button"
        class="map-marker"
        class:active={marker.key === activeCityKey}
        style={`left: ${marker.position.x}%; top: ${marker.position.y}%;`}
        aria-expanded={marker.key === activeCityKey}
        aria-controls="city-manuscripts"
        onclick={() => toggleCity(marker.key)}
      >
        <span class="dot"></span>
        <span class="label">{marker.city} ({marker.count})</span>
      </button>
    {/each}

    {#if activeMarker}
      <figcaption
        id="city-manuscripts"
        class="city-panel"
        style={`--panel-x: ${activeMarker.position.x}%; --panel-y: ${activeMarker.position.y}%;`}
      >
        <h3>{activeMarker.city}</h3>
        <ul>
          {#each activeMarker.testimonios as manuscrito}
            <li>
              <a href={`/testimonios/${manuscrito.id}`}>{manuscrito.testimonio}</a>
              <span>{manuscrito.institucion}</span>
            </li>
          {/each}
        </ul>
      </figcaption>
    {/if}
  </figure>
</section>

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
      <p class="card-link"><a href={`/testimonios/${manuscrito.id}`}>Abrir ficha del testimonio</a></p>
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

  .italy-map {
    position: relative;
    aspect-ratio: 13 / 16;
    margin: 0;
    min-height: 23rem;
  }

  .italy-map svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .italy-shape {
    fill: #e8e0d2;
    stroke: #8a7a62;
    stroke-linejoin: round;
    stroke-width: 1.2;
  }

  .map-marker {
    position: absolute;
    display: flex;
    gap: 0.35rem;
    align-items: center;
    transform: translate(-0.35rem, -50%);
    padding: 0;
    border: 0;
    background: transparent;
    color: #23201d;
    cursor: pointer;
    font-size: 0.82rem;
    font: inherit;
    white-space: nowrap;
  }

  .map-marker:focus-visible {
    outline: 2px solid #674c19;
    outline-offset: 3px;
  }

  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid #fffefb;
    border-radius: 999px;
    background: #8f1f1d;
    box-shadow: 0 0 0 1px #8f1f1d;
  }

  .map-marker.active .dot,
  .map-marker:hover .dot {
    background: #674c19;
    box-shadow: 0 0 0 2px #674c19;
  }

  .label {
    padding: 0.1rem 0.3rem;
    background: rgb(251 250 247 / 88%);
  }

  .city-panel {
    position: absolute;
    left: clamp(0.5rem, var(--panel-x), calc(100% - 14rem));
    top: min(calc(var(--panel-y) + 1.8rem), calc(100% - 9.5rem));
    width: min(13.5rem, calc(100% - 1rem));
    padding: 0.75rem;
    border: 1px solid #d8d0c2;
    background: rgb(255 254 251 / 96%);
    box-shadow: 0 0.5rem 1.4rem rgb(36 30 22 / 12%);
  }

  .city-panel h3 {
    margin: 0 0 0.45rem;
    font-size: 1rem;
  }

  .city-panel ul {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .city-panel li {
    display: grid;
    gap: 0.15rem;
  }

  .city-panel span {
    color: #6c6256;
    font-size: 0.78rem;
    line-height: 1.3;
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

    .italy-map {
      aspect-ratio: auto;
      min-height: 0;
    }

    .italy-map svg {
      height: auto;
    }

    .city-panel {
      position: static;
      width: auto;
      margin-top: 0.75rem;
      box-shadow: none;
    }

    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
