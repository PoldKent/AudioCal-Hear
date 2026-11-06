const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-channel-check-pilot.html';
async function mockAudio(page,{stereo=true}={}){
 await page.addInitScript((stereo)=>{
  window.__channelToneStarts=[];
  class Param{
   setValueAtTime(){}
   linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}
   cancelScheduledValues(){}
  }
  class FakeContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   createOscillator(){
    const osc={
     onended:null,frequency:new Param(),connect(){},disconnect(){},
     start(){window.__channelToneStarts.push('tone');},
     stop(when){if(when>=1)setTimeout(()=>osc.onended?.(),65);},
    };
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   addEventListener(){}
   removeEventListener(){}
   async close(){this.state='closed';}
  }
  if(stereo)FakeContext.prototype.createStereoPanner=function(){
   return {pan:new Param(),connect(){},disconnect(){}};
  };
  window.AudioContext=FakeContext;window.webkitAudioContext=FakeContext;
 },stereo);
}
async function confirmPhysicalSetup(page){
 await page.getByTestId('route').check();
 await page.getByTestId('low-volume').check();
 await expect(page.getByTestId('play')).toBeEnabled();
}
test('P0 headphone L/R pilot never autoplays and requires route plus volume acknowledgements',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(0);
 await expect(page.getByTestId('play')).toBeDisabled();
 await page.getByTestId('route').check();
 await expect(page.getByTestId('play')).toBeDisabled();
 await page.getByTestId('low-volume').check();
 await expect(page.getByTestId('play')).toBeEnabled();
 await expect(page.getByTestId('heard-left')).toBeDisabled();
 await page.getByTestId('play').click();
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(1);
 await expect(page.getByTestId('check-status')).toContainText('Tono finalizado');
 await expect(page.getByTestId('heard-left')).toBeEnabled();
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(1);
});
test('P0 two explicit channel tones produce subjective candidate only; main exam stays joint',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').click();
 await expect(page.getByTestId('heard-left')).toBeEnabled();
 await page.getByTestId('heard-left').click();
 await expect(page.getByTestId('play')).toBeDisabled();
 await expect(page.getByTestId('play')).toContainText('derecho');
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(1);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').click();
 await expect(page.getByTestId('heard-right')).toBeEnabled();
 await page.getByTestId('heard-right').click();
 await expect(page.getByTestId('result')).toContainText('indicio subjetivo');
 const data=await page.evaluate(()=>window.hear3ChannelPilot.snapshot());
 expect(data.observations).toHaveLength(2);
 expect(data.perEarReviewCandidate).toBe(true);
 expect(data.physicalRouteValidated).toBe(false);
 expect(data.perEarExamEnabled).toBe(false);
 expect(data.thresholdsEstimated).toBe(0);
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(2);
});
test('P0 uncertain response or loudspeaker selection keeps joint-only fallback with no side tests',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').click();
 await expect(page.getByTestId('heard-uncertain')).toBeEnabled();
 await page.getByTestId('heard-uncertain').click();
 await expect(page.getByTestId('result')).toContainText('modo conjunto');
 expect((await page.evaluate(()=>window.hear3ChannelPilot.snapshot())).jointOnly).toBe(true);
 await page.getByTestId('device').selectOption('speaker');
 await expect(page.getByTestId('play')).toBeDisabled();
 await expect(page.getByTestId('check-status')).toContainText('modo conjunto');
 await page.getByTestId('device').selectOption('car');
 await expect(page.getByTestId('play')).toBeDisabled();
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(1);
});
test('P0 missing stereo pan control fails closed instead of assuming ear separation',async({page})=>{
 await mockAudio(page,{stereo:false});
 await page.goto(PILOT);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').click();
 await expect(page.getByTestId('error')).toContainText('Independent channels unavailable');
 expect((await page.evaluate(()=>window.hear3ChannelPilot.snapshot())).perEarReviewCandidate).toBe(false);
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(0);
});
test('P0 user stop invalidates the incomplete stereo check and reload is silent',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').click();
 await page.getByTestId('stop').click();
 await expect(page.getByTestId('check-status')).toContainText('interrumpida');
 expect((await page.evaluate(()=>window.hear3ChannelPilot.snapshot())).observations).toHaveLength(0);
 await page.reload();
 expect(await page.evaluate(()=>window.__channelToneStarts.length)).toBe(0);
 await expect(page.getByTestId('play')).toBeDisabled();
});


test('D-058 Escape silences a running manual stereo check without attributing any ear',async({page})=>{
 await mockAudio(page);
 await page.goto(PILOT);
 await confirmPhysicalSetup(page);
 await page.getByTestId('play').focus();
 await page.keyboard.press('Enter');
 await expect(page.getByTestId('check-status')).toContainText('Reproduciendo');
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('check-status')).toContainText('interrumpida');
 const status=await page.evaluate(()=>window.hear3ChannelPilot.snapshot());
 expect(status.audioPlaying).toBe(false);
 expect(status.perEarExamEnabled).toBe(false);
 expect(status.observations).toHaveLength(0);
 await expect(page.getByTestId('heard-left')).toBeDisabled();
});