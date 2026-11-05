const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-integrated-exam-pilot.html';

test('D-057 no Web Audio keeps pilot silent while explaining why playback is disabled',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true});
  Object.defineProperty(window,'webkitAudioContext',{value:undefined,configurable:true});
  window.__oscillatorConstructed=0;
 });
 await page.goto(PILOT);
 await expect(page.getByTestId('audio-preflight')).toContainText('No están disponibles');
 await expect(page.getByTestId('audio-preflight')).toContainText('audio-context');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 await expect(page.getByTestId('plan')).toBeDisabled();
 await expect(page.getByTestId('tone-next')).toBeDisabled();
 await expect(page.getByTestId('recover-exam')).toBeDisabled();
 await expect(page.getByTestId('sweep-frequency')).toHaveText('—');
 expect(await page.evaluate(()=>window.hear3IntegratedPilot.snapshot())).toBeNull();
 await page.goto('/tests/fixtures/hear3-catalog-pilot.html');
 await expect(page.getByTestId('download')).toBeEnabled();
 await expect(page.getByTestId('summary')).toContainText('Catálogo V3');
});
test('D-057 oscillator without gain control blocks playback instead of dropping digital limits',async({page})=>{
 await page.addInitScript(()=>{
  let count=0;
  class UnsafeContext{
   constructor(){count++;throw Error('do not instantiate');}
   createOscillator(){}
  }
  window.AudioContext=UnsafeContext;window.webkitAudioContext=UnsafeContext;
  window.__contextsOpened=()=>count;
 });
 await page.goto(PILOT);
 await expect(page.getByTestId('audio-preflight')).toContainText('gain-control');
 await expect(page.getByTestId('sweep-start')).toBeDisabled();
 expect(await page.evaluate(()=>window.__contextsOpened())).toBe(0);
 await expect(page.getByTestId('tone-heard')).toBeDisabled();
});
test('D-057 required Web Audio features permit only manual start, not autoplay',async({page})=>{
 await page.addInitScript(()=>{
  window.__contextsOpened=0;
  class MockContext{
   constructor(){window.__contextsOpened++;throw Error('should only create on user action');}
   createOscillator(){}
   createGain(){}
  }
  window.AudioContext=MockContext;window.webkitAudioContext=MockContext;
 });
 await page.goto(PILOT);
 await expect(page.getByTestId('audio-preflight')).toContainText('Web Audio básico detectado');
 await expect(page.getByTestId('sweep-start')).toBeEnabled();
 await expect(page.getByTestId('plan')).toBeDisabled();
 expect(await page.evaluate(()=>window.__contextsOpened)).toBe(0);
});
test('D-057 fallback message is accessible without false output-route or SPL certification',async({page})=>{
 await page.addInitScript(()=>{
  window.AudioContext=undefined;window.webkitAudioContext=undefined;
 });
 await page.goto(PILOT);
 const element=page.getByTestId('audio-preflight');
 await expect(element).toHaveAttribute('role','status');
 await expect(element).not.toContainText('SPL verificado');
 await expect(element).toContainText('pruebas sonoras permanecen desactivadas');
 await expect(page.getByTestId('export-exam')).toBeDisabled();
});
