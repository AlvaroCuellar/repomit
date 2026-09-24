import { test, expect, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { DatabaseSync } from 'node:sqlite';
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu mesa de trabajo' })).toBeVisible();
  await page.getByRole('link', { name: 'Importar Excel', exact: true }).click();
}
function count() {
  const db = new DatabaseSync('.local/e2e/test.sqlite', { readOnly: true });
  const value = Number(db.prepare('SELECT COUNT(*) AS n FROM records').get()!.n);
  db.close();
  return value;
}
test('upload, full preview, new vocabulary, draft import and duplicate protection', async ({
  page,
  request
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await login(page);
  expect((await request.get('/plantillas/repomit-plantilla.xlsx')).status()).toBe(200);
  expect((await request.get('/plantillas/repomit-ejemplo.xlsx')).status()).toBe(200);
  const wb = new ExcelJS.Workbook();
  const ms = wb.addWorksheet('Testimonios');
  ms.addRow(['testimonio', 'ciudad', 'institucion', 'signatura']);
  ms.addRow(['E2E IMPORT', 'Roma', 'Biblioteca de prueba', '001']);
  const ps = wb.addWorksheet('Poemas');
  ps.addRow(['testimonio', 'orden', 'incipit', 'forma', 'transcripcion']);
  ps.addRow([
    'E2E IMPORT',
    1,
    { richText: [{ text: 'Verso importado', font: { italic: true } }] },
    'forma e2e importación',
    'Primera línea\nSegunda línea'
  ]);
  const file = {
    name: 'prueba.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer())
  };
  const before = count();
  await page.getByLabel('Archivo Excel (.xlsx)').setInputFiles(file);
  await page.getByRole('button', { name: 'Analizar archivo', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2. Revisar la vista previa' })).toBeVisible();
  expect(count()).toBe(before);
  const previewUrl = page.url();
  await page.getByRole('link', { name: 'Importar Excel', exact: true }).click();
  await expect(
    page.getByText('Continuar una importación pendiente', { exact: true })
  ).toBeVisible();
  await page.getByRole('link', { name: 'prueba.xlsx', exact: true }).click();
  await expect(page).toHaveURL(previewUrl);
  await page
    .locator('.import-row')
    .filter({ hasText: 'Verso importado' })
    .locator('summary')
    .click();
  await expect(page.locator('.import-row em')).toHaveText('Verso importado');
  await expect(page.locator('.import-row')).toContainText(['E2E IMPORT', 'Primera línea']);
  await page.getByLabel(/He revisado las fichas/).check();
  await page.getByLabel(/Quiero añadir estas/).check();
  await page.getByRole('button', { name: 'Importar como borradores' }).click();
  await expect(page.getByRole('heading', { name: 'Importación completada' })).toBeVisible();
  expect(count()).toBe(before + 2);
  const db = new DatabaseSync('.local/e2e/test.sqlite', { readOnly: true });
  const record = db
    .prepare(
      "SELECT id,published,draft FROM records WHERE kind='poemas' AND draft LIKE '%Verso importado%'"
    )
    .get()!;
  db.close();
  expect(record.published).toBeNull();
  expect(JSON.parse(record.draft as string).transcripcion).toMatch(
    /Primera línea(?:\n|<br\s*\/?>)Segunda línea/
  );
  expect((await request.get('/poemas/' + record.id)).status()).toBe(404);
  await page.getByRole('link', { name: 'Importar otro archivo' }).click();
  await page.getByLabel('Archivo Excel (.xlsx)').setInputFiles(file);
  await page.getByRole('button', { name: 'Analizar archivo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('errores impiden importar');
  await expect(page.getByRole('button', { name: 'Importar como borradores' })).toBeDisabled();
  expect(count()).toBe(before + 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/e2e/import-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  expect(pageErrors).toEqual([]);
});
test('blank template and formula errors give clear guidance; edit help is accessible', async ({
  page
}) => {
  await login(page);
  await page
    .getByLabel('Archivo Excel (.xlsx)')
    .setInputFiles('static/plantillas/repomit-plantilla.xlsx');
  await page.getByRole('button', { name: 'Analizar archivo', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Errores y avisos del archivo' })).toContainText(
    'plantilla vacía debe rellenarse'
  );
  const wb = new ExcelJS.Workbook(),
    ps = wb.addWorksheet('Poemas');
  ps.addRow(['testimonio', 'orden', 'incipit']);
  ps.addRow(['E2E IMPORT', 2, { formula: '1+1', result: 2 }]);
  await page.getByLabel('Archivo Excel (.xlsx)').setInputFiles({
    name: 'formula.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer())
  });
  await page.getByRole('button', { name: 'Analizar archivo', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Errores y avisos del archivo' })).toContainText(
    'No se importan fórmulas'
  );
  await expect(page.getByRole('table', { name: 'Errores y avisos del archivo' })).toContainText(
    'fila 2'
  );
  for (const kind of ['testimonios', 'poemas', 'textos']) {
    await page.goto('/admin/' + kind + '/nuevo');
    await page.getByText('Cómo rellenar y revisar esta ficha', { exact: true }).click();
    await expect(
      page.locator('details').filter({ hasText: 'Cómo rellenar y revisar esta ficha' })
    ).toContainText('Guardar borrador');
  }
});
