const {test,expect}=require('@playwright/test');
const PILOT='/tests/fixtures/hear3-catalog-pilot.html';
const profile=()=>({
 id:'historic-file-id',name:'Auriculares de archivo',type:'headphones',
 bands:[125,500,1000,4000],
 measures:{'500|left':[{kind:'heard',db:-55,history:[{db:-55,heard:true}]}]},
 manual:{125:2},balance:{4000:-1},
});
const official=()=>JSON.stringify({
 app:'AudioCal Hear',version:1,profiles:[profile()],
},null,2);
async function setFile(page,text=official()){
 await page.getByTestId('legacy-file').setInputFiles({
  name:'AudioCal_Hear_perfiles.json',
  mimeType:'application/json',buffer:Buffer.from(text),
 });
}
test('P0 official V2 file is previewed without touching on-device V2 or V3',async({page})=>{
 await page.goto(PILOT);
 await page.evaluate(()=>{
  localStorage.setItem('audiocal-hear-profiles-v1','UNRELATED_V2_LOCAL_INVALID_SOURCE');
  localStorage.setItem('audiocal-hear-active-v1','local-active');
 });
 await page.getByTestId('legacy-source').selectOption('file');
 await setFile(page);
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('legacy-description')).toContainText('hear2-official-export-v1');
 await expect(page.getByTestId('legacy-description')).toContainText('observaciones originales que permanecen en archivo V2: 1');
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 const legacy=await page.evaluate(()=>({
  raw:localStorage.getItem('audiocal-hear-profiles-v1'),
  active:localStorage.getItem('audiocal-hear-active-v1'),
 }));
 expect(legacy).toEqual({raw:'UNRELATED_V2_LOCAL_INVALID_SOURCE',active:'local-active'});
});
test('P0 file metadata imports only after exact archive download and confirmation',async({page})=>{
 await page.goto(PILOT);
 const raw=official();
 await page.getByTestId('legacy-source').selectOption('file');
 await setFile(page,raw);
 await page.getByTestId('legacy-preview').click();
 const downloadPromise=page.waitForEvent('download');
 await page.getByTestId('legacy-export').click();
 const artifact=await downloadPromise;
 const bytes=await artifact.path();
 const fs=require('node:fs');
 const archive=JSON.parse(fs.readFileSync(bytes,'utf8'));
 expect(archive.profilesRaw).toBe(raw);
 expect(JSON.parse(archive.profilesRaw).profiles[0].manual[125]).toBe(2);
 await expect(page.getByTestId('legacy-import')).toBeEnabled();
 page.once('dialog',d=>d.dismiss());
 await page.getByTestId('legacy-import').click();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
 page.once('dialog',d=>d.accept());
 await page.getByTestId('legacy-import').click();
 await expect(page.getByTestId('summary')).toContainText('1 dispositivos, 1 perfiles, 0 resultados');
 const data=await page.evaluate(()=>window.hear3CatalogPilot.snapshot());
 expect(data.catalog.results).toHaveLength(0);
 expect(data.catalog.profiles[0].graphicEq.bands.map(x=>x.frequencyHz))
  .toEqual([125,500,1000,4000]);
 expect(data.catalog.profiles[0].graphicEq.bands.every(x=>x.verification==='unverified')).toBe(true);
 expect(data.catalog.activeProfileId).toBe(null);
 expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe(null);
});
test('P0 changing the selected file or origin invalidates prior import consent',async({page})=>{
 await page.goto(PILOT);
 await page.getByTestId('legacy-source').selectOption('file');
 await setFile(page);
 await page.getByTestId('legacy-preview').click();
 await page.getByTestId('legacy-export').click();
 await expect(page.getByTestId('legacy-import')).toBeEnabled();
 await setFile(page,JSON.stringify({app:'AudioCal Hear',version:1,profiles:[
  {...profile(),name:'Replaced file'},
 ]}));
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await expect(page.getByTestId('legacy-export')).toBeDisabled();
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await page.getByTestId('legacy-source').selectOption('browser');
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});
test('P0 unsupported or invalid V2 JSON cannot arm a metadata import',async({page})=>{
 await page.goto(PILOT);
 await page.getByTestId('legacy-source').selectOption('file');
 await setFile(page,JSON.stringify({app:'AudioCal Hear',version:99,profiles:[profile()]}));
 await page.getByTestId('legacy-preview').click();
 await expect(page.getByTestId('error')).toContainText('Invalid legacy');
 await expect(page.getByTestId('legacy-import')).toBeDisabled();
 await expect(page.getByTestId('legacy-export')).toBeDisabled();
 await expect(page.getByTestId('summary')).toContainText('0 dispositivos, 0 perfiles, 0 resultados');
});
