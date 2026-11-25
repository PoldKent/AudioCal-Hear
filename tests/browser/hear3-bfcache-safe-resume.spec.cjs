const {test,expect}=require('@playwright/test');
async function syntheticCachedExit(page){
 await page.evaluate(()=>{
  const event=new Event('pagehide');
  Object.defineProperty(event,'persisted',{value:true});
  window.dispatchEvent(event);
 });
}

test('a restored back-forward cached page remains responsive without starting sound',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await syntheticCachedExit(page);
 await page.getByTestId('focus-confirm').click();
 await expect(page.locator('#ready-hint')).toContainText('Marca la confirmación');
 await expect(page.getByTestId('focus-volume')).not.toBeChecked();
 await expect(page.getByTestId('focus-sweep')).toBeHidden();
 expect(errors).toEqual([]);
});

test('leaving an active sweep for BFCache silences and requires renewed volume consent',async({page})=>{
 await page.addInitScript(()=>{
  window.__hearStarts=0;
  class Param{setValueAtTime(){}exponentialRampToValueAtTime(){}linearRampToValueAtTime(){}cancelScheduledValues(){}}
  class Context{
   constructor(){this.state='running';this.createdAt=performance.now();this.sampleRate=48000;this.destination={};}
   get currentTime(){return (performance.now()-this.createdAt)/1000;}
   addEventListener(){}removeEventListener(){}
   createOscillator(){return {frequency:new Param(),type:'sine',onended:null,connect(){},disconnect(){},start(){window.__hearStarts++},stop(){}};}
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}async close(){this.state='closed';}
  }
  window.AudioContext=Context;window.webkitAudioContext=Context;
 });
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-sweep')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__hearStarts)).toBe(1);
 await syntheticCachedExit(page);
 await expect(page.getByTestId('focus-ready')).toBeVisible();
 await expect(page.getByTestId('focus-volume')).not.toBeChecked();
 await page.getByTestId('focus-confirm').click();
 await expect(page.locator('#ready-hint')).toContainText('Marca la confirmación');
 expect(await page.evaluate(()=>window.__hearStarts)).toBe(1);
});
