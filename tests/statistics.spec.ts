import { test, expect } from '@playwright/test';

test('real public navigation counts once; logged-in editing and hash changes do not', async ({
  page,
  browser
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu mesa de trabajo' })).toBeVisible();
  await page.getByRole('link', { name: 'Estadísticas', exact: true }).click();
  const total = () => page.locator('.totals section').first().locator('strong');
  const baseline = Number((await total().innerText()).replace(/\./g, ''));
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/140.0 Safari/537.36' });
  const visitor = await context.newPage();
  let counted = visitor.waitForResponse(
    (r) => r.url().endsWith('/api/consultas') && r.request().method() === 'POST'
  );
  await visitor.goto('/');
  expect((await counted).status()).toBe(204);
  await expect(visitor.locator('.public-counter')).toContainText('páginas consultadas');
  await expect(visitor.locator('.public-counter')).toContainText('no visitantes únicos');
  await page.reload();
  await expect(total()).toHaveText((baseline + 1).toLocaleString('es-ES'));
  counted = visitor.waitForResponse(
    (r) => r.url().endsWith('/api/consultas') && r.request().method() === 'POST'
  );
  await visitor.getByRole('link', { name: 'Presentación', exact: true }).click();
  await counted;
  await page.reload();
  await expect(total()).toHaveText((baseline + 2).toLocaleString('es-ES'));
  await visitor.goto('/presentacion#consulta');
  await page.goto('/presentacion');
  await page.goto('/admin/estadisticas');
  await expect(total()).toHaveText((baseline + 2).toLocaleString('es-ES'));
  await expect(page.getByText('Primera consulta registrada:', { exact: false })).toBeVisible();
  await context.close();
});
