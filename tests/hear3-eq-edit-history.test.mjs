import test from 'node:test';
import assert from 'node:assert/strict';
import {createHear3EqEditHistory} from '../src/hear3/eq-edit-history.mjs';

test('history allows undo, redo and selective reset without mutating original gains',()=>{
 const source=[1,0,-1];
 const history=createHear3EqEditHistory({initial:source,capDb:3});
 assert.equal(history.canUndo(),false);
 assert.equal(history.canRedo(),false);
 const next=[2,0,-1];
 assert.equal(history.record(next),true);
 source[0]=3;next[0]=3;
 assert.deepEqual(history.current(),[2,0,-1]);
 assert.deepEqual(history.original(),[1,0,-1]);
 assert.equal(history.canUndo(),true);
 assert.deepEqual(history.undo(),[1,0,-1]);
 assert.deepEqual(history.redo(),[2,0,-1]);
 assert.deepEqual(history.resetBand(0),[1,0,-1]);
 assert.deepEqual(history.undo(),[2,0,-1]);
 assert.deepEqual(history.restoreAll(),[1,0,-1]);
 assert.deepEqual(history.original(),[1,0,-1]);
});
test('branching edits clear only redo history and preserve the saved base',()=>{
 const h=createHear3EqEditHistory({initial:[0,0],capDb:2});
 h.record([0.5,0]);h.record([1,0]);
 h.undo();
 assert.equal(h.canRedo(),true);
 h.record([0.5,-0.5]);
 assert.equal(h.canRedo(),false);
 assert.deepEqual(h.current(),[0.5,-0.5]);
 assert.deepEqual(h.original(),[0,0]);
});
test('history rejects invalid gains, band positions and oversized edit journals',()=>{
 const h=createHear3EqEditHistory({initial:[0,0],capDb:2,maxSteps:2});
 for(const values of [[0.25,0],[3,0],[NaN,0],[Infinity,0],[0]]){
  assert.throws(()=>h.record(values),/Invalid edited EQ gains/);
 }
 assert.throws(()=>h.resetBand(2),/Unknown EQ band/);
 h.record([0.5,0]);h.record([1,0]);h.record([1.5,0]);
 assert.deepEqual(h.undo(),[1,0]);
 assert.deepEqual(h.undo(),[0.5,0]);
 assert.equal(h.canUndo(),false);
 assert.deepEqual(h.original(),[0,0]);
});
