import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { db, transaction, databasePath } from '../src/lib/server/database.ts';
import { createUser } from '../src/lib/server/auth.ts';
import {
  fields,
  richFields,
  conditions,
  type Kind,
  type Content
} from '../src/lib/editor/schema.ts';
import { cleanHtml, publicData } from '../src/lib/server/content.ts';

if (!db.prepare("SELECT value FROM metadata WHERE key='seeded'").get()) {
  const read = (file: string) => JSON.parse(readFileSync(`data/generated/${file}.json`, 'utf8'));
  const poemas = read('poemas'),
    testimonios = read('testimonios'),
    site = read('site');
  const records: { id: string; kind: Kind; content: Content }[] = [];
  for (const kind of ['testimonios', 'poemas'] as const)
    for (const source of kind === 'poemas' ? poemas : testimonios) {
      const content: Content = {};
      for (const [key] of fields[kind])
        content[key] = String(
          richFields.has(key)
            ? cleanHtml(
                source[key + '_html'] ||
                  String(source[key] || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
              )
            : source[key] || ''
        );
      for (const key of Object.keys(conditions))
        if (['si', 'sì', 'sí'].includes((content[key] || '').toLowerCase())) content[key] = 'sí';
      content.fecha_revision = source.fecha_revision || '';
      content.fecha_creacion = source.fecha_creacion || '';
      records.push({ id: source.id, kind, content });
    }
  site.home.intro.forEach((text: string, index: number) =>
    records.push({
      id: `home-${index + 1}`,
      kind: 'textos',
      content: {
        pagina: 'home',
        orden: String(index + 1),
        title: `Párrafo ${index + 1}`,
        texto: cleanHtml(text)
      }
    })
  );
  ['intro', 'mapTitle', 'mapDescription'].forEach((key, index) =>
    records.push({
      id: `manuscritos-${key}`,
      kind: 'textos',
      content: {
        pagina: 'manuscritos',
        orden: String(index + 1),
        title: ['Introducción', 'Título del mapa', 'Descripción del mapa'][index],
        texto: cleanHtml(site.manuscritos[key])
      }
    })
  );
  for (const page of ['presentacion', 'criterios'])
    site[page].forEach((s: { key: string; title: string; paragraphs: string[] }, index: number) =>
      records.push({
        id: `${page}-${s.key}`,
        kind: 'textos',
        content: {
          pagina: page,
          orden: String(index + 1),
          title: s.title,
          texto: s.paragraphs.map(cleanHtml).join('\n\n')
        }
      })
    );
  transaction(() => {
    const insert = db.prepare(
      'INSERT INTO records(id,kind,draft,published,updated_at,updated_by) VALUES(?,?,?,?,?,?)'
    );
    const hist = db.prepare(
      'INSERT INTO history(record_id,content,action,author,created_at) VALUES(?,?,?,?,?)'
    );
    for (const r of records) {
      const text = JSON.stringify(r.content),
        date = new Date().toISOString();
      insert.run(r.id, r.kind, text, text, date, 'Migración local');
      hist.run(r.id, text, 'Migración inicial', 'Migración local', date);
    }
    const output = publicData();
    if (output.poemas.length !== poemas.length || output.testimonios.length !== testimonios.length)
      throw new Error('La migración no conserva todas las relaciones. Se ha cancelado.');
    db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run(
      'seeded',
      new Date().toISOString()
    );
  });
  console.log(`Migración verificada: ${poemas.length} poemas y ${testimonios.length} manuscritos.`);
} else console.log('Base de datos ya inicializada. Se conservan todas las ediciones.');
// Canonicalize historical si/sì variants once; preserve every other field and revision.
if (!db.prepare("SELECT value FROM metadata WHERE key='boolean-normalization-v1'").get())
  transaction(() => {
    let count = 0;
    for (const row of db
      .prepare("SELECT id,draft,published FROM records WHERE kind='poemas'")
      .all()) {
      const convert = (text: string) => {
        const content = JSON.parse(text);
        for (const key of Object.keys(conditions))
          if (['si', 'sì', 'sí'].includes(String(content[key] || '').toLowerCase()))
            content[key] = 'sí';
        return JSON.stringify(content);
      };
      const draft = convert(row.draft as string),
        published = row.published ? convert(row.published as string) : null;
      if (draft !== row.draft || published !== row.published) {
        db.prepare('UPDATE records SET draft=?,published=? WHERE id=?').run(
          draft,
          published,
          row.id
        );
        count++;
      }
    }
    db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run(
      'boolean-normalization-v1',
      new Date().toISOString()
    );
    console.log(`Variantes históricas de sí/no normalizadas: ${count}.`);
  });
if (!db.prepare('SELECT id FROM users LIMIT 1').get()) {
  const password = randomBytes(18).toString('base64url');
  await createUser('admin@repomit.local', 'Administración local', password, 'admin');
  mkdirSync('.local', { recursive: true, mode: 0o700 });
  const access = '.local/acceso.txt';
  if (existsSync(access))
    throw new Error('Ya existe un archivo de acceso. Revisa la cuenta antes de regenerarlo.');
  writeFileSync(
    access,
    `Acceso local a RePoMIt\nCorreo: admin@repomit.local\nContraseña: ${password}\n\nEntra en /admin/login. Cambia esta contraseña desde Cuentas y acceso.\n`,
    { mode: 0o600 }
  );
  console.log('Cuenta creada. Credenciales guardadas únicamente en .local/acceso.txt');
}
console.log(`Base de datos: ${databasePath}`);
db.close();
