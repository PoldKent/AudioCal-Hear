import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebAudioToneAdapter } from '../src/hear3/web-audio-adapter.mjs';

function createFakeContext({ pendingResume = false, panning = true } = {}) {
  const calls = [];
  const nodes = [];
  const listeners = new Map();
  let resolveResume;
  const ctx = {
    state: pendingResume ? 'suspended' : 'running',
    sampleRate: 48000,
    currentTime: 10,
    destination: {},
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
    createOscillator() {
      const osc = {
        type: null, onended: null,
        frequency: { setValueAtTime: (...args) => calls.push(['frequency', ...args]) },
        connect: () => calls.push(['osc.connect']),
        disconnect: () => calls.push(['osc.disconnect']),
        start: (at) => calls.push(['start', at]),
        stop: (at) => calls.push(['stop', at]),
      };
      nodes.push(osc);
      return osc;
    },
    createGain: () => ({
      gain: {
        cancelScheduledValues: (v) => calls.push(['cancel', v]),
        setValueAtTime: (...args) => calls.push(['gain.set', ...args]),
        linearRampToValueAtTime: (...args) => calls.push(['gain.ramp', ...args]),
      },
      connect: () => calls.push(['gain.connect']),
      disconnect: () => calls.push(['gain.disconnect']),
    }),
    createStereoPanner: panning ? () => ({
      pan: { setValueAtTime: (...args) => calls.push(['pan', ...args]) },
      connect: () => calls.push(['pan.connect']),
      disconnect: () => calls.push(['pan.disconnect']),
    }) : undefined,
    async resume() {
      if (!pendingResume) { this.state = 'running'; return; }
      return new Promise((resolve) => {
        resolveResume = () => { this.state = 'running'; resolve(); };
      });
    },
    async close() { this.state = 'closed'; calls.push(['close']); },
  };
  return { ctx, calls, nodes, listeners, resolvePending: () => resolveResume?.() };
}
const args = (overrides = {}) => ({
  toneId: 'a1', frequencyHz: 1000, digitalLevelDbfs: -45,
  channel: 'left', authorizedDigitalRangeDbfs: { minDbfs: -85, maxDbfs: -35 },
  durationSeconds: 2, ...overrides,
});

test('starts a bounded sine and stops by zeroing gain immediately on response', async () => {
  const f = createFakeContext();
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx });
  assert.equal((await a.playTone(args())).started, true);
  assert.deepEqual(f.calls.find(c => c[0] === 'pan'), ['pan', -1, 10]);
  assert.ok(f.calls.some(c => c[0] === 'gain.ramp' && Math.abs(c[1] - 10 ** (-45 / 20)) < 1e-12));
  assert.deepEqual(f.calls.filter(c => c[0] === 'stop'), [['stop', 12]]);
  assert.equal(a.stop(), true);
  assert.equal(a.getStatus().activeToneId, null);
  assert.deepEqual(f.calls.filter(c => c[0] === 'stop'), [['stop', 12], ['stop', 10]]);
  assert.deepEqual(f.calls.filter(c => c[0] === 'gain.set').at(-1), ['gain.set', 0, 10]);
});

test('does not play after a pending resume was interrupted', async () => {
  const f = createFakeContext({ pendingResume: true });
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx });
  const pending = a.playTone(args());
  a.stop();
  f.resolvePending();
  assert.deepEqual(await pending, { started: false, reason: 'cancelled' });
  assert.equal(f.calls.some(c => c[0] === 'start'), false);
});

test('rejects range, invalid frequencies and unavailable stereo; never starts audio', async () => {
  const f = createFakeContext({ panning: false });
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx });
  await assert.rejects(a.playTone(args({ digitalLevelDbfs: -20 })), /authorized/);
  await assert.rejects(a.playTone(args({ frequencyHz: 24000 })), /Nyquist/);
  await assert.rejects(a.playTone(args()), /Independent channels/);
  assert.equal(f.calls.some(c => c[0] === 'start'), false);
});

test('hidden page is fail-closed; natural end does not clear a newer tone', async () => {
  const f = createFakeContext();
  let visible = true;
  const ended = [];
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx, isVisible: () => visible, onToneEnded: e => ended.push(e.toneId) });
  await a.playTone(args({ channel: 'joint' }));
  const priorEnd = f.nodes[0].onended;
  await a.playTone(args({ toneId: 'a2', channel: 'right' }));
  priorEnd?.();
  assert.equal(a.getStatus().activeToneId, 'a2');
  f.nodes[1].onended?.();
  assert.equal(a.getStatus().activeToneId, null);
  assert.deepEqual(ended, ['a2']);
  visible = false;
  await assert.rejects(a.playTone(args()), /hidden/);
});

test('disposing prevents stale replay and closes context', async () => {
  const f = createFakeContext();
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx });
  await a.playTone(args({ channel: 'joint' }));
  await a.dispose();
  assert.equal(f.ctx.state, 'closed');
  assert.equal(a.getStatus().disposed, true);
  await assert.rejects(a.playTone(args()), /disposed/);
});

test('malformed replacement tone stops a prior active tone (fail closed)', async () => {
  const f = createFakeContext();
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx });
  await a.playTone(args({ channel: 'joint' }));
  await assert.rejects(a.playTone(args({ digitalLevelDbfs: -10 })), /authorized/);
  assert.equal(a.getStatus().activeToneId, null);
  assert.equal(f.calls.filter(c => c[0] === 'stop').at(-1)[1], 10);
});

test('visibility and pagehide events silence active audio and listeners detach on dispose', async () => {
  const f = createFakeContext();
  const listeners = new Map();
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
  };
  let visible = true;
  const interruptions = [];
  const a = createWebAudioToneAdapter({ createContext: () => f.ctx, isVisible: () => visible, visibilityTarget: target, lifecycleTarget: target, onInterrupted: e => interruptions.push(e.reason) });
  await a.playTone(args({ channel: 'joint' }));
  visible = false;
  listeners.get('visibilitychange')();
  assert.equal(a.getStatus().activeToneId, null);
  visible = true;
  await a.playTone(args({ channel: 'joint', toneId: 'a2' }));
  listeners.get('pagehide')();
  assert.equal(a.getStatus().activeToneId, null);
  assert.deepEqual(interruptions, ['hidden', 'pagehide']);
  await a.dispose();
  assert.equal(listeners.size, 0);
});


test('P0 discrete tone is silenced on AudioContext suspension and reports interruption', async () => {
  const f = createFakeContext();
  const interruptions = [];
  const adapter = createWebAudioToneAdapter({
    createContext: () => f.ctx,
    onInterrupted: e => interruptions.push(e.reason),
  });
  await adapter.playTone(args({ channel: 'joint' }));
  assert.equal(adapter.getStatus().activeToneId, 'a1');
  assert.equal(adapter.getStatus().contextState, 'running');
  assert.equal(adapter.getStatus().visible, true);
  f.ctx.state = 'suspended';
  f.listeners.get('statechange')();
  assert.equal(adapter.getStatus().activeToneId, null);
  assert.equal(adapter.getStatus().contextState, 'suspended');
  assert.deepEqual(interruptions, ['context-suspended']);
  assert.ok(f.calls.some(c => c[0] === 'gain.set' && c[1] === 0));
  await adapter.dispose();
  assert.equal(f.listeners.size, 0);
});


test('devicechange stops active tone, discards future responses and detaches listener on dispose',async()=>{
 const f=createFakeContext();
 const listeners=new Map();
 const target={
  addEventListener:(name,fn)=>listeners.set(name,fn),
  removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);},
 };
 const events=[];
 const a=createWebAudioToneAdapter({createContext:()=>f.ctx,
  mediaDevicesTarget:target,onInterrupted:event=>events.push(event)});
 assert.equal(listeners.has('devicechange'),true);
 await a.playTone(args({channel:'joint'}));
 assert.equal(a.getStatus().activeToneId,'a1');
 listeners.get('devicechange')?.();
 assert.equal(a.getStatus().activeToneId,null);
 assert.deepEqual(events,[{reason:'devicechange',routeMayHaveChanged:true}]);
 assert.ok(f.calls.some(x=>x[0]==='gain.set'&&x[1]===0));
 await a.dispose();
 assert.equal(listeners.size,0);
});
test('devicechange during suspended context resume prevents any stale autoplay',async()=>{
 const f=createFakeContext({pendingResume:true});
 const target={listener:null,addEventListener(_name,fn){this.listener=fn;},
  removeEventListener(){this.listener=null;}};
 const a=createWebAudioToneAdapter({createContext:()=>f.ctx,mediaDevicesTarget:target});
 const pending=a.playTone(args({channel:'joint'}));
 target.listener?.();
 f.resolvePending();
 assert.deepEqual(await pending,{started:false,reason:'cancelled'});
 assert.equal(f.calls.some(x=>x[0]==='start'),false);
 await a.dispose();
});