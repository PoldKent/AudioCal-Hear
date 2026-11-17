/**
 * Hear 3.0 D-043: declared graphic-EQ frequencies only.
 * Presets are common nominal frequency layouts, NOT detected hardware.
 * No acoustic calibration, device preset, or physical dB conversion.
 */
const presets=Object.freeze({
 '4':[125,500,2000,8000],
 '5':[125,250,500,1000,2000],
 '7':[63,125,250,500,1000,2000,4000],
 '10':[31.5,63,125,250,500,1000,2000,4000,8000,16000],
 '15':[25,40,63,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000],
 '31':[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,
  1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000],
});
const check=(value,message)=>{if(!value)throw Error(message);};
export const HEAR3_BAND_PRESET_SIZES=Object.freeze(
 Object.keys(presets).map(Number));
function checkedFrequencies(input){
 check(Array.isArray(input)&&input.length>=2&&input.length<=31,
  'El EQ debe tener de 2 a 31 frecuencias.');
 let last=0;
 const values=[];
 for(const frequencyHz of input){
  check(Number.isFinite(frequencyHz)&&frequencyHz>=20&&frequencyHz<=20000,
   'Cada frecuencia debe estar entre 20 y 20000 Hz.');
  check(frequencyHz>last,'Las frecuencias deben ser únicas y estar ordenadas de menor a mayor.');
  last=frequencyHz;values.push(frequencyHz);
 }
 return values;
}
export function parseHear3CustomBandFrequencies(input){
 check(typeof input==='string'&&input.length>0&&input.length<=360,
  'Introduce entre 2 y 31 frecuencias, separadas por comas o espacios.');
 const tokens=input.trim().split(/[;,\s]+/).filter(Boolean);
 check(tokens.every(x=>/^(?:[1-9]\d{0,4})(?:\.\d{1,3})?$/.test(x)),
  'Frecuencia inválida. Usa números en Hz y punto decimal cuando sea necesario.');
 return checkedFrequencies(tokens.map(Number));
}
export function resolveHear3GraphicBandLayout({
 preset='5',customFrequencies='',
}={}){
 check(typeof preset==='string'&&
  (Object.hasOwn(presets,preset)||preset==='custom'),'Distribución de bandas desconocida.');
 const frequencies=preset==='custom'
  ?parseHear3CustomBandFrequencies(customFrequencies)
  :checkedFrequencies(presets[preset]);
 return Object.freeze(frequencies.map(f=>Object.freeze({
  id:'band-'+String(f),frequencyHz:f,
 })));
}
