import { all, one, run, transaction } from './database.ts';
import { formas as initialForms } from '../editor/schema.ts';

// Ignore case, accents and spacing when detecting duplicate names, but preserve
// punctuation that may distinguish scholarly categories.
export function formKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
    .replace(/\s+/g, ' ');
}
export class VocabularyError extends Error {
  existing?: string;
  constructor(message: string, existing?: string) {
    super(message);
    this.existing = existing;
  }
}
async function seedForms() {
  await transaction(async () => {
    if (!(await one("SELECT value FROM metadata WHERE key='metric-forms-v1'"))) {
      const add = (name: string) => {
        if (name && !['—', '-'].includes(name))
          return run(
            'INSERT INTO metric_forms(normalized_name,name,created_by,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(normalized_name) DO NOTHING',
            [formKey(name), name, 'Migración del vocabulario', new Date().toISOString()]
          );
      };
      for (const name of initialForms) await add(name);
      for (const row of await all<{ draft: string; published: string | null }>(
        "SELECT draft,published FROM records WHERE kind='poemas' ORDER BY id"
      )) {
        for (const source of [row.draft, row.published])
          if (source) await add(String(JSON.parse(source).forma || ''));
      }
      await run('INSERT INTO metadata(key,value) VALUES($1,$2)', [
        'metric-forms-v1',
        new Date().toISOString()
      ]);
    }
  });
}
export async function listForms(): Promise<string[]> {
  await seedForms();
  return (await all<{ name: string }>('SELECT name FROM metric_forms'))
    .map((row) => row.name)
    .sort((a, b) => a.localeCompare(b, 'es'));
}
export async function findForm(name: string): Promise<string | undefined> {
  await seedForms();
  return (
    await one<{ name: string }>('SELECT name FROM metric_forms WHERE normalized_name=$1', [
      formKey(name)
    ])
  )?.name;
}
export async function addForm(input: string, author: string): Promise<string> {
  const name = input.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  if (
    name.length < 2 ||
    name.length > 100 ||
    !/\p{L}/u.test(name) ||
    /[<>\u0000-\u001f\u007f]/.test(name)
  )
    throw new VocabularyError('Escribe un nombre de entre 2 y 100 caracteres, sin etiquetas HTML.');
  return transaction(async () => {
    const existing = await findForm(name);
    if (existing)
      throw new VocabularyError(
        `Ya existe la forma «${existing}». Puedes seleccionarla sin crear otra.`,
        existing
      );
    await run(
      'INSERT INTO metric_forms(normalized_name,name,created_by,created_at) VALUES($1,$2,$3,$4)',
      [formKey(name), name, author, new Date().toISOString()]
    );
    return name;
  });
}
