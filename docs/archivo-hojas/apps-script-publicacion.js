/**
 * Limita el acceso del script al documento actual.
 *
 * @OnlyCurrentDoc
 */
const DEPLOY_HOOK_URL = 'URL_DEL_DEPLOY_HOOK_DE_VERCEL';
const MINUTOS_ENTRE_PUBLICACIONES = 5;

function onEdit(event) {
  sincronizarSiglaTestimonio_(event);
}

function publicarRePoMIt() {
  UrlFetchApp.fetch(DEPLOY_HOOK_URL, { method: 'post' });
  PropertiesService.getScriptProperties().setProperty('ultimaPublicacion', String(Date.now()));
}

function publicarRePoMItDesdeEdicion(event) {
  sincronizarSiglaTestimonio_(event);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(500)) {
    return;
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const ultimaPublicacion = Number(properties.getProperty('ultimaPublicacion') || 0);
    const ahora = Date.now();
    const espera = MINUTOS_ENTRE_PUBLICACIONES * 60 * 1000;

    if (ahora - ultimaPublicacion < espera) {
      return;
    }

    publicarRePoMIt();
  } finally {
    lock.releaseLock();
  }
}

function configurarPublicacionAutomatica() {
  const hoja = SpreadsheetApp.getActive();

  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'publicarRePoMItDesdeEdicion') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('publicarRePoMItDesdeEdicion').forSpreadsheet(hoja).onEdit().create();
}

function sincronizarSiglaTestimonio_(event) {
  if (!event || !event.range || !event.value || !event.oldValue) {
    return;
  }

  const hoja = event.range.getSheet();
  if (hoja.getName() !== 'Testimonios' || event.range.getRow() === 1) {
    return;
  }

  const encabezados = hoja
    .getRange(1, 1, 1, hoja.getLastColumn())
    .getDisplayValues()[0]
    .map(normalizarEncabezado_);
  const columnaTestimonio = encabezados.indexOf('testimonio') + 1;

  if (columnaTestimonio === 0 || event.range.getColumn() !== columnaTestimonio) {
    return;
  }

  const poemas = event.source.getSheetByName('Poemas');
  if (!poemas) {
    return;
  }

  const encabezadosPoemas = poemas
    .getRange(1, 1, 1, poemas.getLastColumn())
    .getDisplayValues()[0]
    .map(normalizarEncabezado_);
  const columnaPoemasTestimonio = encabezadosPoemas.indexOf('testimonio') + 1;

  if (columnaPoemasTestimonio === 0 || poemas.getLastRow() < 2) {
    return;
  }

  const rango = poemas.getRange(2, columnaPoemasTestimonio, poemas.getLastRow() - 1, 1);
  const valores = rango.getValues();
  let cambios = 0;

  for (const fila of valores) {
    if (String(fila[0]).trim() === String(event.oldValue).trim()) {
      fila[0] = event.value;
      cambios += 1;
    }
  }

  if (cambios > 0) {
    rango.setValues(valores);
    SpreadsheetApp.getActive().toast(
      `Sigla actualizada en ${cambios} poema(s).`,
      'RePoMIt',
      5
    );
  }
}

function normalizarEncabezado_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RePoMIt')
    .addItem('Publicar ahora', 'publicarRePoMIt')
    .addItem('Activar publicacion automatica', 'configurarPublicacionAutomatica')
    .addToUi();
}
