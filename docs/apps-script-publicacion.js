const DEPLOY_HOOK_URL = 'URL_DEL_DEPLOY_HOOK_DE_VERCEL';
const MINUTOS_ENTRE_PUBLICACIONES = 5;

function publicarRePoMIt() {
  UrlFetchApp.fetch(DEPLOY_HOOK_URL, { method: 'post' });
  PropertiesService.getScriptProperties().setProperty('ultimaPublicacion', String(Date.now()));
}

function publicarRePoMItDesdeEdicion() {
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RePoMIt')
    .addItem('Publicar ahora', 'publicarRePoMIt')
    .addItem('Activar publicacion automatica', 'configurarPublicacionAutomatica')
    .addToUi();
}
