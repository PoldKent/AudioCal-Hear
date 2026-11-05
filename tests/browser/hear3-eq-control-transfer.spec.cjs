const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

async function mockDigitalTones(page){
 await page.addInitScript(()=>{
  window.__playCount=0;
  class Param{
   setValueAtTime(){}linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}cancelScheduledValues(){}
  }
  class Context{
   constructor(){this.state='running';this.currentTime=0;this.destination={};this.sampleRate=48000;}
   createOscillator(){return {
    frequency:new Param(),onended:null,
    connect(){},disconnect(){},
    start(){window.__playCount++;},
    stop(){},
   };}
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   addEventListener(){}removeEventListener(){}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=Context;window.webkitAudioContext=Context;
 });
}
const profile=(unit='dB',lastHz=2000)=>{
 const freqs=[125,250,500,1000,lastHz];
 return {deviceId:'claimed-example',type:'graphic',
  bands:freqs.map((frequencyHz,i)=>({
   id:'control-'+i,frequencyHz,source:'manual',verification:'user-confirmed',
   control:unit==='dB'?{unit:'dB',min:-6,max:6,step:1}:
    {unit:'physical-step',min:0,max:10,step:1},
  })),
 };
};
async function completeNeutralExam(page){
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 for(let band=0;band<5;band++)for(let t=0;t<4;t++){
  await expect(page.getByTestId('tone-next')).toBeEnabled();
  await page.getByTestId('tone-next').click();
  await expect(page.getByTestId('tone-not')).toBeEnabled();
  await page.getByTestId('tone-not').click();
 }
 await expect(page.getByTestId('tone-finish')).toBeEnabled();
 await page.getByTestId('tone-finish').click();
 await expect(page.getByTestId('eq-export')).toBeEnabled();
}
async function upload(page,data){
 await page.getByTestId('transfer-file').setInputFiles({
  name:'perfil-eq-controles.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(data)),
 });
}
test('D-045/046 user profile JSON can review precise control values without changing audio or local V2/V3',async({page})=>{
 test.setTimeout(100000);
 await mockDigitalTones(page);
 await page.goto(PILOT);
 await expect(page.getByTestId('transfer-preview')).toBeDisabled();
 await expect(page.getByTestId('transfer-export')).toBeDisabled();
 await expect(page.getByTestId('transfer-status')).toContainText('Primero finaliza');
 expect(await page.evaluate(()=>window.__playCount)).toBe(0);
 await completeNeutralExam(page);
 const before=await page.evaluate(()=>window.__playCount);
 await upload(page,profile());
 await expect(page.getByTestId('transfer-preview')).toBeEnabled();
 await page.getByTestId('transfer-preview').click();
 await expect(page.getByTestId('transfer-status')).toContainText('Escalas dB representables: 5 de 5');
 await expect(page.getByTestId('transfer-rows').locator('li')).toHaveCount(5);
 const review=await page.evaluate(()=>window.hear3IntegratedPilot.eqTransferReview());
 expect(review.mappedCount).toBe(5);
 expect(review.unmappedCount).toBe(0);
 expect(review.rows.every(x=>x.attainableDb===0)).toBe(true);
 expect(review.validatedForProduction).toBe(false);
 expect(review.autoApplyAllowed).toBe(false);
 expect(review.devicePresetExportAllowed).toBe(false);
 expect(await page.evaluate(()=>window.__playCount)).toBe(before);
 await expect(page.getByTestId('transfer-export')).toBeEnabled();
 const download=page.waitForEvent('download');
 await page.getByTestId('transfer-export').click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('hear3-transferencia-no-validada-no-aplicar.json');
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(null);
});
test('D-045 unsupported physical positions remain unresolved and changing file invalidates earlier transfer',async({page})=>{
 test.setTimeout(100000);
 await mockDigitalTones(page);
 await page.goto(PILOT);
 await completeNeutralExam(page);
 await upload(page,profile('physical-step'));
 await page.getByTestId('transfer-preview').click();
 await expect(page.getByTestId('transfer-status')).toContainText('Sin equivalencia comprobable: 5');
 const review=await page.evaluate(()=>window.hear3IntegratedPilot.eqTransferReview());
 expect(review.rows.every(x=>x.attainableDb===null)).toBe(true);
 await upload(page,profile());
 await expect(page.getByTestId('transfer-export')).toBeDisabled();
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.eqTransferReview())).toBeNull();
 await page.getByTestId('transfer-preview').click();
 await expect(page.getByTestId('transfer-export')).toBeEnabled();
 await upload(page,profile('dB',1999));
 await expect(page.getByTestId('transfer-export')).toBeDisabled();
 await page.getByTestId('transfer-preview').click();
 await expect(page.getByTestId('error')).toContainText('Exact EQ frequencies');
 await expect(page.getByTestId('transfer-export')).toBeDisabled();
});
test('D-045 malformed file never enables device preset export',async({page})=>{
 await page.goto(PILOT);
 await upload(page,{fake:'provisional'});
 await expect(page.getByTestId('transfer-preview')).toBeDisabled();
 await expect(page.getByTestId('transfer-export')).toBeDisabled();
 const keys=await page.evaluate(()=>Object.keys(localStorage));
 expect(keys.filter(x=>x.startsWith('hear3:catalog:'))).toHaveLength(0);
});
