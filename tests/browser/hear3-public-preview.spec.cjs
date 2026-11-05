const { test, expect } = require('@playwright/test');

const pilots = [
  { link: 'Abrir piloto de tonos', url: '/tests/fixtures/hear3-audio-pilot.html', heading: 'piloto interno de audio' },
  { link: 'Abrir piloto de barrido', url: '/tests/fixtures/hear3-sweep-pilot.html', heading: 'barrido experimental interno' },
  { link: 'Abrir piloto de catálogo', url: '/tests/fixtures/hear3-catalog-pilot.html', heading: 'piloto interno de respaldo' },
  { link: 'Abrir visor de historial V2', url: '/tests/fixtures/hear3-legacy-v2-pilot.html', heading: 'revisión de perfiles antiguos' },
];

test('Hear 3.0 public preview is linked from the real app without replacing Hear 2.0', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#root')).toHaveAttribute('data-page','setup');
  const notice=page.getByRole('complementary',{name:'Avance de Hear 3.0'});
  await expect(notice).toContainText('Vista previa disponible');
  await notice.getByRole('link',{name:/Ver vista previa/}).click();
  await expect(page).toHaveURL(/\/hear3-preview\/$/);
  await expect(page.getByRole('heading',{level:1})).toContainText('La próxima forma de');
  await expect(page.getByText('Es una vista previa experimental')).toBeVisible();
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth+2);
  expect(noOverflow).toBe(true);
});

test('preview exposes the four implemented pilots, not a fictional full Hear 3.0 exam', async ({page}) => {
  await page.goto('/hear3-preview/');
  await expect(page.getByText('todavía no forman un examen Hear 3.0 completo')).toBeVisible();
  await expect(page.locator('#pilotos article')).toHaveCount(4);
  for (const pilot of pilots) {
    const link=page.getByRole('link',{name:pilot.link});
    await expect(link).toBeVisible();
    expect(new URL(await link.getAttribute('href'),page.url()).pathname).toMatch(
      new RegExp(pilot.url.replace(/[.*+?^\\$\{\}()|[\]\\]/g,'\\$&')+'$')
    );
  }
});

test('all publicly linked pilots load their module UIs without audio automatically starting', async ({page}) => {
  await page.goto('/hear3-preview/');
  const paths=await page.locator('#pilotos article a').evaluateAll(links=>links.map(x=>x.href));
  expect(paths).toHaveLength(4);
  for (let i=0;i<paths.length;i++) {
    await page.goto(paths[i]);
    await expect(page.locator('main h1')).toContainText(pilots[i].heading,{ignoreCase:true});
    await expect(page.locator('main')).toBeVisible();
    if (i===0) await expect(page.getByTestId('start')).toBeEnabled();
    if (i===1) await expect(page.getByTestId('start')).toBeEnabled();
  }
});

test('preview navigation never clears or migrates Hear 2.0 profiles automatically',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.setItem('audiocal-hear-profiles-v1','DO_NOT_TOUCH_V2'));
  await page.goto('/hear3-preview/');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await page.goto('/tests/fixtures/hear3-legacy-v2-pilot.html');
  expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('DO_NOT_TOUCH_V2');
  await page.goto('/hear3-preview/');
  expect(await page.evaluate(()=>localStorage.getItem('audiocal-hear-profiles-v1'))).toBe('DO_NOT_TOUCH_V2');
});
