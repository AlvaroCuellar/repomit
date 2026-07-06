import ExcelJS from 'exceljs';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadLocalEnv();

const excelDir = path.join(root, 'data', 'excel');
const generatedDir = path.join(root, 'data', 'generated');
const LAST_REVIEW_DATE = '6 de julio de 2026';
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID?.trim();
const GOOGLE_SHEETS_BASE_URL = GOOGLE_SHEETS_ID
  ? `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv`
  : '';

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
  'esquema_metrico',
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
  data_source: GOOGLE_SHEETS_ID ? 'google_sheets' : 'excel',
  input_dir: GOOGLE_SHEETS_ID ? `Google Sheets: ${GOOGLE_SHEETS_ID}` : path.relative(root, excelDir),
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

const poemas = [];
const testimoniosById = new Map();
const testimoniosBySourceFile = new Map();
const importedFiles = [];
const canonicalizationMap = new Map();

if (GOOGLE_SHEETS_ID) {
  await importGoogleSheets(GOOGLE_SHEETS_ID);
} else {
  await importExcelFiles();
}

const site = GOOGLE_SHEETS_ID
  ? await buildSiteContentFromGoogleSheets().catch((error) => {
      diagnostics.notes.push(
        `No se pudo leer la pestaña "Contenido web"; se usan textos locales: ${error.message}`
      );
      return getDefaultSiteContent();
    })
  : getDefaultSiteContent();

for (const importedFile of importedFiles) {
  for (const row of importedFile.poemRows) {
    poemas.push(buildPoema(row, importedFile.filename, testimoniosById, testimoniosBySourceFile));
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
    GOOGLE_SHEETS_ID
      ? 'Los datos proceden de Google Sheets CSV; las cursivas deben marcarse manualmente con *asteriscos*.'
      : 'No se detectaron celdas richText en los Excel leidos; las variantes HTML se generaron desde texto plano.'
  );
}

await writeJson('poemas.json', poemas);
await writeJson('testimonios.json', testimonios);
await writeJson('site.json', site);
await writeJson('diagnostico.json', diagnostics);

console.log(
  `Datos RePoMIt generados: ${poemas.length} poemas, ${testimonios.length} testimonios, ${diagnostics.totals.files_read} fuente(s) leidas.`
);

async function importExcelFiles() {
  const excelFiles = (await readdir(excelDir))
    .filter((filename) => filename.endsWith('.xlsx'))
    .filter((filename) => !filename.startsWith('~$'))
    .sort((a, b) => a.localeCompare(b, 'es'));

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

  const fileTestimonios = [];

  for (const row of testimonyRows.records) {
    const testimonio = buildTestimonio(row, filename);
    fileTestimonios.push(testimonio);
    if (!testimoniosById.has(testimonio.id)) {
      testimoniosById.set(testimonio.id, testimonio);
      fileDiagnostic.testimonios += 1;
    } else {
      fileDiagnostic.notes.push(`Testimonio duplicado omitido en importacion: ${testimonio.id}`);
    }
    fileDiagnostic.rich_text_cells += row.richTextCells;
    fileDiagnostic.italic_runs += row.italicRuns;
  }

  testimoniosBySourceFile.set(filename, fileTestimonios);

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
}

function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const filepath = path.join(root, filename);
    if (!existsSync(filepath)) {
      continue;
    }

    for (const line of readFileSync(filepath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function importGoogleSheets(sheetId) {
  const [poemTable, testimonyTable] = await Promise.all([
    fetchGoogleSheetCsv(sheetId, 'Poemas'),
    fetchGoogleSheetCsv(sheetId, 'Testimonios')
  ]);

  const sourceFile = `Google Sheets ${sheetId}`;
  const fileDiagnostic = {
    file: sourceFile,
    ignored: false,
    reason: '',
    sheets: ['Poemas', 'Testimonios'],
    detected_poemas_sheet: 'Poemas',
    detected_testimonios_sheet: 'Testimonios',
    poemas: 0,
    testimonios: 0,
    skipped_poema_rows: 0,
    skipped_testimonio_rows: 0,
    rich_text_cells: 0,
    italic_runs: 0,
    notes: []
  };

  const poemRows = readTableRows(poemTable, POEMA_FIELDS, isRealPoemaRow);
  const testimonyRows = readTableRows(testimonyTable, TESTIMONIO_FIELDS, isRealTestimonioRow);
  fileDiagnostic.skipped_poema_rows = poemRows.skippedRows;
  fileDiagnostic.skipped_testimonio_rows = testimonyRows.skippedRows;

  const fileTestimonios = [];

  for (const row of testimonyRows.records) {
    const testimonio = buildTestimonio(row, sourceFile);
    fileTestimonios.push(testimonio);
    if (!testimoniosById.has(testimonio.id)) {
      testimoniosById.set(testimonio.id, testimonio);
      fileDiagnostic.testimonios += 1;
    } else {
      fileDiagnostic.notes.push(`Testimonio duplicado omitido en importacion: ${testimonio.id}`);
    }
  }

  testimoniosBySourceFile.set(sourceFile, fileTestimonios);

  for (const row of poemRows.records) {
    fileDiagnostic.poemas += 1;
  }

  importedFiles.push({
    filename: sourceFile,
    poemRows: poemRows.records
  });

  diagnostics.files.push(fileDiagnostic);
  diagnostics.totals.files_read += 1;
  diagnostics.totals.poemas += fileDiagnostic.poemas;
  diagnostics.totals.testimonios += fileDiagnostic.testimonios;
}

async function fetchGoogleSheetCsv(sheetId, sheetName) {
  const url = `${GOOGLE_SHEETS_BASE_URL}&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo leer "${sheetName}" desde Google Sheets (${response.status}).`);
  }

  const csv = await response.text();

  if (/^<!doctype html>|^<html/i.test(csv.trim())) {
    throw new Error(
      `Google Sheets devolvio HTML para "${sheetName}". Comparte la hoja o publicala para que Vercel pueda leerla.`
    );
  }

  return parseCsv(csv).filter((row) => row.some((cell) => cleanText(cell) !== ''));
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);

  return rows;
}

function readTableRows(table, fields, isRealRow) {
  const records = [];
  let skippedRows = 0;

  table.forEach((rawRow, rowIndex) => {
    const values = fields.map((field, index) => readPlainCell(rawRow[index], field));

    if (isHeaderRow(values, fields)) {
      skippedRows += 1;
      return;
    }

    const record = Object.fromEntries(fields.map((field, index) => [field, values[index].text]));
    const html = Object.fromEntries(fields.map((field, index) => [field, values[index].html]));

    if (!isRealRow(record)) {
      skippedRows += 1;
      return;
    }

    records.push({
      record,
      html,
      rowNumber: rowIndex + 1,
      richTextCells: 0,
      italicRuns: 0
    });
  });

  return { records, skippedRows };
}

function readPlainCell(value, field) {
  const text = cleanText(value);
  const html = applyLongFieldBreaks(formatInlineHtml(text), field);
  const italicRuns = (text.match(/\*[^*]+\*/g) ?? []).length;
  return { text: stripInlineMarkers(text), html, richText: false, italicRuns };
}

async function buildSiteContentFromGoogleSheets() {
  const table = await fetchGoogleSheetCsv(GOOGLE_SHEETS_ID, 'Contenido web');
  const [headerRow, ...rows] = table;
  const header = headerRow.map((cell) => technicalId(cell).replaceAll('-', '_'));
  const records = rows
    .map((row) =>
      Object.fromEntries(header.map((field, index) => [field, cleanText(row[index] ?? '')]))
    )
    .filter((row) => row.pagina && row.seccion && row.texto);

  if (records.length === 0) {
    return getDefaultSiteContent();
  }

  return mergeSiteContent(getDefaultSiteContent(), records);
}

function mergeSiteContent(defaults, records) {
  const siteContent = structuredClone(defaults);
  const pageRecords = groupBy(records, (record) => normalizeSearch(record.pagina));

  for (const [page, entries] of pageRecords.entries()) {
    const sorted = entries.toSorted((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

    if (page === 'home') {
      siteContent.home.intro = sorted
        .filter((record) => normalizeSearch(record.seccion) === 'intro')
        .map((record) => formatInlineHtml(record.texto));
      continue;
    }

    if (page === 'manuscritos') {
      for (const record of sorted) {
        const section = normalizeSearch(record.seccion);
        if (section === 'intro') {
          siteContent.manuscritos.intro = formatInlineHtml(record.texto);
        } else if (section === 'mapa titulo') {
          siteContent.manuscritos.mapTitle = stripInlineMarkers(record.texto);
        } else if (section === 'mapa texto') {
          siteContent.manuscritos.mapDescription = formatInlineHtml(record.texto);
        }
      }
      continue;
    }

    if (page === 'presentacion' || page === 'criterios') {
      siteContent[page] = buildPageSections(sorted);
    }
  }

  return siteContent;
}

function buildPageSections(records) {
  const bySection = groupBy(records, (record) => record.seccion);
  return Array.from(bySection.entries()).map(([sectionKey, entries]) => {
    const first = entries[0];
    return {
      key: technicalId(sectionKey),
      title: first.titulo || first.seccion,
      paragraphs: entries
        .toSorted((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
        .map((entry) => formatInlineHtml(entry.texto))
    };
  });
}

function groupBy(records, getKey) {
  const groups = new Map();

  for (const record of records) {
    const key = getKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return groups;
}

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

function buildPoema(row, sourceFile, canonicalTestimonios, sourceFileTestimonios) {
  const record = normalizeRecord(row.record);
  normalizePoemaFields(record, row, sourceFile);
  const testimonioOriginal = record.testimonio;
  const testimonioOriginalId = technicalId(testimonioOriginal);
  const fallbackTestimonio = getSingleSourceTestimonio(sourceFile, sourceFileTestimonios);
  const testimonioCanonico =
    canonicalTestimonios.get(testimonioOriginalId)?.testimonio ?? fallbackTestimonio?.testimonio;
  const testimonioId =
    canonicalTestimonios.has(testimonioOriginalId) || !fallbackTestimonio
      ? testimonioOriginalId
      : fallbackTestimonio.id;
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
    fecha_revision: LAST_REVIEW_DATE,
    source_file: sourceFile,
    source_row: row.rowNumber,
    ...record,
    search_incipit: normalizeSearch(record.incipit),
    search_verso: normalizeSearch(
      [
        record.incipit,
        record.segundo_verso,
        record.explicit,
        record.incipit_desarrollo,
        record.incipit_interno,
        record.estribillo_entero,
        record.transcripcion
      ].join(' ')
    ),
    search_autor: normalizeSearch([record.epigrafe, record.atribucion].join(' ')),
    search_epigrafe: normalizeSearch(record.epigrafe),
    search_estribillo: normalizeSearch(record.estribillo_entero),
    search_general: normalizeSearch(
      [
        record.incipit,
        record.segundo_verso,
        record.explicit,
        record.epigrafe,
        record.atribucion,
        record.incipit_desarrollo,
        record.incipit_interno,
        record.estribillo_entero,
        record.transcripcion
      ].join(' ')
    ),
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

function getSingleSourceTestimonio(sourceFile, sourceFileTestimonios) {
  const testimonios = sourceFileTestimonios.get(sourceFile) ?? [];
  return testimonios.length === 1 ? testimonios[0] : undefined;
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
    fecha_revision: LAST_REVIEW_DATE,
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
  const text = cellToText(cell, field);
  const html = cellToHtml(cell, field);
  const richText = Array.isArray(cell.value?.richText);
  const italicRuns = richText ? cell.value.richText.filter((part) => part.font?.italic).length : 0;
  return { text, html, richText, italicRuns };
}

function cellToText(cell, field) {
  return cleanText(cellValueToText(cell.value, field, cell));
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

  return applyLongFieldBreaks(escapeHtml(cellToText(cell, field)), field);
}

function cellValueToText(value, field, cell) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    if (field === 'folios') {
      return formatFolioDate(value, cell?.numFmt);
    }

    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? '').join('');
  }

  if ('result' in value) {
    return cellValueToText(value.result, field, cell);
  }

  if ('text' in value) {
    return cellValueToText(value.text, field, cell);
  }

  if ('hyperlink' in value) {
    return cellValueToText(value.hyperlink, field, cell);
  }

  return String(value);
}

function formatFolioDate(value, numFmt = '') {
  const day = value.getUTCDate();
  const month = value.getUTCMonth() + 1;
  const year = value.getUTCFullYear();
  const normalizedFormat = normalizeSearch(numFmt);

  if (normalizedFormat.includes('mmm') && normalizedFormat.includes('yy')) {
    return `${month}-${String(year).slice(-2)}`;
  }

  return `${day}-${month}`;
}

function normalizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([field, value]) => [field, cleanText(value)])
  );
}

function normalizePoemaFields(record, row, sourceFile) {
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

  normalizeForma(record, row, sourceFile);
}

function normalizeForma(record, row, sourceFile) {
  const normalizedForma = normalizeSearch(record.forma);
  const formNormalizations = new Map([
    ['cancion', 'canción (otras formas)'],
    ['cancion an arte menor', 'canción en arte menor']
  ]);
  const normalizedValue = formNormalizations.get(normalizedForma);

  if (!normalizedValue || record.forma === normalizedValue) {
    return;
  }

  diagnostics.normalizations.push({
    file: sourceFile,
    row: row.rowNumber,
    item: [record.testimonio, normalizeOrder(record.orden)].filter(Boolean).join('-'),
    field: 'forma',
    from: record.forma,
    to: normalizedValue
  });
  record.forma = normalizedValue;
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

  const matchingHeaderCells = normalized.filter((value) =>
    expected.some(
      (header) => header && (value === header || value.startsWith(`${header} `) || value.includes(header))
    )
  );

  return matchingHeaderCells.length >= 2;
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

  return value.replace(/(?<!<)\s*\/\s*/g, '<br>').replace(/\s*[|ǀ]\s*/g, '<br><br>');
}

function formatInlineHtml(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = sanitizeHref(href);
      return safeHref ? `<a href="${safeHref}">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function stripInlineMarkers(value) {
  return String(value ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHref(value) {
  const href = String(value ?? '').trim();
  if (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) {
    return href;
  }
  return '';
}

function countHtmlFields(record) {
  return Object.keys(record).filter((field) => field.endsWith('_html') && record[field]).length;
}

async function writeJson(filename, data) {
  await writeFile(path.join(generatedDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}

function getDefaultSiteContent() {
  return {
  home: {
    intro: [
      'RePoMIt es un repertorio digital dedicado a la poesía en castellano de los siglos XVI y XVII copiada en manuscritos que se custodian en Italia.',
      'Se ha desarrollado en el marco del proyecto didáctico <em>Corre manuscrita (en Italia): Fuentes, métodos y herramientas para el estudio de la poesía áurea</em> (proyectos Fu.His.It. 2026), coordinado por Antonietta Molinaro, Università eCampus, con la participación de Álvaro Cuéllar, Universitat Autònoma de Barcelona y con el patrocinio del Instituto Cervantes, de las asociaciones AISPI y AISI y de la Università eCampus (Italia).',
      'El repertorio trabaja con testimonios completos: las composiciones se ordenan según su posición topográfica en cada manuscrito y se identifican mediante un ítem formado por el testimonio y el orden progresivo que la composición ocupa en él.',
      'La aplicación permite consultar fichas de poemas y testimonios, así como recorrer el repertorio por orden alfabético.'
    ]
  },
  manuscritos: {
    intro:
      'Esta sección reúne los testimonios manuscritos actualmente incorporados a RePoMIt. Cada ficha incluye los datos codicológicos y bibliográficos disponibles, así como el listado de composiciones catalogadas.',
    mapTitle: 'Custodia de los manuscritos',
    mapDescription:
      'Localización de las bibliotecas e instituciones que conservan los manuscritos catalogados.'
  },
  presentacion: [
    {
      key: 'que-es-repomit',
      title: 'Qué es RePoMIt',
      paragraphs: [
        'RePoMIt, <em>Repertorio de la poesía en castellano en manuscritos italianos</em>, es un repertorio digital dedicado a la catalogación de las composiciones poéticas en castellano de los siglos XVI y XVII conservadas en manuscritos que se compusieron y/o circularon en Italia durante el reino de los Austrias o, en menor medida, que llegaron a Italia por sucesivos desplazamientos y/o adquisiciones.',
        'Su contenido y su infraestructura digital se actualizan a medida que se incorporan nuevos testimonios.'
      ]
    },
    {
      key: 'origen-del-proyecto',
      title: 'Origen del proyecto',
      paragraphs: [
        'El repertorio se diseñó y desarrolló en el marco del proyecto didáctico <em>Corre manuscrita (en Italia): Fuentes, métodos y herramientas para el estudio de la poesía áurea</em> (proyectos Fu.His.It. 2026) coordinado por Antonietta Molinaro (Università eCampus), con la participación de Álvaro Cuéllar (Universitat Autònoma de Barcelona).',
        'El proyecto didáctico, en forma de seminario, se dirigió a los estudiantes de Máster y Doctorado en universidades italianas durante el año académico 2025/2026. Vio la participación de 20 asistentes, quienes contribuyeron a catalogar el primer núcleo de seis testimonios manuscritos, custodiados en distintas bibliotecas italianas.'
      ]
    },
    {
      key: 'objetivos',
      title: 'Objetivos',
      paragraphs: [
        'El objetivo principal de RePoMIt es ofrecer una vía de acceso ordenada y verificable a los testimonios manuscritos italianos que transmiten poesía en castellano de los Siglos de Oro. A cada poema le corresponde una ficha en la que se proporcionan datos textuales y bibliográficos esenciales y, en algunos casos, la transcripción completa del texto.',
        'En su primera fase de desarrollo, RePoMIt privilegia la catalogación de testimonios manuscritos que se custodien en bibliotecas de las que todavía no existen catálogos completos del patrimonio manuscrito. Sin embargo, por incluir más datos que un repertorio tradicional, está abierto a acoger también testimonios que proceden de bibliotecas ya catalogadas.'
      ]
    },
    {
      key: 'equipo-y-colaboraciones',
      title: 'Equipo y colaboraciones',
      paragraphs: [
        'La dirección científica corresponde a Antonietta Molinaro, Università eCampus.',
        'El desarrollo digital está a cargo de Álvaro Cuéllar, Universitat Autònoma de Barcelona.',
        'El proyecto cuenta con el patrocinio del Instituto Cervantes, de las Asociaciones AISPI y AISI y de la Università eCampus.',
        'Todas las fichas presentan la información de los responsables de su creación, implementación y revisión.'
      ]
    },
    {
      key: 'como-consultar-el-repertorio',
      title: 'Cómo consultar el repertorio',
      paragraphs: [
        'El usuario puede consultar el repertorio alfabético, acceder a las fichas de los manuscritos catalogados o utilizar la búsqueda por íncipit, verso, epígrafe, estribillo, autor y texto libre.',
        'La grafía de los poemas, salvo excepciones justificadas, sigue las normas ortográficas actuales. La búsqueda ignora puntuación, mayúsculas y tildes.',
        'También se pueden seleccionar los poemas catalogados conforme a su forma métrico-poética.',
        'Para una consulta más eficaz y provechosa del repertorio, se invitan los usuarios a consultar los <a href="/criterios">Criterios de catalogación</a>.'
      ]
    },
    {
      key: 'como-participar',
      title: 'Cómo participar',
      paragraphs: [
        'Toda la comunidad académica puede colaborar en la implementación y revisión del repertorio.',
        'Las colaboraciones pueden orientarse a la identificación y/o catalogación de nuevos testimonios, revisión de fichas existentes, control de atribuciones, incremento de datos bibliográficos, transcripciones de textos puntuales.',
        'Para participar, contacten con: <a href="mailto:antonietta.molinaro@uniecampus.it">antonietta.molinaro@uniecampus.it</a>.'
      ]
    },
    {
      key: 'como-senalar-errores-o-sugerencias',
      title: 'Cómo señalar errores o sugerencias',
      paragraphs: [
        'Para señalar errores o sugerencias, se invita a enviar un correo a: <a href="mailto:antonietta.molinaro@uniecampus.it">antonietta.molinaro@uniecampus.it</a>.',
        'Las correcciones y sugerencias deberán indicar, siempre que sea posible, el ítem afectado y la fuente que justifica la modificación.'
      ]
    }
  ],
  criterios: [
    {
      key: 'unidad-de-catalogacion',
      title: 'Unidad de catalogación',
      paragraphs: [
        'RePoMIt trabaja siempre con testimonios manuscritos completos. La catalogación no parte de poemas aislados, sino de la secuencia de composiciones transmitida por cada manuscrito. Sin embargo, en caso de florilegios plurilingüe, la catalogación se limita a los poemas en idioma castellano y a los poemas plurilingües entre cuyos idiomas se incluya el castellano.'
      ]
    },
    {
      key: 'el-item',
      title: 'El ítem',
      paragraphs: [
        'El ítem o código identificativo de cada composición catalogada se forma mediante la sigla del testimonio y el orden topográfico de la composición dentro del manuscrito. Este criterio permite conservar la relación entre la ficha poética y la estructura dispositiva del testimonio.',
        'La sigla de cada testimonio es el resultado de la unión de los datos siguientes: Ciudad (primeras dos letras), Biblioteca u otra institución (primera letra), Fondo (primera letra), Signatura.'
      ]
    },
    {
      key: 'campos-de-la-ficha',
      title: 'Campos de la ficha',
      paragraphs: [
        'Las fichas de los poemas recogen los siguientes datos: <strong>Íncipit</strong>, <strong>Segundo verso</strong>, <strong>Éxplicit</strong>, <strong>Testimonio</strong> (incluidos el orden topográfico y los folios/páginas que ocupa en él; si se trata de folios, se incluye también la indicación del recto/verso), <strong>Epígrafe</strong>, <strong>Atribución</strong> (declarada en el testimonio o reconstruida por los estudios críticos y/o por otras fuentes documentales), <strong>Forma métrico-poética</strong>, <strong>Esquema métrico</strong>, <strong>Estructura</strong> (estrofas de desarrollo a partir de una letra/mote inicial, composiciones internas y/o finales, estribillos), <strong>Transcripción</strong> del texto de la composición y <strong>Responsabilidad de la ficha</strong>.',
        'Las fichas de los testimonios incluyen los siguientes datos: <strong>Ciudad</strong>, <strong>Institución</strong>, <strong>Signatura</strong>, <strong>Recopilador</strong>, <strong>Fecha</strong>, <strong>Contenido</strong> y <strong>Bibliografía</strong>.',
        'Lo que aparece entre corchetes [ ] procede de una conjetura del responsable de la ficha o de la bibliografía consultada y mencionada en la ficha del testimonio al que se corresponde la composición.',
        'El campo de la Transcripción es facultativo, menos en los casos en los que el texto catalogado presente variación textual en el propio testimonio que se está catalogando. En este caso, los otros campos del repertorio acogen la versión textual definitiva mientras que la transcripción se configura como el lugar en el que se da cuenta de las distintas fases de escritura y corrección/cambio.'
      ]
    },
    {
      key: 'opciones-de-busqueda',
      title: 'Opciones de búsqueda',
      paragraphs: [
        'La búsqueda ignora puntuación, mayúsculas y tildes. Esto permite localizar variantes gráficas de un mismo verso sin exigir coincidencia literal estricta.',
        'La grafía de los poemas, salvo excepciones justificadas (ej. italianismos y lusitanismos que, por distintos motivos, no se pueden remitir al término castellano correspondiente), sigue las normas ortográficas actuales.',
        'La búsqueda por Íncipit consulta tres campos: el íncipit de la composición y, cuando constan, también el íncipit de la primera estrofa de desarrollo y el de eventuales composiciones internas y/o finales.',
        'La sección relativa a la forma métrico-poética se basa en el uso de un vocabulario controlado que trata de contrarrestar la significativa variabilidad taxonómica de la poesía de los Siglos de Oro y su excepcional oscilación en la denominación de las formas. Por tanto, las formas catalogadas se reducen a las siguientes (en orden alfabético): Canción en arte menor (incluye todas las formas de canción en octosílabos u otros versos de arte menor; ej. redondillas, quintillas, copla real, canción trovadoresca, décima espinela, etc. NB no incluye las glosas); Canción en arte mayor; Canción petrarquista (incluye todas las formas de canciones en las que se alternan endecasílabos y heptasílabos; ej. cuarteto-lira, lira garcilasiana, lira-sextina/sexteto-lira, canción pindárica); Canción (otras formas) (para las composiciones que no se pueden adscribir a los casos detallados supra: ej. las canciones en cuartetos de endecasílabos, las canzonette chiabresche, etc.); Estribote; glosa (incluye todas las formas métricas en las que se puede desarrollar una glosa); Letra/Mote (se utilizará solo en los casos en los que la composición no tiene desarrollo estrófico; si lo tiene se utilizará la forma más adecuada entre: canción en arte menor, villancico, glosa); Madrigal; Octava real; Ovillejo; Pareados; Polimetría (incluye ensaladas y composiciones que tienen un esquema métrico variable que no se puede remitir a una estructura métrica; NB no incluye los romances y romancillos con desfecha final); Sextina; Soneto; Silva; Tercetos encadenados; Romance; Romancillo (tanto heptasílabo como hexasílabo); Romance/Romancillo con desfecha; Villancico (incluye los villancicos con coplas zejelescas).'
      ]
    },
    {
      key: 'actualizacion-de-los-datos',
      title: 'Actualización de los datos',
      paragraphs: [
        'Las fichas y las referencias bibliográficas se actualizan a través de controles periódicos y por efecto de sugerencias y señalaciones de los usuarios.'
      ]
    }
  ]
  };
}
