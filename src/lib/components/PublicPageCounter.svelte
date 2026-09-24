<script lang="ts">
  import { invalidate, afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { isPublicPage } from '$lib/consultation-policy';

  let recording = false;
  const visitKey = 'repomit:visit-recorded';
  async function recordVisit(pathname: string) {
    if (recording) return;
    try {
      if (sessionStorage.getItem(visitKey)) return;
      // Test storage before recording: unavailable storage must not count every page.
      sessionStorage.setItem('repomit:storage-check', '1');
      sessionStorage.removeItem('repomit:storage-check');
    } catch { return; }
    recording = true;
    try {
      const response = await fetch('/api/visitas', {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: pathname, keepalive: true
      });
      if (response.status === 200) {
        sessionStorage.setItem(visitKey, '1');
        await invalidate('repomit:visits');
      }
    } catch { /* A later navigation can retry. */ }
    finally { recording = false; }
  }

  afterNavigate(({ from, to }) => {
    if (!to || $page.status !== 200 || !isPublicPage(to.url.pathname)) return;
    void recordVisit(to.url.pathname);
    // A fragment-only change is not another page consultation.
    if (from && from.url.pathname === to.url.pathname && from.url.search === to.url.search) return;
    // No cookies or personal identifiers are created. The server excludes authenticated editors.
    void fetch('/api/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: to.url.pathname,
      keepalive: true
    }).catch(() => { /* Statistics must never interrupt reading. */ });
  });
</script>
