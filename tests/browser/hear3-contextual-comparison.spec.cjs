const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

async function fakeAudio(page){
 await page.addInitScript(()=>{
  window.__mockStarts=[];
  class Param{
   setValueAtTime(){}linearRampToValueAtTime(){}
   exponentialRampToValueAtTime(){}cancelScheduledValues(){}
  }
  class FakeAudioContext{
   constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.destination={};}
   addEventListener(){}removeEventListener(){}
   createOscillator(){
    const osc={
     frequency:new Param(),type:'sine',onended:null,
     connect(){},disconnect(){},
     start(){window.__mockStarts.push('tone');},
     stop(at){
      // Continuous sweep (20 s), and D-036 pair (1.4 s) finish
      // synthetically; ordinary discrete tones (3 s) need user response.
      if(at>=15||(at>0&&at<2))setTimeout(()=>osc.onended?.(),70);
     },
    };
    return osc;
   }
   createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
   async resume(){this.state='running';}
   async close(){this.state='closed';}
  }
  window.AudioContext=FakeAudioContext;
  window.webkitAudioContext=FakeAudioContext;
 });
}
async function reachContradiction(page){
 await page.goto(PILOT);
 await page.getByTestId('sweep-start').click();
 await expect(page.getByTestId('plan')).toBeEnabled();
 await page.getByTestId('plan').click();
 for(const reply of ['heard','not-heard','heard','not-heard','not-heard']){
  await expect(page.getByTestId('tone-next')).toBeEnabled();
  await page.getByTestId('tone-next').click();
  await expect(page.getByTestId('tone-'+reply)).toBeEnabled();
  await page.getByTestId('tone-'+reply).click();
 }
 await expect(page.getByTestId('tone-status')).toContainText('Contradicción');
 await expect(page.getByTestId('tone-confirm')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
}
test('P0 contextual contradiction uses one user click for a verified consecutive A/B tone pair',async({page})=>{
 await fakeAudio(page);
 await reachContradiction(page);
 const count=await page.evaluate(()=>window.__mockStarts.length);
 await page.getByTestId('tone-confirm').click();
 await expect(page.getByTestId('comparison-status')).toContainText('Elige una respuesta perceptiva');
 const after=await page.evaluate(()=>window.__mockStarts.length);
 expect(after-count).toBe(2); // The second was automatic, not separately clicked.
 await expect(page.getByTestId('comparison-first')).toBeEnabled();
 await expect(page.getByTestId('comparison-second')).toBeEnabled();
 await expect(page.getByTestId('comparison-uncertain')).toBeEnabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 expect((await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).eqGainsCalculated).toBe(0);
 await page.getByTestId('comparison-second').click();
 await expect(page.getByTestId('tone-next')).toBeEnabled();
 const result=await page.evaluate(()=>window.hear3IntegratedPilot.comparisonReports());
 expect(result).toHaveLength(1);
 expect(result[0].response).toBe('second-clearer');
 expect(result[0].calibratedThresholds).toBe(0);
 expect(result[0].eqGainsCalculated).toBe(0);
 expect(result[0].provenance).toBe('user-response');
});
test('P0 no tones start on opening pilot and no comparison is offered without conflicting responses',async({page})=>{
 await fakeAudio(page);
 await page.goto(PILOT);
 expect(await page.evaluate(()=>window.__mockStarts.length)).toBe(0);
 await expect(page.getByTestId('tone-confirm')).toBeDisabled();
 await expect(page.getByTestId('comparison-first')).toBeDisabled();
 await expect(page.getByTestId('comparison-second')).toBeDisabled();
 const state=await page.evaluate(()=>window.hear3IntegratedPilot.comparison());
 expect(state.state).toBe('idle');
});
test('P0 uncertain comparison leaves band inconclusive instead of producing a fabricated threshold',async({page})=>{
 await fakeAudio(page);
 await reachContradiction(page);
 await page.getByTestId('tone-confirm').click();
 await expect(page.getByTestId('comparison-uncertain')).toBeEnabled();
 await page.getByTestId('comparison-uncertain').click();
 const snapshot=await page.evaluate(()=>window.hear3IntegratedPilot.snapshot());
 expect(snapshot.bands[0].status).toBe('inconclusive');
 expect(snapshot.bands[0].intervalDbfs).toBe(null);
 expect(snapshot.thresholdsEstimated).toBe(0);
 expect(snapshot.eqGainsCalculated).toBe(0);
 expect(snapshot.currentBandId).toBe('band-250');
 await expect(page.getByTestId('tone-next')).toBeEnabled();
});
test('P0 comparison is silent on reload even after a contradictory progress checkpoint',async({page})=>{
 await fakeAudio(page);
 await reachContradiction(page);
 await page.reload();
 expect(await page.evaluate(()=>window.__mockStarts.length)).toBe(0);
 await expect(page.getByTestId('recover-exam')).toBeEnabled();
 await expect(page.getByTestId('tone-confirm')).toBeDisabled();
 await expect(page.getByTestId('comparison-first')).toBeDisabled();
});
