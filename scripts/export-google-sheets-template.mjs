import ExcelJS from 'exceljs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedDir = path.join(root, 'data', 'generated');
const outputDir = path.join(root, 'docs', 'google-sheets-template');
const outputFile = path.join(outputDir, 'RePoMIt-Google-Sheets.xlsx');

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

const HTML_FIELD_MAP = {
  incipit: 'incipit_html',
  segundo_verso: 'segundo_verso_html',
  explicit: 'explicit_html',
  esquema_metrico: 'esquema_metrico_html',
  incipit_desarrollo: 'incipit_desarrollo_html',
  incipit_interno: 'incipit_interno_html',
  estribillo_entero: 'estribillo_entero_html',
  transcripcion: 'transcripcion_html',
  contenido: 'contenido_html',
  bibliografia: 'bibliografia_html'
};

await mkdir(outputDir, { recursive: true });

const poemas = await readJson('poemas.json');
const testimonios = await readJson('testimonios.json');
const site = await readJson('site.json');

const workbook = new ExcelJS.Workbook();
workbook.creator = 'RePoMIt';
workbook.created = new Date();
workbook.modified = new Date();

addInstructionsSheet(workbook);
addDataSheet(
  workbook,
  'Testimonios',
  TESTIMONIO_FIELDS,
  testimonios.map((testimonio) => TESTIMONIO_FIELDS.map((field) => valueForSheet(testimonio, field))),
  { freezeColumns: 1 }
);
addDataSheet(
  workbook,
  'Poemas',
  POEMA_FIELDS,
  poemas.map((poema) => POEMA_FIELDS.map((field) => valueForSheet(poema, field))),
  { freezeColumns: 1 }
);
addDataSheet(workbook, 'Contenido web', ['pagina', 'seccion', 'orden', 'titulo', 'texto'], siteRows(site), {
  freezeColumns: 2
});

await workbook.xlsx.writeFile(outputFile);

console.log(`Google Sheet inicial generado en ${path.relative(root, outputFile)}`);

async function readJson(filename) {
  return JSON.parse(await readFile(path.join(generatedDir, filename), 'utf8'));
}

function valueForSheet(record, field) {
  const htmlField = HTML_FIELD_MAP[field];
  if (htmlField && record[htmlField]) {
    return htmlToSheetMarkup(record[htmlField]);
  }
  return record[field] ?? '';
}

function addInstructionsSheet(workbook) {
  const sheet = workbook.addWorksheet('Instrucciones', {
    views: [{ showGridLines: false }]
  });

  sheet.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 96 }
  ];

  sheet.addRows([
    ['RePoMIt - hoja unica de edicion', ''],
    ['Que es este archivo', 'Sube este XLSX a Google Drive y abrelo como Google Sheets. La hoja resultante es la unica fuente editable para la web.'],
    ['Pestanas que lee la web', 'Testimonios, Poemas y Contenido web. No cambies esos nombres. Esta pestana de instrucciones no la lee la web.'],
    ['Como enlazarla', 'Copia el ID de la URL de Google Sheets y configuralo como GOOGLE_SHEETS_ID en local o en Vercel.'],
    ['Como probar en local', 'GOOGLE_SHEETS_ID="ID_DE_LA_HOJA" npm run build:data && npm run validate:data && npm run dev'],
    ['Como publicar', 'En Vercel configura GOOGLE_SHEETS_ID y usa el Deploy Hook con el Apps Script de docs/apps-script-publicacion.js.'],
    ['Formato de texto', 'Usa *cursiva*, **negrita**, [texto](/ruta) o [correo](mailto:correo@dominio).'],
    ['Importante', 'Google Sheets por CSV no conserva cursivas visuales; por eso las cursivas deben marcarse con asteriscos.'],
    ['Ciudad nueva', 'Si aparece una ciudad nueva en Testimonios, la web la aceptara, pero conviene añadir su coordenada al mapa.']
  ]);

  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B3D1D' } };
  sheet.mergeCells('A1:B1');
  sheet.getColumn(1).font = { bold: true };
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) {
      row.height = 42;
    }
  });
}

function addDataSheet(workbook, name, headers, rows, options = {}) {
  const sheet = workbook.addWorksheet(name, {
    views: [
      {
        state: 'frozen',
        ySplit: 1,
        xSplit: options.freezeColumns ?? 0,
        showGridLines: false
      }
    ]
  });

  sheet.addRow(headers);
  sheet.addRows(rows);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B3D1D' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 28;

  for (let columnIndex = 1; columnIndex <= headers.length; columnIndex += 1) {
    const column = sheet.getColumn(columnIndex);
    column.width = getColumnWidth(headers[columnIndex - 1], name);
    column.alignment = {
      vertical: 'top',
      horizontal: headers[columnIndex - 1] === 'orden' ? 'right' : 'left',
      wrapText: true
    };
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    row.height = name === 'Contenido web' ? 48 : 34;
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE4DFD4' } }
      };
    });
  });
}

function getColumnWidth(header, sheetName) {
  if (sheetName === 'Contenido web' && header === 'texto') {
    return 110;
  }
  if (['incipit', 'segundo_verso', 'explicit', 'contenido', 'bibliografia', 'transcripcion'].includes(header)) {
    return 48;
  }
  if (['esquema_metrico', 'estructura_cabeza', 'incipit_desarrollo', 'estructura_interna', 'incipit_interno', 'estribillo_entero'].includes(header)) {
    return 36;
  }
  if (['autores_ficha', 'autores_transcripcion', 'institucion'].includes(header)) {
    return 30;
  }
  if (['orden', 'folios'].includes(header)) {
    return 12;
  }
  return 22;
}

function siteRows(site) {
  const rows = [];

  site.home.intro.forEach((text, index) => {
    rows.push(['home', 'intro', index + 1, '', htmlToSheetMarkup(text)]);
  });

  rows.push(['manuscritos', 'intro', 1, '', htmlToSheetMarkup(site.manuscritos.intro)]);
  rows.push(['manuscritos', 'mapa titulo', 1, '', site.manuscritos.mapTitle]);
  rows.push(['manuscritos', 'mapa texto', 1, '', htmlToSheetMarkup(site.manuscritos.mapDescription)]);

  for (const page of ['presentacion', 'criterios']) {
    for (const section of site[page]) {
      section.paragraphs.forEach((text, index) => {
        rows.push([page, section.title, index + 1, section.title, htmlToSheetMarkup(text)]);
      });
    }
  }

  return rows;
}

function htmlToSheetMarkup(value) {
  return decodeHtmlEntities(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<a\s+href="([^"]+)">([\s\S]*?)<\/a>/gi, (_match, href, label) => `[${stripTags(label)}](${href})`)
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, (_match, text) => `**${stripTags(text)}**`)
      .replace(/<em>([\s\S]*?)<\/em>/gi, (_match, text) => `*${stripTags(text)}*`)
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
  );
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
