import ExcelJS from 'exceljs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excelDir = path.join(root, 'data', 'excel');
const generatedDir = path.join(root, 'data', 'generated');

const POEMA_FIELDS = [
  'incipit',
  'segundo_verso',
  'explicit',
  'testimonio',
  'orden',
  'folios',
  'epigrafe',
  'atribucion',
  'forma',
  'esquema_metrico',
  'estructura_cabeza',
  'incipit_desarrollo',
  'estructura_interna',
  'incipit_interno',
  'estribillo',
  'estribillo_entero',
  'autores_ficha',
  'transcripcion',
  'autores_transcripcion'
];

const TESTIMONIO_FIELDS = [
  'testimonio',
  'ciudad',
  'institucion',
  'signatura',
  'recopilador',
  'fecha',
  'contenido',
  'enlace',
  'bibliografia',
  'autores_ficha'
];

const POEMA_HTML_FIELDS = [
  'incipit',
  'segundo_verso',
  'explicit',
  'incipit_desarrollo',
  'incipit_interno',
  'estribillo_entero',
  'transcripcion'
];

const TESTIMONIO_HTML_FIELDS = ['contenido', 'bibliografia'];
const LONG_HTML_FIELDS = new Set([
  'contenido',
  'bibliografia',
  'incipit_interno',
  'estribillo_entero',
  'transcripcion'
]);

const diagnostics = {
  generated_at: new Date().toISOString(),
  input_dir: path.relative(root, excelDir),
  files: [],
  totals: {
    files_read: 0,
    files_ignored: 0,
    poemas: 0,
    testimonios: 0,
    rich_text_cells: 0,
    italic_runs: 0,
    html_fields: 0,
    controlled_blanks_normalized: 0
  },
  normalizations: [],
  canonicalizaciones: [],
  notes: []
};

await mkdir(generatedDir, { recursive: true });

const excelFiles = (await readdir(excelDir))
  .filter((filename) => filename.endsWith('.xlsx'))
  .filter((filename) => !filename.startsWith('~$'))
  .sort((a, b) => a.localeCompare(b, 'es'));

const poemas = [];
const testimoniosById = new Map();
const importedFiles = [];
const canonicalizationMap = new Map();

for (const filename of excelFiles) {
  const workbook = new ExcelJS.Workbook();
  const filepath = path.join(excelDir, filename);
  await workbook.xlsx.readFile(filepath);

  const fileDiagnostic = {
    file: path.relative(root, filepath),
    ignored: false,
    reason: '',
    sheets: workbook.worksheets.map((worksheet) => worksheet.name),
    detected_poemas_sheet: '',
    detected_testimonios_sheet: '',
    poemas: 0,
    testimonios: 0,
    skipped_poema_rows: 0,
    skipped_testimonio_rows: 0,
    rich_text_cells: 0,
    italic_runs: 0,
    notes: []
  };

  const sheets = detectSheets(workbook);
  fileDiagnostic.detected_poemas_sheet = sheets.poemas?.name ?? '';
  fileDiagnostic.detected_testimonios_sheet = sheets.testimonios?.name ?? '';

  if (!sheets.poemas || !sheets.testimonios) {
    fileDiagnostic.ignored = true;
    fileDiagnostic.reason = 'No se encontraron dos hojas utilizables.';
    diagnostics.files.push(fileDiagnostic);
    diagnostics.totals.files_ignored += 1;
    continue;
  }

  const poemRows = readSheetRows(sheets.poemas, POEMA_FIELDS, isRealPoemaRow);
  const testimonyRows = readSheetRows(sheets.testimonios, TESTIMONIO_FIELDS, isRealTestimonioRow);
  fileDiagnostic.skipped_poema_rows = poemRows.skippedRows;
  fileDiagnostic.skipped_testimonio_rows = testimonyRows.skippedRows;

  if (isTemplateWorkbook(filename) && poemRows.records.length === 0) {
    fileDiagnostic.ignored = true;
    fileDiagnostic.reason = 'Archivo modelo sin filas reales de poemas.';
    diagnostics.files.push(fileDiagnostic);
    diagnostics.totals.files_ignored += 1;
    continue;
  }

  if (poemRows.records.length === 0 && testimonyRows.records.length === 0) {
    fileDiagnostic.ignored = true;
    fileDiagnostic.reason = 'Libro sin filas reales de poemas ni testimonios.';
    diagnostics.files.push(fileDiagnostic);
    diagnostics.totals.files_ignored += 1;
    continue;
  }

  for (const row of testimonyRows.records) {
    const testimonio = buildTestimonio(row, filename);
    if (!testimoniosById.has(testimonio.id)) {
      testimoniosById.set(testimonio.id, testimonio);
      fileDiagnostic.testimonios += 1;
    } else {
      fileDiagnostic.notes.push(`Testimonio duplicado omitido en importacion: ${testimonio.id}`);
    }
    fileDiagnostic.rich_text_cells += row.richTextCells;
    fileDiagnostic.italic_runs += row.italicRuns;
  }

  for (const row of poemRows.records) {
    fileDiagnostic.poemas += 1;
    fileDiagnostic.rich_text_cells += row.richTextCells;
    fileDiagnostic.italic_runs += row.italicRuns;
  }

  importedFiles.push({
    filename,
    poemRows: poemRows.records
  });

  diagnostics.files.push(fileDiagnostic);
  diagnostics.totals.files_read += 1;
  diagnostics.totals.poemas += fileDiagnostic.poemas;
  diagnostics.totals.testimonios += fileDiagnostic.testimonios;
  diagnostics.totals.rich_text_cells += fileDiagnostic.rich_text_cells;
  diagnostics.totals.italic_runs += fileDiagnostic.italic_runs;
}

for (const importedFile of importedFiles) {
  for (const row of importedFile.poemRows) {
    poemas.push(buildPoema(row, importedFile.filename, testimoniosById));
  }
}

const testimonios = Array.from(testimoniosById.values()).sort((a, b) =>
  a.id.localeCompare(b.id, 'es')
);
poemas.sort((a, b) => a.id.localeCompare(b.id, 'es'));
diagnostics.canonicalizaciones = Array.from(canonicalizationMap.values()).sort((a, b) =>
  `${a.campo}:${a.de}`.localeCompare(`${b.campo}:${b.de}`, 'es')
);

diagnostics.totals.html_fields = poemas.reduce((count, poema) => count + countHtmlFields(poema), 0);
diagnostics.totals.html_fields += testimonios.reduce(
  (count, testimonio) => count + countHtmlFields(testimonio),
  0
);

if (diagnostics.totals.rich_text_cells === 0) {
  diagnostics.notes.push(
    'No se detectaron celdas richText en los Excel leidos; las variantes HTML se generaron desde texto plano.'
  );
}

await writeJson('poemas.json', poemas);
await writeJson('testimonios.json', testimonios);
await writeJson('diagnostico.json', diagnostics);

console.log(
  `Datos RePoMIt generados: ${poemas.length} poemas, ${testimonios.length} testimonios, ${diagnostics.totals.files_read} Excel leidos.`
);

function detectSheets(workbook) {
  const worksheets = workbook.worksheets;
  const byNamePoemas = worksheets.find((worksheet) => normalizeSearch(worksheet.name).includes('poema'));
  const byNameTestimonios = worksheets.find((worksheet) =>
    normalizeSearch(worksheet.name).includes('testimonio')
  );

  if (byNamePoemas && byNameTestimonios && byNamePoemas.id !== byNameTestimonios.id) {
    return { poemas: byNamePoemas, testimonios: byNameTestimonios };
  }

  const scored = worksheets.map((worksheet) => ({
    worksheet,
    poemScore: scoreHeader(worksheet, ['incipit', 'segundo', 'explicit', 'testimonio', 'orden']),
    testimonyScore: scoreHeader(worksheet, ['testimonio', 'ciudad', 'institucion', 'signatura'])
  }));

  const poemas = scored.toSorted((a, b) => b.poemScore - a.poemScore)[0]?.worksheet;
  const testimonios = scored
    .filter((entry) => entry.worksheet.id !== poemas?.id)
    .toSorted((a, b) => b.testimonyScore - a.testimonyScore)[0]?.worksheet;

  if (poemas && testimonios) {
    const poemScore = scored.find((entry) => entry.worksheet.id === poemas.id)?.poemScore ?? 0;
    const testimonyScore =
      scored.find((entry) => entry.worksheet.id === testimonios.id)?.testimonyScore ?? 0;
    if (poemScore >= 2 && testimonyScore >= 2) {
      return { poemas, testimonios };
    }
  }

  return {
    poemas: worksheets[0],
    testimonios: worksheets[1]
  };
}

function scoreHeader(worksheet, tokens) {
  const firstRows = [1, 2, 3].flatMap((rowNumber) =>
    worksheet
      .getRow(rowNumber)
      .values.slice(1)
      .map((value) => normalizeSearch(cellValueToText(value)))
  );

  return tokens.reduce(
    (score, token) => score + (firstRows.some((value) => value.includes(token)) ? 1 : 0),
    0
  );
}

function readSheetRows(worksheet, fields, isRealRow) {
  const records = [];
  let skippedRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = fields.map((field, index) => {
      const cell = row.getCell(index + 1);
      return readCell(cell, field);
    });

    if (isHeaderRow(values, fields)) {
      skippedRows += 1;
      return;
    }

    const record = Object.fromEntries(fields.map((field, index) => [field, values[index].text]));
    const html = Object.fromEntries(fields.map((field, index) => [field, values[index].html]));
    const richTextCells = values.filter((value) => value.richText).length;
    const italicRuns = values.reduce((count, value) => count + value.italicRuns, 0);

    if (!isRealRow(record)) {
      skippedRows += 1;
      return;
    }

    records.push({ record, html, rowNumber, richTextCells, italicRuns });
  });

  return { records, skippedRows };
}

function buildPoema(row, sourceFile, canonicalTestimonios) {
  const record = normalizeRecord(row.record);
  normalizeControlledFields(record, row, sourceFile);
  const testimonioOriginal = record.testimonio;
  const testimonioId = technicalId(testimonioOriginal);
  const testimonioCanonico = canonicalTestimonios.get(testimonioId)?.testimonio;
  const testimonioVisible = testimonioCanonico || testimonioOriginal;
  const orden = normalizeOrder(record.orden);
  const id = `${testimonioId || 'sin-testimonio'}-${padOrder(orden)}`;
  const itemOriginal = [testimonioOriginal, orden].filter(Boolean).join('-');
  const item = [testimonioVisible, orden].filter(Boolean).join('-');

  record.testimonio_original = testimonioOriginal;
  record.testimonio = testimonioVisible;

  if (testimonioOriginal && testimonioVisible && testimonioOriginal !== testimonioVisible) {
    recordCanonicalization({
      campo: 'testimonio',
      de: testimonioOriginal,
      a: testimonioVisible,
      ejemplo_item_original: itemOriginal,
      ejemplo_item_canonico: item
    });
  }

  const poema = {
    id,
    item,
    title: record.incipit,
    testimonio_id: testimonioId,
    source_file: sourceFile,
    source_row: row.rowNumber,
    ...record,
    search_incipit: normalizeSearch(record.incipit),
    search_verso: normalizeSearch(record.segundo_verso),
    search_autor: normalizeSearch(
      [record.atribucion, record.autores_ficha, record.autores_transcripcion].join(' ')
    ),
    search_general: normalizeSearch(Object.values(record).join(' ')),
    sort_incipit: normalizeSearch(record.incipit)
  };

  if (itemOriginal && itemOriginal !== item) {
    poema.item_original = itemOriginal;
  }

  for (const field of POEMA_HTML_FIELDS) {
    poema[`${field}_html`] = row.html[field];
  }

  return poema;
}

function recordCanonicalization({ campo, de, a, ejemplo_item_original, ejemplo_item_canonico }) {
  const key = `${campo}\u0000${de}\u0000${a}`;

  if (!canonicalizationMap.has(key)) {
    canonicalizationMap.set(key, {
      campo,
      de,
      a,
      poemas_afectados: 0,
      ejemplo_item_original,
      ejemplo_item_canonico
    });
  }

  canonicalizationMap.get(key).poemas_afectados += 1;
}

function buildTestimonio(row, sourceFile) {
  const record = normalizeRecord(row.record);
  const id = technicalId(record.testimonio);
  const testimonio = {
    id,
    source_file: sourceFile,
    source_row: row.rowNumber,
    ...record
  };

  for (const field of TESTIMONIO_HTML_FIELDS) {
    testimonio[`${field}_html`] = row.html[field];
  }

  return testimonio;
}

function readCell(cell, field) {
  const text = cellToText(cell);
  const html = cellToHtml(cell, field);
  const richText = Array.isArray(cell.value?.richText);
  const italicRuns = richText ? cell.value.richText.filter((part) => part.font?.italic).length : 0;
  return { text, html, richText, italicRuns };
}

function cellToText(cell) {
  return cleanText(cellValueToText(cell.value));
}

function cellToHtml(cell, field) {
  const value = cell.value;
  if (Array.isArray(value?.richText)) {
    const html = value.richText
      .map((part) => {
        const escaped = escapeHtml(part.text ?? '');
        return part.font?.italic ? `<em>${escaped}</em>` : escaped;
      })
      .join('');
    return applyLongFieldBreaks(cleanHtmlText(html), field);
  }

  return applyLongFieldBreaks(escapeHtml(cellToText(cell)), field);
}

function cellValueToText(value) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? '').join('');
  }

  if ('result' in value) {
    return cellValueToText(value.result);
  }

  if ('text' in value) {
    return cellValueToText(value.text);
  }

  if ('hyperlink' in value) {
    return cellValueToText(value.hyperlink);
  }

  return String(value);
}

function normalizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([field, value]) => [field, cleanText(value)])
  );
}

function normalizeControlledFields(record, row, sourceFile) {
  for (const field of ['estructura_cabeza', 'estructura_interna', 'estribillo']) {
    if (record[field] === '') {
      record[field] = '—';
      diagnostics.totals.controlled_blanks_normalized += 1;
      diagnostics.normalizations.push({
        file: sourceFile,
        row: row.rowNumber,
        item: [record.testimonio, normalizeOrder(record.orden)].filter(Boolean).join('-'),
        field,
        from: '',
        to: '—'
      });
    }
  }
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\]/g, ']')
    .trim();
}

function cleanHtmlText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\]/g, ']')
    .trim();
}

function normalizeSearch(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function technicalId(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeOrder(value) {
  const text = cleanText(value);
  const number = Number(text);
  return Number.isInteger(number) ? String(number) : text;
}

function padOrder(value) {
  const text = cleanText(value);
  const number = Number(text);
  return Number.isInteger(number) ? String(number).padStart(3, '0') : technicalId(text || 'sin-orden');
}

function isHeaderRow(values, fields) {
  const normalized = values.map((value) => normalizeSearch(value.text));
  const expected = fields.map((field) => normalizeSearch(field.replaceAll('_', ' ')));

  if (normalized[0] === expected[0]) {
    return true;
  }

  return normalized.filter(Boolean).some((value) => {
    return (
      value.includes('incipit') ||
      value.includes('explicit') ||
      value.includes('segundo verso') ||
      value.includes('ciudad') ||
      value.includes('institucion') ||
      value.includes('signatura')
    );
  });
}

function isRealPoemaRow(record) {
  return Object.entries(record).some(([field, value]) => field !== 'orden' && cleanText(value) !== '');
}

function isRealTestimonioRow(record) {
  return Object.values(record).some((value) => cleanText(value) !== '');
}

function isTemplateWorkbook(filename) {
  const normalized = normalizeSearch(filename);
  return (
    normalized.includes('modelo') ||
    normalized.includes('excel para fichar') ||
    normalized.includes('plantilla')
  );
}

function applyLongFieldBreaks(value, field) {
  if (!LONG_HTML_FIELDS.has(field)) {
    return value;
  }

  return value.replace(/(?<!<)\s*\/\s*/g, '<br>').replace(/\s*\|\s*/g, '<br><br>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countHtmlFields(record) {
  return Object.keys(record).filter((field) => field.endsWith('_html') && record[field]).length;
}

async function writeJson(filename, data) {
  await writeFile(path.join(generatedDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}
