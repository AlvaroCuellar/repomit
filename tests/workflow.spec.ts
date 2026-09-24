import { test, expect, type Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu mesa de trabajo' })).toBeVisible();
}
test('search ignores accents and formatting, includes manuscript, authors and folios, and sorts topographically', async ({
  page
}) => {
  await login(page);
  await page.goto('/admin/testimonios/nuevo');
  await page.getByLabel('Sigla del manuscrito', { exact: true }).fill('RECORRIDO Á 01');
  await page.getByLabel('Ciudad', { exact: true }).fill('Roma');
  await page.getByLabel('Institución', { exact: true }).fill('Biblioteca');
  await page.getByLabel('Signatura', { exact: true }).fill('001');
  await page.getByRole('button', { name: 'Guardar y añadir poemas', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('borrador');
  await expect(page.getByRole('status')).not.toContainText('versión publicada');
  const parent = new URL(page.url()).searchParams.get('manuscrito')!;
  for (const [order, title] of [
    [4, 'Árbol de la canción'],
    [2, 'Otra canción']
  ] as const) {
    await page.goto('/admin/poemas/nuevo?manuscrito=' + parent);
    await page.getByLabel('Orden topográfico', { exact: true }).fill(String(order));
    await page.getByRole('textbox', { name: 'Íncipit', exact: true }).fill(title);
    await page.getByLabel('Atribución', { exact: true }).fill('Góngora y Argote, Luis de');
    await page.getByLabel('Folios / páginas', { exact: true }).fill('3v-5r');
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Cambios guardados');
  }
  await page.goto('/admin?kind=poemas&manuscrito=' + parent);
  await expect(page.getByLabel('Ordenar por')).toHaveValue('catalogo');
  const rows = page.locator('tbody tr');
  await expect(rows.nth(0)).toContainText('n.º 2');
  await expect(rows.nth(1)).toContainText('n.º 4');
  for (const query of ['recorrido a 01', 'gongora', '3v-5r', 'arbol cancion']) {
    await page.getByLabel('Buscar ficha').fill(query);
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    await expect(page.locator('tbody')).toContainText('Árbol de la canción');
  }
  await page.getByRole('link', { name: 'Árbol de la canción', exact: true }).click();
  await expect(page.getByRole('link', { name: '← Poema anterior', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Poema anterior', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Íncipit', exact: true })).toHaveText(
    'Otra canción'
  );
  await expect(page.getByRole('link', { name: 'Poema siguiente →', exact: true })).toBeVisible();
  await page.goto('/admin/poemas/nuevo');
  await page.getByRole('combobox', { name: 'Manuscrito', exact: true }).selectOption(parent);
  await page
    .getByRole('button', { name: 'Usar siguiente orden disponible: 5', exact: true })
    .click();
  await expect(page.getByLabel('Orden topográfico', { exact: true })).toHaveValue('5');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: /Volver al manuscrito RECORRIDO/ }).click();
  await expect(page).toHaveURL(/\/poemas\/nuevo/);
  await expect(page.getByLabel('Orden topográfico', { exact: true })).toHaveValue('5');
  await page
    .getByRole('textbox', { name: 'Íncipit', exact: true })
    .fill('Último poema de revisión');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await page.getByRole('link', { name: /Volver al manuscrito RECORRIDO/ }).click();
  await page.getByText('Publicar el manuscrito completo', { exact: true }).click();
  await page.getByLabel('Ciudad', { exact: true }).fill('Milán');
  await expect(
    page.getByRole('button', { name: 'Publicar manuscrito y poemas', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByText('Guarda los cambios de esta ficha antes de publicar el conjunto.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/e2e/manuscript-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('public navigation and editorial forms remain usable on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of ['/', '/manuscritos', '/repertorio', '/busqueda', '/poemas/nan-xvii30-006']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  await login(page);
  await page.goto('/admin/poemas/nuevo');
  await expect(page.getByRole('button', { name: 'Guardar borrador', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Completa');
  await expect(page.getByRole('textbox', { name: 'Íncipit', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
