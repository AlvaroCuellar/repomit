import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordCitation, citationSection } from '../src/lib/citations/index.ts';
import type { Poema, Testimonio } from '../src/lib/data/repomit.ts';

test('citation uses ficha responsibility, stable ID and revision rather than poem attribution', () => {
  const record = {
    id: 'stable-id',
    incipit: 'Un verso',
    item: 'RaC 263-1',
    autores_ficha: 'Molinaro, Antonietta',
    atribucion: 'Lope de Vega',
    fecha_revision: '24 de septiembre de 2026'
  } as Poema;
  const cite = recordCitation('poemas', record, 'https://example.org', '25 de septiembre de 2026');
  assert.match(cite, /^Molinaro, Antonietta\./);
  assert.ok(!cite.includes('Lope de Vega'));
  assert.ok(cite.includes('Ítem RaC 263-1.'));
  assert.ok(cite.includes('https://example.org/poemas/stable-id'));
  assert.ok(cite.includes('Última revisión: 24 de septiembre de 2026'));
  assert.ok(cite.includes('consulta: 25 de septiembre de 2026'));
  record.item = 'RaC corregida-1';
  assert.ok(
    recordCitation('poemas', record, 'https://example.org', 'hoy').includes('/poemas/stable-id')
  );
});

test('missing bibliographic data is omitted; editorial proposal is portable between domains', () => {
  const record = {
    id: 'ms-1',
    testimonio: 'RaC 263',
    ciudad: 'Rávena',
    institucion: 'Biblioteca Classense',
    signatura: '263',
    autores_ficha: '—'
  } as Testimonio;
  const cite = recordCitation('testimonios', record, 'https://example.org', 'hoy');
  assert.ok(cite.startsWith('«RaC 263: Rávena, Biblioteca Classense, 263»'));
  assert.ok(cite.includes('en Antonietta Molinaro (dir.)'));
  assert.ok(!cite.includes('Última revisión:'));
  const section = citationSection('https://nuevo.example');
  assert.equal(section.pagina, 'presentacion');
  assert.ok(section.texto.includes('https://nuevo.example/'));
  assert.ok(!section.texto.includes('repomit.vercel.app'));
});
