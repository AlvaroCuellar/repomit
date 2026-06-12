<script lang="ts">
  let { compact = false } = $props<{ compact?: boolean }>();

  const institutions = [
    {
      name: 'Instituto Cervantes',
      role: 'patrocinio',
      href: 'https://www.cervantes.es',
      logo: '/logos/instituto-cervantes.svg',
      alt: 'Logotipo del Instituto Cervantes',
      width: '42px'
    },
    {
      name: 'Università eCampus',
      role: 'dirección científica / seminario',
      href: 'https://www.uniecampus.it',
      logo: '/logos/ecampus.svg',
      alt: 'Logotipo de Università eCampus',
      width: '190px'
    },
    {
      name: 'AISPI',
      role: 'patrocinio',
      href: 'https://www.aispi.it/',
      logo: '/logos/aispi.png',
      alt: 'Logotipo de AISPI',
      width: '206px',
      cropWidth: '76px'
    },
    {
      name: 'AISI',
      role: 'patrocinio',
      href: 'https://www.associazioneaisi.it/',
      logo: '/logos/aisi.svg',
      alt: 'Logotipo de AISI',
      width: '150px'
    }
  ];
</script>

<div class:compact class="institutional-logos" aria-label="Instituciones colaboradoras">
  {#each institutions as institution}
    <a
      class="institution"
      href={institution.href}
      target="_blank"
      rel="noopener noreferrer"
      style={`--logo-width: ${institution.width}; --crop-width: ${institution.cropWidth ?? institution.width};`}
    >
      <span class:cropped={Boolean(institution.cropWidth)} class="logo-slot">
        {#if institution.logo}
          <img src={institution.logo} alt={institution.alt} />
        {:else}
          <span class="text-mark" aria-label={`${institution.alt} pendiente`}>
            {institution.name}
          </span>
        {/if}
      </span>
      <span class="meta" aria-hidden={compact}>
        <span class="name">{institution.name}</span>
        <span class="role">{institution.role}</span>
      </span>
    </a>
  {/each}
</div>

<style>
  .institutional-logos {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.4rem;
    align-items: center;
    margin: 1rem 0;
  }

  .institution {
    display: grid;
    gap: 0.35rem;
    align-content: start;
    width: var(--logo-width);
    max-width: 100%;
    color: inherit;
    text-decoration: none;
  }

  .logo-slot {
    display: flex;
    align-items: center;
    width: var(--logo-width);
    max-width: 100%;
    height: 64px;
  }

  .logo-slot.cropped {
    width: var(--crop-width);
    overflow: hidden;
  }

  img {
    display: block;
    max-width: var(--logo-width);
    max-height: 64px;
    object-fit: contain;
    object-position: left center;
  }

  .cropped img {
    width: auto;
    max-width: none;
    height: 64px;
  }

  .text-mark {
    color: #23201d;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .meta {
    display: grid;
    gap: 0.12rem;
  }

  .name {
    color: #23201d;
    font-weight: 700;
    line-height: 1.25;
  }

  .role {
    color: #6c6256;
    font-size: 0.85rem;
    line-height: 1.35;
  }

  .compact {
    gap: 0.65rem 1rem;
    margin: 0;
    align-items: center;
  }

  .compact .institution {
    display: flex;
    width: auto;
    align-items: center;
  }

  .compact .logo-slot {
    width: min(var(--logo-width), 120px);
    height: 42px;
  }

  .compact .logo-slot.cropped {
    width: min(var(--crop-width), 76px);
  }

  .compact img {
    max-width: min(var(--logo-width), 120px);
    max-height: 42px;
  }

  .compact .cropped img {
    height: 42px;
    max-width: none;
  }

  .compact .meta {
    display: none;
  }

  .compact .text-mark {
    font-size: 0.9rem;
  }

  .compact .name {
    font-size: 0.82rem;
  }

  .compact .role {
    font-size: 0.75rem;
  }

  @media (max-width: 640px) {
    .institutional-logos {
      gap: 0.85rem 1rem;
    }

    .compact .institution {
      width: auto;
    }

    .compact .logo-slot {
      width: min(var(--logo-width), 96px);
      height: 32px;
    }

    .compact .logo-slot.cropped {
      width: min(var(--crop-width), 58px);
    }

    .compact img {
      max-width: min(var(--logo-width), 96px);
      max-height: 32px;
    }

    .compact .cropped img {
      height: 32px;
    }

    .compact .name {
      font-size: 0.76rem;
    }

    .compact .role {
      font-size: 0.7rem;
    }
  }
</style>
