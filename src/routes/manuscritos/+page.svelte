<script lang="ts">
  import { poemas, testimonios } from '$lib/data/repomit';

  const manuscritos = [...testimonios].sort(
    (a, b) =>
      a.ciudad.localeCompare(b.ciudad, 'es') ||
      a.institucion.localeCompare(b.institucion, 'es') ||
      a.testimonio.localeCompare(b.testimonio, 'es')
  );

  const poemasPorTestimonio = new Map<string, number>();

  for (const poema of poemas) {
    poemasPorTestimonio.set(poema.testimonio_id, (poemasPorTestimonio.get(poema.testimonio_id) ?? 0) + 1);
  }

  function countPoemas(testimonioId: string) {
    return poemasPorTestimonio.get(testimonioId) ?? 0;
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
</div>

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
    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
