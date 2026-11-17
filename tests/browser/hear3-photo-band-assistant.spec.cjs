const {test,expect}=require('@playwright/test');

async function drawnEqImage(page){
 const image=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=300;canvas.height=180;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,300,180);
  ctx.fillStyle='#111';ctx.font='18px sans-serif';
  ctx.fillText('64Hz 160Hz 400Hz 1kHz',10,60);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 return {name:'mi-ecualizador.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')};
}
test('camera helper is part of one app, proposes bands only after local detection and explicit review',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'TextDetector',{configurable:true,value:class{
   async detect(){return [{rawValue:'64 Hz 160 Hz 400 Hz 1 kHz 2.5 kHz 6.25 kHz 15.625 kHz'}];}
  }});
 });
 await page.goto('/hear3-exam/');
 const startLayout=await page.getByTestId('layout-choice').inputValue();
 expect(startLayout).toBe('5');
 await page.getByTestId('photo-band-details').locator('summary').click();
 await page.getByTestId('eq-photo-input').setInputFiles(await drawnEqImage(page));
 await expect(page.getByTestId('eq-photo-proposal')).toContainText('64, 160, 400, 1000, 2500, 6250, 15625');
 await expect(page.getByTestId('eq-photo-apply')).toBeEnabled();
 // OCR must NEVER silently change the hardware layout or emit a tone.
 await expect(page.getByTestId('layout-choice')).toHaveValue('5');
 expect(await page.evaluate(()=>Boolean(window.hear3IntegratedPilot?.snapshot()))).toBe(false);
 await page.getByTestId('eq-photo-apply').click();
 await expect(page.getByTestId('layout-choice')).toHaveValue('custom');
 await expect(page.getByTestId('layout-custom')).toHaveValue('64, 160, 400, 1000, 2500, 6250, 15625');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await expect(page.getByTestId('layout-status')).toContainText('7 bandas entre 64 y 15625 Hz');
 await page.getByTestId('eq-photo-clear').click();
 await expect(page.getByTestId('eq-photo-canvas')).toBeHidden();
 await expect(page.getByTestId('eq-photo-input')).toHaveValue('');
 expect(await page.evaluate(()=>Boolean(window.hear3IntegratedPilot?.snapshot()))).toBe(false);
});
test('no OCR support is a legitimate photo reference + manual band entry, no upload',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'TextDetector',
  {configurable:true,value:undefined}));
 await page.goto('/hear3-exam/');
 await page.getByTestId('photo-band-details').locator('summary').click();
 await page.getByTestId('eq-photo-input').setInputFiles(await drawnEqImage(page));
 await expect(page.getByTestId('eq-photo-status')).toContainText('reconocimiento automático no está disponible');
 await expect(page.getByTestId('eq-photo-apply')).toBeDisabled();
 await expect(page.getByTestId('eq-photo-canvas')).toBeVisible();
 await page.getByTestId('layout-choice').selectOption('custom');
 await page.getByTestId('layout-custom').fill('80, 160, 320');
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('layout-status')).toContainText('3 bandas entre 80 y 320 Hz');
 await page.getByTestId('eq-photo-clear').click();
 await expect(page.getByTestId('eq-photo-canvas')).toBeHidden();
});
test('device shortcut requires conscious selection and never claims hardware detection',async({page})=>{
 await page.goto('/hear3-exam/');
 await page.getByTestId('archive-category').selectOption('car');
 await expect(page.getByTestId('device-suggest-layout')).toContainText('automóvil');
 await expect(page.getByTestId('layout-choice')).toHaveValue('5');
 await page.getByTestId('device-suggest-layout').click();
 await expect(page.getByTestId('layout-choice')).toHaveValue('car-reference-7');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await page.getByTestId('layout-apply').click();
 await expect(page.getByTestId('layout-status')).toContainText('7 bandas entre 64 y 15625 Hz');
});

test('the four visible journey steps allow preview and safe backwards review without running audio',async({page})=>{
 await page.goto('/hear3-exam/');
 await expect(page.getByTestId('journey-status')).toContainText('Etapa actual: 1 · Mi equipo');
 await expect(page.locator('[data-journey-stage=prepare]')).toHaveAttribute('aria-current','step');
 await expect(page.getByTestId('journey-back')).toBeDisabled();
 await page.getByTestId('journey-next').click();
 await expect(page.getByTestId('journey-status')).toContainText('1 · Mi equipo');
 await page.locator('[data-journey-stage=tones]').click();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBe(null);
 // Navigation cannot create evidence or advance beyond the actual exam engine.
 await expect(page.getByTestId('journey-status')).toContainText('1 · Mi equipo');
 const links=page.locator('[data-journey-stage]');
 await expect(links).toHaveCount(4);
});
