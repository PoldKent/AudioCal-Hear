const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

// Deterministically test audio cancellation before a suspended AudioContext resumes.
async function deferAudioResume(page){
 await page.evaluate(()=>{
  window.__hearOscillatorStarts=0;
  window.__hearResumePending=false;
  class DeferredAudioContext{
   constructor(){this.state='suspended';this.sampleRate=48000;this.currentTime=0;}
   resume(){window.__hearResumePending=true;return new Promise(resolve=>{
    window.__hearReleaseResume=()=>{this.state='running';resolve()};
   });}
   createOscillator(){window.__hearOscillatorStarts++;throw new Error('Stale oscillator scheduled');}
  }
  Object.defineProperty(window,'AudioContext',{configurable:true,value:DeferredAudioContext});
 });
}
async function releaseAudioResume(page){
 await expect.poll(()=>page.evaluate(()=>window.__hearResumePending)).toBeTruthy();
 await page.evaluate(()=>{window.__hearReleaseResume();return new Promise(resolve=>setTimeout(resolve,80))});
 expect(await page.evaluate(()=>window.__hearOscillatorStarts)).toBe(0);
}

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
  await page.locator('[data-act="introNext"]').click();
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

test('contradictions yield a saved low-confidence estimate and advance without repeating',async({page})=>{
 await newProfile(page,'Estimación sin repeticiones');
 await passPreparation(page);
 const reply=async heard=>{
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('[data-act="answerYes"]')).toBeVisible();
  await page.locator('[data-act="'+(heard?'answerYes':'answerNo')+'"]').click();
 };
 for(const heard of [true,true,false,false,false,true,false,true])await reply(heard);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 const samples=Object.values(stored.measures).flat().filter(Boolean);
 expect(samples).toHaveLength(1);
 expect(samples[0].kind).toBe('heard');
 expect(Number.isFinite(samples[0].db)).toBe(true);
 expect(samples[0].confidence).toBe('low');
 expect(samples[0].history).toHaveLength(8);
 expect(samples[0].contradictions).toBeGreaterThan(0);
 await expect(page.locator('#levelText')).toContainText('-36 dBFS');
 await expect(page.locator('#root')).not.toContainText('Resultado guardado');
 await page.locator('[data-nav="results"]').click();
 await page.locator('#technicalResults > summary').click();
 await page.locator('#uiLanguage').selectOption('es');
 await expect(page.locator('#tracePanel')).toContainText('confianza baja');
});

test('a tone can be answered while still playing on every viewport',async({page})=>{
 await newProfile(page,'Responder antes de los tres segundos');
 await passPreparation(page);
 await page.locator('[data-act="play"]').click();
 await expect(page.locator('#holdSeconds')).toBeVisible();
 await expect(page.locator('[data-act="answerYes"]')).toBeVisible();
 await expect(page.locator('[data-act="answerNo"]')).toBeVisible();
 await page.locator('[data-act="answerYes"]').click();
 await expect(page.locator('#levelText')).toContainText('-48 dBFS');
 await expect(page.locator('#holdSeconds')).toHaveCount(0);
 await noOverflow(page);
});

test('Spotify transfer guide keeps local audio upload and adapts to custom bands', async ({ page }) => {
  await newProfile(page, 'Auriculares EQ');
  await page.locator('#uiLanguage').selectOption('es');
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#transferPanel')).toBeAttached();
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
  await expect(page.locator('#transferPanel')).toBeAttached();
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
 await page.locator('#physicalSetup > summary').click();
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
  await page.locator('#technicalResults > summary').click();
   await expect(page.locator('#tracePanel')).toBeVisible();
  await expect(page.locator('#tracePanel')).toContainText('Medición original sin modificar');
  await expect(page.locator('#tracePanel')).toContainText('Corrección automática frente al ajuste final');
  await expect(page.locator('#tracePanel .trace-table tbody tr')).toHaveCount(7);
  await expect(page.locator('#tracePanel')).toContainText('sin conversión dB/paso');
  await noOverflow(page);
});
test('in-ear parameters persist and do not claim an acoustic measurement', async ({page}) => {
  await page.locator('[data-device="headphones"]').click();
 await page.locator('#physicalSetup > summary').click();
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
 await page.locator('#physicalSetup > summary').click();
 await page.locator('#context-eqStepDb').selectOption('unknown');
 await page.locator('#deviceName').fill('Auto PNG QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await page.locator('#eqCardSection > summary').click();
 await expect(page.locator('#eqCardCanvas')).toHaveCount(0);
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

test('results only offer tone-based EQ without an additional loudness exercise',async({page})=>{
 await newProfile(page,'Sin pruebas extras');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#loudnessPanel')).toHaveCount(0);
 await expect(page.locator('#musicComparison')).toHaveCount(0);
 await expect(page.locator('#eqEditor')).toBeVisible();
 await expect(page.locator('.transfer-card')).toHaveAttribute('open','');
 await noOverflow(page);
});

test('cross-evidence CSV exports with units and leaves EQ untouched',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Auto audit QA');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await page.locator('#technicalResults > summary').click();
 await expect(page.locator('#evidenceAudit')).toBeVisible();
 const gains=await page.locator('.eqband .eqval').allTextContents();
 const event=page.waitForEvent('download');
 await page.locator('[data-act="download-audit"]').click();
 const file=await event;
 expect(file.suggestedFilename()).toMatch(/Auditoria_.*\.csv$/);
 const text=fs.readFileSync(await file.path(),'utf8');
 expect(text).toContain('Sonoridad comparación 1 dBFS relativo');
 expect(text).toContain('tone-relative-v3-experimental');
 expect(await page.locator('.eqband .eqval').allTextContents()).toEqual(gains);
 await noOverflow(page);
});

test('historical second pass is not represented as independent repetition',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Perfil antiguo');
 await page.locator('[data-act="create"]').click();
 await page.evaluate(()=>{const key='audiocal-hear-profiles-v1';const list=JSON.parse(localStorage.getItem(key));list[0].passes=2;localStorage.setItem(key,JSON.stringify(list))});
 await page.reload();
 await page.evaluate(()=>{
   const list=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
   list[0].measures['64|both']=[{kind:'heard',db:-50,method:'adaptive-v18-explicit'},
       {kind:'heard',db:-50,method:'adaptive-v18-explicit'}];
   localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(list));
 });
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await page.locator('#technicalResults > summary').click();
 await page.locator('#uiLanguage').selectOption('es');
 await expect(page.locator('#evidenceAudit')).toContainText('Confirmación histórica');
 await expect(page.locator('#evidenceAudit')).toContainText('Registros históricos no independientes: 1');
 await expect(page.locator('#tracePanel')).toContainText('no búsqueda independiente');
 await noOverflow(page);
});
test('verify mode starts a fresh search for the second pass',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Dos búsquedas independientes');
 await page.locator('[data-act="create"]').click();
 await page.evaluate(()=>{const key='audiocal-hear-profiles-v1';const list=JSON.parse(localStorage.getItem(key));list[0].passes=2;localStorage.setItem(key,JSON.stringify(list))});
 await page.reload();
 await page.evaluate(()=>{
   const list=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
   for(const f of list[0].bands)list[0].measures[f+'|both']=[{kind:'heard',db:-50,method:'adaptive-v20-search'}];
   localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(list));
 });
 await page.reload();
 await page.locator('[data-nav="test"]').click();
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('#levelText')).toContainText('-36 dBFS');
 await expect(page.locator('#root')).toContainText('Búsqueda independiente 2/2');
});

test('3 dB per step is selectable, saved and retained in the result EQ guide',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#physicalSetup > summary').click();
 await page.locator('#context-eqScale').selectOption('steps');
 await expect(page.locator('#context-eqStepDb option')).toHaveCount(4);
 await page.locator('#context-eqStepDb').selectOption('3');
 await expect(page.locator('#context-eqStepDb')).toHaveValue('3');
 await page.locator('#deviceName').fill('Auto 3 dB por paso');
 await page.locator('[data-act="create"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.context.eqStepDb).toBe('3');
 await page.locator('[data-nav="results"]').click();
 await page.locator('#eqCardSection > summary').click();
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
 await page.locator('#technicalResults > summary').click();
 const freq=1000;
 const originalGraph=await page.locator('#tracePanel .trace-plot svg').innerHTML();
 const originalAuto=await page.locator('#tracePanel tbody tr').filter({has:page.getByRole('rowheader',{name:'1 kHz'})}).locator('td').nth(2).innerText();
 const beforeDownload=page.waitForEvent('download');
 await page.locator('[data-act="downloadpng"]').click();
 const pngBefore=fs.readFileSync(await (await beforeDownload).path());
 await page.evaluate(()=>window.__audioPlayerBefore=document.getElementById('audioPlayer'));
 await page.locator('[data-eq-select="1000"]').click();
 await page.locator('#eqSlider').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('[data-trace-final="1000"]')).toHaveText('+3 dB');
 await expect(page.locator('[data-eq-band="1000"] .eqval')).toHaveText('+3');
 await expect(page.locator('#eqSlider')).toHaveValue('3');
 await expect(page.locator('#eqSelectedValue')).toHaveText('+3 dB');
 await expect(page.locator('#eqChangeCount')).toHaveText('1 cambios');
 
 const afterDownload=page.waitForEvent('download');
 await page.locator('[data-act="downloadpng"]').click();
 const pngAfter=fs.readFileSync(await (await afterDownload).path());
 expect(pngAfter).not.toBe(pngBefore);
 expect(await page.locator('#tracePanel .trace-plot svg').innerHTML()).toBe(originalGraph);
 expect(await page.locator('#tracePanel tbody tr').filter({has:page.getByRole('rowheader',{name:'1 kHz'})}).locator('td').nth(2).innerText()).toBe(originalAuto);
 expect(await page.evaluate(()=>document.getElementById('audioPlayer')===window.__audioPlayerBefore)).toBe(true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.manual['1000']).toBe(3);
 const txtEvent=page.waitForEvent('download');
 await page.locator('#eqCardSection > summary').click();
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
 await page.locator('#technicalResults > summary').click();
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
 await page.locator('#physicalSetup > summary').click();
 await page.locator('#context-eqStepDb').selectOption('unknown');
 await page.locator('#deviceName').fill('AF02 rango');
 await page.locator('[data-act="create"]').click();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await page.locator('#eqCardSection > summary').click();
 // Transfer guide is already expanded in the tone-only UI.
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
  

   await expect(page.locator('#eqCardCanvas')).toHaveCount(0);
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
 await page.locator('#physicalSetup > summary').click();
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
 await page.locator('#eqCardSection > summary').click();
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

test('high-level car/speaker test retains a staged manual volume check on the single prep screen',async({page})=>{
 await page.locator('details').filter({has:page.locator('#testStart')}).locator('summary').click();
 await expect(page.locator('#testStart')).toHaveAttribute('max','0');
 await page.locator('#testStart').fill('0');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-act="create"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.type).toBe('car');
 expect(saved.testStart).toBe(0);
 expect(saved.testFloor).toBe(-100);
 await expect(page.locator('#root')).toContainText('Referencia 1');
 await expect(page.locator('#root')).toContainText('-36 dBFS');
 await expect(page.locator('[data-act="confirmlevel"]')).toBeDisabled();
 page.once('dialog',d=>d.accept());
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('[data-act="previewlevel"]')).toBeVisible();
 await page.locator('[data-act="previewlevel"]').click();
 await expect(page.locator('[data-act="confirmlevel"]')).toBeEnabled({timeout:10000});
 await page.locator('[data-act="confirmlevel"]').click();
 await expect(page.locator('#root')).toContainText('-24 dBFS');
 await page.reload();
 await page.locator('[data-nav="test"]').click();
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

test('results prioritize an actionable 10-band starter EQ and keep the evidence optional',async({page})=>{
 await page.locator('[data-device="headphones"]').click();
 await page.locator('#deviceName').fill('Guía práctica de 10 bandas');
 await page.locator('[data-act="create"]').click();
 await page.evaluate(()=>{
  const list=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
  const p=list[0],freqs=[30,60,120,250,500,1000,2000,4000,8000,16000];
  const left=[-36.5,-60,-68,-72,-84,-98,-90,-96,-87,-26];
  const right=[-36,-60,-72,-72,-84,-94,null,-96,-96,-26];
  for(let i=0;i<freqs.length;i++){
   for(const [side,arr] of [['left',left],['right',right]]){
    const db=arr[i];
    p.measures[freqs[i]+'|'+side]=[{kind:db===null?'stillheard':'heard',db,confidence:'low',method:'adaptive-v21-short',
      audibleDb:db,inaudibleDb:db===null?null:db-2,uncertaintyDb:2,contradictions:1,history:[]}];
   }
  }
  localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(list));
 });
 await page.reload();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#starterGuide')).toBeVisible();
 await expect(page.locator('#starterGuide')).toContainText('Propuesta del test');
 await expect(page.locator('[data-eq-band]')).toHaveCount(10);
 await expect(page.locator('#technicalResults')).not.toHaveAttribute('open');
 await expect(page.locator('#starterGuide')).toContainText('Punto de partida');
 await expect(page.locator('[data-act="starter-apply"]')).toHaveCount(0);
 const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(p.measures['250|left'][0].db).toBe(-72);
 expect(Object.values(p.manual).every(x=>x===0)).toBeTruthy();
 await noOverflow(page);
});

test('opening advanced results stays preserved when physical EQ unit changes',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Paneles persistentes');
 await page.locator('[data-act="create"]').click();
 await page.locator('[data-nav="results"]').click();
 await page.locator('#eqCardSection > summary').click();
 await expect(page.locator('#eqCardSection')).toHaveAttribute('open','');
 await page.locator('#resultEqScale').selectOption('db');
 await expect(page.locator('#eqCardSection')).toHaveAttribute('open','');
 await page.locator('#resultEqScale').selectOption('steps');
 await expect(page.locator('#eqCardSection')).toHaveAttribute('open','');
 await expect(page.locator('#resultEqStepDb')).toBeVisible();
 await noOverflow(page);
});

test('single equalizer keeps one visible chart and exposes categorized optional actions',async({page})=>{
 await page.locator('[data-device="headphones"]').click();
 await page.locator('#deviceName').fill('Único EQ');
 await page.locator('[data-act="create"]').click();
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await expect(page.getByRole('heading',{name:/Tu ecualizador · 10 bandas/})).toHaveCount(1);
 await expect(page.getByRole('heading',{name:/Mi ecualizador · resultado para aplicar/})).toHaveCount(0);
 await expect(page.locator('#eqCardCanvas')).toHaveCount(0);
 await expect(page.locator('[data-eq-band]')).toHaveCount(10);
 await expect(page.locator('#starterGuide')).toBeVisible();
 await expect(page.locator('#eqCardSection')).not.toHaveAttribute('open','');
 await page.locator('#eqCardSection > summary').click();
 await page.locator('#resultEqScale').selectOption('steps');
 await expect(page.locator('#eqCardSection')).toHaveAttribute('open','');
 await expect(page.locator('#resultEqStepDb')).toBeVisible();
 await noOverflow(page);
});


test('the simplified preparation does not require a preliminary frequency sweep',async({page})=>{
 await page.locator('[data-device="speaker"]').click();
 await page.locator('#deviceName').fill('Ecualizador directo');
 await page.locator('[data-act="create"]').click();
 await expect(page.locator('#preSweepPanel')).toHaveCount(0);
 await expect(page.locator('#inlineLoudness')).toHaveCount(0);
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('#levelText')).toContainText('dBFS');
 await noOverflow(page);
});

test('headphone preparation only requires tone channel confirmation',async({page})=>{
 await newProfile(page,'Canales de auriculares');
 await expect(page.locator('#preSweepPanel')).toHaveCount(0);
 await expect(page.locator('#inlineLoudness')).toHaveCount(0);
 await expect(page.locator('#ambientCheck')).toHaveCount(0);
 await passPreparation(page);
 await expect(page.locator('#levelText')).toContainText('dBFS');
 await noOverflow(page);
});

test('results provide editable EQ without personal sound or A/B requirements',async({page})=>{
 await newProfile(page,'EQ sin música');
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#starterGuide')).toContainText('Calculado con tonos');
 await expect(page.locator('[data-eq-band]')).toHaveCount(10);
 for(const selector of ['#musicComparison','#musicTools','#personalSoundReview','[data-act="preview-sound"]'])
  await expect(page.locator(selector)).toHaveCount(0);
 await expect(page.locator('.transfer-card')).toHaveAttribute('open','');
 await noOverflow(page);
});

test('the hearing test uses only adaptive tones without inline loudness or sweeps',async({page})=>{
 await page.locator('[data-device="speaker"]').click();
 await page.locator('#deviceName').fill('Test de tonos');
 await page.locator('[data-act="create"]').click();
 await expect(page.locator('#inlineLoudness')).toHaveCount(0);
 await expect(page.locator('#preSweepPanel')).toHaveCount(0);
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('#levelText')).toBeVisible();
 await expect(page.locator('[data-act="play"]')).toBeVisible();
 await noOverflow(page);
});

const thresholdEvidence=measures=>Object.fromEntries(Object.entries(measures||{}).map(([k,records])=>[k,records.map(x=>({kind:x.kind,db:x.db,confidence:x.confidence,method:x.method}))]));
test('Hear 2.0 complete simulated 20-threshold profile produces one persistent editable/exportable EQ',async({page})=>{
 await newProfile(page,'Recorrido completo 10 bandas');
 await page.locator('#uiLanguage').selectOption('es');
 await page.evaluate(()=>{
  const all=JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'));
  const p=all[0],freq=p.bands;
  const levels=freq.map(f=>f===1000?-82:f===2000?-62:-62);
  for(const [i,f] of freq.entries()){
   for(const side of ['left','right']){
    p.measures[f+'|'+side]=[{kind:'heard',db:levels[i]+(side==='right'?1:0),
     confidence:'low',method:'adaptive-v21-short',elapsedS:24,at:Date.now()}];
   }
  }
  p.sweepRecords={left:{method:'fixed-digital-level-preflight-v1',minHz:125,maxHz:8000,
   durationS:22,levelDbfs:-42,at:Date.now(),micUsed:false,mic:[],
   events:[{hz:300,heard:true},{hz:7800,heard:false}]}};
  localStorage.setItem('audiocal-hear-profiles-v1',JSON.stringify(all));
 });
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await expect(page.getByRole('heading',{name:/Tu ecualizador · 10 bandas/})).toHaveCount(1);
 await expect(page.locator('[data-eq-band]')).toHaveCount(10);
 await expect(page.locator('#starterGuide')).toContainText('Propuesta del test');
 await expect(page.locator('p.small.muted').filter({hasText:'10/10 bandas'})).toHaveCount(1);
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures);
 expect(Object.keys(original)).toHaveLength(20);
 await expect(page.locator('[data-act="starter-apply"]')).toHaveCount(0);
 const firstDownload=page.waitForEvent('download');
 await page.locator('[data-act="downloadpng"]').click();
 const pngBefore=fs.readFileSync(await (await firstDownload).path());
 expect(pngBefore.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 // The automatic recommendation is already in the live EQ.
 // An edit must change exported values without changing threshold evidence.
 await page.locator('[data-eq-select="1000"]').click();
 await page.locator('#eqEditor [data-delta="1"]').click();
 const edited=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(Object.values(edited.manual).some(x=>x!==0)).toBe(true);
 expect(thresholdEvidence(edited.measures)).toEqual(thresholdEvidence(original));
 const secondDownload=page.waitForEvent('download');
 await page.locator('[data-act="downloadpng"]').click();
 const pngAfter=fs.readFileSync(await (await secondDownload).path());
 expect(pngAfter.equals(pngBefore)).toBe(false);
 await expect(page.locator('#starterGuide')).toContainText('ajustes personales');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(thresholdEvidence(stored.measures)).toEqual(thresholdEvidence(original));
 await page.locator('#technicalResults > summary').click();
 await expect(page.locator('#preSweepResults')).toBeVisible();
 await expect(page.locator('#tracePanel')).toBeVisible();
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('[data-eq-band]')).toHaveCount(10);
 await expect(page.locator('[data-act="starter-apply"]')).toHaveCount(0);
 const afterReload=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(thresholdEvidence(afterReload.measures)).toEqual(thresholdEvidence(original));
 expect(afterReload.manual).toEqual(stored.manual);
 await expect(page.locator('#musicComparison')).toHaveCount(0);
 await expect(page.locator('#personalSoundReview')).toHaveCount(0);
 await expect(page.locator('.transfer-card')).toHaveAttribute('open','');
 await noOverflow(page);
});

test('completed uncertain hearing test keeps recommendations first and music optional',async({page})=>{
 await newProfile(page,'Umbrales inciertos');
 await page.locator('#uiLanguage').selectOption('es');
 await page.evaluate(()=>{
  const key='audiocal-hear-profiles-v1',p=JSON.parse(localStorage.getItem(key));
  for(const f of p[0].bands){
   for(const side of ['left','right']){
    p[0].measures[f+'|'+side]=[{kind:'heard',db:-49,confidence:'low',method:'adaptive-v21-short',
     audibleDb:-49,inaudibleDb:-49,contradictions:1}];
   }
  }
  localStorage.setItem(key,JSON.stringify(p));
 });
 await page.reload();
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#starterGuide')).toBeVisible();
 await expect(page.locator('#eqChangeCount')).toContainText('0 cambios');
 await expect(page.locator('#personalSoundFinish')).toHaveCount(0);
 await expect(page.locator('#musicComparison')).toHaveCount(0);
 await expect(page.locator('#musicFile')).not.toBeVisible();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('[data-act="previous-frequency"]').click();
 await passPreparation(page); // Fresh channel confirmation is required on returning to the test.
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures);
 expect(Object.keys(after).length).toBe(Object.keys(before).length-2);
 await noOverflow(page);
});
test('16 kHz first inaudible presentation increases digital dBFS and remains in the same band',async({page})=>{
 await newProfile(page,'Prueba 16 kHz');
 await page.locator('#uiLanguage').selectOption('es');
 await page.evaluate(()=>{
  const store='audiocal-hear-profiles-v1',all=JSON.parse(localStorage.getItem(store));
  const profile=all[0];
  for(const f of profile.bands){
   if(f===16000)continue;
   for(const side of ['left','right']){
    profile.measures[f+'|'+side]=[{kind:'heard',db:-54,confidence:'low'}];
   }
  }
  localStorage.setItem(store,JSON.stringify(all));
 });
 await page.reload();
 // Channel checks must be repeated when reopening a profile in another session.
 await page.locator('[data-nav="test"]').click();
 await page.locator('[data-act="checkleft"]').click();
 await page.locator('[data-act="confirmleft"]').click();
 await page.locator('[data-act="checkright"]').click();
 await page.locator('[data-act="confirmright"]').click();
 await page.locator('[data-act="introNext"]').click();
 await expect(page.locator('.frequency')).toContainText('16 kHz');
 await expect(page.locator('#levelText')).toContainText('-36 dBFS');
 await page.locator('[data-act="play"]').click();
 await page.locator('[data-act="answerNo"]').click();
 await expect(page.locator('#levelText')).toContainText('-33 dBFS');
 await expect(page.locator('#testBoostNotice')).toBeVisible();
 await expect(page.locator('.frequency')).toContainText('16 kHz');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures);
 expect(stored['16000|left']).toBeUndefined();
 await noOverflow(page);
});

test('results keep only advanced EQ controls and technical evidence, without music',async({page})=>{
 await newProfile(page,'Opciones útiles');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#technicalResults')).not.toHaveAttribute('open','');
 await expect(page.locator('#eqCardSection')).not.toHaveAttribute('open','');
 for(const x of ['#musicTools','#musicComparison','#toneBalance','#prefRound','#loudnessPanel'])
  await expect(page.locator(x)).toHaveCount(0);
 await page.locator('#eqCardSection > summary').click();
 await expect(page.locator('[data-act="format"]')).toBeVisible();
 await expect(page.locator('[data-act="downloadtxt"]')).toBeVisible();
 await expect(page.locator('.transfer-card')).toHaveAttribute('open','');
 await noOverflow(page);
});

test('keyboard changes EQ without live-announcing the entire application',async({page})=>{
 await newProfile(page,'Teclado');
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#root')).toHaveAttribute('tabindex','-1');
 await expect(page.locator('#root')).not.toHaveAttribute('aria-live');
 await expect(page.locator('.skip-link')).toHaveAttribute('href','#root');
 await page.locator('[data-eq-select="1000"]').click();
 const slider=page.locator('#eqSlider');
 await expect(slider).toHaveAttribute('aria-describedby','eqSelectedNote');
 await expect(page.locator('[data-eq-select="1000"]')).toHaveAttribute('aria-pressed','true');
 const initial=Number(await slider.inputValue());
 await slider.focus();
 await slider.press('ArrowRight');
 await expect(slider).toHaveValue(String(initial+1));
 await expect(page.locator('#eqSelectedValue')).toHaveText('+'+(initial+1)+' dB');
 await expect(page.locator('#eqEditor [data-delta="1"]')).toHaveAttribute('aria-label',/1 kHz/);
 const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(p.manual['1000']).toBe(1);
 await noOverflow(page);
});

test('results headings and advanced EQ options are localized in all eight languages',async({page})=>{
 await newProfile(page,'Resultados idiomas');
 await page.locator('[data-nav="results"]').click();
 const headings={es:'Tu resultado auditivo',en:'Your hearing test results',fr:'Vos résultats auditifs',
  pt:'Seus resultados auditivos',it:'I tuoi risultati uditivi',de:'Deine Hörergebnisse',
  zh:'你的听力测试结果',ja:'聴力テストの結果'};
 const advanced={en:'Advanced EQ options · bands and physical controls',fr:'Options EQ avancées · bandes et commandes physiques',
  pt:'Opções avançadas de EQ · bandas e controles físicos',it:'Opzioni EQ avanzate · bande e controlli fisici',
  de:'Erweiterte EQ-Optionen · Bänder und Gerätebedienung',zh:'高级均衡器选项 · 频段与实体控件',ja:'EQの詳細設定 · 帯域と機器の操作'};
 for(const [locale,title] of Object.entries(headings)){
  await page.locator('#uiLanguage').selectOption(locale);
  await expect(page.locator('.result-head h1')).toHaveText(title);
  if(locale!=='es')await expect(page.locator('#eqCardSection > summary')).toHaveText(advanced[locale]);
  await noOverflow(page);
 }
});

test('no music bypass distracts from the tone-derived EQ',async({page})=>{
 await newProfile(page,'Solo tonos');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('#bypassBtn')).toHaveCount(0);
 await expect(page.locator('#musicComparison')).toHaveCount(0);
 await expect(page.locator('.eqband')).toHaveCount(10);
 await noOverflow(page);
});

test('navigation headings and hearing-test progress are accessible',async({page})=>{
 await newProfile(page,'Accesibilidad de progreso');
 await page.locator('#uiLanguage').selectOption('es');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('.result-head h1')).toBeFocused();
 await page.locator('[data-nav="test"]').click();
 await expect(page.locator('#root h1')).toBeFocused();
 await passPreparation(page);
 await expect(page.locator('#testLiveStatus')).toContainText('Nueva frecuencia:');
 const currentFrequency=(await page.locator('.frequency').innerText()).trim();
 await expect(page.locator('#testLiveStatus')).toContainText(currentFrequency);
 expect(await page.locator('.frequency').evaluate(el=>el.tagName)).toBe('H2');
 await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuemin','0');
 await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuemax','100');
 await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',/^\d+$/);
 await noOverflow(page);
});
test('adaptive test retains an actionable keyboard focus after a heard/not-heard response',async({page})=>{
 await newProfile(page,'Foco de respuesta');
 await passPreparation(page);
 await page.locator('[data-act="play"]').click();
 const no=page.locator('[data-act="answerNo"]');
 await expect(no).toBeVisible();
 await no.focus();
 await no.press('Enter');
 await expect(page.locator('[data-act="play"]')).toBeFocused();
 await expect(page.locator('#testLiveStatus')).toContainText((await page.locator('.frequency').innerText()).trim());
});

test('the live frequency announcement follows all eight languages without changing measured data',async({page})=>{
 await newProfile(page,'Accesibilidad idiomas del tono');
 await passPreparation(page);
 const freq=(await page.locator('.frequency').innerText()).trim();
 const before=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures));
 const prefixes={es:'Nueva frecuencia:',en:'New frequency:',fr:'Nouvelle fréquence',
  pt:'Nova frequência:',it:'Nuova frequenza:',de:'Neue Frequenz:',zh:'新频率：',ja:'新しい周波数：'};
 for(const [locale,prefix] of Object.entries(prefixes)){
  await page.locator('#uiLanguage').selectOption(locale);
  await expect(page.locator('#testLiveStatus')).toContainText(prefix);
  await expect(page.locator('#testLiveStatus')).toContainText(freq);
  await expect(page.locator('#testLiveStatus')).not.toContainText('undefined');
 }
 const after=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0].measures));
 expect(after).toBe(before);
});
test('tone-only examination does not display optional microphone sampling',async({page})=>{
 await newProfile(page,'Solo tonos sin micrófono');
 await expect(page.locator('#ambientCheck')).toHaveCount(0);
 await expect(page.locator('[data-act="ambient"]')).toHaveCount(0);
 await passPreparation(page);
 await expect(page.locator('#levelText')).toBeVisible();
 await noOverflow(page);
});

test('stopping a pending audio resume cannot restart headphone calibration tones',async({page})=>{
 await newProfile(page,'Cancelación antes de sonido');
 await deferAudioResume(page);
 await page.locator('[data-act="checkleft"]').click();
 await expect.poll(()=>page.evaluate(()=>window.__hearResumePending)).toBeTruthy();
 await page.locator('[data-act="stopaudio"]').click();
 await releaseAudioResume(page);
 await expect(page.locator('[data-act="confirmleft"]')).toBeDisabled();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(stored.measures).toEqual({});
});
test('leaving preparation cancels a delayed reference tone',async({page})=>{
 await page.locator('[data-device="car"]').click();
 await page.locator('#deviceName').fill('Tono cancelado');
 await page.locator('[data-act="create"]').click();
 await deferAudioResume(page);
 await page.locator('[data-act="check"]').click();
 await expect.poll(()=>page.evaluate(()=>window.__hearResumePending)).toBeTruthy();
 await page.locator('[data-nav="results"]').click();
 await releaseAudioResume(page);
 await expect(page.locator('#root')).toHaveAttribute('data-page','results');
});

test('tone-only results do not start a loudness comparison audio context',async({page})=>{
 await newProfile(page,'Sin sonoridad extra');
 await page.locator('[data-nav="results"]').click();
 await expect(page.locator('[data-loudness]')).toHaveCount(0);
 await expect(page.locator('#loudnessPanel')).toHaveCount(0);
 await noOverflow(page);
});

test('tone test never requests microphone permission when navigating',async({page})=>{
 await page.addInitScript(()=>{
  window.__micCalls=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,
   value:{getUserMedia:()=>{window.__micCalls++;return Promise.reject(new Error('unexpected microphone request'))}}});
 });
 await page.reload();
 await newProfile(page,'Sin permisos');
 await passPreparation(page);
 await page.locator('[data-nav="results"]').click();
 await page.locator('[data-nav="profiles"]').click();
 expect(await page.evaluate(()=>window.__micCalls)).toBe(0);
});

test('stop action remains available without microphone permissions or extra tests',async({page})=>{
 await newProfile(page,'Detención de tonos');
 await passPreparation(page);
 await page.locator('[data-act="play"]').click();
 await page.locator('[data-act="stopaudio"]').click();
 await expect(page.locator('#preSweepPanel')).toHaveCount(0);
 await expect(page.locator('#ambientCheck')).toHaveCount(0);
 await expect(page.locator('#inlineLoudness')).toHaveCount(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
 expect(saved.measures).toEqual({});
});
