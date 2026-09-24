<script lang="ts">
  import {
    italyPath,
    project,
    coordinatesFor,
    cityKey,
    type Coordinates,
    type MapSettings
  } from './geography';
  export let cities: string[] = [];
  export let settings: MapSettings = { visible: true, cities: {} };
  export let place: ((coordinates: Coordinates) => void) | undefined = undefined;
  function clickMap(event: MouseEvent) {
    if (!place || event.detail === 0) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    place({
      latitude: Number((48 - ((event.clientY - rect.top) / rect.height) * 13).toFixed(5)),
      longitude: Number((6 + ((event.clientX - rect.left) / rect.width) * 13).toFixed(5))
    });
  }
  function moveMap(event: KeyboardEvent) {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0.05, 0],
      ArrowDown: [-0.05, 0],
      ArrowLeft: [0, -0.05],
      ArrowRight: [0, 0.05]
    };
    if (!place || !delta[event.key]) return;
    event.preventDefault();
    const c = coordinatesFor(active, settings) || { latitude: 42, longitude: 12 };
    const [lat, lon] = delta[event.key];
    place({
      latitude: Math.max(35, Math.min(48, Number((c.latitude + lat).toFixed(5)))),
      longitude: Math.max(6, Math.min(19, Number((c.longitude + lon).toFixed(5))))
    });
  }
  export let active = '';
  export let select: (city: string) => void = () => {};
  $: points = cities.flatMap((city) => {
    const c = coordinatesFor(city, settings);
    return c ? [{ city, key: cityKey(city), ...project(c) }] : [];
  });
</script>

<div class="map">
  {#if place}
    <button
      class="surface"
      type="button"
      aria-label="Situar ciudad en el mapa. Usa las flechas para mover el punto"
      onclick={clickMap}
      onkeydown={moveMap}
      ><svg viewBox="0 0 300 400" aria-hidden="true"><path d={italyPath} /></svg></button
    >
  {:else}<svg viewBox="0 0 300 400" aria-hidden="true"><path d={italyPath} /></svg>{/if}
  {#each points as point}
    <button
      type="button"
      class:active={active === point.key}
      style={`left:${point.x / 3}%;top:${point.y / 4}%`}
      aria-label={`Ver ${point.city}`}
      aria-pressed={active === point.key}
      onclick={() => select(point.city)}
      title={point.city}><span></span><b>{point.city}</b></button
    >
  {/each}
</div>

<style>
  .surface {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: none;
    display: block;
    cursor: crosshair;
  }
  .surface:hover,
  .surface:focus-visible {
    z-index: 0;
  }
  .map {
    position: relative;
    width: 100%;
    aspect-ratio: 3/4;
    max-width: 27rem;
    margin: auto;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  path {
    fill: #e8e0d2;
    stroke: #8a7a62;
    stroke-width: 0.8;
    stroke-linejoin: round;
  }
  button {
    position: absolute;
    transform: translate(-6px, -50%);
    display: flex;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: 0;
    padding: 0;
    color: #23201d;
    cursor: pointer;
    font-size: 0.78rem;
    white-space: nowrap;
  }
  button span {
    display: block;
    width: 10px;
    height: 10px;
    background: #8f1f1d;
    border: 1px solid white;
    border-radius: 50%;
    flex-shrink: 0;
  }
  b {
    background: #fffefbdc;
    padding: 1px 3px;
    font-weight: normal;
  }
  button:hover,
  button:focus-visible,
  button.active {
    z-index: 2;
  }
  button:focus-visible {
    outline: 2px solid #674c19;
    outline-offset: 3px;
  }
  .active b {
    font-weight: bold;
    background: white;
  }
</style>
