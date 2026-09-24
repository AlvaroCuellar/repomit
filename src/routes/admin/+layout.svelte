<script lang="ts">
  import './admin.css';
  import { page } from '$app/stores';
  export let data;
  $: active =
    $page.url.pathname === '/admin'
      ? $page.url.searchParams.get('kind') || 'inicio'
      : $page.url.pathname.split('/')[2];
  const links = [
    ['inicio', '/admin', 'Inicio'],
    ['testimonios', '/admin?kind=testimonios', 'Manuscritos'],
    ['poemas', '/admin?kind=poemas', 'Poemas'],
    ['importar', '/admin/importar', 'Importar Excel'],
    ['textos', '/admin?kind=textos', 'Textos de la web'],
    ['mapa', '/admin/mapa', 'Mapa'],
    ['estadisticas', '/admin/estadisticas', 'Estadísticas'],
    ['usuarios', '/admin/usuarios', 'Cuentas y acceso']
  ];
</script>

<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>
<div class="admin">
  {#if data.user}
    <div class="admin-top">
      <div>
        <span class="eyebrow">ÁREA DE EDICIÓN</span>
        <p>{data.user.name}</p>
      </div>
      <form method="POST" action="/admin/logout">
        <button class="secondary">Cerrar sesión</button>
      </form>
    </div>
    <nav class="admin-nav" aria-label="Administración">
      {#each links as [key, href, label]}<a
          {href}
          aria-current={active === key ? 'page' : undefined}>{label}</a
        >{/each}
    </nav>
  {/if}
  <slot />
</div>
