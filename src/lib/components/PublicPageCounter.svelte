<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { isPublicPage } from '$lib/consultation-policy';

  afterNavigate(({ from, to }) => {
    if (!to || $page.status !== 200 || !isPublicPage(to.url.pathname)) return;
    // A fragment-only change is not another page consultation.
    if (from && from.url.pathname === to.url.pathname && from.url.search === to.url.search) return;
    // No cookies or local identifiers are created. The server excludes authenticated editors.
    void fetch('/api/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: to.url.pathname,
      keepalive: true
    }).catch(() => { /* Statistics must never interrupt reading. */ });
  });
</script>
