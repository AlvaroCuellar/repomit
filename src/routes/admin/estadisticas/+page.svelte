<script lang="ts">
  export let data;
  const number = (value: number) => value.toLocaleString('es-ES');
  const date = (value: string) => new Date(value).toLocaleDateString('es-ES', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric'
  });
</script>

<svelte:head><title>Estadísticas · RePoMIt</title></svelte:head>
<h1>Consultas del repertorio</h1>
<p>Este contador registra páginas consultadas, no personas ni visitantes únicos. Una persona puede consultar varias páginas o volver a cargar una misma página.</p>
{#if data.statistics.firstSeen}
  <p class="help">Primera consulta registrada: {date(data.statistics.firstSeen)}. No se incluyen visitas anteriores a la activación del contador.</p>
{:else}
  <p class="notice">Todavía no hay consultas registradas. El contador comenzará con la primera consulta pública; no se han añadido visitas históricas.</p>
{/if}
<div class="totals">
  <section class="panel"><h2>Total registrado</h2><strong>{number(data.statistics.total)}</strong></section>
  <section class="panel"><h2>Hoy</h2><strong>{number(data.statistics.today)}</strong></section>
  <section class="panel"><h2>Últimos 30 días</h2><strong>{number(data.statistics.last30Days)}</strong></section>
</div>
<section class="panel">
  <h2>Consultas diarias</h2>
  <p class="help">Fechas según UTC. Se muestran los días con consultas de los últimos 30 días, incluido hoy.</p>
  {#if data.statistics.days.length}
    <table><thead><tr><th scope="col">Fecha</th><th scope="col">Páginas consultadas</th></tr></thead>
      <tbody>{#each data.statistics.days as day}<tr><td>{date(day.day)}</td><td>{number(day.total)}</td></tr>{/each}</tbody>
    </table>
  {:else}<p>No hay consultas en este periodo.</p>{/if}
</section>
<section class="panel">
  <h2>Qué se cuenta</h2>
  <p>Se cuentan las cargas y navegaciones de las páginas públicas con JavaScript activo. Se excluyen el área de edición, las consultas realizadas con una sesión de edición abierta, los recursos descargados, las precargas y los robots identificables.</p>
  <p>Solo se guardan sumas por día. No se almacenan direcciones IP, identificadores personales, términos de búsqueda ni un historial individual, y no se añaden cookies de seguimiento.</p>
  <p class="help">La cifra es orientativa: algunos robots pueden no identificarse y los bloqueadores o errores de conexión pueden impedir el registro. Las recargas cuentan como nuevas consultas.</p>
</section>

<style>
  .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .totals h2 { margin-top: 0; font-size: 1rem; }
  .totals strong { font-size: 2rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .65rem; text-align: left; border-bottom: 1px solid #dedfd6; }
  th:last-child, td:last-child { text-align: right; }
  @media(max-width: 600px) { .totals { grid-template-columns: 1fr; } }
</style>
