<script lang="ts">
  import { labels, type Kind } from '$lib/editor/schema';
  export let data;
  $: kind = data.kind as Kind;
</script>

<svelte:head><title>Edición del repertorio · RePoMIt</title></svelte:head>
<h1>Tu mesa de trabajo</h1>
<p class="muted">
  Catálogo, transcripciones y textos en un mismo lugar. Los borradores solo los ve el equipo.
</p>
<div class="cards">
  {#each Object.entries(labels) as [key, label]}<a class="panel" href={'/admin?kind=' + key}
      ><strong>{data.counts[key as Kind]}</strong>{label}</a
    >{/each}
</div>
{#if data.pending}<p class="notice">
    Hay {data.pending} fichas o secciones con borradores pendientes de publicación.
    {#each Object.entries(labels) as [key, label]}{#if data.pendingByKind[key as Kind]}<a
          href={'/admin?kind=' + key + '&estado=draft'}
          >Revisar {data.pendingByKind[key as Kind]} {label.toLowerCase()}</a
        >{' · '}{/if}{/each}
  </p>{/if}
<div class="heading-row">
  <h2>{labels[kind]}</h2>
  <a
    class="button"
    href={'/admin/' + kind + '/nuevo' + (data.parent ? '?manuscrito=' + data.parent : '')}
    >{kind === 'poemas'
      ? 'Añadir poema'
      : kind === 'testimonios'
        ? 'Incorporar manuscrito'
        : 'Añadir sección'}</a
  >
</div>
{#if kind === 'textos'}
  <div class="panel">
    <p>
      Puedes añadir secciones nuevas a Presentación y Criterios mediante «Añadir sección», sin
      sustituir las existentes. Dentro de cada sección, pulsa Intro para añadir párrafos. Guarda,
      revisa la vista previa y publica cuando esté lista.
    </p>
    <a
      class="button secondary"
      href={data.citationSectionId
        ? '/admin/textos/' + data.citationSectionId
        : '/admin/textos/nuevo?plantilla=cita'}
      >{data.citationSectionId
        ? 'Editar instrucciones de cita'
        : 'Preparar «Cómo citar el repertorio»'}</a
    >
    <p class="help">
      La propuesta incluye un modelo para el repertorio y otro para las fichas. Puedes adaptar su
      redacción antes de publicarla.
    </p>
  </div>
{/if}
{#if kind === 'testimonios'}<p class="help">
    Empieza por el manuscrito y añade sus poemas en orden topográfico. El contenido se genera
    automáticamente. Puedes trabajar en borrador hasta revisar el conjunto.
  </p>{/if}
<form class="panel grid" method="GET">
  <input type="hidden" name="kind" value={kind} /><label
    >Buscar ficha<input
      type="search"
      name="q"
      value={data.query}
      placeholder="Íncipit, sigla, autor, folios o título…"
    /></label
  ><label
    >Estado<select name="estado" value={data.status}
      ><option value="">Todos</option><option value="draft">Con borradores</option><option
        value="published">Publicados</option
      >{#if kind === 'poemas'}<option value="untranscribed">Sin transcripción</option>{/if}</select
    ></label
  >{#if kind === 'poemas'}<label
      >Manuscrito<select name="manuscrito" value={data.parent}
        ><option value="">Todos los manuscritos</option>{#each data.parents as p}<option
            value={p.id}>{p.title}</option
          >{/each}</select
      ></label
    >{/if}
  <label
    >Ordenar por<select name="ordenar" value={data.sort}
      ><option value="recientes">Últimas ediciones</option><option value="catalogo"
        >{kind === 'poemas' ? 'Manuscrito y orden topográfico' : 'Orden alfabético'}</option
      ></select
    ></label
  >
  <p class="help wide">
    Puedes buscar sin tildes y combinar palabras. Para retomar un manuscrito, selecciónalo en el
    filtro y revisa sus poemas en orden topográfico.
  </p>
  <div class="actions">
    <button>Filtrar</button><a href={'/admin?kind=' + kind}>Limpiar filtros</a>
  </div>
</form>
<p class="muted">{data.rows.length} resultados</p>
<div class="table-wrap">
  <table>
    <thead><tr><th>Ficha</th><th>Estado</th><th>Última edición</th></tr></thead><tbody
      >{#each data.rows as row}<tr
          ><td
            ><a class="record-title" href={'/admin/' + kind + '/' + row.id}
              >{row.title.replace(/<[^>]*>/g, '')}</a
            >{#if kind === 'poemas'}<div class="help">
                {data.parents.find((p) => p.id === row.parent)?.title} · n.º {row.order}
              </div>
              <div class="help">
                {row.transcribed ? 'Con transcripción' : 'Transcripción pendiente'}
              </div>{:else if kind === 'textos'}<div class="help">
                {row.page} · sección {row.order}
              </div>{/if}</td
          ><td
            ><span class="badge" class:draft={row.changed}
              >{row.changed
                ? row.published
                  ? 'Cambios en borrador'
                  : 'Borrador'
                : 'Publicado'}</span
            ></td
          ><td
            >{new Date(row.updated).toLocaleDateString('es-ES')}
            <div class="help">{row.by}</div></td
          ></tr
        >{:else}<tr><td colspan="3">No hay fichas que coincidan con estos filtros.</td></tr
        >{/each}</tbody
    >
  </table>
</div>
