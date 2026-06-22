<section class="home-header">
  <h1>RePoMIt</h1>
  <p class="subtitle">
    <strong>Re</strong>pertorio de la <strong>po</strong>esía en castellano en
    <strong>m</strong>anuscritos <strong>it</strong>alianos
  </p>
</section>

<section class="intro">
  <p>
    RePoMIt es un repertorio digital dedicado a la poesía en castellano conservada
    en manuscritos italianos de los siglos XVI y XVII. La aplicación permite consultar
    fichas de poemas y testimonios, así como recorrer el repertorio por orden alfabético.
  </p>

  <p>
    El proyecto nace en el marco del seminario
    <em>Corre manuscrita (in Italia): Fonti, metodi e strumenti per lo studio della poesia aurea</em>,
    coordinado por Antonietta Molinaro, Università eCampus, con la participación de
    Álvaro Cuéllar, Universitat Autònoma de Barcelona.
  </p>

  <p>
    El repertorio trabaja con testimonios completos: las composiciones se ordenan según su
    posición topográfica en cada manuscrito y se identifican mediante el ítem formado por
    testimonio y orden.
  </p>
</section>

<nav class="featured-links" aria-label="Accesos principales">
  <a href="/busqueda">
    <strong>Búsqueda</strong>
    <span>Buscar por íncipit, verso, epígrafe, estribillo, autor o texto libre.</span>
  </a>
  <a href="/repertorio">
    <strong>Repertorio</strong>
    <span>Consultar las composiciones en orden alfabético.</span>
  </a>
  <a href="/manuscritos">
    <strong>Manuscritos</strong>
    <span>Acceder a las fichas de testimonios y sus composiciones catalogadas.</span>
  </a>
</nav>

<style>
  .home-header {
    padding-bottom: 1rem;
    border-bottom: 1px solid #e4dfd4;
  }

  .subtitle {
    margin: 0;
    color: #4c463d;
    font-size: 1.15rem;
  }

  .subtitle strong {
    color: #23201d;
    font-weight: 800;
  }

  .intro {
    max-width: 50rem;
    margin-top: 1.5rem;
  }

  .featured-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }

  .featured-links a {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border: 1px solid #e4dfd4;
    border-radius: 4px;
    background: #fffefb;
    text-decoration: none;
  }

  .featured-links span {
    color: #4c463d;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    .featured-links {
      grid-template-columns: 1fr;
    }
  }
</style>
