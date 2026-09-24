import ExcelJS from 'exceljs';
import yauzl from 'yauzl';
import { normalizeExcelNamespaces } from './excel-namespaces.ts';
import { randomUUID, createHash } from 'node:crypto';
import { all, one, run, transaction } from './database.ts';
import {
  listRecords,
  saveRecord,
  sanitizeContent,
  plain,
  normalized,
  ContentError
} from './content.ts';
import { addForm, findForm, formKey, listForms } from './vocabulary.ts';
import {
  importFields,
  importRequired,
  importHeader,
  headerKey,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS
} from '../editor/import-schema.ts';
import { richFields, conditions, type Content } from '../editor/schema.ts';
import { escapeText } from '../data/repomit.ts';

type Kind = 'poemas' | 'testimonios';
export type Issue = {
  level: 'error' | 'warning';
  sheet: string;
  row: number;
  field: string;
  message: string;
};
export type ImportRow = { id: string; kind: Kind; sheet: string; row: number; content: Content };
export type ParsedImport = { rows: ImportRow[]; issues: Issue[]; skipped: number };
export type PlannedRow = ImportRow & {
  status: 'new' | 'reference' | 'duplicate';
  existingId?: string;
  parentId?: string;
  parentVersion?: number;
};
export type ImportPlan = {
  rows: PlannedRow[];
  issues: Issue[];
  newForms: string[];
  manuscripts: number;
  poems: number;
  skipped: number;
  references: number;
  duplicates: number;
  signature: string;
};
export class ImportError extends Error {}

async function inspectZip(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) {
        reject(
          new ImportError(
            'No se puede leer el archivo. Guarda una copia como Excel .xlsx, sin contraseña.'
          )
        );
        return;
      }
      let size = 0,
        actualSize = 0,
        count = 0,
        workbook = false;
      let settled = false;
      const fail = (message: string) => {
        if (!settled) {
          settled = true;
          zip.close();
          reject(new ImportError(message));
        }
      };
      zip.on('error', () => fail('El archivo Excel está dañado o incompleto.'));
      zip.on('entry', (entry: yauzl.Entry) => {
        size += entry.uncompressedSize;
        count++;
        if (size > 32 * 1024 * 1024 || count > 1000) {
          fail('El libro contiene demasiados datos. Divídelo en archivos más pequeños.');
          return;
        }
        if (entry.isEncrypted() || /vbaProject\.bin$/i.test(entry.fileName)) {
          fail('Utiliza un archivo .xlsx sin contraseña ni macros.');
          return;
        }
        if (entry.fileName === 'xl/workbook.xml') workbook = true;
        if (entry.fileName.endsWith('/')) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (error, stream) => {
          if (error || !stream) {
            fail('El archivo Excel está dañado o incompleto.');
            return;
          }
          stream.on('error', () => fail('El archivo Excel está dañado o incompleto.'));
          stream.on('data', (chunk: Buffer) => {
            actualSize += chunk.length;
            if (actualSize > 32 * 1024 * 1024) {
              stream.destroy();
              fail('El libro contiene demasiados datos. Divídelo en archivos más pequeños.');
            }
          });
          stream.on('end', () => {
            if (!settled) zip.readEntry();
          });
        });
      });
      zip.on('end', () => {
        if (!settled) {
          settled = true;
          workbook ? resolve() : reject(new ImportError('El archivo no es un libro Excel .xlsx.'));
        }
      });
      zip.readEntry();
    });
  });
}
export async function parseExcel(buffer: Buffer, filename: string): Promise<ParsedImport> {
  if (!/\.xlsx$/i.test(filename))
    throw new ImportError(
      'Selecciona un archivo .xlsx. Si tienes un .xls o .csv, guárdalo primero como .xlsx.'
    );
  if (!buffer.length || buffer.length > MAX_IMPORT_BYTES)
    throw new ImportError('El archivo debe contener datos y ocupar como máximo 5 MB.');
  await inspectZip(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load((await normalizeExcelNamespaces(buffer)) as unknown as ExcelJS.Buffer);
  } catch {
    throw new ImportError(
      'No se ha podido abrir el Excel. Guarda otra copia .xlsx y vuelve a intentarlo.'
    );
  }
  const parsed: ParsedImport = { rows: [], issues: [], skipped: 0 };
  const add = (level: Issue['level'], sheet: string, row: number, field: string, message: string) =>
    parsed.issues.push({ level, sheet, row, field, message });
  const found = new Set<Kind>();
  for (const sheet of workbook.worksheets) {
    const name = headerKey(sheet.name);
    const kind: Kind | undefined =
      name === 'poemas'
        ? 'poemas'
        : ['testimonios', 'manuscritos'].includes(name)
          ? 'testimonios'
          : undefined;
    if (!kind) {
      if (!['instrucciones', 'campos', 'formas', 'ejemplos'].includes(name))
        add(
          'warning',
          sheet.name,
          0,
          '',
          'Esta pestaña no se importa. Solo se leen Testimonios y Poemas.'
        );
      continue;
    }
    if (found.has(kind)) {
      add(
        'error',
        sheet.name,
        0,
        '',
        'Hay dos pestañas para el mismo tipo de ficha. Conserva solo una.'
      );
      continue;
    }
    found.add(kind);
    if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > 60)
      throw new ImportError(
        'Cada pestaña admite hasta 2.000 filas de datos y 60 columnas. Divide el libro y elimina filas o columnas sobrantes.'
      );
    if (sheet.rowCount === 0) continue;
    const columns = new Map<number, string>(),
      used = new Set<string>();
    sheet.getRow(1).eachCell((cell, col) => {
      const text = cell.text.trim();
      if (!text) return;
      const key = importHeader(text, kind);
      if (!key) {
        add(
          'warning',
          sheet.name,
          1,
          text,
          'Columna no reconocida: sus valores no se importarán. Consulta los encabezados de la plantilla.'
        );
        return;
      }
      if (key === '_contenido') {
        add(
          'warning',
          sheet.name,
          1,
          text,
          'El contenido topográfico se genera desde los poemas; esta columna antigua no se importa.'
        );
        return;
      }
      if (used.has(key)) {
        add('error', sheet.name, 1, text, 'Este campo aparece en dos columnas. Deja una sola.');
        return;
      }
      used.add(key);
      columns.set(col, key);
    });
    const dataRows: ExcelJS.Row[] = [];
    sheet.eachRow((row, number) => {
      if (number > 1) {
        const relevant = [...columns]
          .filter(([, key]) => key !== 'orden')
          .some(([col]) => !['', '—', '-'].includes(row.getCell(col).text.trim()));
        if (relevant) dataRows.push(row);
        else parsed.skipped++;
      }
    });
    if (!dataRows.length) continue;
    for (const key of importRequired[kind])
      if (!used.has(key))
        add(
          'error',
          sheet.name,
          1,
          key,
          `Falta la columna obligatoria «${key}». La primera fila debe contener los encabezados.`
        );
    for (const row of dataRows) {
      const content: Content = Object.fromEntries(importFields[kind].map(([key]) => [key, '']));
      for (const [col, key] of columns) {
        const cell = row.getCell(col),
          value = cell.value;
        if (cell.isMerged) {
          add(
            'error',
            sheet.name,
            row.number,
            key,
            'Separa las celdas combinadas. Cada dato debe ocupar su propia celda.'
          );
          continue;
        }
        if (value instanceof Date) {
          add(
            'error',
            sheet.name,
            row.number,
            key,
            'Excel ha convertido este valor en fecha. Cambia la celda a Texto y vuelve a escribir el dato original.'
          );
          continue;
        }
        if (
          value &&
          typeof value === 'object' &&
          ('formula' in value || 'sharedFormula' in value || 'error' in value)
        ) {
          add(
            'error',
            sheet.name,
            row.number,
            key,
            'No se importan fórmulas ni errores de Excel. Copia y pega solo los valores.'
          );
          continue;
        }
        let text = cell.text || '';
        if (richFields.has(key)) {
          if (value && typeof value === 'object' && 'richText' in value) {
            text = value.richText
              .map((run) => {
                let t = escapeText(run.text);
                if (run.font?.italic) t = `<em>${t}</em>`;
                if (run.font?.bold) t = `<strong>${t}</strong>`;
                return t;
              })
              .join('');
          } else {
            text = escapeText(text);
            if (cell.font?.italic) text = `<em>${text}</em>`;
            if (cell.font?.bold) text = `<strong>${text}</strong>`;
          }
        } else if (key === 'enlace' && value && typeof value === 'object' && 'hyperlink' in value)
          text = value.hyperlink;
        if (text.length > 200000) {
          add(
            'error',
            sheet.name,
            row.number,
            key,
            'Este campo supera los 200.000 caracteres. Divídelo o reduce su extensión.'
          );
          continue;
        }
        content[key] = text.trim();
      }
      parsed.rows.push({ id: randomUUID(), kind, sheet: sheet.name, row: row.number, content });
    }
  }
  if (!found.size)
    add(
      'error',
      'Libro',
      0,
      '',
      'No se encuentran las pestañas Testimonios o Poemas. Usa los nombres de la plantilla.'
    );
  if (!parsed.rows.length)
    add(
      'error',
      'Libro',
      0,
      '',
      'No hay fichas para importar. La plantilla vacía debe rellenarse antes de subirla.'
    );
  if (parsed.rows.length > MAX_IMPORT_ROWS)
    throw new ImportError(
      'Se admiten hasta 2.000 fichas por archivo. Divide la importación en varios libros.'
    );
  return parsed;
}

export async function planImport(parsed: ParsedImport): Promise<ImportPlan> {
  const issues = [...parsed.issues];
  const rows: PlannedRow[] = parsed.rows.map((row) => ({
    ...row,
    content: { ...row.content },
    status: 'new'
  }));
  const add = (row: ImportRow, level: Issue['level'], field: string, message: string) =>
    issues.push({ level, sheet: row.sheet, row: row.row, field, message });
  const originals = await listRecords();
  const parents = new Map<string, { id: string; version: number; name: string }>();
  for (const r of originals.filter((r) => r.kind === 'testimonios'))
    for (const source of [r.draft, r.published])
      if (source) {
        const c = JSON.parse(source);
        parents.set(normalized(c.testimonio), {
          id: r.id,
          version: r.version,
          name: JSON.parse(r.draft).testimonio
        });
      }
  const seenParents = new Set<string>();
  for (const row of rows.filter((r) => r.kind === 'testimonios')) {
    const sigla = row.content.testimonio.trim();
    const key = normalized(sigla);
    if (!key) {
      add(row, 'error', 'testimonio', 'Escribe la sigla del manuscrito.');
      continue;
    }
    if (seenParents.has(key)) {
      add(
        row,
        'error',
        'testimonio',
        'El manuscrito aparece en más de una fila del archivo. Deja una sola ficha.'
      );
      continue;
    }
    seenParents.add(key);
    const existing = parents.get(key);
    if (existing) {
      row.status = 'reference';
      row.existingId = existing.id;
      row.parentVersion = existing.version;
      add(
        row,
        'warning',
        'testimonio',
        `Se utilizará el manuscrito existente «${existing.name}». Los datos de esta fila no sustituirán su ficha.`
      );
    } else parents.set(key, { id: row.id, version: 0, name: sigla });
    if (row.status === 'new')
      for (const field of ['ciudad', 'institucion', 'signatura'])
        if (!row.content[field] || row.content[field] === '—')
          add(
            row,
            'warning',
            field,
            'Completa este dato en el panel antes de publicar el manuscrito.'
          );
  }
  const seenPoems = new Set<string>(),
    newForms = new Map<string, string>();
  const knownForms = new Map((await listForms()).map((name) => [formKey(name), name]));
  for (const row of rows.filter((r) => r.kind === 'poemas')) {
    const c = row.content;
    const parent = parents.get(normalized(c.testimonio));
    if (!parent) {
      add(
        row,
        'error',
        'testimonio',
        'La sigla no corresponde a un manuscrito existente ni a una fila de Testimonios de este archivo. Revisa ambas pestañas.'
      );
    } else {
      row.parentId = parent.id;
      row.parentVersion = parent.version;
      c.testimonio_id = parent.id;
    }
    if (!plain(c.incipit).trim() || plain(c.incipit).trim() === '—')
      add(row, 'error', 'incipit', 'Escribe el primer verso del poema.');
    if (!/^[1-9]\d{0,5}$/.test(c.orden))
      add(
        row,
        'error',
        'orden',
        'Usa un número entero entre 1 y 999999; se permiten saltos de numeración.'
      );
    const key = `${parent?.id || normalized(c.testimonio)}:${Number(c.orden)}`;
    if (seenPoems.has(key))
      add(
        row,
        'error',
        'orden',
        'Hay dos filas del archivo con el mismo manuscrito y número de orden.'
      );
    seenPoems.add(key);
    const existing = parent
      ? originals.find(
          (r) =>
            r.kind === 'poemas' &&
            [r.draft, r.published].some((source) => {
              if (!source) return false;
              const data = JSON.parse(source);
              return data.testimonio_id === parent.id && Number(data.orden) === Number(c.orden);
            })
        )
      : undefined;
    if (existing) {
      row.status = 'duplicate';
      row.existingId = existing.id;
      add(
        row,
        'error',
        'orden',
        'Ya existe un poema con este orden en el manuscrito. Elimina esta fila del archivo; las correcciones se hacen desde su ficha.'
      );
    }
    for (const [flag, dependent] of Object.entries(conditions)) {
      const value = formKey(c[flag] || '');
      c[flag] = ['si', 'yes'].includes(value)
        ? 'sí'
        : value === 'no'
          ? 'no'
          : ['', '—', '-'].includes(value)
            ? value
              ? '—'
              : ''
            : value;
      if (!['', 'sí', 'no', '—'].includes(c[flag]))
        add(row, 'error', flag, 'Utiliza sí, no, — o deja la celda vacía.');
      const hasText =
        !!plain(c[dependent] || '').trim() &&
        !['—', '-'].includes(plain(c[dependent] || '').trim());
      if (c[flag] === 'sí' && !hasText)
        add(
          row,
          'warning',
          dependent,
          'Falta el texto correspondiente a una respuesta Sí. Podrás completar el borrador antes de publicar.'
        );
      if (c[flag] === 'no' && hasText)
        add(
          row,
          'warning',
          dependent,
          'Hay texto, pero la respuesta es No. Se conservará para que lo revises antes de publicar.'
        );
    }
    if (!c.forma || c.forma === '—')
      add(row, 'warning', 'forma', 'Revisa la forma métrico-poética antes de publicar.');
    else {
      const known = knownForms.get(formKey(c.forma));
      if (known) c.forma = known;
      else {
        const name = c.forma.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
        if (
          name.length < 2 ||
          name.length > 100 ||
          /[<>\u0000-\u001f]/.test(name) ||
          !/\p{L}/u.test(name)
        )
          add(
            row,
            'error',
            'forma',
            'La forma debe ser un nombre de entre 2 y 100 caracteres, sin HTML.'
          );
        else {
          newForms.set(formKey(name), newForms.get(formKey(name)) || name);
          c.forma = newForms.get(formKey(name))!;
        }
      }
    }
  }
  // Sanitize the exact values that will be stored. Relational checks above use
  // one in-memory snapshot, avoiding hundreds of database round trips for a batch.
  for (const row of rows)
    if (row.status === 'new')
      try {
        row.content = sanitizeContent(row.kind, row.content);
      } catch (e) {
        if (e instanceof ContentError) add(row, 'error', '', e.message);
        else throw e;
      }
  if (rows.length && !rows.some((r) => r.status === 'new'))
    issues.push({
      level: 'error',
      sheet: 'Libro',
      row: 0,
      field: '',
      message:
        'No hay fichas nuevas que incorporar. Para corregir fichas existentes, abre el editor.'
    });
  const signature = createHash('sha256')
    .update(JSON.stringify({ rows, newForms: [...newForms.values()], issues }))
    .digest('hex');
  return {
    rows,
    issues,
    newForms: [...newForms.values()],
    manuscripts: rows.filter((r) => r.kind === 'testimonios' && r.status === 'new').length,
    poems: rows.filter((r) => r.kind === 'poemas' && r.status === 'new').length,
    references: rows.filter((r) => r.status === 'reference').length,
    duplicates: rows.filter((r) => r.status === 'duplicate').length,
    skipped: parsed.skipped,
    signature
  };
}

export async function stageImport(parsed: ParsedImport, filename: string, userId: string) {
  const plan = await planImport(parsed),
    id = randomUUID();
  await transaction(async () => {
    await run('DELETE FROM import_batches WHERE expires_at<$1 AND result IS NULL', [Date.now()]);
    await run(
      'DELETE FROM import_batches WHERE user_id=$1 AND result IS NULL AND id NOT IN (SELECT id FROM import_batches WHERE user_id=$2 AND result IS NULL ORDER BY created_at DESC LIMIT 4)',
      [userId, userId]
    );
    await run(
      'INSERT INTO import_batches(id,user_id,filename,payload,plan,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        id,
        userId,
        filename.slice(0, 255),
        JSON.stringify(parsed),
        JSON.stringify(plan),
        Date.now(),
        Date.now() + 2 * 60 * 60 * 1000
      ]
    );
  });
  return id;
}
export type ImportResult = { manuscripts: string[]; poems: string[]; forms: string[] };
export async function recentImports(userId: string) {
  return all<{
    id: string;
    filename: string;
    created_at: number;
    expires_at: number;
  }>(
    'SELECT id,filename,created_at,expires_at FROM import_batches WHERE user_id=$1 AND result IS NULL AND expires_at>$2 ORDER BY created_at DESC LIMIT 5',
    [userId, Date.now()]
  );
}
export async function getImport(id: string, userId: string) {
  const row = await one<Record<string, unknown>>(
    'SELECT * FROM import_batches WHERE id=$1 AND user_id=$2',
    [id, userId]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    filename: row.filename as string,
    plan: JSON.parse(row.plan as string) as ImportPlan,
    expiresAt: Number(row.expires_at),
    expired: Number(row.expires_at) < Date.now(),
    result: row.result ? (JSON.parse(row.result as string) as ImportResult) : null
  };
}
export function commitImport(
  id: string,
  userId: string,
  author: string,
  acceptForms: boolean
): Promise<ImportResult> {
  return transaction(async () => {
    const batch = await one<Record<string, unknown>>(
      'SELECT * FROM import_batches WHERE id=$1 AND user_id=$2 FOR UPDATE',
      [id, userId]
    );
    if (!batch)
      throw new ImportError(
        'Esta vista previa no pertenece a tu cuenta o ya no existe. Vuelve a subir el archivo.'
      );
    if (batch.result) return JSON.parse(batch.result as string);
    if (Number(batch.expires_at) < Date.now())
      throw new ImportError(
        'La vista previa ha caducado. Vuelve a subir el archivo para comprobar los datos actuales.'
      );
    const previous = JSON.parse(batch.plan as string) as ImportPlan;
    const plan = await planImport(JSON.parse(batch.payload as string));
    if (plan.issues.some((i) => i.level === 'error'))
      throw new ImportError(
        'Hay errores que impiden importar. Corrige el archivo y vuelve a subirlo.'
      );
    if (plan.signature !== previous.signature)
      throw new ImportError(
        'El catálogo ha cambiado desde la vista previa. Vuelve a subir el archivo y revisa el resultado actualizado.'
      );
    if (plan.newForms.length && !acceptForms)
      throw new ImportError('Confirma que quieres añadir las nuevas formas métricas indicadas.');
    for (const name of plan.newForms) if (!(await findForm(name))) await addForm(name, author);
    const result: ImportResult = { manuscripts: [], poems: [], forms: plan.newForms };
    for (const row of [
      ...plan.rows.filter((r) => r.kind === 'testimonios'),
      ...plan.rows.filter((r) => r.kind === 'poemas')
    ])
      if (row.status === 'new') {
        const recordId = row.id;
        const date = new Date().toISOString();
        const content = sanitizeContent(row.kind, row.content);
        content.fecha_creacion = date.slice(0, 10);
        content.fecha_revision = '';
        const json = JSON.stringify(content);
        await run(
          'INSERT INTO records(id,kind,draft,published,version,updated_at,updated_by) VALUES($1,$2,$3,NULL,1,$4,$5)',
          [recordId, row.kind, json, date, author]
        );
        await run(
          'INSERT INTO history(record_id,content,action,author,created_at) VALUES($1,$2,$3,$4,$5)',
          [
            recordId,
            json,
            `Importación: ${batch.filename} · ${row.sheet}, fila ${row.row}`,
            author,
            date
          ]
        );
        result[row.kind === 'poemas' ? 'poems' : 'manuscripts'].push(recordId);
      }
    await run("UPDATE import_batches SET result=$1,payload='' WHERE id=$2", [
      JSON.stringify(result),
      id
    ]);
    return result;
  });
}
