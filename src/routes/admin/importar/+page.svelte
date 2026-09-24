<script lang="ts">
  import { onMount } from 'svelte';
  import ImportInstructions from '$lib/editor/ImportInstructions.svelte';
  import { fields, richFields } from '$lib/editor/schema';
  let { data, form }: import('./$types').PageProps = $props();
  let busy = $state(false),
    ready = $state(false);
  onMount(() => (ready = true));
  let plan = $derived(data.batch?.plan);
  let errors = $derived(plan?.issues.filter((i) => i.level === 'error') || []);
  let warnings = $derived(plan?.issues.filter((i) => i.level === 'warning') || []);
</script>

<svelte:head><title>Importar Excel · RePoMIt</title></svelte:head>
<h1>Importar manuscritos y poemas</h1>
<p>
  Incorpora fichas preparadas en Excel. Primero revisas el contenido y después lo guardas como
  borrador. Las fichas existentes no se sobrescriben.
</p>
<div class="actions">
  <a class="button secondary" href="/plantillas/repomit-plantilla.xlsx" download
    >Descargar plantilla vacía</a
  ><a class="button secondary" href="/plantillas/repomit-ejemplo.xlsx" download
    >Descargar ejemplo rellenado</a
  >
</div>
<ImportInstructions />
{#if !data.batch && data.recent.length}<details class="panel" open>
    <summary>Continuar una importación pendiente</summary>
    <p class="help">
      Estas vistas previas todavía no han creado fichas. Puedes retomarlas durante dos horas desde
      la subida.
    </p>
    <ul>
      {#each data.recent as batch}<li>
          <a href={'/admin/importar?lote=' + batch.id}>{batch.filename}</a> · {new Date(
            batch.created_at
          ).toLocaleString('es-ES')}
        </li>{/each}
    </ul>
  </details>{/if}
{#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
{#if data.batch?.result}
  <section class="panel">
    <h2>Importación completada</h2>
    {#if data.batch.result.poems.length}<details>
        <summary>Revisar los {data.batch.result.poems.length} poemas importados</summary>
        <ul>
          {#each data.batch.result.poems as id}<li>
              <a href={'/admin/poemas/' + id}
                >{(
                  data.batch.plan.rows.find((r) => r.id === id)?.content.incipit || 'Abrir poema'
                ).replace(/<[^>]*>/g, '')}</a
              >
            </li>{/each}
        </ul>
      </details>{/if}
    <p role="status">
      Se han guardado {data.batch.result.manuscripts.length} manuscritos y {data.batch.result.poems
        .length} poemas como borradores. Nada se ha publicado.
    </p>
    <p>
      Revisa las fichas, completa los datos pendientes y abre la vista previa. Después puedes
      publicar desde la ficha del manuscrito o de cada poema.
    </p>
    <div class="actions">
      <a class="button" href="/admin?kind=testimonios&estado=draft">Revisar manuscritos</a><a
        class="button secondary"
        href="/admin?kind=poemas&estado=draft">Revisar poemas</a
      ><a href="/admin/importar">Importar otro archivo</a>
    </div>
    {#if data.batch.result.manuscripts.length}<ul>
        {#each data.batch.result.manuscripts as id}<li>
            <a href={'/admin/testimonios/' + id}
              >{data.parents.find((p) => p.id === id)?.title || 'Abrir manuscrito importado'}</a
            >
          </li>{/each}
      </ul>{/if}
  </section>
{:else}
  <section class="panel">
    <h2>1. Seleccionar el archivo</h2>
    <form
      method="POST"
      action="?/analyze"
      enctype="multipart/form-data"
      onsubmit={() => (busy = true)}
    >
      <label
        >Archivo Excel (.xlsx)<input type="file" name="archivo" accept=".xlsx" required /></label
      >
      <p class="help">
        Hasta 5 MB y 2.000 fichas. No subas fórmulas, archivos con contraseña ni macros.
      </p>
      <button disabled={busy || !ready}
        >{busy ? 'Analizando el archivo…' : 'Analizar archivo'}</button
      >
    </form>
  </section>
  {#if data.batch && plan}
    <section class="panel">
      <h2>2. Revisar la vista previa</h2>
      <p><strong>{data.batch.filename}</strong></p>
      <p>
        {plan.manuscripts} manuscritos nuevos · {plan.poems} poemas nuevos · {plan.references} manuscritos
        existentes usados como referencia.
      </p>
      {#if plan.skipped}<p class="help">
          Se han omitido {plan.skipped} filas vacías o que solo contenían numeración.
        </p>{/if}
      {#if data.batch.expired}<p class="notice error">
          La vista previa ha caducado. Vuelve a subir el archivo.
        </p>{/if}
      {#if errors.length}<div class="notice error" role="alert">
          <strong>{errors.length} errores impiden importar.</strong> Corrige las filas indicadas en el
          Excel y vuelve a analizarlo. No se ha creado ninguna ficha.
        </div>{:else}<p class="notice">
          No hay errores que impidan guardar este lote como borrador.
        </p>{/if}
      {#if plan.issues.length}<div class="table-wrap">
          <table class="import-issues" aria-label="Errores y avisos del archivo">
            <thead
              ><tr><th>Tipo</th><th>Pestaña y fila</th><th>Campo</th><th>Qué debes revisar</th></tr
              ></thead
            ><tbody
              >{#each plan.issues as issue}<tr
                  ><td>{issue.level === 'error' ? 'Error' : 'Aviso'}</td><td
                    >{issue.sheet}{issue.row ? ' · fila ' + issue.row : ''}</td
                  ><td>{issue.field || '—'}</td><td>{issue.message}</td></tr
                >{/each}</tbody
            >
          </table>
        </div>{/if}
      {#if plan.newForms.length}<div class="notice">
          <strong>Nuevas formas métricas detectadas:</strong>
          {plan.newForms.join(', ')}. Revisa los nombres antes de añadirlos al vocabulario.
        </div>{/if}
      <p class="help">
        Abre cada fila para revisar todos sus campos y el formato que se conservará. «Referencia
        existente» no modifica la ficha del manuscrito.
      </p>
      {#each plan.rows as row}<details class="import-row">
          <summary
            >{row.kind === 'testimonios' ? 'Manuscrito' : 'Poema'} · {row.sheet}, fila {row.row} · {(
              row.content.incipit ||
              row.content.testimonio ||
              'Sin identificar'
            ).replace(/<[^>]*>/g, '')}
            <span class="badge"
              >{row.status === 'reference'
                ? 'Referencia existente'
                : row.status === 'duplicate'
                  ? 'Duplicado'
                  : 'Nuevo borrador'}</span
            ></summary
          >
          <dl>
            {#each fields[row.kind] as [key, label]}<div>
                <dt>{label}</dt>
                <dd>
                  {#if key === 'testimonio_id'}{plan.rows.find((r) => r.id === row.parentId)
                      ?.content.testimonio ||
                      data.parents.find((p) => p.id === row.parentId)?.title ||
                      row.content.testimonio ||
                      'Sin manuscrito válido'}{:else if richFields.has(key)}<div
                      class="preview-content"
                    >
                      {@html row.content[key] || '—'}
                    </div>{:else}{row.content[key] || '—'}{/if}
                </dd>
              </div>{/each}
          </dl>
          {#if row.existingId}<a href={'/admin/' + row.kind + '/' + row.existingId} target="_blank"
              >Abrir ficha existente ↗</a
            >{/if}
        </details>{/each}
    </section>
    <section class="panel">
      <h2>3. Guardar como borradores</h2>
      <p>
        La confirmación guarda todo el lote en una sola operación. Si el catálogo ha cambiado o se
        detecta un conflicto, no se importará parcialmente.
      </p>
      <form method="POST" action="?/confirm">
        <input type="hidden" name="lote" value={data.batch.id} /><label
          ><input type="checkbox" name="revisado" required /> He revisado las fichas{warnings.length
            ? ' y los avisos'
            : ''} de esta vista previa.</label
        >{#if plan.newForms.length}<label style="margin-top:.75rem"
            ><input type="checkbox" name="formas" required /> Quiero añadir estas {plan.newForms
              .length} formas métricas nuevas al vocabulario.</label
          >{/if}<button
          disabled={errors.length > 0 || data.batch.expired || !ready}
          style="margin-top:1rem">Importar como borradores</button
        >
      </form>
    </section>
  {/if}
{/if}

<style>
  .import-row {
    border-top: 1px solid #dedfd6;
    padding: 1rem 0;
  }
  .import-row summary {
    line-height: 1.6;
  }
  dl > div {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 640px) {
    .import-issues thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .import-issues tbody {
      display: block;
    }
    .import-issues tr {
      display: grid;
      grid-template-columns: 70px 1fr;
      border-bottom: 1px solid #dedfd6;
      padding: 0.65rem 0;
    }
    .import-issues td {
      border: 0;
      padding: 0.25rem;
      overflow-wrap: anywhere;
    }
    .import-issues td:nth-child(3),
    .import-issues td:nth-child(4) {
      grid-column: 1/-1;
    }
    .import-issues td:nth-child(3)::before {
      content: 'Campo: ';
      font-weight: 600;
    }
    dl > div {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }
  }
</style>
