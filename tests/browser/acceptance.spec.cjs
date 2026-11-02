// End-to-end *simulated* profile acceptance: no claim of a calibrated physical test.
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const cases=[
 {name:'Auriculares 10',device:'headphones',preset:'photo10',bands:[30,60,120,250,500,1000,2000,4000,8000,16000],sides:['left','right']},
 {name:'Automóvil 7',device:'car',preset:'car7',bands:[64,160,400,1000,2500,6250,15625],sides:['both']},
 {name:'Parlantes 5',device:'speaker',preset:'custom',bands:[200,500,1000,5000,12000],sides:['both']},
 {name:'Control físico 4',device:'speaker',preset:'custom',bands:[60,650,2200,10000],sides:['both']}
];

test('AudioCal Hear acceptance: measured 4/5/7/10 band profiles survive full results, edits and export',async({page})=>{
 for(const config of cases){
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await page.locator('#uiLanguage').selectOption('es');
  await page.locator('[data-device="'+config.device+'"]').click();
  if(config.preset==='custom'){
   if(await page.locator('#moreFormats').getAttribute('open')===null)await page.locator('#moreFormats > summary').click();
   await page.locator('#extraPreset').selectOption('custom');
   await page.locator('#customFreqs').fill(config.bands.join(', '));
   await page.locator('#customFreqs').dispatchEvent('change');
  }else await page.locator('[data-preset="'+config.preset+'"]').click();
  await page.locator('#deviceName').fill(config.name);
  await page.locator('[data-act="create"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page','test');

  // Fixture represents completed saved responses, not newly observed acoustic measurements.
  await page.evaluate(({bands,sides})=>{
   const key='audiocal-hear-profiles-v1',saved=JSON.parse(localStorage.getItem(key));
   const p=saved[0];p.measures={};
   bands.forEach((f,i)=>sides.forEach(side=>{
    p.measures[f+'|'+side]=[{kind:'heard',db:-66+(i%4===2?10:0),method:'adaptive-v21-short',confidence:'low',at:Date.now()}];
   }));
   localStorage.setItem(key,JSON.stringify(saved));
  },{bands:config.bands,sides:config.sides});
  await page.reload();
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('#root')).toHaveAttribute('data-page','results');
  await expect(page.getByRole('heading',{name:new RegExp('Tu ecualizador · '+config.bands.length+' bandas')})).toHaveCount(1);
  await expect(page.locator('[data-eq-band]')).toHaveCount(config.bands.length);
  await expect(page.locator('#eqCardCanvas')).toHaveCount(0);
  await expect(page.locator('#starterGuide')).toContainText('estimado');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(Object.keys(before.measures)).toHaveLength(config.bands.length*config.sides.length);
  expect(before.bands).toEqual(config.bands);

  await page.locator('#technicalResults > summary').click();
  await expect(page.locator('#tracePanel')).toBeVisible();
  await page.locator('[data-eq-select="'+config.bands[Math.floor(config.bands.length/2)]+'"]').click();
  const slider=page.locator('#eqSlider');
  const original=Number(await slider.inputValue());
  const target=original===2?1:2;
  await slider.evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}))},target);
  await expect(page.locator('#eqSlider')).toHaveValue(String(target));
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(after.measures).toEqual(before.measures);
  expect(after.manual).not.toEqual(before.manual);

  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-act="downloadpng"]').click();
  const downloaded=await downloadPromise;
  const png=fs.readFileSync(await downloaded.path());
  expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  await page.reload();
  await page.locator('[data-nav="results"]').click();
  await expect(page.locator('[data-eq-band]')).toHaveCount(config.bands.length);
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('audiocal-hear-profiles-v1'))[0]);
  expect(persisted.measures).toEqual(before.measures);
  expect(persisted.manual).toEqual(after.manual);
  const w=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(w.scroll).toBeLessThanOrEqual(w.client+2);
 }
});
