import test from 'node:test';
import assert from 'node:assert/strict';
import {
 chooseHear3ListeningConsoleState,HEAR3_CONSOLE_SOURCES,
} from '../src/hear3/primary-listening-console.mjs';

const state=(enabled,eqReady=false)=>chooseHear3ListeningConsoleState({enabled,eqReady});
test('console starts with explicit user action and never invents playback',()=>{
 assert.equal(state([]).mode,'setup');
 assert.equal(state(['sweep-start']).primaryId,'sweep-start');
 assert.equal(state(['sweep-start']).answers,null);
 assert.equal(state(['sweep-start','plan']).primaryId,'plan');
 assert.equal(state(['sweep-start','tone-next']).primaryId,'tone-next');
 assert.equal(state(['sweep-start','tone-finish']).primaryId,'tone-finish');
});
test('responding while tones/sweep are playing requires a real enabled source button',()=>{
 let a=state(['tone-heard','tone-not','tone-stop','tone-next']);
 assert.equal(a.mode,'tone-response');
 assert.equal(a.answers,'tone');
 assert.equal(a.stopId,'tone-stop');
 a=state(['sweep-heard','sweep-not','sweep-stop','sweep-start']);
 assert.equal(a.mode,'sweep-response');
 assert.equal(a.answers,'sweep');
 assert.equal(a.stopId,'sweep-stop');
});
test('contradictions, comparisons and recovery are always deliberate',()=>{
 assert.equal(state(['tone-confirm','tone-next']).mode,'contradiction');
 assert.equal(state(['comparison-first','comparison-second','tone-next']).mode,'comparison');
 assert.equal(state(['tone-resume','sweep-start']).mode,'resume');
 assert.equal(state(['recover-exam']).mode,'recover');
});
test('result wins only when EQ engine returns a computed result',()=>{
 assert.equal(state(['sweep-start','tone-next'],true).mode,'result');
 assert.equal(state(['sweep-start','tone-next'],false).mode,'next-tone');
 const result=state([],true);
 assert.equal(result.primaryId,null);
 assert.match(result.prompt,/no se aplica/i);
});
test('source list contains only known local exam actions, not automatic scripts',()=>{
 assert.equal(new Set(HEAR3_CONSOLE_SOURCES).size,HEAR3_CONSOLE_SOURCES.length);
 for(const id of HEAR3_CONSOLE_SOURCES)
  assert.match(id,/^(sweep-|tone-|comparison-|plan$|recover-exam$)/);
 assert.ok(Object.isFrozen(HEAR3_CONSOLE_SOURCES));
});
