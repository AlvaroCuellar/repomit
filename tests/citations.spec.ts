import { test, expect } from '@playwright/test';

test('public text shares typography, and fichas offer an identified citation', async ({ page }) => {
  const typography = [];
  for (const path of ['/', '/presentacion', '/criterios']) {
    await page.goto(path);
    typography.push(
      await page
        .locator('.paragraph')
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.fontFamily, s.fontSize, s.lineHeight];
        })
    );
  }
  expect(typography[0]).toEqual(typography[1]);
  expect(typography[0]).toEqual(typography[2]);
  await page.goto('/poemas/nan-xvii30-006');
  await page.getByText('Cómo citar esta ficha', { exact: true }).click();
  await expect(page.locator('.citation')).toContainText('/poemas/nan-xvii30-006');
  await expect(page.locator('.citation')).toContainText('consulta:');
  await expect(page.locator('.citation')).toContainText('Ítem');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
});

test('editor can prepare, preview and publish a separate citation section without replacing existing text', async ({
  page,
  browser
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu mesa de trabajo' })).toBeVisible();
  await page.goto('/admin?kind=textos');
  await page
    .getByRole('link', { name: 'Preparar «Cómo citar el repertorio»', exact: true })
    .click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Cómo citar el repertorio');
  await expect(page.getByRole('combobox', { name: 'Página', exact: true })).toHaveValue('presentacion');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  const visitor = await browser.newPage();
  await visitor.goto('/presentacion');
  const previousSections = await visitor.locator('h2').allTextContents();
  expect(previousSections).not.toContain('Cómo citar el repertorio');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Vista previa guardada' }).click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole('heading', { name: 'Cómo citar el repertorio', exact: true })
  ).toBeVisible();
  await popup.close();
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await visitor.reload();
  await expect(
    visitor.getByRole('heading', { name: 'Cómo citar el repertorio', exact: true })
  ).toBeVisible();
  expect(await visitor.locator('h2').allTextContents()).toEqual([
    ...previousSections,
    'Cómo citar el repertorio'
  ]);
  await page.goto('/admin?kind=textos');
  await expect(
    page.getByRole('link', { name: 'Editar instrucciones de cita', exact: true })
  ).toBeVisible();
  await visitor.close();
});
