import { test, expect, type Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Local-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu mesa de trabajo' })).toBeVisible();
}

test('public pages, protected access and request security', async ({ page, request }) => {
  for (const path of [
    '/',
    '/presentacion',
    '/criterios',
    '/manuscritos',
    '/repertorio',
    '/busqueda',
    '/poemas/nan-xvii30-006',
    '/testimonios/nan-xvii30'
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  }
  expect((await request.get('/poemas/no-existe')).status()).toBe(404);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  const blocked = await request.post('/admin/poemas/nuevo?/publish', {
    form: { incipit: 'intrusion' },
    headers: { origin: 'https://evil.example' }
  });
  expect(blocked.status()).toBe(403);
  const anonymous = await request.get('/admin/poemas/nan-xvii30-006/vista-previa', {
    maxRedirects: 0
  });
  expect(anonymous.status()).toBe(303);
  await page.getByLabel('Correo electrónico').fill('tests@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrectos');
});

test('Antonietta can catalogue, preview, publish, rename and restore without a spreadsheet', async ({
  page,
  browser
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.getByRole('link', { name: 'Incorporar manuscrito' }).click();
  await page.getByLabel('Sigla del manuscrito').fill('Prueba E2E 999');
  await page.getByLabel('Ciudad', { exact: true }).fill('Roma');
  await page.getByLabel('Institución', { exact: true }).fill('Biblioteca de prueba');
  await page.getByLabel('Signatura', { exact: true }).fill('999');
  await page.getByRole('button', { name: 'Guardar y añadir poemas' }).click();
  await expect(page).toHaveURL(/\/admin\/poemas\/nuevo\?manuscrito=/);
  const parent = new URL(page.url()).searchParams.get('manuscrito')!;
  await expect(page.getByLabel('Orden topográfico')).toHaveValue('1');
  await page
    .getByRole('textbox', { name: 'Íncipit', exact: true })
    .fill('Una prueba de catalogación');
  await page.getByLabel('Forma métrico-poética').selectOption('soneto');
  await page.getByLabel('¿Tiene estrofas de desarrollo?').selectOption('no');
  await page.getByLabel('¿Tiene composiciones internas?').selectOption('no');
  await page.getByLabel('¿Tiene estribillo?').selectOption('no');
  await page.getByRole('textbox', { name: 'Transcripción', exact: true }).fill('Verso en cursiva');
  await page.getByRole('textbox', { name: 'Transcripción', exact: true }).press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Cursiva en Transcripción', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/poemas\/(?!nuevo)/);
  const poem = new URL(page.url()).pathname.split('/').at(-1)!;
  const visitor = await browser.newPage();
  await visitor.goto('/repertorio');
  await expect(visitor.getByText('Una prueba de catalogación', { exact: true })).toHaveCount(0);
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Vista previa guardada' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup.locator('.transcription em')).toHaveText('Verso en cursiva');
  await popup.close();
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Publica primero');
  await page.goto('/admin/testimonios/' + parent);
  await page.getByText('Publicar el manuscrito completo', { exact: true }).click();
  await page.getByLabel('He revisado el manuscrito y sus poemas guardados.').check();
  await page.getByRole('button', { name: 'Publicar manuscrito y poemas', exact: true }).click();
  await visitor.goto('/poemas/' + poem);
  await expect(visitor.locator('h1')).toContainText('Una prueba de catalogación');
  await expect(visitor.locator('.transcription em')).toHaveText('Verso en cursiva');
  await page.getByLabel('Sigla del manuscrito').fill('Prueba E2E corregida');
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await visitor.reload();
  await expect(visitor.locator('.item').first()).toContainText('Prueba E2E corregida-1');
  await page.goto('/admin/poemas/' + poem);
  await page.getByLabel('Atribución', { exact: true }).fill('Borrador confidencial');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await visitor.reload();
  await expect(visitor.getByText('Borrador confidencial')).toHaveCount(0);
  await page.getByText('Historial y recuperación de versiones', { exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar como borrador' }).last().click();
  await expect(page.getByLabel('Atribución', { exact: true })).toHaveValue('');
  await page.goto('/admin?kind=poemas&manuscrito=' + parent);
  await expect(
    page.getByRole('link', { name: 'Una prueba de catalogación', exact: true })
  ).toBeVisible();
  await page.screenshot({ path: '.local/e2e/panel-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/poemas/' + poem);
  await page.screenshot({ path: '.local/e2e/editor-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(errors).toEqual([]);
  await visitor.close();
});

test('web text editing and accounts enforce permissions', async ({ page, browser }) => {
  await login(page);
  await page.goto('/admin/textos/home-1');
  await page
    .getByRole('textbox', { name: 'Texto', exact: true })
    .fill('Portada de prueba publicada sin reconstrucción');
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  const visitor = await browser.newPage();
  await visitor.goto('/');
  await expect(visitor.getByText('Portada de prueba publicada sin reconstrucción')).toBeVisible();
  await page.goto('/admin/usuarios');
  await page.getByLabel('Nombre', { exact: true }).fill('Editora de prueba');
  await page.getByLabel('Correo electrónico').fill('editor@repomit.local');
  await page.getByLabel('Contraseña inicial').fill('Editor-test-password-1234');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cuenta creada');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill('editor@repomit.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Editor-test-password-1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.goto('/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Dar acceso a una persona' })).toHaveCount(0);
  const denied = await page.request.post('/admin/usuarios?/create', {
    headers: { origin: 'http://127.0.0.1:5174', accept: 'text/html' },
    form: { name: 'Evil', email: 'evil@test.local', password: 'Evil-password-12345' }
  });
  expect(denied.status()).toBe(403);
  await visitor.close();
});

test('new manuscript with several works: next item, numbering gaps, duplicate prevention and atomic publication', async ({
  page,
  browser
}) => {
  await login(page);
  await page.goto('/admin/testimonios/nuevo');
  await page.getByLabel('Sigla del manuscrito').fill('PrAlta 2026');
  await page.getByLabel('Ciudad', { exact: true }).fill('Florencia');
  await page
    .getByLabel('Institución', { exact: true })
    .fill('Biblioteca de nuevas incorporaciones');
  await page.getByLabel('Signatura', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Guardar y añadir poemas' }).click();
  await expect(page).toHaveURL(/manuscrito=/);
  const parent = new URL(page.url()).searchParams.get('manuscrito')!;
  await page
    .getByRole('textbox', { name: 'Íncipit', exact: true })
    .fill('Primera obra nueva del manuscrito');
  await page.getByLabel('Folios / páginas').fill('[3v-5r]');
  await page.getByLabel('Forma métrico-poética').selectOption('soneto');
  await page.getByRole('button', { name: 'Guardar y añadir siguiente', exact: true }).click();
  await expect(page.getByLabel('Orden topográfico')).toHaveValue('2');
  await expect(page.getByRole('textbox', { name: 'Íncipit', exact: true })).toBeEmpty();
  await page
    .getByRole('textbox', { name: 'Íncipit', exact: true })
    .fill('Segunda obra nueva con desarrollo');
  await page.getByLabel('Orden topográfico').fill('1');
  await page.getByLabel('Forma métrico-poética').selectOption('glosa');
  await page.getByLabel('¿Tiene estrofas de desarrollo?').selectOption('sí');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ya existe');
  await expect(page.getByRole('textbox', { name: 'Íncipit', exact: true })).toHaveText(
    'Segunda obra nueva con desarrollo'
  );
  await page.getByLabel('Orden topográfico').fill('4');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/poemas\/(?!nuevo)/);
  const poem = new URL(page.url()).pathname.split('/').at(-1)!;
  await page.goto('/admin/testimonios/' + parent);
  await expect(page.getByRole('heading', { name: 'Poemas de este manuscrito (2)' })).toBeVisible();
  await page.getByText('Publicar el manuscrito completo', { exact: true }).click();
  await page.getByLabel('He revisado el manuscrito y sus poemas guardados.').check();
  await page.getByRole('button', { name: 'Publicar manuscrito y poemas', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Poema 4');
  const visitor = await browser.newPage();
  expect((await visitor.goto('/testimonios/' + parent))?.status()).toBe(404);
  await page.goto('/admin/poemas/' + poem);
  await page
    .getByRole('textbox', { name: 'Íncipit del desarrollo', exact: true })
    .fill('Aquí empieza la estrofa');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await page.goto('/admin/testimonios/' + parent);
  await page.getByText('Publicar el manuscrito completo', { exact: true }).click();
  await page.getByLabel('He revisado el manuscrito y sus poemas guardados.').check();
  await page.getByRole('button', { name: 'Publicar manuscrito y poemas', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  expect((await visitor.goto('/testimonios/' + parent))?.status()).toBe(200);
  await expect(visitor.getByRole('link', { name: 'PrAlta 2026-1', exact: true })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'PrAlta 2026-4', exact: true })).toBeVisible();
  await expect(visitor.getByText('[3v-5r]', { exact: true })).toBeVisible();
  await visitor.goto('/repertorio');
  await visitor.getByLabel('Filtrar repertorio').fill('Segunda obra nueva');
  await expect(
    visitor.getByRole('link', { name: 'Segunda obra nueva con desarrollo', exact: true })
  ).toBeVisible();
  await page.goto('/admin/poemas/' + poem);
  await page.getByText('Retirar de la web pública', { exact: true }).click();
  await page.getByLabel('Quiero retirar esta ficha de la web pública.').check();
  await page.getByRole('button', { name: 'Retirar publicación', exact: true }).click();
  expect((await visitor.goto('/poemas/' + poem))?.status()).toBe(404);
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  expect((await visitor.goto('/poemas/' + poem))?.status()).toBe(200);
  await visitor.close();
});

test('editing existing works preserves rich text and rejects stale edits without losing input', async ({
  page,
  browser
}) => {
  await login(page);
  await page.goto('/admin/poemas/nan-xvii30-006');
  const peer = await page.context().newPage();
  await peer.goto('/admin/poemas/nan-xvii30-006');
  await page.getByLabel('Atribución', { exact: true }).fill('[Autora de prueba, María]');
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await peer
    .getByLabel('Atribución', { exact: true })
    .fill('Intento de sobrescribir una versión anterior');
  await peer.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(peer.getByRole('alert')).toContainText('Otra persona');
  await expect(peer.getByLabel('Atribución', { exact: true })).toHaveValue(
    'Intento de sobrescribir una versión anterior'
  );
  const visitor = await browser.newPage();
  await visitor.goto('/poemas/nan-xvii30-006');
  await expect(visitor.getByText('[Autora de prueba, María]', { exact: true })).toBeVisible();
  const transcription = page.getByRole('textbox', { name: 'Transcripción', exact: true });
  await transcription.fill('');
  await transcription.evaluate((el) => {
    const clipboard = new DataTransfer();
    clipboard.setData(
      'text/html',
      '<p>Primer verso con <i>cursiva</i></p><p>Segundo verso <b>destacado</b></p><script>alert("xss")</script><img src=x onerror=alert(1)>'
    );
    el.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard })
    );
  });
  await expect(transcription.locator('em')).toHaveText('cursiva');
  await expect(transcription.locator('strong')).toHaveText('destacado');
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await visitor.reload();
  await expect(visitor.locator('.transcription em')).toHaveText('cursiva');
  await expect(visitor.locator('.transcription strong')).toHaveText('destacado');
  expect(await visitor.locator('.transcription script,.transcription img').count()).toBe(0);
  await peer.close();
  await visitor.close();
});

test('neutral discreet access and formatted manuscript introduction render without browser errors', async ({
  page,
  browser
}) => {
  await page.goto('/');
  await expect(page.locator('header').getByRole('link', { name: 'Acceso de edición' })).toHaveCount(
    0
  );
  await expect(
    page.locator('footer').getByRole('link', { name: 'Acceso de edición' })
  ).toBeVisible();
  await page.locator('footer').getByRole('link', { name: 'Acceso de edición' }).click();
  await expect(page.getByRole('heading', { name: 'Acceso de edición', exact: true })).toBeVisible();
  await login(page);
  await page.goto('/admin/textos/manuscritos-intro');
  const textbox = page.getByRole('textbox', { name: 'Texto', exact: true });
  await textbox.fill('Primer párrafo');
  await textbox.press('End');
  await textbox.press('Enter');
  await textbox.press('Enter');
  await textbox.pressSequentially('Segundo párrafo');
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  const visitor = await browser.newPage();
  const errors: string[] = [];
  visitor.on('pageerror', (e) => errors.push(e.message));
  await visitor.goto('/manuscritos');
  await expect(visitor.locator('.intro')).toContainText('Primer párrafo');
  await expect(visitor.locator('.intro')).toContainText('Segundo párrafo');
  expect(errors).toEqual([]);
  await visitor.close();
});

test('an editor can add a metric form without losing unsaved work, reuse it and publish it', async ({
  page,
  browser
}) => {
  await login(page);
  await page.goto('/admin/poemas/nan-xvii30-007');
  await page
    .getByLabel('Atribución', { exact: true })
    .fill('Corrección pendiente que debe conservarse');
  await page.getByRole('button', { name: 'Añadir nueva forma', exact: true }).click();
  await page.getByLabel('Nombre de la nueva forma').fill('  Décima de prueba  ');
  await page.getByRole('button', { name: 'Crear y seleccionar', exact: true }).click();
  await expect(page.getByLabel('Forma métrico-poética')).toHaveValue('décima de prueba');
  await expect(page.getByLabel('Atribución', { exact: true })).toHaveValue(
    'Corrección pendiente que debe conservarse'
  );
  await page.getByRole('button', { name: 'Publicar ficha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  const visitor = await browser.newPage();
  await visitor.goto('/poemas/nan-xvii30-007');
  await expect(visitor.getByText('décima de prueba', { exact: true })).toBeVisible();
  await visitor.goto('/repertorio');
  await expect(visitor.locator('select option[value="décima de prueba"]')).toHaveCount(1);
  await page.goto('/admin/poemas/nan-xvii30-008');
  await expect(page.locator('select[name="forma"] option[value="décima de prueba"]')).toHaveCount(
    1
  );
  await page.getByRole('button', { name: 'Añadir nueva forma', exact: true }).click();
  await page.getByLabel('Nombre de la nueva forma').fill('DECIMA   DE PRUEBA');
  await page.getByRole('button', { name: 'Crear y seleccionar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ya existe');
  await page.getByRole('button', { name: 'Usar forma existente', exact: true }).click();
  await expect(page.getByLabel('Forma métrico-poética')).toHaveValue('décima de prueba');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  const denied = await visitor.request.post('/admin/formas', {
    maxRedirects: 0,
    headers: { origin: 'http://127.0.0.1:5174' },
    data: { name: 'Forma sin permiso' }
  });
  expect(denied.status()).toBe(303);
  await visitor.close();
});
