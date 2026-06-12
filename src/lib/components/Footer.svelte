<script lang="ts">
  import InstitutionalLogos from '$lib/components/InstitutionalLogos.svelte';
</script>

<footer class="site-footer">
  <div class="footer-inner">
    <p class="footer-title">
      RePoMIt · Repertorio de la poesía en castellano en manuscritos italianos
    </p>
    <InstitutionalLogos compact />
    <p>Dirección científica: Antonietta Molinaro, Università eCampus</p>
    <p>Desarrollo digital: Álvaro Cuéllar, Universitat Autònoma de Barcelona</p>
    <p>
      Sitio desarrollado por Álvaro Cuéllar:
      <a href="https://alvarocuellar.com">alvarocuellar.com</a>
    </p>
    <p>
      Con el patrocinio de: Instituto Cervantes · AISPI · AISI · Università eCampus / DiSUS
    </p>
    <p>Versión preliminar, 2026</p>
    <p><a href="https://repomit.vercel.app">https://repomit.vercel.app</a></p>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid #e4dfd4;
    background: #f4f1ea;
  }

  .footer-inner {
    width: min(960px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.5rem 0;
    color: #4c463d;
    font-size: 0.9rem;
  }

  p {
    margin: 0.25rem 0;
    line-height: 1.5;
  }

  .footer-title {
    color: #23201d;
    font-weight: 700;
  }
</style>
