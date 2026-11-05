const {test,expect}=require('@playwright/test');
const PILOT='/hear3-photo-privacy/';
const png=Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAJnRFWHRHUFMAUFJJVkFURV9HUFNfVE9LRU5fRE9fTk9UX0NPUFlfODg0MvrwCFIAAAAgdEVYdENhbWVyYQBQUklWQVRFX0NBTUVSQV9TRVJJQUxfMTI0poHUqwAAABVJREFUeJxjFG86wcDAwMDAwMQAAwAYXQFlQ5cK5wAAAABJRU5ErkJggg==','base64');
async function select(page,mime='image/png',buffer=png){
 await page.getByTestId('photo').setInputFiles({
  name:mime==='image/png'?'foto-con-metadatos.png':'archivo-invalido.svg',
  mimeType:mime,buffer,
 });
}
test('D-059 selected image is rasterized locally; original GPS and camera text not exported',async({page})=>{
 const posted=[];
 page.on('request',request=>{
  if(request.method()!=='GET')posted.push({url:request.url(),method:request.method()});
 });
 await page.goto(PILOT);
 await expect(page.getByTestId('download')).toBeDisabled();
 await expect(page.getByTestId('preview')).toBeHidden();
 await select(page);
 expect(png.toString('utf8')).toContain('PRIVATE_GPS_TOKEN_DO_NOT_COPY_8842');
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('status')).toContainText('PNG local de 3 × 2');
 await expect(page.getByTestId('preview')).toBeVisible();
 await expect(page.getByTestId('download')).toBeEnabled();
 const snapshot=await page.evaluate(()=>window.hear3PhotoPilot.summary());
 expect(snapshot.photoUploaded).toBe(false);
 expect(snapshot.photoStored).toBe(false);
 expect(snapshot.sourceMetadataCopied).toBe(false);
 expect(snapshot.eqOrDeviceRecognized).toBe(false);
 expect(snapshot.outputMime).toBe('image/png');
 const pending=page.waitForEvent('download');
 await page.getByTestId('download').click();
 const file=await pending;
 const fs=require('node:fs');
 const output=fs.readFileSync(await file.path());
 expect(output.subarray(0,8).equals(png.subarray(0,8))).toBe(true);
 const raw=output.toString('utf8');
 expect(raw).not.toContain('PRIVATE_GPS_TOKEN_DO_NOT_COPY_8842');
 expect(raw).not.toContain('PRIVATE_CAMERA_SERIAL_124');
 expect(posted).toEqual([]);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 expect(await page.evaluate(()=>sessionStorage.length)).toBe(0);
});
test('D-059 changing or clearing image revokes the old preview and keeps it unexportable',async({page})=>{
 await page.goto(PILOT);
 await select(page);
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('download')).toBeEnabled();
 const initial=await page.getByTestId('preview').getAttribute('src');
 expect(initial).toMatch(/^blob:/);
 await page.getByTestId('clear').click();
 await expect(page.getByTestId('preview')).toBeHidden();
 await expect(page.getByTestId('download')).toBeDisabled();
 expect(await page.evaluate(()=>window.hear3PhotoPilot.summary())).toBeNull();
 await select(page);
 await expect(page.getByTestId('download')).toBeDisabled();
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('preview')).toBeVisible();
});
test('D-059 dangerous SVG and mismatched image signature are blocked without storing data',async({page})=>{
 await page.goto(PILOT);
 await select(page,'image/svg+xml',Buffer.from('<svg onload="alert(1)"></svg>'));
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('error')).toContainText('supported JPEG');
 await expect(page.getByTestId('preview')).toBeHidden();
 await select(page,'image/png',Buffer.from('<svg onload="alert(1)"></svg>'));
 await page.getByTestId('inspect').click();
 await expect(page.getByTestId('error')).toContainText('signature');
 await expect(page.getByTestId('download')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
