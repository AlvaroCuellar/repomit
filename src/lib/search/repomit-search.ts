import type { Poema, Testimonio } from '$lib/data/repomit';

export type SearchScope = 'incipit' | 'verso' | 'autor' | 'epigrafe' | 'estribillo' | 'libre';
export type MatchMode = 'exacta' | 'todas' | 'alguna';

export type SearchCriteria = {
  query: string;
  scope: SearchScope;
  forma: string;
  testimonioId: string;
  mode: MatchMode;
};

export type SearchResult = {
  poema: Poema;
  matchedFields: string[];
};

export type RepertorioGroup = {
  letter: string;
  poemas: Poema[];
};

type SearchField = {
  label: string;
  value: string;
};

export function normalizeSearchText(value: string) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getFormaOptions(poemas: Poema[]) {
  return Array.from(new Set(poemas.map((poema) => poema.forma).filter(Boolean))).sort(compareFormas);
}

export function getTestimonioOptions(testimonios: Testimonio[]) {
  return testimonios
    .map((testimonio) => ({
      id: testimonio.id,
      label: testimonio.testimonio
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function searchPoemas(poemas: Poema[], criteria: SearchCriteria): SearchResult[] {
  const query = normalizeSearchText(criteria.query);
  const hasQuery = query.length > 0;

  if (!hasQuery && !criteria.forma && !criteria.testimonioId) {
    return [];
  }

  return poemas
    .filter((poema) => matchesFilters(poema, criteria))
    .map((poema) => ({
      poema,
      matchedFields: hasQuery ? getMatchedFields(poema, query, criteria.scope, criteria.mode) : []
    }))
    .filter((result) => !hasQuery || result.matchedFields.length > 0)
    .sort((a, b) => {
      return (
        a.poema.sort_incipit.localeCompare(b.poema.sort_incipit, 'es') ||
        a.poema.id.localeCompare(b.poema.id, 'es')
      );
    });
}

export function hasActiveSearch(criteria: SearchCriteria) {
  return Boolean(normalizeSearchText(criteria.query) || criteria.forma || criteria.testimonioId);
}

export function filterRepertorio(
  poemas: Poema[],
  criteria: { query: string; forma: string; testimonioId: string }
) {
  const query = normalizeSearchText(criteria.query);
  const words = query.split(' ').filter(Boolean);

  return poemas
    .filter((poema) => {
      if (criteria.forma && poema.forma !== criteria.forma) {
        return false;
      }

      if (criteria.testimonioId && poema.testimonio_id !== criteria.testimonioId) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeSearchText(
        [
          poema.incipit,
          poema.incipit_desarrollo,
          poema.incipit_interno,
          poema.item,
          poema.item_original ?? '',
          poema.atribucion,
          poema.testimonio
        ].join(' ')
      );

      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => a.sort_incipit.localeCompare(b.sort_incipit, 'es') || a.id.localeCompare(b.id));
}

export function groupRepertorioByInitial(poemas: Poema[]): RepertorioGroup[] {
  const groups = new Map<string, Poema[]>();

  for (const poema of poemas) {
    const letter = getInitialLetter(poema.sort_incipit || poema.incipit);
    groups.set(letter, [...(groups.get(letter) ?? []), poema]);
  }

  return Array.from(groups.entries())
    .map(([letter, groupPoemas]) => ({ letter, poemas: groupPoemas }))
    .sort((a, b) => a.letter.localeCompare(b.letter, 'es'));
}

export function hasTextValue(value: string) {
  const normalized = normalizeSearchText(value);
  return normalized !== '' && normalized !== '-';
}

function getInitialLetter(value: string) {
  const normalized = normalizeSearchText(value).replace(/^[^a-z0-9]+/i, '');
  const first = normalized.at(0);
  return first ? first.toUpperCase() : '#';
}

function matchesFilters(poema: Poema, criteria: SearchCriteria) {
  if (criteria.forma && poema.forma !== criteria.forma) {
    return false;
  }

  if (criteria.testimonioId && poema.testimonio_id !== criteria.testimonioId) {
    return false;
  }

  return true;
}

function getMatchedFields(poema: Poema, query: string, scope: SearchScope, mode: MatchMode) {
  return getFieldsForScope(poema, scope)
    .filter((field) => fieldMatches(field, query, mode))
    .map((field) => field.label);
}

function getFieldsForScope(poema: Poema, scope: SearchScope): SearchField[] {
  if (scope === 'incipit') {
    return [
      { label: 'íncipit', value: poema.incipit },
      {
        label: 'íncipit de la primera estrofa de desarrollo',
        value: poema.incipit_desarrollo
      },
      {
        label: 'íncipit de la(s) composición(es) interna(s)/final(es)',
        value: poema.incipit_interno
      }
    ];
  }

  if (scope === 'verso') {
    return [
      { label: 'íncipit', value: poema.incipit },
      { label: 'segundo verso', value: poema.segundo_verso },
      { label: 'éxplicit', value: poema.explicit },
      {
        label: 'íncipit de la primera estrofa de desarrollo',
        value: poema.incipit_desarrollo
      },
      {
        label: 'íncipit de la(s) composición(es) interna(s)/final(es)',
        value: poema.incipit_interno
      },
      { label: 'estribillo', value: poema.estribillo_entero },
      { label: 'transcripción', value: poema.transcripcion }
    ];
  }

  if (scope === 'autor') {
    return [
      { label: 'epígrafe', value: poema.epigrafe },
      { label: 'atribución', value: poema.atribucion }
    ];
  }

  if (scope === 'epigrafe') {
    return [{ label: 'epígrafe', value: poema.epigrafe }];
  }

  if (scope === 'estribillo') {
    return [{ label: 'estribillo', value: poema.estribillo_entero }];
  }

  return [
    { label: 'íncipit', value: poema.incipit },
    { label: 'segundo verso', value: poema.segundo_verso },
    { label: 'éxplicit', value: poema.explicit },
    { label: 'epígrafe', value: poema.epigrafe },
    { label: 'atribución', value: poema.atribucion },
    {
      label: 'íncipit de la primera estrofa de desarrollo',
      value: poema.incipit_desarrollo
    },
    {
      label: 'íncipit de la(s) composición(es) interna(s)/final(es)',
      value: poema.incipit_interno
    },
    { label: 'estribillo', value: poema.estribillo_entero },
    { label: 'transcripción', value: poema.transcripcion }
  ];
}

function fieldMatches(field: SearchField, query: string, mode: MatchMode) {
  const valueTokens = tokenizeSearchText(field.value);
  const queryTokens = tokenizeNormalizedText(query);

  if (valueTokens.length === 0 || queryTokens.length === 0) {
    return false;
  }

  if (mode === 'exacta') {
    return containsTokenSequence(valueTokens, queryTokens);
  }

  if (mode === 'todas') {
    return queryTokens.every((word) => valueTokens.includes(word));
  }

  return queryTokens.some((word) => valueTokens.includes(word));
}

function tokenizeSearchText(value: string) {
  return tokenizeNormalizedText(normalizeSearchText(value));
}

function tokenizeNormalizedText(value: string) {
  return value.split(' ').filter(Boolean);
}

function containsTokenSequence(tokens: string[], sequence: string[]) {
  if (sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((token, sequenceIndex) => tokens[index + sequenceIndex] === token)
  );
}

function compareFormas(a: string, b: string) {
  const cancionPriority = new Map([
    ['canción en arte menor', 'cancion-1'],
    ['canción petrarquista', 'cancion-2'],
    ['canción (otras formas)', 'cancion-3']
  ]);
  const aComparable = cancionPriority.get(a) ?? a;
  const bComparable = cancionPriority.get(b) ?? b;

  return aComparable.localeCompare(bComparable, 'es');
}
