<script lang="ts">
  export let data;
  export let form;
</script>

<svelte:head><title>Cuentas y acceso · RePoMIt</title></svelte:head>
<h1>Cuentas y acceso</h1>
{#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}{#if form?.success}<p
    class="notice"
    role="status"
  >
    {form.success}
  </p>{/if}
<section class="panel">
  <h2>Cambiar mi contraseña</h2>
  <p class="help">Usa al menos 12 caracteres. Al cambiarla tendrás que volver a entrar.</p>
  <form method="POST" action="?/password" class="grid">
    <label
      >Contraseña actual<input
        name="current"
        type="password"
        autocomplete="current-password"
        required
      /></label
    ><label
      >Nueva contraseña<input
        name="next"
        type="password"
        autocomplete="new-password"
        minlength="12"
        maxlength="256"
        required
      /></label
    ><label
      >Repetir nueva contraseña<input
        name="confirm"
        type="password"
        autocomplete="new-password"
        minlength="12"
        maxlength="256"
        required
      /></label
    >
    <div class="actions"><button>Cambiar contraseña</button></div>
  </form>
</section>
{#if data.user?.role === 'admin'}
  <section class="panel">
    <h2>Dar acceso a una persona</h2>
    <p class="help">
      Las cuentas de edición pueden catalogar y publicar. Las de administración también gestionan
      los accesos. No se envían correos automáticamente.
    </p>
    <form method="POST" action="?/create" class="grid">
      <label>Nombre<input name="name" autocomplete="name" required /></label><label
        >Correo electrónico<input name="email" type="email" autocomplete="off" required /></label
      ><label
        >Contraseña inicial<input
          name="password"
          type="password"
          autocomplete="new-password"
          minlength="12"
          maxlength="256"
          required
        /></label
      ><label
        >Permisos<select name="role"
          ><option value="editor">Edición</option><option value="admin">Administración</option
          ></select
        ></label
      ><button>Crear cuenta</button>
    </form>
  </section>
  <section class="panel">
    <h2>Personas con acceso</h2>
    {#each data.users as user}<div class="panel">
        <strong>{user.name}</strong>
        <p class="help">
          {user.email} · {user.role === 'admin' ? 'Administración' : 'Edición'} · {user.active
            ? 'Activa'
            : 'Desactivada'}
        </p>
        {#if user.id !== data.user.id}<form method="POST" action="?/deactivate">
            <input type="hidden" name="id" value={user.id} /><button class="secondary"
              >{user.active ? 'Desactivar acceso' : 'Reactivar acceso'}</button
            >
          </form>
          <details style="margin-top:1rem">
            <summary>Restablecer contraseña</summary>
            <form method="POST" action="?/reset">
              <input type="hidden" name="id" value={user.id} /><label
                >Nueva contraseña para {user.name}<input
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  minlength="12"
                  maxlength="256"
                  required
                /></label
              ><button style="margin-top:.75rem">Restablecer contraseña</button>
            </form>
          </details>{/if}
      </div>{/each}
  </section>{/if}
