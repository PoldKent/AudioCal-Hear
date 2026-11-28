const {test,expect}=require('@playwright/test');

// Simulated Web Audio: verifies logic and consent, not real hearing or SPL.
async function fakeAudio(page){
 await page.addInitScript(()=>{
  window.__hearFocusStarts=0;window.__previewPlays=0;window.__previewFilters=[];
  class Param{constructor(){this.value=null}setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(){}
   linearRampToValueAtTime(){}cancelScheduledValues(){}}
  class Node{connect(n){return n}disconnect(){}}
  class Context{
   constructor(){this.state='running';this.createdAt=performance.now();this.sampleRate=48000;this.destination=new Node();}
   get currentTime(){return (performance.now()-this.createdAt)/1000;}
   addEventListener(){}removeEventListener(){}
   createOscillator(){const ctx=this;const osc={frequency:new Param(),type:'sine',onended:null,connect(){},disconnect(){},
    start(){window.__hearFocusStarts++},stop(at){if(at-ctx.currentTime>15)setTimeout(()=>osc.onended?.(),120);}};return osc;}
   createGain(){const n=new Node();n.gain=new Param();return n;}
   createStereoPanner(){const n=new Node();n.pan=new Param();return n;}
   createMediaElementSource(){return new Node();}
   createBiquadFilter(){const n=new Node();n.frequency=new Param();n.Q=new Param();n.gain=new Param();
    window.__previewFilters.push(n);return n;}
   async resume(){this.state='running'}async close(){this.state='closed'}
  }
  window.AudioContext=Context;window.webkitAudioContext=Context;
  HTMLMediaElement.prototype.play=function(){window.__previewPlays++;return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){};
 });
}
const num=t=>Number(t.replace(/−/g,'-').match(/-?\d+(\.\d+)?/)[0]);
// Answers like a listener whose threshold (dBFS) per frequency is known.
async function runListener(page,threshold){
 await page.getByTestId('focus-volume').check();
 await page.getByTestId('focus-confirm').click();
 await expect(page.getByTestId('focus-tones')).toBeVisible();
 for(let i=0;i<120;i++){
  if(await page.getByTestId('focus-result').isVisible())return;
  if(await page.locator('#tone-uncertain').isVisible()){await page.locator('#tone-repeat').click();continue;}
  await page.getByTestId('focus-tone-play').click();
  await expect(page.getByTestId('focus-tone-no')).toBeVisible();
  const hz=num(await page.locator('#tone-hz').innerText());
  const level=num(await page.getByTestId('focus-tone-level').innerText());
  await page.getByTestId(level>=threshold[hz]?'focus-tone-yes':'focus-tone-no').click();
 }
 await expect(page.getByTestId('focus-result')).toBeVisible();
}

test('equipment and full-range bands are visible before starting',async({page})=>{
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await expect(page.getByTestId('focus-equipment')).toBeVisible();
 await expect(page.getByTestId('focus-bands')).toBeVisible();
 await expect(page.getByTestId('focus-bands')).toHaveValue('android-5');
 await expect(page.locator('#bands option[value="android-5"]')).toHaveText('5 bandas (60 Hz–14 kHz)');
 await expect(page.locator('#bands option[value="5"]')).toHaveText('5 bandas (125 Hz–2 kHz)');
});

test('too much physical volume is explained instead of a silent flat EQ',async({page})=>{
 test.setTimeout(120000);
 await fakeAudio(page);
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await runListener(page,{60:-70,230:-88,910:-90,3600:-92,14000:-90});
 await expect(page.getByTestId('focus-level-advice')).toBeVisible();
 await expect(page.getByTestId('focus-level-advice')).toContainText('4 de 5');
 await expect(page.getByTestId('focus-level-advice')).toContainText('Baja un poco el volumen');
});

test('a normal result shows no volume warning and the deviant band is corrected alone',async({page})=>{
 test.setTimeout(120000);
 await fakeAudio(page);
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await runListener(page,{60:-66,230:-66,910:-66,3600:-52,14000:-66});
 await expect(page.getByTestId('focus-level-advice')).toBeHidden();
 const gains=await page.getByTestId('focus-eq-rows').locator('.gain').allInnerTexts();
 expect(gains).toEqual(['0 dB','0 dB','0 dB','+3 dB','0 dB']);
});

test('the EQ can be heard with a local song only after Play, and A/B keeps the same level',async({page})=>{
 test.setTimeout(120000);
 await fakeAudio(page);
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await runListener(page,{60:-55,230:-66,910:-66,3600:-70,14000:-66});
 await page.locator('#eq-preview > summary').click();
 await expect(page.getByTestId('focus-preview-play')).toBeDisabled();
 await page.getByTestId('focus-preview-file').setInputFiles({name:'cancion.mp3',mimeType:'audio/mpeg',buffer:Buffer.alloc(2048)});
 await expect(page.getByTestId('focus-preview-status')).toContainText('cancion.mp3');
 expect(await page.evaluate(()=>window.__previewPlays)).toBe(0);
 await page.getByTestId('focus-preview-play').click();
 await expect(page.getByTestId('focus-preview-status')).toContainText('Sonando con tu EQ');
 expect(await page.evaluate(()=>window.__previewPlays)).toBe(1);
 const withEq=await page.evaluate(()=>window.__previewFilters.map(f=>f.gain.value));
 expect(withEq.some(v=>v!==0)).toBe(true);
 await page.getByTestId('focus-preview-bypass').check();
 await expect(page.getByTestId('focus-preview-status')).toContainText('sin EQ');
 expect(await page.evaluate(()=>window.__previewFilters.map(f=>f.gain.value))).toEqual(withEq.map(()=>0));
 // Editing the EQ updates the preview immediately.
 await page.getByTestId('focus-preview-bypass').uncheck();
 await page.locator('#eq-edit-options > summary').click();
 await page.locator('#focus-edit-band-0').fill('-2');
 await expect.poll(()=>page.evaluate(()=>window.__previewFilters[0].gain.value)).toBe(-2);
 await page.getByTestId('focus-preview-stop').click();
 await expect(page.getByTestId('focus-preview-status')).toContainText('Detenida');
});

test('preview rejects non-audio files',async({page})=>{
 test.setTimeout(120000);
 await fakeAudio(page);
 await page.goto('/');
 await page.getByTestId('focus-begin').click();
 await runListener(page,{60:-66,230:-66,910:-66,3600:-66,14000:-66});
 await page.locator('#eq-preview > summary').click();
 await page.getByTestId('focus-preview-file').setInputFiles({name:'notas.txt',mimeType:'text/plain',buffer:Buffer.from('hola')});
 await expect(page.getByTestId('focus-preview-status')).toContainText('archivo de audio');
 await expect(page.getByTestId('focus-preview-play')).toBeDisabled();
});
