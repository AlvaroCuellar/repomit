<script lang="ts">
  import { untrack, onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import AddForm from '$lib/editor/AddForm.svelte';
  import EditingInstructions from '$lib/editor/EditingInstructions.svelte';
  import RichEditor from '$lib/editor/RichEditor.svelte';
  import {
    fields,
    groups,
    labels,
    richFields,
    longFields,
    conditions,
    help,
    type Content
  } from '$lib/editor/schema';
  let { data, form }: import('./$types').PageProps = $props();
  let values: Content = $state(
    untrack(() => ({ ...data.content, ...(form && 'values' in form ? form.values : {}) }))
  );
  let availableForms = $state(untrack(() => data.formas));
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let dirty = $state(false);
  let submitting = $state(false);
  let label = $derived(Object.fromEntries(fields[data.kind]));
  const dependent = Object.fromEntries(Object.entries(conditions).map(([a, b]) => [b, a]));
  $effect(() => {
    availableForms = data.formas;
    values = { ...data.content, ...(form && 'values' in form ? form.values : {}) };
    dirty = false;
    submitting = false;
  });
  beforeNavigate(({ cancel }) => {
    if (
      dirty &&
      !submitting &&
      !confirm('Tienes cambios sin guardar. ¿Quieres salir de esta ficha?')
    )
      cancel();
  });
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty && !submitting) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
</script>

<svelte:window onbeforeunload={beforeUnload} />
<svelte:head
  ><title>{data.id === 'nuevo' ? 'Nueva ficha' : 'Editar ficha'} · RePoMIt</title></svelte:head
>
<a href={'/admin?kind=' + data.kind}>← Volver a {labels[data.kind].toLowerCase()}</a>
<div class="heading-row">
  <div>
    <h1 style="margin-top:1rem">
      {data.id === 'nuevo'
        ? data.kind === 'poemas'
          ? 'Añadir poema'
          : data.kind === 'testimonios'
            ? 'Incorporar manuscrito'
            : 'Añadir sección'
        : 'Editar ' +
          (data.kind === 'poemas'
            ? 'poema'
            : data.kind === 'testimonios'
              ? 'manuscrito'
              : 'sección')}
    </h1>
    <span class="badge" class:draft={data.changed || data.id === 'nuevo'}
      >{data.id === 'nuevo'
        ? 'Nueva ficha'
        : data.changed
          ? 'Borrador pendiente'
          : 'Publicado'}</span
    >
  </div>
  {#if data.id !== 'nuevo'}<a
      class="button secondary"
      href={'/admin/' + data.kind + '/' + data.id + '/vista-previa'}
      target="_blank">Vista previa guardada ↗</a
    >{/if}
</div>
<EditingInstructions kind={data.kind} />
{#if data.kind === 'poemas' && values.testimonio_id}<nav
    class="actions panel"
    aria-label="Revisar el manuscrito"
  >
    <a href={'/admin/testimonios/' + values.testimonio_id}
      >Volver al manuscrito {data.parents.find((p) => p.id === values.testimonio_id)?.title}</a
    >{#if data.id !== 'nuevo' && values.testimonio_id === data.content.testimonio_id}{#if data.previous}<a
          class="button secondary"
          href={'/admin/poemas/' + data.previous}>← Poema anterior</a
        >{/if}{#if data.next}<a class="button secondary" href={'/admin/poemas/' + data.next}
          >Poema siguiente →</a
        >{/if}{/if}
  </nav>{/if}
{#if data.saved && !form?.error}<p class="notice" role="status">
    Cambios guardados. {data.id === 'nuevo'
      ? 'La ficha anterior se ha guardado como borrador. Puedes continuar con el siguiente poema.'
      : data.changed
        ? 'El borrador todavía no es visible para los visitantes.'
        : 'La versión publicada ya está disponible en la web.'}
  </p>{/if}
{#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
{#if data.kind === 'testimonios'}<p class="help">
    La ficha reúne el manuscrito completo. Guarda sus datos y añade después sus poemas. El contenido
    topográfico se construye automáticamente.
  </p>{/if}
{#if data.kind === 'poemas'}<p class="help">
    Puedes guardar una ficha en preparación y completarla después. Los campos no pertinentes pueden
    marcarse con —. La transcripción es facultativa.
  </p>{/if}
<form method="POST" oninput={() => (dirty = true)} onsubmit={() => (submitting = true)}>
  <input type="hidden" name="version" value={data.version} />
  {#key data.id + ':' + data.version + ':' + (form?.error || '')}
    {#each groups[data.kind] as group}<fieldset class="panel" disabled={!ready}>
        <legend>{group.title}</legend>
        <div class="grid">
          {#each group.keys as key}
            {#if !dependent[key] || values[dependent[key]] === 'sí' || (values[key] && values[key] !== '—')}
              <div class:wide={longFields.has(key)}>
                {#if richFields.has(key)}
                  <label for={'field-' + key}>{label[key]}</label>
                  <RichEditor
                    name={key}
                    label={label[key]}
                    bind:value={values[key]}
                    long={['transcripcion', 'bibliografia', 'texto'].includes(key)}
                  />
                {:else}
                  <label
                    >{label[key]}
                    {#if key === 'testimonio_id'}<select name={key} bind:value={values[key]}
                        ><option value="">Selecciona un manuscrito</option
                        >{#each data.parents as p}<option value={p.id}
                            >{p.title}{p.published ? '' : ' (borrador)'}</option
                          >{/each}</select
                      >
                    {:else if key in conditions}<select name={key} bind:value={values[key]}
                        ><option value="">Sin determinar</option><option value="sí">Sí</option
                        ><option value="no">No</option><option value="—">No pertinente</option
                        ></select
                      >
                    {:else if key === 'forma'}<select name={key} bind:value={values[key]}
                        ><option value="">Selecciona una forma</option
                        >{#if values[key] && !availableForms.includes(values[key])}<option
                            value={values[key]}>{values[key]} (valor existente)</option
                          >{/if}{#each availableForms as forma}<option value={forma}>{forma}</option
                          >{/each}<option value="—">No pertinente</option></select
                      >
                    {:else if key === 'pagina'}<select name={key} bind:value={values[key]}
                        ><option value="home">Portada</option><option value="manuscritos"
                          >Manuscritos</option
                        ><option value="presentacion">Presentación</option><option value="criterios"
                          >Criterios</option
                        ></select
                      >
                    {:else if longFields.has(key)}<textarea
                        name={key}
                        bind:value={values[key]}
                        rows="3"></textarea>
                    {:else}<input
                        name={key}
                        bind:value={values[key]}
                        type={key === 'orden' ? 'number' : 'text'}
                        min={key === 'orden' ? 1 : undefined}
                        max={key === 'orden' ? 999999 : undefined}
                      />{/if}
                  </label>{/if}
                {#if key === 'forma'}<AddForm
                    onselect={(name) => {
                      availableForms = [...new Set([...availableForms, name])].sort((a, b) =>
                        a.localeCompare(b, 'es')
                      );
                      values.forma = name;
                      dirty = true;
                    }}
                  />{/if}
                {#if key === 'testimonio_id' && !data.parents.length}<p class="notice">
                    Primero <a href="/admin/testimonios/nuevo">incorpora el manuscrito</a> al que pertenece
                    este poema.
                  </p>{/if}
                {#if key === 'orden' && data.kind === 'poemas' && data.id === 'nuevo' && values.testimonio_id}
                  {@const suggestion = data.parents.find(
                    (p) => p.id === values.testimonio_id
                  )?.nextOrder}
                  {#if suggestion && suggestion <= 999999}<button
                      type="button"
                      class="secondary"
                      onclick={() => {
                        values.orden = String(suggestion);
                        dirty = true;
                      }}>Usar siguiente orden disponible: {suggestion}</button
                    ><span class="help"
                      >Se propone el número posterior al mayor del manuscrito; puedes introducir
                      otro para respetar la posición original.</span
                    >{/if}
                {/if}
                {#if key === 'orden' && data.kind === 'textos'}<span class="help"
                    >Elige una posición libre en la página. El número propuesto añade la sección al
                    final de Presentación.</span
                  >{:else if help[key]}<span class="help">{help[key]}</span>{/if}
                {#if key === 'atribucion'}<div class="actions">
                    <button
                      type="button"
                      class="secondary"
                      onclick={() => {
                        values[key] = '[anónimo]';
                        dirty = true;
                      }}>Sin atribución conocida</button
                    >
                  </div>{/if}
                {#if key === 'epigrafe'}<button
                    type="button"
                    class="secondary"
                    onclick={() => {
                      values[key] = '[anepígrafo]';
                      dirty = true;
                    }}>Sin epígrafe</button
                  >{/if}
              </div>
            {:else}<input type="hidden" name={key} value={values[key] || ''} />{/if}
          {/each}
        </div>
      </fieldset>{/each}
  {/key}
  <div class="actions sticky">
    <button disabled={!ready} formaction="?/draft">Guardar borrador</button><button
      disabled={!ready}
      formaction="?/publish"
      class="secondary">Publicar ficha</button
    >{#if data.kind !== 'textos'}<button disabled={!ready} formaction="?/next" class="secondary"
        >{data.kind === 'testimonios'
          ? 'Guardar y añadir poemas'
          : 'Guardar y añadir siguiente'}</button
      >{/if}<span class="help"
      >{dirty ? 'Hay cambios sin guardar.' : 'Guardar borrador no cambia la web pública.'}</span
    >
  </div>
</form>
{#if data.kind === 'testimonios' && data.id !== 'nuevo'}
  <section class="panel">
    <div class="heading-row">
      <h2>Poemas de este manuscrito ({data.children.length})</h2>
      <a class="button" href={'/admin/poemas/nuevo?manuscrito=' + data.id}>Añadir poema</a>
    </div>
    <p class="help">
      Se respeta el orden original, incluidos sus saltos. La transcripción puede completarse en
      cualquier momento.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Orden</th><th>Íncipit</th><th>Folios</th><th>Estado</th></tr></thead><tbody
          >{#each data.children as child}<tr
              ><td>{child.content.orden}</td><td
                ><a href={'/admin/poemas/' + child.id}
                  >{child.content.incipit.replace(/<[^>]*>/g, '')}</a
                ></td
              ><td>{child.content.folios}</td><td
                ><span class="badge" class:draft={child.changed}
                  >{child.changed ? 'Borrador' : 'Publicado'}</span
                ></td
              ></tr
            >{:else}<tr><td colspan="4">Empieza añadiendo el primer poema del manuscrito.</td></tr
            >{/each}</tbody
        >
      </table>
    </div>
    <details style="margin-top:1.5rem">
      <summary>Publicar el manuscrito completo</summary>
      <p>
        Se publicarán la ficha guardada del manuscrito y los borradores guardados de sus {data
          .children.length} poemas. Si hay errores, el conjunto no se publica.
      </p>
      <form method="POST" action="?/publishAll">
        <input type="hidden" name="version" value={data.version} /><input
          type="hidden"
          name="childrenVersions"
          value={data.childrenVersions}
        /><label
          ><input type="checkbox" required /> He revisado el manuscrito y sus poemas guardados.</label
        >{#if dirty}<p class="notice">
            Guarda los cambios de esta ficha antes de publicar el conjunto.
          </p>{/if}<button disabled={!ready || dirty} style="margin-top:1rem"
          >Publicar manuscrito y poemas</button
        >
      </form>
    </details>
  </section>
{/if}
{#if data.id !== 'nuevo'}<details class="panel">
    <summary>Historial y recuperación de versiones</summary>
    {#if dirty}<p class="notice">
        Guarda los cambios actuales antes de recuperar una versión anterior.
      </p>{/if}
    <p class="help">
      Recuperar una versión la guarda como borrador. Revisa la vista previa antes de publicarla.
    </p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Cambio</th><th>Responsable</th><th>Recuperar</th></tr></thead
        ><tbody
          >{#each data.history as revision}<tr
              ><td>{new Date(revision.created_at).toLocaleString('es-ES')}</td><td
                >{revision.action}</td
              ><td>{revision.author}</td><td
                ><form method="POST" action="?/restore">
                  <input type="hidden" name="revision" value={revision.id} /><input
                    type="hidden"
                    name="version"
                    value={data.version}
                  /><button disabled={!ready || dirty} class="secondary"
                    >Recuperar como borrador</button
                  >
                </form></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
  </details>
  {#if data.published}<details class="panel">
      <summary>Retirar de la web pública</summary>
      <p>La ficha se conserva como borrador y mantiene su historial.</p>
      <form method="POST" action="?/unpublish">
        <input type="hidden" name="version" value={data.version} /><label
          ><input type="checkbox" required /> Quiero retirar esta ficha de la web pública.</label
        >{#if dirty}<p class="notice">
            Guarda los cambios de esta ficha antes de retirar la publicación.
          </p>{/if}<button disabled={!ready || dirty} class="danger" style="margin-top:1rem"
          >Retirar publicación</button
        >
      </form>
    </details>{:else if data.kind !== 'textos'}<details class="panel">
      <summary>Eliminar este {data.kind === 'testimonios' ? 'manuscrito' : 'poema'}</summary>
      <p>
        {data.kind === 'testimonios'
          ? `Se eliminarán también sus ${data.children.length} poemas borrador y todo su historial.`
          : 'Se eliminarán este borrador y todo su historial.'}
        Esta acción no se puede deshacer.
      </p>
      <form method="POST" action="?/delete">
        <input type="hidden" name="version" value={data.version} /><label
          ><input type="checkbox" name="confirmDelete" required /> Confirmo que quiero eliminarlo definitivamente.</label
        >{#if dirty}<p class="notice">
            Hay cambios sin guardar. Recarga la ficha antes de eliminarla.
          </p>{/if}<button disabled={!ready || dirty} class="danger" style="margin-top:1rem"
          >Eliminar definitivamente</button
        >
      </form>
    </details>{/if}
{/if}
