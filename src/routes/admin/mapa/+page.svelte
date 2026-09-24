<script lang="ts">
  import { onMount } from 'svelte';
  let ready = false;
  onMount(() => { ready = true; });
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import ItalyMap from '$lib/map/ItalyMap.svelte';
  import {
    cityKey,
    coordinatesFor,
    validCoordinates,
    type Coordinates,
    type MapSettings
  } from '$lib/map/geography';
  export let data;
  export let form;
  let settings: MapSettings = structuredClone(data.settings);
  let selected = data.cities[0] || '';
  $: c = coordinatesFor(selected, settings);
  let latitude: number | undefined;
  let longitude: number | undefined;
  $: {
    latitude = c?.latitude;
    longitude = c?.longitude;
  }
  function apply() {
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      validCoordinates({ latitude, longitude })
    )
      settings = {
        ...settings,
        cities: { ...settings.cities, [cityKey(selected)]: { latitude, longitude } }
      };
  }
  function place(coordinates: Coordinates) {
    settings = { ...settings, cities: { ...settings.cities, [cityKey(selected)]: coordinates } };
  }
  function reset() {
    const cities = { ...settings.cities };
    delete cities[cityKey(selected)];
    settings = { ...settings, cities };
  }
  $: missing = data.cities.filter((city) => !coordinatesFor(city, settings));
  $: valid =
    latitude !== undefined && longitude !== undefined && validCoordinates({ latitude, longitude });
  $: unapplied = latitude !== c?.latitude || longitude !== c?.longitude;
</script>

<h1>Mapa de ciudades</h1>
<p>
  Selecciona una ciudad y pulsa en el mapa para colocar su punto. Puedes reajustarlo con otro clic y
  comprobar la vista previa. Guarda los cambios para actualizar el mapa público.
</p>
{#if form?.error}<p role="alert" class="error">{form.error}</p>{/if}
{#if $page.url.searchParams.has('guardado')}<p role="status">Mapa guardado.</p>{/if}
<form method="POST" use:enhance>
  <fieldset disabled={!ready}>
  <input type="hidden" name="settings" value={JSON.stringify(settings)} /><input
    type="hidden"
    name="version"
    value={data.version}
  />
  <label class="visibility"
    ><input type="checkbox" bind:checked={settings.visible} /> Mostrar el mapa en Manuscritos</label
  >
  <div class="columns">
    <div>
      <label for="map-city">Ciudad</label><select id="map-city" bind:value={selected}
        >{#each data.cities as city}<option value={city}>{city}</option>{/each}</select
      >
      {#if selected}
        <label
          >Latitud norte <input
            type="number"
            min="35"
            max="48"
            step="any"
            bind:value={latitude}
          /></label
        >
        <label
          >Longitud este <input
            type="number"
            min="6"
            max="19"
            step="any"
            bind:value={longitude}
          /></label
        >
        <p>Coordenadas decimales, por ejemplo: Rávena, 44.4204 y 12.2200.</p>
        <button type="button" onclick={apply} disabled={!valid}>Aplicar a la vista previa</button>
        <button type="button" class="secondary" onclick={reset}
          >Restablecer ubicación de referencia</button
        >
      {/if}
      {#if missing.length}<p role="status">
          Pendientes de ubicar: {missing.join(', ')}. Estas ciudades siguen en el catálogo, pero no
          se sitúan en el mapa hasta que se indiquen sus coordenadas.
        </p>{/if}
      {#if unapplied}<p role="status">
          Aplica las coordenadas a la vista previa antes de guardar.
        </p>{/if}
      <button disabled={unapplied}>Guardar mapa</button>
    </div>
    <div>
      <h2>Vista previa</h2>
      <p>
        Pulsa sobre el mapa para situar {selected}. Con el mapa enfocado, las flechas desplazan el
        punto.
      </p>
      <ItalyMap
        cities={data.cities}
        {settings}
        active={cityKey(selected)}
        place={selected ? place : undefined}
        select={(city) => (selected = city)}
      />
    </div>
  </div>
  </fieldset>
</form>
<p class="source">
  Cartografía y posiciones iniciales: <a href="https://www.naturalearthdata.com/">Natural Earth</a>.
  Las coordenadas representan ciudades, no edificios concretos.
</p>

<style>
  fieldset {border:0;padding:0;margin:0;min-width:0;}
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 2rem;
  }
  label:not(.visibility) {
    display: grid;
    gap: 0.3rem;
    margin: 1rem 0;
  }
  input,
  select {
    max-width: 100%;
  }
  .visibility {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .source {
    font-size: 0.85rem;
    color: #625a50;
  }
  button {
    margin: 0.3rem;
  }
  .error {
    color: #951b1b;
  }
  @media (max-width: 700px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>
