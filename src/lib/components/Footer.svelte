<script lang="ts">
  import InstitutionalLogos from '$lib/components/InstitutionalLogos.svelte';
</script>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-top">
      <p class="footer-title">
        RePoMIt · Repertorio de la poesía en castellano en manuscritos italianos
      </p>
      <p class="footer-year">RePoMIt, 2026</p>
    </div>

    <div class="footer-text">
      <p>Dirección científica: Antonietta Molinaro, Università eCampus</p>
      <p>
        Desarrollo digital: Álvaro Cuéllar · Universitat Autònoma de Barcelona ·
        <a href="https://alvarocuellar.com" target="_blank" rel="noopener noreferrer">
          alvarocuellar.com
        </a>
      </p>
      <p>
        Con el patrocinio de: Instituto Cervantes · AISPI · AISI · Università eCampus / DiSUS
      </p>
    </div>

    <div class="footer-bottom">
      <InstitutionalLogos compact />
      <a
        class="site-url"
        href="https://repomit.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
      >
        https://repomit.vercel.app
      </a>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid #e4dfd4;
    background: #f4f1ea;
  }

  .footer-inner {
    width: min(1040px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0;
    color: #4c463d;
    font-size: 0.86rem;
  }

  .footer-top,
  .footer-bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
  }

  p {
    margin: 0;
    line-height: 1.45;
  }

  .footer-title {
    color: #23201d;
    font-weight: 700;
  }

  .footer-year,
  .site-url {
    white-space: nowrap;
  }

  .footer-text {
    display: grid;
    gap: 0.2rem;
    margin: 0.55rem 0 0.85rem;
  }

  .footer-bottom {
    padding-top: 0.85rem;
    border-top: 1px solid #e4dfd4;
  }

  a {
    color: #614716;
    overflow-wrap: anywhere;
  }

  @media (max-width: 700px) {
    .footer-top,
    .footer-bottom {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }

    .footer-year,
    .site-url {
      white-space: normal;
    }
  }

  @media (max-width: 520px) {
    .footer-inner {
      width: min(100% - 1.25rem, 960px);
      padding: 1rem 0;
      font-size: 0.8rem;
    }
  }
</style>
