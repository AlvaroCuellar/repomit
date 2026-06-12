import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedDir = path.join(root, 'data', 'generated');

const allowedBooleanLike = new Set(['si', 'sí', 'no', '—', '-']);
const structureFields = ['estructura_cabeza', 'estructura_interna', 'estribillo'];
const searchFields = ['search_incipit', 'search_verso', 'search_autor', 'search_general', 'sort_incipit'];
const htmlTagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
const allowedHtmlTags = new Set(['em', 'br']);

const poemas = await readJson('poemas.json');
const testimonios = await readJson('testimonios.json');
const diagnostico = await readOptionalJson('diagnostico.json');

const blockingErrors = [];
const warnings = [];

assertArray('poemas.json', poemas);
assertArray('testimonios.json', testimonios);

checkUnique('poemas.json ids', poemas, 'id');
checkUnique('testimonios.json ids', testimonios, 'id');
checkUnique('poemas.json items', poemas, 'item');

for (const poema of poemas) {
  if (!poema.incipit) {
    blockingErrors.push(`Poema sin incipit: ${describeRecord(poema)}`);
  }

  if (!poema.testimonio) {
    blockingErrors.push(`Poema sin testimonio: ${describeRecord(poema)}`);
  }

  if (!poema.orden) {
    blockingErrors.push(`Poema sin orden: ${describeRecord(poema)}`);
  }

  if (!poema.forma) {
    blockingErrors.push(`Poema con forma vacia: ${describeRecord(poema)}`);
  }

  for (const field of structureFields) {
    const value = normalizeForAllowedValue(poema[field]);
    if (!allowedBooleanLike.has(value)) {
      blockingErrors.push(
        `Poema ${describeRecord(poema)} tiene ${field}="${poema[field] ?? ''}". Valores permitidos: sí, si, no o —.`
      );
    }
  }
}

const testimonioIds = new Set(testimonios.map((testimonio) => testimonio.id));
for (const poema of poemas) {
  if (!testimonioIds.has(poema.testimonio_id)) {
    blockingErrors.push(
      `Poema ${describeRecord(poema)} referencia un testimonio inexistente: ${poema.testimonio_id || '(vacio)'}`
    );
  }
}

const report = buildQualityReport();
diagnostico.informe = report;
diagnostico.quality_report_generated_at = new Date().toISOString();

await writeJson('diagnostico.json', diagnostico);

if (blockingErrors.length > 0) {
  console.error(`Validacion RePoMIt fallida con ${blockingErrors.length} error(es):`);
  for (const error of blockingErrors) {
    console.error(`- ${error}`);
  }
  console.error('Se ha escrito el informe completo en data/generated/diagnostico.json.');
  process.exit(1);
}

console.log(
  `Datos RePoMIt validados: ${poemas.length} poemas, ${testimonios.length} testimonios, ${warnings.length} aviso(s) no bloqueante(s).`
);

function buildQualityReport() {
  const resumen = {
    numero_poemas: poemas.length,
    numero_testimonios: testimonios.length,
    excel_leidos: diagnostico.totals?.files_read ?? 0,
    excel_ignorados: diagnostico.totals?.files_ignored ?? 0,
    celdas_richText_detectadas: diagnostico.totals?.rich_text_cells ?? 0,
    tramos_en_cursiva_detectados: diagnostico.totals?.italic_runs ?? 0
  };

  const testimoniosReport = buildTestimoniosReport();
  const formas = buildFormasReport();
  const siglas = buildSiglasReport();
  const camposCondicionales = buildConditionalFieldsReport();
  const busqueda = buildSearchReport();
  const html = buildHtmlReport();

  return {
    resumen,
    testimonios: testimoniosReport,
    formas,
    siglas,
    campos_condicionales: camposCondicionales,
    busqueda,
    html,
    errores: {
      bloqueantes: blockingErrors,
      avisos_no_bloqueantes: warnings
    }
  };
}

function buildTestimoniosReport() {
  return testimonios
    .map((testimonio) => ({
      id: testimonio.id,
      testimonio: testimonio.testimonio,
      ciudad: testimonio.ciudad,
      institucion: testimonio.institucion,
      signatura: testimonio.signatura,
      poemas_asociados: poemas.filter((poema) => poema.testimonio_id === testimonio.id).length
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'es'));
}

function buildFormasReport() {
  const counts = new Map();
  const formaVacia = [];
  const formaGuion = [];

  for (const poema of poemas) {
    const forma = cleanText(poema.forma);
    const key = forma || '(vacia)';
    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (!forma) {
      formaVacia.push(describeRecord(poema));
    }

    if (forma === '—' || forma === '-') {
      formaGuion.push(describeRecord(poema));
    }
  }

  if (formaVacia.length > 0) {
    warnings.push(`Hay ${formaVacia.length} poema(s) con forma vacia.`);
  }

  if (formaGuion.length > 0) {
    warnings.push(`Hay ${formaGuion.length} poema(s) con forma igual a —.`);
  }

  return {
    listado: Array.from(counts.entries())
      .map(([forma, poemas_count]) => ({ forma, poemas: poemas_count }))
      .sort((a, b) => b.poemas - a.poemas || a.forma.localeCompare(b.forma, 'es')),
    avisos: {
      forma_vacia: formaVacia,
      forma_guion: formaGuion
    }
  };
}

function buildSiglasReport() {
  const groups = new Map();

  for (const testimonio of testimonios) {
    addSiglaVariant(groups, testimonio.testimonio, 'testimonios.json', testimonio.id);
  }

  for (const poema of poemas) {
    addSiglaVariant(groups, poema.testimonio, 'poemas.json', poema.id);
  }

  const variantes = Array.from(groups.entries())
    .map(([id_tecnico, group]) => ({
      id_tecnico,
      variantes: Array.from(group.variants.values()).sort((a, b) =>
        a.valor.localeCompare(b.valor, 'es')
      )
    }))
    .sort((a, b) => a.id_tecnico.localeCompare(b.id_tecnico, 'es'));

  const diferenciasCapitalizacion = variantes
    .filter((group) => {
      const exactValues = group.variantes.map((variant) => variant.valor).filter(Boolean);
      const lowercaseValues = new Set(exactValues.map((value) => value.toLowerCase()));
      return exactValues.length > 1 && lowercaseValues.size < exactValues.length;
    })
    .map((group) => ({
      id_tecnico: group.id_tecnico,
      variantes: group.variantes.map((variant) => variant.valor)
    }));

  for (const issue of diferenciasCapitalizacion) {
    warnings.push(
      `Diferencias de capitalizacion en ${issue.id_tecnico}: ${issue.variantes.join(' / ')}.`
    );
  }

  const canonicalizaciones = Array.isArray(diagnostico.canonicalizaciones)
    ? diagnostico.canonicalizaciones
    : [];

  for (const canonicalizacion of canonicalizaciones) {
    warnings.push(
      `Testimonio canonicalizado en poemas: ${canonicalizacion.de} -> ${canonicalizacion.a} (${canonicalizacion.poemas_afectados} poema(s)).`
    );
  }

  return {
    variantes,
    avisos_capitalizacion: diferenciasCapitalizacion,
    canonicalizaciones
  };
}

function addSiglaVariant(groups, rawValue, source, recordId) {
  const value = cleanText(rawValue);
  const id = technicalId(value);

  if (!groups.has(id)) {
    groups.set(id, { variants: new Map() });
  }

  const group = groups.get(id);
  if (!group.variants.has(value)) {
    group.variants.set(value, {
      valor: value,
      apariciones: 0,
      fuentes: []
    });
  }

  const variant = group.variants.get(value);
  variant.apariciones += 1;
  variant.fuentes.push({ archivo: source, registro: recordId });
}

function buildConditionalFieldsReport() {
  const report = {
    estructura_cabeza_si_sin_incipit_desarrollo: [],
    estructura_cabeza_no_con_incipit_desarrollo: [],
    estructura_interna_si_sin_incipit_interno: [],
    estructura_interna_no_con_incipit_interno: [],
    estribillo_si_sin_estribillo_entero: [],
    estribillo_no_con_estribillo_entero: []
  };

  for (const poema of poemas) {
    if (isYes(poema.estructura_cabeza) && isBlankOrDash(poema.incipit_desarrollo)) {
      report.estructura_cabeza_si_sin_incipit_desarrollo.push(poemSummary(poema));
    }

    if (isNo(poema.estructura_cabeza) && hasContent(poema.incipit_desarrollo)) {
      report.estructura_cabeza_no_con_incipit_desarrollo.push(poemSummary(poema));
    }

    if (isYes(poema.estructura_interna) && isBlankOrDash(poema.incipit_interno)) {
      report.estructura_interna_si_sin_incipit_interno.push(poemSummary(poema));
    }

    if (isNo(poema.estructura_interna) && hasContent(poema.incipit_interno)) {
      report.estructura_interna_no_con_incipit_interno.push(poemSummary(poema));
    }

    if (isYes(poema.estribillo) && isBlankOrDash(poema.estribillo_entero)) {
      report.estribillo_si_sin_estribillo_entero.push(poemSummary(poema));
    }

    if (isNo(poema.estribillo) && hasContent(poema.estribillo_entero)) {
      report.estribillo_no_con_estribillo_entero.push(poemSummary(poema));
    }
  }

  for (const [field, records] of Object.entries(report)) {
    if (records.length > 0) {
      warnings.push(`Campos condicionales: ${field} contiene ${records.length} poema(s).`);
    }
  }

  return report;
}

function buildSearchReport() {
  const poemasSinCampos = [];

  for (const poema of poemas) {
    const missing = searchFields.filter((field) => !poema[field]);
    if (missing.length > 0) {
      poemasSinCampos.push({
        ...poemSummary(poema),
        campos_faltantes: missing
      });
    }
  }

  if (poemasSinCampos.length > 0) {
    warnings.push(`Hay ${poemasSinCampos.length} poema(s) con campos de busqueda incompletos.`);
  }

  return {
    campos_requeridos: searchFields,
    todos_los_poemas_tienen_campos_busqueda: poemasSinCampos.length === 0,
    poemas_sin_campos: poemasSinCampos
  };
}

function buildHtmlReport() {
  let camposHtmlGenerados = 0;
  const etiquetasNoPermitidas = [];

  for (const record of [...poemas, ...testimonios]) {
    for (const [field, value] of Object.entries(record)) {
      if (!field.endsWith('_html')) {
        continue;
      }

      if (value) {
        camposHtmlGenerados += 1;
      }

      for (const tag of findHtmlTags(value)) {
        if (!allowedHtmlTags.has(tag.name)) {
          etiquetasNoPermitidas.push({
            registro: describeRecord(record),
            campo: field,
            etiqueta: tag.raw
          });
        }
      }
    }
  }

  if (etiquetasNoPermitidas.length > 0) {
    warnings.push(
      `Hay ${etiquetasNoPermitidas.length} etiqueta(s) HTML no permitida(s) en campos *_html.`
    );
  }

  return {
    campos_html_generados: camposHtmlGenerados,
    etiquetas_permitidas: ['<em>', '</em>', '<br>'],
    etiquetas_no_permitidas: etiquetasNoPermitidas
  };
}

function findHtmlTags(value) {
  const tags = [];
  const html = String(value ?? '');
  htmlTagPattern.lastIndex = 0;
  let match = htmlTagPattern.exec(html);

  while (match) {
    tags.push({ raw: match[0], name: match[1].toLowerCase() });
    match = htmlTagPattern.exec(html);
  }

  return tags;
}

async function readJson(filename) {
  const contents = await readFile(path.join(generatedDir, filename), 'utf8');
  return JSON.parse(contents);
}

async function readOptionalJson(filename) {
  try {
    return await readJson(filename);
  } catch {
    return {};
  }
}

async function writeJson(filename, data) {
  await writeFile(path.join(generatedDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}

function assertArray(label, value) {
  if (!Array.isArray(value)) {
    blockingErrors.push(`${label} debe contener un array.`);
  }
}

function checkUnique(label, records, field) {
  const seen = new Map();
  for (const record of records) {
    const value = record[field];
    if (!value) {
      blockingErrors.push(`${label}: registro sin ${field}: ${describeRecord(record)}`);
      continue;
    }

    if (seen.has(value)) {
      blockingErrors.push(`${label}: valor duplicado "${value}" en ${describeRecord(record)}`);
      continue;
    }

    seen.set(value, record);
  }
}

function normalizeForAllowedValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace('-', '—');
}

function isYes(value) {
  return normalizeForAllowedValue(value) === 'si';
}

function isNo(value) {
  return normalizeForAllowedValue(value) === 'no';
}

function isBlankOrDash(value) {
  const normalized = normalizeForAllowedValue(value);
  return normalized === '' || normalized === '—';
}

function hasContent(value) {
  return !isBlankOrDash(value);
}

function poemSummary(poema) {
  return {
    id: poema.id,
    item: poema.item,
    title: poema.title,
    testimonio: poema.testimonio,
    orden: poema.orden
  };
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
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

function describeRecord(record) {
  return record.id || record.item || record.testimonio || '(sin identificador)';
}
