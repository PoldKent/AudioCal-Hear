const { test, expect } = require('@playwright/test');
const PILOT='/tests/fixtures/hear3-legacy-v2-pilot.html';
const profile = (id='old1')=>({
 id,name:'Mi equipo original',type:'headphones',
 bands:[125,250,500,1000,2000,4000],
 preset:'photo10',channels:'separate',testStart:-36,testFloor:-100,
 measures:{'1000|left':[{kind:'heard',db:-55,history:[{db:-55,heard:true}]}]},
 manual:{1000:2},balance:{1000:1},context:{subtype:'overear'},
});
test('P0 V2 browser audit reads legacy keys without writing or generating false V3 results',async({page})=>{
 await page.goto(PILOT);
 await page.evaluate(p=>{
  localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify([p]));
  localStorage.setItem('audiocal-hear-active-v1',p.id);
 },profile());
 const original=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 await page.getByTestId('read').click();
 await expect(page.getByTestId('summary')).toContainText('Perfiles V2: 1');
 await expect(page.getByTestId('summary')).toContainText('Resultados de medición trasladados: 0');
 await expect(page.getByTestId('warning')).toContainText('conservados solo en el respaldo V2');
 await expect(page.getByTestId('export')).toBeEnabled();
 const archive=await page.evaluate(()=>JSON.parse(window.hear3LegacyPilot.archive()));
 expect(archive.sourceText).toBe(original);
 expect(JSON.parse(archive.sourceText)[0].measures['1000|left'][0].db).toBe(-55);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(original);
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBeNull();
});

test('P0 V2 auditor rejects bad frequencies and keeps old browser data unchanged',async({page})=>{
 await page.goto(PILOT);
 const bad=profile();bad.bands=[1000,500];
 await page.evaluate(p=>localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify([p])),bad);
 const before=await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'));
 await page.getByTestId('read').click();
 await expect(page.getByTestId('error')).toContainText('ordering or units invalid');
 await expect(page.getByTestId('export')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(before);
});

test('P0 V2 auditor can inspect a JSON file locally without importing or replacing data',async({page})=>{
 await page.goto(PILOT);
 const source=JSON.stringify([profile()]);
 await page.getByTestId('file').setInputFiles({
  name:'profiles-v2.json',mimeType:'application/json',buffer:Buffer.from(source),
 });
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('summary')).toContainText('Perfiles V2: 1');
 expect(await page.evaluate(()=>JSON.parse(window.hear3LegacyPilot.archive()).sourceText)).toBe(source);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBeNull();
});

test('P0 V2 archive is read-only, and historical measurement never becomes a V3 result',async({page})=>{
 await page.goto(PILOT);
 await page.evaluate(p=>localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify([p])),profile());
 await page.getByTestId('read').click();
 const preview=await page.evaluate(()=>window.hear3LegacyPilot.snapshot());
 expect(preview.migratedResults).toBe(0);
 expect(preview.automaticCommitAllowed).toBe(false);
 expect(preview.profiles[0].archivedOnlyFields).toContain('measures');
 expect(preview.profiles[0].archivedOnlyFields).toContain('manual');
});

test('P0 legacy history view shows evidence counts without invented V3 thresholds or audio',async({page})=>{
 await page.goto(PILOT);
 await page.evaluate(p=>localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify([p])),profile());
 await page.getByTestId('read').click();
 await expect(page.getByTestId('legacy-history')).toContainText('Registros V2: 1');
 await expect(page.getByTestId('legacy-history')).toContainText('No se han calculado umbrales V3');
 const data=await page.evaluate(()=>window.hear3LegacyPilot.history());
 expect(data.migratedV3Results).toBe(0);
 expect(data.profiles[0].historicalRecordCount).toBe(1);
 expect(data.profiles[0].observations[0].source).toBe('legacy-v2-unverified');
 expect(data.profiles[0].observations[0].thresholdDb).toBeUndefined();
 expect(await page.evaluate(()=>localStorage.getItem('hear3:catalog:v1:0'))).toBeNull();
});

test('P0 legacy labels are rendered as text and cannot execute source HTML',async({page})=>{
 await page.goto(PILOT);
 const p=profile();
 p.name='<img src=x onerror="window.__legacyInjected=1">';
 await page.evaluate(value=>localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify([value])),p);
 await page.getByTestId('read').click();
 await expect(page.getByTestId('legacy-history')).toContainText('<img src=x');
 expect(await page.getByTestId('legacy-history').locator('img').count()).toBe(0);
 expect(await page.evaluate(()=>Boolean(window.__legacyInjected))).toBe(false);
});

test('P0 official export history view keeps V2 records marked unverified',async({page})=>{
 await page.goto(PILOT);
 const original=JSON.stringify({app:'AudioCal Hear',version:1,profiles:[profile()]});
 await page.getByTestId('file').setInputFiles({
  name:'AudioCal_Hear_perfiles.json',mimeType:'application/json',
  buffer:Buffer.from(original),
 });
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('legacy-history')).toContainText('Registros V2: 1');
 const snapshot=await page.evaluate(()=>window.hear3LegacyPilot.history());
 expect(snapshot.profiles[0].observations[0].source).toBe('legacy-v2-unverified');
 expect(snapshot.migratedV3Results).toBe(0);
 expect(JSON.parse(await page.evaluate(()=>window.hear3LegacyPilot.archive())).sourceText).toBe(original);
});
