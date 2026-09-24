import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coordinatesFor, cityKey, project } from '../src/lib/map/geography.ts';
const folder = mkdtempSync(join(tmpdir(), 'repomit-map-'));
process.env.REPOMIT_DB = join(folder, 'test.sqlite');
const { getMapSettings, saveMapSettings, validateMapSettings } =
  await import('../src/lib/server/map-settings.ts');
const { db } = await import('../src/lib/server/database.ts');
after(() => {
  db.close();
  rmSync(folder, { recursive: true, force: true });
});
test('Rávena has its own geographic location and aliases share it', () => {
  const ravenna = coordinatesFor('Rávena')!;
  const rome = coordinatesFor('Roma')!;
  assert.deepEqual(ravenna, coordinatesFor('Ravenna'));
  assert.ok(ravenna.latitude > 44.3 && ravenna.latitude < 44.5);
  assert.ok(project(ravenna).y < project(rome).y - 60);
  assert.equal(coordinatesFor('Ciudad sin ubicar'), undefined);
  assert.equal(cityKey('Nápoles'), 'naples');
});
test('map coordinates persist, visibility changes and stale edits cannot overwrite corrections', async () => {
  const initial = await getMapSettings();
  await saveMapSettings(
    { visible: false, cities: { Rávena: { latitude: 44.42, longitude: 12.22 } } },
    initial.version
  );
  const saved = await getMapSettings();
  assert.equal(saved.settings.visible, false);
  assert.deepEqual(coordinatesFor('Ravenna', saved.settings), {
    latitude: 44.42,
    longitude: 12.22
  });
  await assert.rejects(
    () => saveMapSettings({ visible: true, cities: {} }, initial.version),
    /Otra persona/
  );
  assert.equal((await getMapSettings()).settings.visible, false);
});
test('invalid locations and malformed settings are rejected', () => {
  for (const latitude of [NaN, Infinity, 0, 90])
    assert.throws(() =>
      validateMapSettings({ visible: true, cities: { roma: { latitude, longitude: 12 } } })
    );
  assert.throws(() =>
    validateMapSettings({ visible: true, cities: { roma: { latitude: '44', longitude: 12 } } })
  );
  assert.throws(() => validateMapSettings({ visible: true, cities: [] }));
});
