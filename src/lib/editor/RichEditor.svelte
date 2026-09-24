<script lang="ts">
  import { cleanPastedHtml } from './paste';
  import { onMount } from 'svelte';
  export let name: string;
  export let label: string;
  export let value = '';
  export let long = false;
  let editor: HTMLDivElement;
  let ready = false;
  let link = '';
  let showLink = false;
  let selection: Range | null = null;
  onMount(() => {
    editor.innerHTML = value.replace(/\n/g, '<br>');
    ready = true;
  });
  // SvelteKit reuses the page on previous/next navigation. Synchronize values
  // arriving after mount without resetting the caret during ordinary typing.
  $: if (ready && editor && editor.innerHTML !== value.replace(/\n/g, '<br>')) {
    editor.innerHTML = value.replace(/\n/g, '<br>');
    selection = null;
  }
  function sync() {
    value = editor.innerHTML;
  }
  function remember() {
    const current = window.getSelection();
    if (current?.rangeCount && editor.contains(current.anchorNode))
      selection = current.getRangeAt(0).cloneRange();
  }
  function command(cmd: string, arg?: string) {
    editor.focus();
    if (selection) {
      const current = window.getSelection();
      current?.removeAllRanges();
      current?.addRange(selection);
    }
    document.execCommand(cmd, false, arg);
    sync();
    remember();
  }
  function addLink() {
    if (/^(https?:\/\/|mailto:|\/(?!\/))/.test(link)) {
      command('createLink', link);
      showLink = false;
      link = '';
    }
  }
  function paste(event: ClipboardEvent) {
    event.preventDefault();
    remember();
    const html = event.clipboardData?.getData('text/html');
    if (html) command('insertHTML', cleanPastedHtml(html));
    else command('insertText', event.clipboardData?.getData('text/plain') || '');
  }
</script>

<input type="hidden" {name} {value} />
<div class="rich-editor">
  <div class="toolbar" role="toolbar" aria-label={'Formato de ' + label}>
    <button
      type="button"
      aria-label={'Cursiva en ' + label}
      on:mousedown|preventDefault
      on:click={() => command('italic')}><em>Cursiva</em></button
    >
    <button
      type="button"
      aria-label={'Negrita en ' + label}
      on:mousedown|preventDefault
      on:click={() => command('bold')}><strong>Negrita</strong></button
    >
    <button
      type="button"
      on:mousedown|preventDefault
      on:click={() => {
        remember();
        showLink = !showLink;
      }}>Enlace</button
    >
    <button type="button" on:mousedown|preventDefault on:click={() => command('removeFormat')}
      >Quitar formato</button
    >
  </div>
  {#if showLink}<div class="toolbar">
      <label
        >Dirección del enlace<input type="url" bind:value={link} placeholder="https://…" /></label
      ><button type="button" on:click={addLink}>Insertar enlace</button>
    </div>{/if}
  <div
    id={'field-' + name}
    bind:this={editor}
    class="editable"
    class:long
    contenteditable={ready}
    role="textbox"
    aria-label={label}
    aria-multiline="true"
    tabindex="0"
    on:input={sync}
    on:keyup={remember}
    on:mouseup={remember}
    on:blur={remember}
    on:paste={paste}
    on:drop|preventDefault
  ></div>
</div>
