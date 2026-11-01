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
  if(await page.locator('[data-act="checkleft"]').count()){
    await page.locator('[data-act="checkleft"]').click();
    await expect(page.locator('[data-act="confirmleft"]')).toBeEnabled();
    await page.locator('[data-act="confirmleft"]').click();
    await page.locator('[data-act="checkright"]').click();
    await expect(page.locator('[data-act="confirmright"]')).toBeEnabled();
    await page.locator('[data-act="confirmright"]').click();
  }
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
  expect(records[0].testFloor).toBe(-100);
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
  test.setTimeout(110000);
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
  await page.locator('#context-eqStepDb').selectOption('unknown');
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
  await expect(page.locator('#tracePanel')).toContainText('sin conversión dB/paso');
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

test('EQ PNG card marks unknown units, then exports positions using a user-declared 2 dB step', async ({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#context-eqStepDb').selectOption('unknown');
 await page.locator('#deviceName').fill('Auto PNG QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#eqCardCanvas')).toBeVisible();
 await expect(page.locator('#eqCardNotice')).toContainText('desconocida');
 await page.locator('#resultEqScale').selectOption('steps');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('unknown');
 await page.locator('#resultEqStepDb').selectOption('2');
 await expect(page.locator('#eqCardNotice')).toContainText('Hear no lo verifica');
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
 await page.locator('#uiLanguage').selectOption('es');
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

test('3 dB per step is selectable, saved and retained in the result EQ guide',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#context-eqScale').selectOption('steps');
 await expect(page.locator('#context-eqStepDb option')).toHaveCount(4);
 await page.locator('#context-eqStepDb').selectOption('3');
 await expect(page.locator('#context-eqStepDb')).toHaveValue('3');
 await page.locator('#deviceName').fill('Auto 3 dB por paso');
 await page.locator('[data-act="create"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.context.eqStepDb).toBe('3');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#resultEqScale')).toHaveValue('steps');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('3');
 await page.locator('#resultEqStepDb').selectOption('2');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('2');
 await page.locator('#resultEqStepDb').selectOption('3');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('3');
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#resultEqStepDb')).toHaveValue('3');
 await noOverflow(page);
});

test('AF-02: changing a band keeps original measurements and synchronizes every EQ view',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('AF02 sincronización');
 await page.locator('[data-act="create"]').click();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 const freq=1000;
 const originalGraph=await page.locator('#tracePanel .trace-plot svg').innerHTML();
 const originalAuto=await page.locator('#tracePanel tbody tr').filter({has:page.getByRole('rowheader',{name:'1 kHz'})}).locator('td').nth(2).innerText();
 const pngBefore=await page.locator('#eqCardCanvas').evaluate(c=>c.toDataURL('image/png'));
 await page.evaluate(()=>window.__audioPlayerBefore=document.getElementById('audioPlayer'));
 await page.locator('[data-eq-select="1000"]').click();
 await page.locator('#eqSlider').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('[data-trace-final="1000"]')).toHaveText('+3 dB');
 await expect(page.locator('[data-eq-band="1000"] .eqval')).toHaveText('+3');
 await expect(page.locator('[data-eq-value="1000"]')).toContainText('+3');
 await expect(page.locator('#eqSelectedValue')).toHaveText('+3 dB');
 await expect(page.locator('#eqChangeCount')).toHaveText('1 cambios');
 await expect(page.locator('.stat-grid .stat:nth-child(3) strong')).toHaveText('1');
 const pngAfter=await page.locator('#eqCardCanvas').evaluate(c=>c.toDataURL('image/png'));
 expect(pngAfter).not.toBe(pngBefore);
 expect(await page.locator('#tracePanel .trace-plot svg').innerHTML()).toBe(originalGraph);
 expect(await page.locator('#tracePanel tbody tr').filter({has:page.getByRole('rowheader',{name:'1 kHz'})}).locator('td').nth(2).innerText()).toBe(originalAuto);
 expect(await page.evaluate(()=>document.getElementById('audioPlayer')===window.__audioPlayerBefore)).toBe(true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.manual['1000']).toBe(3);
 const txtEvent=page.waitForEvent('download');
 await page.locator('[data-act="downloadtxt"]').click();
 const txt=await txtEvent;
 const contents=fs.readFileSync(await txt.path(),'utf8');
 expect(contents).toMatch(/1 kHz\s+\+3 dB/);
 await page.locator('[data-act="clearmanual"]').click();
 await expect(page.locator('[data-trace-final="1000"]')).toHaveText('0 dB');
 await expect(page.locator('#eqChangeCount')).toHaveText('0 cambios');
 await noOverflow(page);
});
test('AF-02: transfer confirmation is invalidated after changing applied EQ values',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('AF02 transferencia');
 await page.locator('[data-act="create"]').click();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await page.locator('[data-act="transfer-open"]').click();
 await page.locator('[data-act="transfer-next"]').click();
 await page.locator('[data-act="transfer-next"]').click();
 await page.locator('[data-act="transfer-mark"]').click();
 await page.locator('[data-eq-select="1000"]').click();
 await page.locator('#eqSlider').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#transferStatus')).toContainText('Los valores de EQ cambiaron');
 await noOverflow(page);
});

test('AF-02: physical EQ scale changes invalidate checked transfer bands',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#context-eqStepDb').selectOption('unknown');
 await page.locator('#deviceName').fill('AF02 rango');
 await page.locator('[data-act="create"]').click();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await page.locator('[data-act="transfer-open"]').click();
 await page.locator('[data-act="transfer-next"]').click();
 await page.locator('[data-act="transfer-next"]').click();
 await page.locator('[data-act="transfer-mark"]').click();
 await page.locator('#resultEqScale').selectOption('db');
 await page.locator('#resultEqScale').selectOption('steps');
 await expect(page.locator('#transferStatus')).toContainText('Cambió la escala');
 await expect(page.locator('#resultEqStepDb')).toHaveValue('unknown');
 await noOverflow(page);
});

test('digital reference is 0 to −100, playback defaults safely below 0',async({page})=>{
 await expect(page.locator('#root')).toContainText('0 a −100 dBFS');
 await expect(page.locator('#testStart')).toHaveValue('-36');
 await expect(page.locator('#testFloor')).toHaveValue('-100');
 await expect(page.locator('#testStart')).toHaveAttribute('max','0');
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Escala 0 a -100');
 await page.locator('[data-act="create"]').click();
 const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(p.testStart).toBe(-36);
 expect(p.testFloor).toBe(-100);
});
test('separate-ear test requires subjective left/right checks before playing',async({page})=>{
 await newProfile(page,'Lados confirmados');
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('#root')).toContainText('Comprobar izquierda y derecha');
 await expect(page.locator('[data-act="confirmleft"]')).toBeDisabled();
 await page.locator('[data-act="checkleft"]').click();
 await page.locator('[data-act="confirmleft"]').click();
 await page.locator('[data-act="checkright"]').click();
 await page.locator('[data-act="confirmright"]').click();
 await passPreparation(page);
 await expect(page.locator('#levelText')).toContainText('-36 dBFS');
});
test('PNG horizontal EQ exports a landscape image with frequency columns for 7 and 10 bands',async({page})=>{
 for(const [device,count] of [['car',7],['headphones',10]]){
  await page.locator('[data-device="'+device+'"]').click();
  await page.locator('#deviceName').fill('Horizontal EQ '+count);
  await page.locator('[data-act="create"]').click();
  await page.locator('[data-nav="results"]').click();
  const canvas=page.locator('#eqCardCanvas');
  const dims=await canvas.evaluate(c=>({w:c.width,h:c.height,signature:c.toDataURL('image/png').slice(0,30)}));
  expect(dims.w).toBeGreaterThan(dims.h);
  expect(dims.h).toBe(782);
  expect(dims.signature).toContain('data:image/png;base64,');
  await expect(canvas).toHaveAttribute('aria-label',/Ecualizador horizontal/);
  const download=page.waitForEvent('download');
  await page.locator('[data-act="downloadpng"]').click();
  const png=await download;
  const file=fs.readFileSync(await png.path());
  expect(file.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(file.readUInt32BE(16)).toBeGreaterThan(file.readUInt32BE(20));
  await noOverflow(page);
  await page.locator('[data-nav="setup"]').click();
 }
});

test('physical car control limits are independent of recommended digital gain limits',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await expect(page.locator('#context-eqScale')).toHaveValue('steps');
 await expect(page.locator('#context-eqStepDb')).toHaveValue('3');
 await expect(page.locator('#controlMin')).toHaveValue('-6');
 await expect(page.locator('#controlMax')).toHaveValue('6');
 await expect(page.locator('#eqMin')).toHaveValue('-6');
 await expect(page.locator('#eqMax')).toHaveValue('6');
 await page.locator('#controlMin').fill('-4');
 await page.locator('#controlMax').fill('5');
 await page.locator('#deviceName').fill('Auto límites independientes');
 await page.locator('[data-act="create"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect([saved.min,saved.max,saved.controlMin,saved.controlMax]).toEqual([-6,6,-4,5]);
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#resultControlMin')).toHaveValue('-4');
 await expect(page.locator('#resultControlMax')).toHaveValue('5');
 await expect(page.locator('#eqCardSection')).toContainText('equivalencia nominal -12 a +15 dB');
 await page.locator('#resultControlMax').fill('4');
 await page.locator('#resultControlMax').blur();
 await expect(page.locator('#resultControlMax')).toHaveValue('4');
 const updated=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect([updated.min,updated.max,updated.controlMin,updated.controlMax]).toEqual([-6,6,-4,4]);
 await noOverflow(page);
});

test('car and speakers can opt into 0 dBFS only with staged manual volume verification',async({page})=>{
 await page.locator('details').filter({has:page.locator('#testStart')}).locator('summary').click();
 await expect(page.locator('#testStart')).toHaveAttribute('max','0');
 await page.locator('#testStart').fill('0');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-act="create"]').click();
 await expect(page.locator('#root')).toHaveAttribute('data-page','test');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.type).toBe('car');
 expect(saved.testStart).toBe(0);
 expect(saved.testFloor).toBe(-100);
 await page.locator('[data-act="introNext"]').click();
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('[data-act="previewlevel"]')).toContainText('-36 dBFS');
 await expect(page.locator('[data-act="confirmlevel"]')).toBeDisabled();
 page.once('dialog',d=>d.accept());
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('[data-act="previewlevel"]')).toBeVisible();
 await page.locator('[data-act="previewlevel"]').click();
 await expect(page.locator('[data-act="confirmlevel"]')).toBeEnabled();
 await page.locator('[data-act="confirmlevel"]').click();
 await expect(page.locator('[data-act="previewlevel"]')).toContainText('-24 dBFS');
 await page.reload();
 await page.locator('[data-nav="test"]').click();
 await page.locator('[data-act="introNext"]').click();
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('[data-act="previewlevel"]')).toBeVisible();
 await page.locator('[data-nav="setup"]').click();
 await page.locator('[data-device="speaker"]').click();
 await page.locator('details').filter({has:page.locator('#testStart')}).locator('summary').click();
 await expect(page.locator('#testStart')).toHaveAttribute('max','0');
 await noOverflow(page);
});

test('headphones cannot inherit the car full-scale setting',async({page})=>{
 await page.locator('details').filter({has:page.locator('#testStart')}).locator('summary').click();
 await page.locator('#testStart').fill('0');
 await page.locator('[data-device="headphones"]').click();
 await page.locator('details').filter({has:page.locator('#testStart')}).locator('summary').click();
 await expect(page.locator('#testStart')).toHaveAttribute('max','-24');
 await expect(page.locator('#testStart')).toHaveValue('-24');
 await page.locator('#deviceName').fill('Headphones QA safe bound');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-act="create"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.type).toBe('headphones');
 expect(saved.testStart).toBe(-24);
});
