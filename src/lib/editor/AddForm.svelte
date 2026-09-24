<script lang="ts">
  let { onselect }: { onselect: (name: string) => void } = $props();
  let open = $state(false),
    name = $state(''),
    busy = $state(false),
    message = $state(''),
    existing = $state('');
  async function add() {
    if (busy) return;
    busy = true;
    message = '';
    existing = '';
    try {
      const response = await fetch('/admin/formas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (response.redirected) {
        message = 'La sesión ha caducado. Guarda una copia de tus cambios y vuelve a entrar.';
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        message = result.error || 'No se ha podido añadir la forma.';
        existing = result.existing || '';
        return;
      }
      onselect(result.name);
      name = '';
      open = false;
      message = `Forma «${result.name}» añadida y seleccionada. Guarda la ficha para aplicarla.`;
    } catch {
      message =
        'No se ha podido conectar. Tus cambios en la ficha se conservan; vuelve a intentarlo.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="new-form">
  <button
    type="button"
    class="secondary"
    onclick={() => {
      open = !open;
      message = '';
      existing = '';
    }}
    aria-expanded={open}>Añadir nueva forma</button
  >
  {#if open}
    <div class="panel">
      <label
        >Nombre de la nueva forma<input
          bind:value={name}
          maxlength="100"
          placeholder="Ejemplo: décima"
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        /></label
      >
      <p class="help">
        Se añadirá a la lista de todas las fichas. Se escribe en minúsculas y se comprueba que no
        exista con otras tildes, espacios o mayúsculas.
      </p>
      <button type="button" disabled={busy} onclick={add}
        >{busy ? 'Guardando…' : 'Crear y seleccionar'}</button
      >
    </div>
  {/if}
  {#if message}<p class="help" role="status">{message}</p>{/if}
  {#if existing}<button
      type="button"
      class="secondary"
      onclick={() => {
        onselect(existing);
        message = `Forma «${existing}» seleccionada.`;
        existing = '';
        open = false;
      }}>Usar forma existente</button
    >{/if}
</div>

<style>
  .new-form {
    margin-top: 0.6rem;
  }
</style>
