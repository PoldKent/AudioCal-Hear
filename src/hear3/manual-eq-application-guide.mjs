/**
 * Manual EQ application guidance for existing user-declared graphic layouts.
 * No model inference, no hardware detection, no direct device access.
 * A frequency mismatch or controls without a known dB scale are NOT remapped.
 */
export const HEAR3_GUIDE_CATEGORIES=Object.freeze([
 'headphones','car','speaker','application','interface',
]);
const guides=Object.freeze({
 headphones:{
  title:'Auriculares',
  steps:[
   'Abre el ecualizador de tus auriculares o de su aplicación oficial.',
   'Busca exactamente las mismas frecuencias. No sustituyas una banda por otra porque parezca cercana.',
   'Si el control está expresado realmente en dB, introduce cada valor de la tabla. Si solo muestra puntos o posiciones sin equivalencia, no inventes una conversión.',
   'Deja sin cambios los controles que no tengan una equivalencia verificable y escucha siempre a volumen bajo y cómodo.',
  ],
 },
 car:{
  title:'Sistema de automóvil',
  steps:[
   'Con el automóvil estacionado, abre los controles de audio o el ecualizador del vehículo.',
   'Compara la frecuencia de cada banda con la tabla. Un número diferente no equivale automáticamente a la misma banda.',
   'Si el equipo indica ganancias en dB con un cero conocido, traslada solo los valores que realmente pueda representar. Si usa niveles o posiciones, necesitas la equivalencia del fabricante.',
   'No operes el ecualizador ni hagas pruebas auditivas mientras conduces. Mantén un volumen bajo y cómodo.',
  ],
 },
 speaker:{
  title:'Parlantes',
  steps:[
   'Abre el ecualizador del amplificador, reproductor o sistema que controla tus parlantes.',
   'Comprueba la coincidencia exacta de las frecuencias del EQ gráfico y verifica si la escala de ganancia está en dB.',
   'Traslada solo las bandas con escala documentada. Los mandos de graves/agudos o un EQ paramétrico no se convierten automáticamente.',
   'Mantén un volumen bajo y cómodo. El resultado no corrige automáticamente la acústica de la habitación.',
  ],
 },
 application:{
  title:'Aplicación de audio',
  steps:[
   'Abre la configuración de sonido de la aplicación donde realmente se reproducirá el audio.',
   'Comprueba que su EQ gráfico tenga las mismas frecuencias y unidades de ganancia en dB.',
   'Introduce manualmente los valores compatibles. Si una banda no coincide, no inventes otra frecuencia ni un filtro equivalente.',
   'Guarda el preset en esa aplicación si lo permite. Hear no puede controlar ni verificar un ecualizador de otra app.',
  ],
 },
 interface:{
  title:'Interfaz o equipo de audio',
  steps:[
   'Abre el ecualizador gráfico del programa o equipo conectado a tu interfaz.',
   'Confirma que el EQ realmente intervenga en la cadena por la que escucharás el audio.',
   'Verifica frecuencias y unidades en dB antes de trasladar manualmente valores compatibles.',
   'No conviertas los resultados en posiciones de preamplificador ni controles de instrumentos sin una equivalencia real y verificable.',
  ],
 },
});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function planHear3ManualEqApplication({review,category='headphones'}={}){
 check(HEAR3_GUIDE_CATEGORIES.includes(category),'El tipo de dispositivo no es válido.');
 check(review&&Array.isArray(review.rows)&&review.rows.length>=2&&
  review.rows.length<=31&&finite(review.capDb)&&review.capDb>0&&
  review.capDb<=3,'No hay un ecualizador válido para preparar la guía.');
 let last=0;
 const rows=review.rows.map((item)=>{
  check(item&&finite(item.frequencyHz)&&item.frequencyHz>last&&
   item.frequencyHz>=20&&item.frequencyHz<=20000&&
   finite(item.gainDb)&&Math.abs(item.gainDb)<=review.capDb&&
   Number.isInteger(item.gainDb*2),'Las bandas o ganancias no son compatibles.');
  last=item.frequencyHz;
  return Object.freeze({
   frequencyHz:item.frequencyHz,gainDb:item.gainDb,
   text:item.frequencyHz+' Hz · '+(item.gainDb>0?'+':'')+item.gainDb+' dB',
  });
 });
 const guide=guides[category];
 return Object.freeze({
  category,title:guide.title,
  steps:guide.steps,
  rows:Object.freeze(rows),
  hasNonNeutralGain:rows.some(r=>r.gainDb!==0),
  warning:'Valores orientativos sin calibración acústica, nivel SPL ni headroom verificados. No se aplican automáticamente. Si el equipo no muestra estas frecuencias y una escala dB verificable, no inventes una conversión.',
 });
}
