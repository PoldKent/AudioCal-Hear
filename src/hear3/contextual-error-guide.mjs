/**
 * Hear 3 · D-027: non-invasive, contextual troubleshooting.
 * Pure text selection only; no Web Audio, storage, telemetry, URL fetching,
 * device detection or automatic attempts to resume/raise sound levels.
 */
const plans=Object.freeze({
 route:Object.freeze({
  title:'Comprueba la salida de sonido',
  steps:Object.freeze([
   'Detén el examen si algún sonido sigue reproduciéndose.',
   'Comprueba manualmente qué auriculares o altavoces están seleccionados y que funcionan correctamente.',
   'Mantén el volumen físico bajo y cómodo; no lo aumentes para perseguir un tono inaudible.',
   'Regresa a la preparación y confirma de nuevo la salida antes de reanudar por tu cuenta.',
  ]),
 }),
 audio:Object.freeze({
  title:'Revisa los permisos y la reproducción',
  steps:Object.freeze([
   'Verifica que tu navegador permite Web Audio y que la página sigue activa.',
   'Comprueba la salida de sonido con el volumen físico bajo, sin cambiar el nivel durante el examen.',
   'Si hubo una llamada, desconexión Bluetooth o suspensión, vuelve a confirmar la ruta de audio.',
   'Reanuda únicamente desde el control explícito de Hear, nunca mediante reproducción automática.',
  ]),
 }),
 storage:Object.freeze({
  title:'Protege el examen guardado',
  steps:Object.freeze([
   'No borres datos del navegador ni sobrescribas el examen anterior.',
   'Consulta la sección de recuperación y descarga una copia local verificable si está disponible.',
   'Si la copia aparece dañada o el almacenamiento está bloqueado, conserva los archivos originales.',
   'Inicia un examen nuevo solo después de resolver el conflicto de datos y autorizarlo.',
  ]),
 }),
 bands:Object.freeze({
  title:'Revisa las frecuencias del equipo',
  steps:Object.freeze([
   'Compara las frecuencias introducidas con las bandas reales de tu ecualizador.',
   'Mantén entre 2 y 31 bandas únicas, ordenadas y dentro del intervalo admitido.',
   'Confirma los cambios antes de iniciar un nuevo barrido; el plan activo no se reemplaza silenciosamente.',
   'Si tu equipo no muestra frecuencias en Hz, utiliza el modo manual sin inventar equivalencias.',
  ]),
 }),
 general:Object.freeze({
  title:'Resuelve este paso sin perder tu avance',
  steps:Object.freeze([
   'Comprueba si el examen está pausado o si existe una copia local recuperable.',
   'Conserva los resultados previos y evita borrar o reiniciar la sesión por error.',
   'Revisa Ajustes → Diagnóstico técnico para generar un informe local voluntario y sin datos auditivos.',
   'Si el problema persiste, detén el examen; ningún tono debe iniciarse automáticamente.',
  ]),
 }),
});
const ROUTE=/salida|ruta|route|volumen|bluetooth|auricular|altavoz|headphone|output/i;
const AUDIO=/audio|reproduc|tone|tono|sonido|contexto|context|oscillator|web\s*audio|suspended|interrumpid|playback/i;
const STORAGE=/checkpoint|copia|guardad|almacena|storage|persist|recuper|recovery|revision|versi[oó]n|historial/i;
const BANDS=/frecuenc|bandas|distribuci[oó]n|layout|profile|perfil|plan|eq\b/i;
export function explainHear3ExamError(message){
 const text=typeof message==='string'?message:'';
 const category=ROUTE.test(text)?'route':STORAGE.test(text)?'storage':
  BANDS.test(text)?'bands':AUDIO.test(text)?'audio':'general';
 const plan=plans[category];
 return Object.freeze({
  category,title:plan.title,steps:plan.steps,
  warning:'Estas indicaciones no certifican seguridad acústica; dBFS no equivale a dB SPL.',
 });
}
