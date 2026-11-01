const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
async function newProfile(page, name = 'Auriculares QA') {
  await page.locator('[data-device="headphones"]').click();
  await page.locator('#deviceName').fill(name);
  await page.locator('[data-act="create"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'test');
}
async function passPreparation(page) {
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-act="introNext"]').click();
  }
  await expect(page.locator('#levelText')).toContainText('-36 dBFS');
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 2);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test('device choices and duration stay responsive', async ({ page }) => {
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'setup');
  await expect(page.locator('[data-device="car"]')).toBeVisible();
  await page.locator('[data-device="headphones"]').click();
  await expect(page.locator('[data-preset="photo10"]')).toHaveClass(/selected/);
  await page.locator('[data-testmode="complete"]').click();
  await expect(page.locator('#setupTrials')).toContainText('20');
  await page.locator('[data-device="car"]').click();
  await expect(page.locator('[data-preset="car7"]')).toHaveClass(/selected/);
  await expect(page.locator('#setupTrials')).toContainText('7');
  await noOverflow(page);
});

test('all eight languages preserve navigation and small-screen layout', async ({ page }) => {
  const selector = page.locator('#uiLanguage');
  for (const locale of ['es','en','fr','pt','it','de','zh','ja']) {
    await selector.selectOption(locale);
    await expect(selector).toHaveValue(locale);
    await expect(page.locator('[data-device="headphones"]')).toBeVisible();
    await noOverflow(page);
  }
  await page.locator('[data-nav="profiles"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'profiles');
  await noOverflow(page);
  await page.locator('[data-nav="setup"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'setup');
});

test('profile creation and local persistence survive reload', async ({ page }) => {
  const profileName = 'Auriculares QA';
  await newProfile(page, profileName);
  await expect(page.locator('#root')).toHaveAttribute('data-page', 'test');
  await page.reload();
  await page.locator('[data-nav="profiles"]').click();
  await expect(page.locator('.profile-focus .profile-title')).toHaveText(profileName);
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1')));
  expect(records).toHaveLength(1);
  expect(records[0].preset).toBe('photo10');
  expect(records[0].channels).toBe('separate');
  expect(records[0].testStart).toBe(-36);
  expect(records[0].testFloor).toBe(-84);
  await noOverflow(page);
});

test('guided test exposes explicit heard and not-heard responses', async ({ page }) => {
  await newProfile(page);
  await passPreparation(page);
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('[data-act="answerYes"]')).toBeVisible();
  await expect(page.locator('[data-act="answerNo"]')).toBeVisible();
  await page.locator('[data-act="answerYes"]').click();
  await expect(page.locator('#levelText')).toContainText('-48 dBFS');
  await page.locator('[data-act="play"]').click();
  await page.locator('[data-act="answerNo"]').click();
  await expect(page.locator('#levelText')).toContainText('-42 dBFS');
  await page.locator('[data-act="stopaudio"]').click();
  await noOverflow(page);
});

test('EQ editor updates saved profile and JSON export is valid', async ({ page }) => {
  await newProfile(page);
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page','results');
  await expect(page.locator('#audioPlayer')).toBeVisible();
  await page.locator('[data-eq-select]').first().click();
  const slider = page.locator('#eqSlider');
  await expect(slider).toBeVisible();
  await page.locator('#eqEditor [data-delta="1"]').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(Object.values(stored.manual || {}).some(x => x !== 0)).toBeTruthy();
  await page.locator('[data-nav="profiles"]').click();
  const downloadWait = page.waitForEvent('download');
  const backup = page.locator('details').filter({ has: page.locator('[data-act="exportall"]') });
  await backup.locator('summary').click();
  await page.locator('[data-act="exportall"]').click();
  const download = await downloadWait;
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(exported.app).toBe('AudioCal Hear');
  expect(exported.profiles).toHaveLength(1);
  await noOverflow(page);
});

test('optional microphone is not requested by default', async ({ page }) => {
  await page.addInitScript(() => {
    window.__micRequests = 0;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (...args) => {
        window.__micRequests++;
        return original(...args);
      };
    }
  });
  await page.reload();
  await newProfile(page);
  await passPreparation(page);
  expect(await page.evaluate(() => window.__micRequests)).toBe(0);
});

test('a contradictory answer is rechecked instead of becoming an uncertain result', async ({ page }) => {
  await newProfile(page);
  await passPreparation(page);
  const reply = async heard => {
    await page.locator('[data-act="play"]').click();
    await page.locator('[data-act="'+(heard?'answerYes':'answerNo')+'"]').click();
  };
  for (const heard of [true,true,false,false,false,true,false,false,true,false,true,false]) await reply(heard);
  await expect(page.locator('#root')).toContainText('Umbral aproximado confirmado');
  await expect(page.locator('#root')).not.toContainText('Resultado incierto');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  const measured = Object.values(stored.measures).flat().filter(Boolean);
  expect(measured).toHaveLength(1);
  expect(measured[0].kind).toBe('heard');
  expect(measured[0].db).toBe(-49);
});


test('Spotify transfer guide keeps local audio upload and adapts to custom bands', async ({ page }) => {
  await newProfile(page, 'Auriculares EQ');
  await page.locator('#uiLanguage').selectOption('es');
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#musicFile')).toBeAttached();
  await page.locator('#eqEditor [data-delta="1"]').click();
  await page.locator('[data-act="transfer-open"]').click();
  await page.locator('[data-transfer-target="spotify"]').click();
  await expect(page.locator('#transferPanel')).toContainText('Spotify Connect');
  await page.locator('[data-act="transfer-next"]').click();
  await page.locator('#transferFormat').selectOption('custom');
  await page.locator('#transferCustom').fill('60, 150, 400, 1000, 2400, 15000');
  await page.locator('[data-act="transfer-applyfreq"]').click();
  await expect(page.locator('#transferPanel')).toContainText('6 bandas de destino');
  await page.locator('[data-act="transfer-next"]').click();
  await expect(page.locator('.transfer-current')).toContainText('60 Hz');
  await page.locator('[data-act="transfer-mark"]').click();
  await page.locator('[data-act="transfer-nextband"]').click();
  await expect(page.locator('.transfer-current')).toContainText('150 Hz');
  await expect(page.locator('#musicFile')).toBeAttached();
  await noOverflow(page);
});

test('YouTube Music iPhone shows external hardware fallback, not false automatic application', async ({ page }) => {
  await newProfile(page, 'Auriculares YT');
  await page.locator('#uiLanguage').selectOption('es');
  await page.locator('[data-nav="results"]').click();
  await page.locator('[data-act="transfer-open"]').click();
  await page.locator('[data-transfer-target="youtube"]').click();
  await page.locator('[data-transfer-os="ios"]').click();
  await expect(page.locator('#transferPanel')).toContainText('no ofrece un ecualizador manual universal');
  await expect(page.locator('#transferPanel')).toContainText('sin acceso a tus cuentas');
  await page.locator('[data-act="transfer-next"]').click();
  await page.locator('#transferRange').selectOption('six');
  await page.locator('[data-act="transfer-next"]').click();
  await expect(page.locator('.transfer-current')).toBeVisible();
  await page.locator('[data-act="transfer-close"]').click();
  await expect(page.locator('[data-act="transfer-open"]')).toBeVisible();
  await noOverflow(page);
});

test('context is saved and raw threshold/automatic EQ remain visibly distinct', async ({page}) => {
  await page.locator('[data-device="car"]').click();
  await page.locator('#context-seat').selectOption('passenger');
  await page.locator('#context-windows').selectOption('open');
  await page.locator('#context-eqScale').selectOption('steps');
  await page.locator('#deviceName').fill('Auto contexto QA');
  await page.locator('[data-act="create"]').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(saved.context.seat).toBe('passenger');
  expect(saved.context.windows).toBe('open');
  expect(saved.context.eqScale).toBe('steps');
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#tracePanel')).toBeVisible();
  await expect(page.locator('#tracePanel')).toContainText('Medición original sin modificar');
  await expect(page.locator('#tracePanel')).toContainText('Corrección automática frente al ajuste final');
  await expect(page.locator('#tracePanel .trace-table tbody tr')).toHaveCount(7);
  await expect(page.locator('#tracePanel')).toContainText('NO se ha verificado');
  await noOverflow(page);
});
test('in-ear parameters persist and do not claim an acoustic measurement', async ({page}) => {
  await page.locator('[data-device="headphones"]').click();
  await page.locator('#context-subtype').selectOption('inear');
  await page.locator('#context-seal').selectOption('poor');
  await page.locator('#deviceName').fill('In ear QA');
  await page.locator('[data-act="create"]').click();
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#tracePanel')).toContainText('sellado no comprobado');
  await page.reload();
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#tracePanel')).toContainText('In-ear');
  await noOverflow(page);
});

test('EQ PNG card marks unknown units, then exports positions using an explicitly confirmed 2 dB step', async ({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Auto PNG QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#eqCardCanvas')).toBeVisible();
 await expect(page.locator('#eqCardNotice')).toContainText('desconocida');
 await page.locator('#resultEqScale').selectOption('steps');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('unknown');
 await page.locator('#resultEqStepDb').selectOption('2');
 await expect(page.locator('#eqCardNotice')).toContainText('experimental');
 const imagePromise=page.waitForEvent('download');
 await page.locator('[data-act="downloadpng"]').click();
 const png=await imagePromise;expect(png.suggestedFilename()).toContain('.png');
 const file=fs.readFileSync(await png.path());
 expect(file.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 await noOverflow(page);
});

test('optional loudness matching saves two relative responses without changing EQ',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Auto Loudness QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 const eqBefore=await page.locator('.eqband .eqval').allTextContents();
 await page.locator('#loudnessPanel summary').click();
 await expect(page.locator('#loudnessFrequency')).toBeVisible();
 await page.locator('[data-loudness="record"]').click();
 await expect(page.locator('#loudnessStatus')).toContainText('Escucha primero ambas');
 for(let pass=0;pass<2;pass++){
  await page.locator('[data-loudness="reference"]').click();
  await page.locator('[data-loudness="plus"]').click();
  await page.locator('[data-loudness="target"]').click();
  await page.locator('[data-loudness="record"]').click();
 }
 await expect(page.locator('#loudnessInner')).toContainText('Repetible');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 const first=Number(await page.locator('#loudnessFrequency').inputValue());
 expect(stored.loudness[first]).toHaveLength(2);
 expect(stored.measures).toEqual(before.measures);
 expect(await page.locator('.eqband .eqval').allTextContents()).toEqual(eqBefore);
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await page.locator('#loudnessPanel summary').click();
 await expect(page.locator('#loudnessInner')).toContainText('Repetible');
 await noOverflow(page);
});

test('cross-evidence CSV exports with units and leaves EQ untouched',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Auto audit QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#evidenceAudit')).toBeVisible();
 const gains=await page.locator('.eqband .eqval').allTextContents();
 const event=page.waitForEvent('download');
 await page.locator('[data-act="download-audit"]').click();
 const file=await event;
 expect(file.suggestedFilename()).toMatch(/Auditoria_.*\.csv$/);
 const text=fs.readFileSync(await file.path(),'utf8');
 expect(text).toContain('Sonoridad comparación 1 dBFS relativo');
 expect(text).toContain('local-contrast-v2-experimental');
 expect(await page.locator('.eqband .eqval').allTextContents()).toEqual(gains);
 await noOverflow(page);
});

test('historical second pass is not represented as independent repetition',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('[data-passes="2"]').click();
 await page.locator('#deviceName').fill('Perfil antiguo');
 await page.locator('[data-act="create"]').click();
 await page.evaluate(()=>{
   const list=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
   list[0].measures['64|both']=[{kind:'heard',db:-50,method:'adaptive-v18-explicit'},
       {kind:'heard',db:-50,method:'adaptive-v18-explicit'}];
   localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(list));
 });
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#evidenceAudit')).toContainText('Confirmación histórica');
 await expect(page.locator('#evidenceAudit')).toContainText('Registros históricos no independientes: 1');
 await expect(page.locator('#tracePanel')).toContainText('no búsqueda independiente');
 await noOverflow(page);
});
test('verify mode starts a fresh search for the second pass',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('[data-passes="2"]').click();
 await page.locator('#deviceName').fill('Dos búsquedas independientes');
 await page.locator('[data-act="create"]').click();
 await page.evaluate(()=>{
   const list=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
   for(const f of list[0].bands)list[0].measures[f+'|both']=[{kind:'heard',db:-50,method:'adaptive-v20-search'}];
   localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(list));
 });
 await page.reload();
 await page.locator('[data-nav="test"]').click();
 for(let i=0;i<3;i++)await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('#levelText')).toContainText('-36 dBFS');
 await expect(page.locator('#root')).toContainText('Búsqueda independiente 2/2');
});
