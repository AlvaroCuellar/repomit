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
  await expect(visitor.locator('.visitor-counter')).toContainText('Visitas al repertorio');
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


test('site visit stays single across reload and navigation, and a fresh browser session adds one', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/140.0 Safari/537.36' });
  const visitor = await context.newPage();
  const response = visitor.waitForResponse(r => r.url().endsWith('/api/visitas'));
  await visitor.goto('/');
  const recorded = await response;
  expect(recorded.status()).toBe(200);

  await expect.poll(() => visitor.evaluate(() => sessionStorage.getItem('repomit:visit-recorded'))).toBe('1');
  await visitor.reload();
  const total = Number((await visitor.locator('.visitor-counter strong').innerText()).replace(/\./g, ''));
  let extra = 0;
  visitor.on('request', request => { if (request.url().endsWith('/api/visitas')) extra++; });
  await visitor.reload();
  await expect(visitor.locator('.visitor-counter strong')).toHaveText(total.toLocaleString('es-ES'));
  await visitor.getByRole('link', { name: 'Presentación', exact: true }).click();
  await visitor.getByRole('link', { name: 'RePoMIt', exact: true }).click();
  await expect(visitor.locator('.visitor-counter strong')).toHaveText(total.toLocaleString('es-ES'));
  expect(extra).toBe(0);
  await visitor.screenshot({ path: '.local/contador-portada-desktop.png', fullPage: true });
  await visitor.setViewportSize({ width: 390, height: 844 });
  await expect(visitor.locator('.visitor-counter')).toBeVisible();
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await visitor.screenshot({ path: '.local/contador-portada-mobile.png', fullPage: true });
  const fresh = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/140.0 Safari/537.36' });
  const newcomer = await fresh.newPage();
  const newVisit = newcomer.waitForResponse(r => r.url().endsWith('/api/visitas'));
  await newcomer.goto('/manuscritos');
  expect((await newVisit).status()).toBe(200);
  await expect.poll(() => newcomer.evaluate(() => sessionStorage.getItem('repomit:visit-recorded'))).toBe('1');
  await newcomer.goto('/');
  await expect(newcomer.locator('.visitor-counter strong')).toHaveText((total + 1).toLocaleString('es-ES'));
  await context.close();
  await fresh.close();
});
