<script lang="ts">
  export let form;
</script>

<svelte:head><title>Acceso de edición · RePoMIt</title></svelte:head>
<div class="login panel">
  <span class="eyebrow">REPOMIT · EDICIÓN</span>
  <h1>Acceso de edición</h1>
  <p>Entra para catalogar manuscritos, revisar poemas y actualizar los textos de la web.</p>
  {#if form?.error}<p role="alert" class="notice error">{form.error}</p>{/if}
  <form method="POST">
    <label
      >Correo electrónico<input name="email" type="email" autocomplete="username" required /></label
    ><label
      >Contraseña<input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        maxlength="256"
      /></label
    ><button>Entrar</button>
  </form>
  <p class="muted">
    Acceso reservado al equipo. Si necesitas una cuenta o recuperar el acceso, contacta con la
    persona administradora.
  </p>
</div>

<style>
  .login {
    max-width: 460px;
    margin: 2rem auto !important;
  }
  .login h1 {
    margin-top: 1rem;
  }
  .login form {
    display: grid;
    gap: 1.2rem;
  }
</style>
