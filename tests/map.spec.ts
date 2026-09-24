import { test, expect } from '@playwright/test';
test('editor places a city by clicking, moves it with the keyboard and saves the public map', async ({
  page
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.goto('/admin/mapa');
  await expect(page.getByLabel('Ciudad', { exact: true })).toBeEnabled();
  await page.getByLabel('Ciudad', { exact: true }).selectOption('Roma');
  const city = 'Roma';
  const surface = page.getByRole('button', { name: /Situar ciudad en el mapa/ });
  const rect = (await surface.boundingBox())!;
  await surface.click({ position: { x: rect.width * 0.4, y: rect.height * 0.3 } });
  const clickedLatitude = Number(await page.getByLabel('Latitud norte').inputValue());
  expect(Math.abs(clickedLatitude - 44.1)).toBeLessThan(0.04);
  expect(Math.abs(Number(await page.getByLabel('Longitud este').inputValue()) - 11.2)).toBeLessThan(0.04);
  const movedLatitude = String(Number((clickedLatitude + 0.05).toFixed(5)));
  await surface.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByLabel('Latitud norte')).toHaveValue(movedLatitude);
  await page.getByRole('button', { name: 'Guardar mapa', exact: true }).click();
  await expect(page.getByText('Mapa guardado.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Ciudad', { exact: true })).toBeEnabled();
  await page.getByLabel('Ciudad', { exact: true }).selectOption('Roma');
  await expect(page.getByLabel('Latitud norte')).toHaveValue(movedLatitude);
  await page.screenshot({ path: '.local/e2e/map-editor.png', fullPage: true });
  await page.goto('/manuscritos');
  await page.getByRole('button', { name: `Ver ${city}`, exact: true }).click();
  await expect(page.locator('.selected-city')).toContainText(city);
});
