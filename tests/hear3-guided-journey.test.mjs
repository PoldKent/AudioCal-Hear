import test from 'node:test';
import assert from 'node:assert/strict';
import {
 HEAR3_JOURNEY_STEPS,determineHear3JourneyStage,createHear3JourneyModel,
} from '../src/hear3/guided-journey.mjs';
test('D-018 guided exam follows existing evidence, not a separate artificial flow',()=>{
 assert.deepEqual(HEAR3_JOURNEY_STEPS,['prepare','sweep','tones','result']);
 assert.equal(determineHear3JourneyStage({}),'prepare');
 assert.equal(determineHear3JourneyStage({sweep:{status:'playing'}}),'sweep');
 assert.equal(determineHear3JourneyStage({sweepResult:{status:'completed'}}),'tones');
 assert.equal(determineHear3JourneyStage({exam:{status:'paused'}}),'tones');
 assert.equal(determineHear3JourneyStage({exam:{status:'ready'}}),'tones');
 assert.equal(determineHear3JourneyStage({exam:{status:'completed'}}),'tones');
 assert.equal(determineHear3JourneyStage({eq:{resultAvailable:true}}),'result');
});
test('only actual engine progression marks stages as reached',()=>{
 const model=createHear3JourneyModel({exam:{status:'playing'}});
 assert.equal(model.active,'tones');
 assert.deepEqual(model.items.map(x=>x.available),[true,true,true,false]);
 assert.deepEqual(model.items.map(x=>x.current),[false,false,true,false]);
 assert.ok(Object.isFrozen(model));
});
