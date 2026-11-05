/**
 * Hear 3.0 P0 research pilot — sweep-confirmation -> discrete-tone coordinator.
 * D-003/004/006/021/028–034/037/038/054–057/063.
 *
 * It consumes a validated sweep confirmation plan and the existing verified
 * Web Audio session controller. It NEVER synthesizes threshold numbers or EQ,
 * and no dBFS value establishes a physical sound-pressure limit.
 */
const check=(condition,message)=>{if(!condition)throw Error(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clone=x=>JSON.parse(JSON.stringify(x));

export function createHear3AdaptiveDiscreteExam({
  plan,sessionController,initialDbfs,maxTrialsPerBand=7,
  coarseStepDb=6,durationSeconds=3,channel='joint',
}={}) {
  check(plan?.interpretation==='preliminary-sweep-navigation-only'
    && Array.isArray(plan.initialOrder) && plan.initialOrder.length>=2
    && plan.initialOrder.length<=31,'Valid sweep confirmation plan required');
  check(sessionController && typeof sessionController.getSession==='function'
    && typeof sessionController.startTone==='function'
    && typeof sessionController.answer==='function'
    && typeof sessionController.interrupt==='function'
    && typeof sessionController.resume==='function', 'Verified audio-session controller required');
  const base=sessionController.getSession();
  check(base?.status==='ready' && base?.authorizedDigitalRangeDbfs,
    'Start with a ready, authorized audio session');
  const limits=clone(base.authorizedDigitalRangeDbfs);
  check(finite(limits.minDbfs)&&finite(limits.maxDbfs)&&limits.minDbfs<=limits.maxDbfs
    && limits.maxDbfs<=0,'Invalid digital authorization');
  check(finite(initialDbfs)&&initialDbfs>=limits.minDbfs&&initialDbfs<=limits.maxDbfs,
    'Initial level must be within already-authorized limits');
  check(Number.isInteger(maxTrialsPerBand)&&maxTrialsPerBand>=2&&maxTrialsPerBand<=20,
    'Invalid examination budget');
  check(finite(coarseStepDb)&&coarseStepDb>0&&coarseStepDb<=18,
    'Invalid exploratory intensity step');
  check(finite(durationSeconds)&&durationSeconds>0&&durationSeconds<=30,
    'Invalid exploratory tone duration');
  check(['left','right','joint'].includes(channel),'Invalid channel');
  const uniqueIds=new Set();
  const bands=plan.initialOrder.map(b=>{
    check(b&&typeof b.id==='string'&&b.id.trim()&&!uniqueIds.has(b.id)
      && finite(b.frequencyHz)&&b.frequencyHz>=20&&b.frequencyHz<=20000
      && b.mustConfirmWithDiscreteTone===true,'Invalid discrete band');
    uniqueIds.add(b.id);
    return {id:b.id,frequencyHz:b.frequencyHz,observations:[],
      status:'pending',intervalDbfs:null,confidence:'inconclusive',verificationAsked:false};
  });
  let position=0,sequence=0,phase='ready',nextDbfs=initialDbfs;
  let activeTone=null,requestEpoch=0,contradiction=null;
  const taken=new Set();

  function snapshot() {
    const data=sessionController.getSession();
    // A lower-level interruption always wins over a previously cached UI
    // state. Never claim a tone is still valid after route/context suspension.
    const status=data.status==='paused'?'paused':phase;
    return clone({
      status,profileId:base.profileId,channel,
      authorizedDigitalRangeDbfs:limits,
      sweepReportCount:plan.reportCount,
      bands,completedBands:bands.filter(b=>b.status!=='pending').length,
      totalBands:bands.length,currentBandId:bands[position]?.id??null,
      nextDigitalLevelDbfs:status==='ready'?nextDbfs:null,
      activeToneId:status==='playing'?activeTone?.toneId??null:null,
      needsContradictionConfirmation:status==='awaiting-confirmation',
      contradictionExplanation:status==='awaiting-confirmation'
        ?'Se detectaron respuestas incompatibles al mismo nivel o a niveles más intensos. Confirma antes de repetir, o conserva la banda como inconclusa.':null,
      thresholdsEstimated:0,eqGainsCalculated:0,
      measurementLimit:'Intervalos subjetivos de detección digital; no umbrales audiométricos, dB SPL ni calibración física.',
    });
  }

  function completeBand(status) {
    const band=bands[position];
    check(band,'No pending band');
    const heard=band.observations.filter(o=>o.response==='heard').map(o=>o.digitalLevelDbfs);
    const notHeard=band.observations.filter(o=>o.response==='not-heard').map(o=>o.digitalLevelDbfs);
    const quietestHeard=heard.length?Math.min(...heard):null;
    const loudestNotHeard=notHeard.length?Math.max(...notHeard):null;
    const coherent=quietestHeard!==null&&loudestNotHeard!==null&&loudestNotHeard<quietestHeard;
    band.status=status==='bounded-subjective-interval'&&coherent?status:'inconclusive';
    // This is a *bracket of user reports*, not an inferred audiometric threshold.
    band.intervalDbfs=coherent?{notHeardAtDbfs:loudestNotHeard,heardAtDbfs:quietestHeard}:null;
    band.confidence=band.status==='bounded-subjective-interval'
      ?(band.observations.length>=4?'medium':'low'):'inconclusive';
    position++;
    contradiction=null;activeTone=null;
    if(position>=bands.length){phase='completed';nextDbfs=null;}
    else {phase='ready';nextDbfs=initialDbfs;}
  }

  function planAfterAnswer() {
    const band=bands[position];
    const hears=band.observations.filter(o=>o.response==='heard').map(o=>o.digitalLevelDbfs);
    const misses=band.observations.filter(o=>o.response==='not-heard').map(o=>o.digitalLevelDbfs);
    const quietestHeard=hears.length?Math.min(...hears):null;
    const loudestMiss=misses.length?Math.max(...misses):null;
    const conflicting=hears.length>0&&misses.length>0&&loudestMiss>=quietestHeard;
    if(band.observations.length>=maxTrialsPerBand) {
      completeBand(conflicting?'inconclusive':'bounded-subjective-interval');
      return;
    }
    if(conflicting) {
      phase='awaiting-confirmation';
      contradiction={retryDbfs:band.observations.at(-1).digitalLevelDbfs};
      return;
    }
    let target;
    if(quietestHeard!==null&&loudestMiss!==null){
      const gap=quietestHeard-loudestMiss;
      if(gap<=2){
        // A selective confirmation repeats the quietest heard endpoint once.
        // A disagreeing answer at that same digital level is an explicit
        // contradiction and MUST enter the consent gate rather than being
        // silently replaced by the latest observation.
        if(!band.verificationAsked && band.observations.length<maxTrialsPerBand) {
          band.verificationAsked=true;
          nextDbfs=quietestHeard;phase='ready';return;
        }
        completeBand('bounded-subjective-interval');return;
      }
      target=Number(((quietestHeard+loudestMiss)/2).toFixed(2));
    } else if(quietestHeard!==null){
      target=Math.max(limits.minDbfs,quietestHeard-coarseStepDb);
      if(target>=quietestHeard){completeBand('inconclusive');return;}
    } else if(loudestMiss!==null) {
      target=Math.min(limits.maxDbfs,loudestMiss+coarseStepDb);
      if(target<=loudestMiss){completeBand('inconclusive');return;}
    } else throw Error('Internal evidence is incomplete');

    // Repeating exactly the same level after exhausting its useful
    // information is not a valid reason to continue indefinitely.
    const previouslyTested=band.observations.some(o=>o.digitalLevelDbfs===target);
    if(previouslyTested){completeBand('inconclusive');return;}
    nextDbfs=target;phase='ready';
  }

  async function playNext({userInitiated=false}={}){
    check(userInitiated===true,'Explicit action required to play a test tone');
    check(phase==='ready'&&bands[position],'No eligible tone; review pause or contradiction');
    check(sessionController.getSession().status==='ready',
      'Audio session must be ready and authorized');
    check(!contradiction,'Contradiction requires confirmation');
    const band=bands[position];
    const toneId='hear3-'+(++sequence);
    const tone={toneId,frequencyHz:band.frequencyHz,
      digitalLevelDbfs:nextDbfs,channel,durationSeconds};
    const request=++requestEpoch;
    activeTone=tone;phase='starting';
    try{
      const result=await sessionController.startTone(tone);
      const state=sessionController.getSession();
      if(request!==requestEpoch || result?.started!==true ||
        state.status!=='playing'||state.currentTone?.toneId!==toneId){
        if(request===requestEpoch){activeTone=null;phase=state.status==='paused'?'paused':'ready';}
        return {started:false,reason:'unverified-or-interrupted'};
      }
      phase='playing';
      return {started:true,tone:clone(tone)};
    }catch(error){
      if(request===requestEpoch){activeTone=null;phase='paused';}
      throw error;
    }
  }

  function answer(response){
    check(phase==='playing'&&activeTone,'No verified planned tone is playing');
    check(['heard','not-heard'].includes(response),'Invalid response');
    const expected=activeTone;
    let state;
    try{state=sessionController.answer(response);}
    catch(error){requestEpoch++;activeTone=null;phase='paused';throw error;}
    const recorded=state.observations.at(-1);
    check(state.status==='ready' && recorded &&
      recorded.toneId===expected.toneId &&
      recorded.frequencyHz===expected.frequencyHz &&
      recorded.digitalLevelDbfs===expected.digitalLevelDbfs &&
      recorded.channel===expected.channel &&
      recorded.response===response &&
      recorded.provenance==='user-response' &&
      !taken.has(recorded.toneId),'Unverified or duplicate tone observation');
    taken.add(recorded.toneId);
    bands[position].observations.push(clone(recorded));
    activeTone=null;phase='ready';
    planAfterAnswer();
    return snapshot();
  }

  function confirmContradiction({userConfirmed=false}={}){
    check(phase==='awaiting-confirmation'&&contradiction,
      'No contradiction is waiting for consent');
    if(userConfirmed!==true){completeBand('inconclusive');return snapshot();}
    nextDbfs=contradiction.retryDbfs;
    contradiction=null;phase='ready';
    return snapshot();
  }

  function interrupt({routeMayHaveChanged=false}={}){
    requestEpoch++;activeTone=null;phase='paused';
    sessionController.interrupt({routeMayHaveChanged});
    return snapshot();
  }
  function confirmRoute({userConfirmed=false}={}){
    check(phase==='paused','Session is not paused');
    check(typeof sessionController.confirmRoute==='function','Route confirmation unavailable');
    sessionController.confirmRoute({userConfirmed});
    return snapshot();
  }
  function resume({userInitiated=false}={}){
    check(phase==='paused'&&userInitiated===true,'Explicit action required to resume');
    sessionController.resume({userInitiated:true});
    phase='ready';activeTone=null;
    return snapshot();
  }
  function finish(){
    check(phase==='completed','All bands must be reviewed before finishing');
    return sessionController.finish();
  }
  return Object.freeze({snapshot,playNext,answer,confirmContradiction,interrupt,confirmRoute,resume,finish});
}
