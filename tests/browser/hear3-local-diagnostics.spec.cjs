const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

test('D-061 diagnostics page neither starts audio nor includes hearing profiles',async({page})=>{
 await page.addInitScript(()=>{
  window.__createdAudioContexts=0;
  const Old=window.AudioContext;
  window.AudioContext=class extends Old{
   constructor(...args){super(...args);window.__createdAudioContexts++;}
  };
 });
 await page.goto('/hear3-diagnostics/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Diagnóstico técnico local');
 await expect(page.getByTestId('copy')).toBeDisabled();
 await expect(page.getByTestId('download')).toBeDisabled();
 await expect(page.getByTestId('report')).toHaveValue('');
 expect(await page.evaluate(()=>window.__createdAudioContexts)).toBe(0);
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('report')).toHaveValue(/hear3-local-technical-report-v1/);
 await expect(page.getByTestId('report')).not.toHaveValue(/audiocal-hear-profiles-v1/);
 await expect(page.getByTestId('report')).not.toHaveValue(/userAgent/);
 expect(await page.evaluate(()=>window.__createdAudioContexts)).toBe(0);
 await expect(page.getByTestId('download')).toBeDisabled();
});
test('D-061 only exports a reviewed local report after explicit approval',async({page})=>{
 await page.goto('/hear3-diagnostics/');
 await page.getByTestId('issue-code').selectOption('audio-interrupted');
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('report')).toHaveValue(/audio-interrupted/);
 await expect(page.getByTestId('download')).toBeDisabled();
 await page.getByTestId('confirm').check();
 await expect(page.getByTestId('download')).toBeEnabled();
 const incoming=page.waitForEvent('download');
 await page.getByTestId('download').click();
 const artifact=await incoming;
 const payload=JSON.parse(fs.readFileSync(await artifact.path(),'utf8'));
 expect(payload.format).toBe('hear3-local-technical-report-v1');
 expect(payload.issueCodes).toEqual(['audio-interrupted']);
 expect(payload.personalDataIncluded).toBe(false);
 expect(payload.remoteTransmissionAttempted).toBe(false);
 expect(payload.physicalDeviceVerified).toBe(false);
 await expect(page.getByTestId('status')).toContainText('ningún dato fue enviado');
});
test('D-061 editing selected fields revokes previously approved diagnostic',async({page})=>{
 await page.goto('/hear3-diagnostics/');
 await page.getByTestId('preview').click();
 await page.getByTestId('confirm').check();
 await expect(page.getByTestId('download')).toBeEnabled();
 await page.getByTestId('capabilities').uncheck();
 await expect(page.getByTestId('download')).toBeDisabled();
 await expect(page.getByTestId('report')).toHaveValue('');
 await page.getByTestId('preview').click();
 await expect(page.getByTestId('report')).toHaveValue(/"capabilities": null/);
 await page.getByTestId('clear').click();
 await expect(page.getByTestId('download')).toBeDisabled();
 await expect(page.getByTestId('report')).toHaveValue('');
});
test('D-061 reports only technical codes and never modifies V2 profile storage',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','V2_KEEP'));
 await page.goto('/hear3-diagnostics/');
 await page.getByTestId('issue-code').selectOption('checkpoint-damaged');
 await page.getByTestId('preview').click();
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('V2_KEEP');
 await expect(page.getByTestId('report')).toHaveValue(/checkpoint-damaged/);
 await expect(page.getByTestId('report')).not.toHaveValue(/V2_KEEP/);
 await page.goto('/hear3-preview/');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1')))
  .toBe('V2_KEEP');
});
