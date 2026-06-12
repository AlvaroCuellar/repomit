<script lang="ts">
  import { page } from '$app/stores';
  import { getPoema, getTestimonio, poemas, type Poema } from '$lib/data/repomit';

  const sortedPoemas = [...poemas].sort(
    (a, b) => a.sort_incipit.localeCompare(b.sort_incipit, 'es') || a.id.localeCompare(b.id, 'es')
  );

  $: id = $page.params.id;
  $: poema = getPoema(id);
  $: testimonio = poema ? getTestimonio(poema.testimonio_id) : undefined;
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

  function isYes(value: string | undefined) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') === 'si';
  }

  function shouldShowConditional(flag: string | undefined, value: string | undefined) {
    return isYes(flag) || hasText(value);
  }

  function canonicalNote(current: string | undefined, original: string | undefined) {
    return original && current && original !== current ? `${original} -> ${current}` : '';
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
    <dl>
      <div>
        <dt>Testimonio</dt>
        <dd><a href={fichaTestimonioHref(poema)}>{poema.testimonio}</a></dd>
      </div>
      <div>
        <dt>Folios/páginas</dt>
        <dd>{display(poema.folios)}</dd>
      </div>
      <div>
        <dt>Forma</dt>
        <dd>{display(poema.forma)}</dd>
      </div>
      <div>
        <dt>Atribución</dt>
        <dd>{display(poema.atribucion)}</dd>
      </div>
    </dl>
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
        <dd>
          <a href={fichaTestimonioHref(poema)}>{poema.testimonio}</a>
          {#if testimonio}
            <span class="muted">({testimonio.institucion})</span>
          {/if}
        </dd>
      </div>
      <div>
        <dt>Orden topográfico</dt>
        <dd>{display(poema.orden)}</dd>
      </div>
      <div>
        <dt>Folios/páginas</dt>
        <dd>{display(poema.folios)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2>Texto y descripción</h2>
    <dl>
      <div>
        <dt>Íncipit</dt>
        <dd>{display(poema.incipit)}</dd>
      </div>
      <div>
        <dt>Segundo verso</dt>
        <dd>{display(poema.segundo_verso)}</dd>
      </div>
      <div>
        <dt>Éxplicit</dt>
        <dd>{display(poema.explicit)}</dd>
      </div>
      <div>
        <dt>Epígrafe</dt>
        <dd>{display(poema.epigrafe)}</dd>
      </div>
      <div>
        <dt>Forma</dt>
        <dd>{display(poema.forma)}</dd>
      </div>
      <div>
        <dt>Esquema métrico</dt>
        <dd>{display(poema.esquema_metrico)}</dd>
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
        <dt>Estructura: cabeza + estrofa(s) de desarrollo</dt>
        <dd>{display(poema.estructura_cabeza)}</dd>
      </div>
      {#if hasText(poema.incipit_desarrollo)}
        <div>
          <dt>Íncipit de la primera estrofa de desarrollo</dt>
          <dd>{@html htmlOrText(poema.incipit_desarrollo_html, poema.incipit_desarrollo)}</dd>
        </div>
      {/if}
      <div>
        <dt>Estructura: composición principal + composición(es) interna(s)/final(es)</dt>
        <dd>{display(poema.estructura_interna)}</dd>
      </div>
      {#if hasText(poema.incipit_interno)}
        <div>
          <dt>Íncipit de la(s) composición(es) interna(s)/final(es)</dt>
          <dd>{@html htmlOrText(poema.incipit_interno_html, poema.incipit_interno)}</dd>
        </div>
      {/if}
      <div>
        <dt>Estribillo</dt>
        <dd>{display(poema.estribillo)}</dd>
      </div>
      {#if shouldShowConditional(poema.estribillo, poema.estribillo_entero)}
        <div>
          <dt>Estribillo entero</dt>
          <dd>{@html htmlOrText(poema.estribillo_entero_html, poema.estribillo_entero)}</dd>
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
    <p><strong>Autor(es) de la transcripción:</strong> {display(poema.autores_transcripcion)}</p>
  </section>

  <section class="block">
    <h2>Responsabilidad y revisión</h2>
    <dl>
      <div>
        <dt>Autor(es) de la ficha</dt>
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

    {#if canonicalNote(poema.item, poema.item_original) || canonicalNote(poema.testimonio, poema.testimonio_original)}
      <p class="technical-note">
        <strong>Nota técnica.</strong> Forma normalizada para visualización:
        {#if canonicalNote(poema.item, poema.item_original)}
          ítem {canonicalNote(poema.item, poema.item_original)}
        {/if}
        {#if canonicalNote(poema.testimonio, poema.testimonio_original)}
          testimonio {canonicalNote(poema.testimonio, poema.testimonio_original)}
        {/if}
      </p>
    {/if}
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

  .muted,
  .technical-note {
    color: #6c6256;
  }

  .technical-note {
    margin-top: 1rem;
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .transcription {
    line-height: 1.65;
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
