import type { Poema, Testimonio } from '$lib/data/repomit';

export type SearchScope = 'incipit' | 'verso' | 'item' | 'autor' | 'libre';
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

const STOP_WORDS = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'y'
]);

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
  return Array.from(new Set(poemas.map((poema) => poema.forma).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es')
  );
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
    .filter((field) => fieldMatches(field, query, mode, scope))
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
      { label: 'segundo verso', value: poema.search_verso || poema.segundo_verso },
      { label: 'éxplicit', value: poema.explicit },
      { label: 'epígrafe', value: poema.epigrafe },
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

  if (scope === 'item') {
    return [
      { label: 'ítem', value: poema.item },
      { label: 'ítem original', value: poema.item_original ?? '' }
    ];
  }

  if (scope === 'autor') {
    return [
      { label: 'atribución', value: poema.atribucion },
      { label: 'autor', value: poema.search_autor }
    ];
  }

  return [{ label: 'búsqueda libre', value: poema.search_general }];
}

function fieldMatches(field: SearchField, query: string, mode: MatchMode, scope: SearchScope) {
  const value = normalizeSearchText(field.value);

  if (!value) {
    return false;
  }

  if (scope === 'autor' && authorMatches(value, query, mode)) {
    return true;
  }

  if (mode === 'exacta') {
    return value.includes(query);
  }

  const words = query.split(' ').filter(Boolean);
  if (words.length === 0) {
    return false;
  }

  if (mode === 'todas') {
    return words.every((word) => value.includes(word));
  }

  return words.some((word) => value.includes(word));
}

function authorMatches(value: string, query: string, mode: MatchMode) {
  if (value.includes(query)) {
    return true;
  }

  const words = query.split(' ').filter(Boolean);
  const principalWords = query
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  const comparableWords = principalWords.length > 0 ? principalWords : words;

  if (mode === 'alguna') {
    return comparableWords.some((word) => value.includes(word));
  }

  return comparableWords.length > 0 && comparableWords.every((word) => value.includes(word));
}
