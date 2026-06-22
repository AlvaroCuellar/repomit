<script lang="ts">
  import { page } from '$app/stores';
  import { getPoema, poemas, type Poema } from '$lib/data/repomit';

  const sortedPoemas = [...poemas].sort(
    (a, b) => a.sort_incipit.localeCompare(b.sort_incipit, 'es') || a.id.localeCompare(b.id, 'es')
  );

  $: id = $page.params.id;
  $: poema = getPoema(id);
  $: currentIndex = poema ? sortedPoemas.findIndex((entry) => entry.id === poema.id) : -1;
  $: previousPoema = currentIndex > 0 ? sortedPoemas[currentIndex - 1] : undefined;
  $: nextPoema =
    currentIndex >= 0 && currentIndex < sortedPoemas.length - 1
      ? sortedPoemas[currentIndex + 1]
      : undefined;

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

  function fichaTestimonioHref(entry: Poema) {
    return `/testimonios/${entry.testimonio_id}`;
  }
</script>

{#if poema}
  <nav class="page-nav" aria-label="Navegación de ficha">
    <a href="/repertorio">Volver al repertorio</a>
    <a href="/busqueda">Volver a búsqueda</a>
    <a href={fichaTestimonioHref(poema)}>Ficha del testimonio</a>
  </nav>

  <header class="record-header">
    <p class="item">{poema.item}</p>
    <h1>{poema.incipit}</h1>
  </header>

  <section class="block">
    <h2>Identificación</h2>
    <dl>
      <div>
        <dt>Ítem</dt>
        <dd>{poema.item}</dd>
      </div>
      <div>
        <dt>Testimonio</dt>
        <dd><a href={fichaTestimonioHref(poema)}>{poema.testimonio}</a></dd>
      </div>
      <div>
        <dt>Folios/páginas</dt>
        <dd>{display(poema.folios)}</dd>
      </div>
      <div>
        <dt>Orden topográfico</dt>
        <dd>{display(poema.orden)}</dd>
      </div>
      <div>
        <dt>Epígrafe</dt>
        <dd>{display(poema.epigrafe)}</dd>
      </div>
      <div>
        <dt>Atribución</dt>
        <dd>{display(poema.atribucion)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2>Estructura</h2>
    <dl>
      <div>
        <dt>Íncipit</dt>
        <dd>{@html htmlOrText(poema.incipit_html, poema.incipit)}</dd>
      </div>
      <div>
        <dt>Segundo verso</dt>
        <dd>{@html htmlOrText(poema.segundo_verso_html, poema.segundo_verso)}</dd>
      </div>
      <div>
        <dt>Éxplicit</dt>
        <dd>{@html htmlOrText(poema.explicit_html, poema.explicit)}</dd>
      </div>
      <div>
        <dt>Forma</dt>
        <dd>{display(poema.forma)}</dd>
      </div>
      <div>
        <dt>Esquema métrico</dt>
        <dd>{@html htmlOrText(poema.esquema_metrico_html, poema.esquema_metrico)}</dd>
      </div>
      <div>
        <dt>Estructura: cabeza + estrofa(s) de desarrollo</dt>
        <dd>{display(poema.estructura_cabeza)}</dd>
      </div>
      <div>
        <dt>Íncipit de la primera estrofa de desarrollo</dt>
        <dd>{@html htmlOrText(poema.incipit_desarrollo_html, poema.incipit_desarrollo)}</dd>
      </div>
      <div>
        <dt>Estructura: composición principal + composición(es) interna(s)/final(es)</dt>
        <dd>{display(poema.estructura_interna)}</dd>
      </div>
      <div>
        <dt>Íncipit de la(s) composición(es) interna(s)/final(es)</dt>
        <dd>{@html htmlOrText(poema.incipit_interno_html, poema.incipit_interno)}</dd>
      </div>
      <div>
        <dt>Estribillo(s) (sí/no)</dt>
        <dd>{display(poema.estribillo)}</dd>
      </div>
      <div>
        <dt>Estribillo(s)</dt>
        <dd>{@html htmlOrText(poema.estribillo_entero_html, poema.estribillo_entero)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2>Responsabilidad y revisión</h2>
    <dl>
      <div>
        <dt>Responsable(s) de la ficha</dt>
        <dd>{display(poema.autores_ficha)}</dd>
      </div>
      {#if hasText(poema.fecha_creacion)}
        <div>
          <dt>Fecha de creación</dt>
          <dd>{poema.fecha_creacion}</dd>
        </div>
      {/if}
      {#if hasText(poema.fecha_revision)}
        <div>
          <dt>Fecha de última revisión</dt>
          <dd>{poema.fecha_revision}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <section class="block">
    <h2>Transcripción</h2>
    {#if hasText(poema.transcripcion)}
      <div class="transcription">{@html htmlOrText(poema.transcripcion_html, poema.transcripcion)}</div>
    {:else}
      <p>No consta transcripción completa.</p>
    {/if}
    <dl class="transcription-meta">
      <div>
        <dt>Responsable(s) de la transcripción</dt>
        <dd>{display(poema.autores_transcripcion)}</dd>
      </div>
    </dl>
  </section>

  <nav class="adjacent" aria-label="Navegación alfabética">
    {#if previousPoema}
      <a href={`/poemas/${previousPoema.id}`}>Anterior: {previousPoema.incipit}</a>
    {:else}
      <span></span>
    {/if}
    {#if nextPoema}
      <a href={`/poemas/${nextPoema.id}`}>Siguiente: {nextPoema.incipit}</a>
    {/if}
  </nav>
{:else}
  <nav class="page-nav" aria-label="Navegación de ficha">
    <a href="/repertorio">Volver al repertorio</a>
    <a href="/busqueda">Volver a búsqueda</a>
  </nav>

  <h1>Ficha no encontrada</h1>
  <p>No existe una ficha de poema con el identificador <code>{id}</code>.</p>
{/if}

<style>
  .page-nav,
  .adjacent {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .record-header {
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #d8d0c2;
  }

  .record-header h1 {
    margin-bottom: 0;
  }

  .item {
    margin: 0 0 0.4rem;
    color: #674c19;
    font-weight: 700;
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

  .transcription {
    line-height: 1.65;
  }

  .transcription-meta {
    margin-top: 1rem;
  }

  .adjacent {
    justify-content: space-between;
    margin-top: 1.5rem;
  }

  @media (max-width: 760px) {
    dl {
      grid-template-columns: 1fr;
    }

    .adjacent {
      flex-direction: column;
    }
  }
</style>
