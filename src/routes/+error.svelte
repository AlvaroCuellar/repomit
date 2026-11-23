<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status === 503 ? 'Servicio temporalmente no disponible' : 'Error'} · RePoMIt</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section aria-labelledby="error-title">
  <h1 id="error-title">{page.status === 503 ? 'Servicio temporalmente no disponible' : 'No se puede abrir esta página'}</h1>
  <p>{page.error?.message || 'Vuelve a intentarlo más tarde.'}</p>
  <p><a href="/">Volver a RePoMIt</a></p>
</section>
