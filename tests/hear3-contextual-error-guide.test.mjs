import test from 'node:test';
import assert from 'node:assert/strict';
import {explainHear3ExamError} from '../src/hear3/contextual-error-guide.mjs';

test('contextual error assistance maps known problems without side effects',()=>{
 const categories=[
  ['La salida Bluetooth ya no está verificada','route'],
  ['Web Audio no disponible en este navegador','audio'],
  ['El checkpoint cambió desde la última recuperación','storage'],
  ['La distribución de frecuencias tiene bandas duplicadas','bands'],
  ['Acción no disponible','general'],
 ];
 for(const [message,category] of categories){
  const result=explainHear3ExamError(message);
  assert.equal(result.category,category,message);
  assert.ok(result.title.length>5);
  assert.ok(result.steps.length>=3);
  assert.ok(result.steps.every(s=>typeof s==='string'&&s.length>20));
  assert.match(result.warning,/dBFS.*dB SPL/);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.steps));
 }
});
test('error guide does not leak arbitrary runtime exception text or invent physical calibration',()=>{
 const sensitive='PRIVATE_DEVICE_IDENTIFIER_XYZ';
 const result=explainHear3ExamError('Desconocido: '+sensitive);
 assert.equal(result.category,'general');
 assert.equal(JSON.stringify(result).includes(sensitive),false);
 assert.equal(JSON.stringify(result).includes('calibrado'),false);
});
