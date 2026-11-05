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
  coarseStepDb=6,durationSeconds=3,channel='joint',restoredProgress=null,
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
  check((restoredProgress===null?base?.status==='ready':
    ['paused','completed'].includes(base?.status)) && base?.authorizedDigitalRangeDbfs,
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

  const PROGRESS_FORMAT='hear3-adaptive-discrete-progress-v1';
  const planBands=plan.initialOrder.map(b=>({id:b.id,frequencyHz:b.frequencyHz}));
  const progressOptions={initialDbfs,maxTrialsPerBand,coarseStepDb,durationSeconds,channel};

  function exportProgress(){
    syncControllerStatus();
    return clone({
      format:PROGRESS_FORMAT,profileId:base.profileId,
      authorizedDigitalRangeDbfs:limits,
      planBands,sweepReportCount:plan.reportCount,options:progressOptions,
      position,sequence,phase,nextDbfs,contradiction,bands,
      thresholdsEstimated:0,eqGainsCalculated:0,
    });
  }

  function applyRestoredProgress(raw){
    check(raw&&raw.format===PROGRESS_FORMAT&&raw.profileId===base.profileId,
      'Recovered adaptive progress has an unknown format or profile');
    const p=clone(raw);
    check(JSON.stringify(p.authorizedDigitalRangeDbfs)===JSON.stringify(limits),
      'Recovered adaptive progress exceeds or changes authorized digital bounds');
    check(JSON.stringify(p.options)===JSON.stringify(progressOptions),
      'Recovered adaptive settings do not match current authorized settings');
    check(JSON.stringify(p.planBands)===JSON.stringify(planBands)&&
      p.sweepReportCount===plan.reportCount,
      'Recovered adaptive plan does not match this exam');
    check(p.thresholdsEstimated===0&&p.eqGainsCalculated===0,
      'Recovered progress cannot claim clinical thresholds or EQ gains');
    check(Number.isSafeInteger(p.position)&&p.position>=0&&p.position<=bands.length,
      'Invalid saved adaptive position');
    check(Number.isSafeInteger(p.sequence)&&p.sequence>=0&&p.sequence<=100000,
      'Invalid saved tone sequence');
    check(['ready','starting','playing','paused','awaiting-confirmation','completed']
      .includes(p.phase),'Invalid saved adaptive phase');
    check(Array.isArray(p.bands)&&p.bands.length===bands.length,
      'Invalid recovered band count');
    check((p.position===bands.length)===(p.phase==='completed'),
      'Recovered band coverage and completion phase disagree');
    check(p.position===bands.length ? p.nextDbfs===null :
      finite(p.nextDbfs)&&p.nextDbfs>=limits.minDbfs&&p.nextDbfs<=limits.maxDbfs,
      'Invalid saved next digital level');
    check(p.contradiction==null || (typeof p.contradiction==='object'&&
      finite(p.contradiction.retryDbfs)&&
      p.contradiction.retryDbfs>=limits.minDbfs&&
      p.contradiction.retryDbfs<=limits.maxDbfs),
      'Invalid saved contradiction level');
    check((p.phase==='awaiting-confirmation')===(p.contradiction!==null),
      'Saved contradiction and confirmation phase disagree');
    const recorded=[];
    const ids=new Set();
    let highest=0;
    for(let i=0;i<bands.length;i++){
      const original=bands[i],b=p.bands[i];
      check(b&&b.id===original.id&&b.frequencyHz===original.frequencyHz&&
        ['pending','inconclusive','bounded-subjective-interval'].includes(b.status)&&
        typeof b.verificationAsked==='boolean'&&
        ['inconclusive','low','medium'].includes(b.confidence)&&
        Array.isArray(b.observations)&&b.observations.length<=maxTrialsPerBand,
        'Invalid saved band status or observations');
      check((i<p.position)===(b.status!=='pending'),
        'Recovered band coverage is inconsistent');
      const hears=[],misses=[];
      for(const observation of b.observations){
        check(observation&&typeof observation.toneId==='string'&&
          /^hear3-[1-9][0-9]*$/.test(observation.toneId)&&
          !ids.has(observation.toneId),'Invalid or duplicate saved tone');
        ids.add(observation.toneId);
        highest=Math.max(highest,Number(observation.toneId.slice(6)));
        check(Number.isSafeInteger(highest)&&highest<=p.sequence&&
          observation.frequencyHz===b.frequencyHz&&
          finite(observation.digitalLevelDbfs)&&
          observation.digitalLevelDbfs>=limits.minDbfs&&
          observation.digitalLevelDbfs<=limits.maxDbfs&&
          observation.channel===channel&&
          ['heard','not-heard'].includes(observation.response)&&
          observation.provenance==='user-response',
          'Recovered observation is incompatible with authorized audio');
        (observation.response==='heard'?hears:misses).push(observation.digitalLevelDbfs);
        recorded.push(observation);
      }
      if(b.status==='bounded-subjective-interval'){
        const lower=misses.length?Math.max(...misses):null;
        const upper=hears.length?Math.min(...hears):null;
        check(lower!==null&&upper!==null&&lower<upper&&
          b.intervalDbfs?.notHeardAtDbfs===lower&&
          b.intervalDbfs?.heardAtDbfs===upper&&
          b.confidence===(b.observations.length>=4?'medium':'low'),
          'Recovered interval is not supported by recorded responses');
      }else{
        check(b.intervalDbfs===null&&b.confidence==='inconclusive',
          'Inconclusive or pending band cannot claim an interval');
      }
      if(i>p.position)check(b.observations.length===0&&!b.verificationAsked,
        'Future bands cannot contain recorded observations');
    }
    const session=sessionController.getSession();
    check(JSON.stringify(session.observations)===JSON.stringify(recorded),
      'Adaptive progress and verified audio-session evidence disagree');
    if(p.contradiction!==null){
      const last=p.bands[p.position]?.observations.at(-1);
      check(last&&last.digitalLevelDbfs===p.contradiction.retryDbfs,
        'Saved contradiction does not match its final response');
    }
    check(session.status!=='completed'||p.phase==='completed',
      'Completed audio session conflicts with adaptive progress');
    for(let i=0;i<bands.length;i++)Object.assign(bands[i],clone(p.bands[i]));
    position=p.position;sequence=p.sequence;nextDbfs=p.nextDbfs;
    contradiction=p.contradiction;
    // Recovered sessions are never already audible, not even if their
    // checkpoint was captured while an oscillator was active.
    phase=session.status==='completed'?'completed':'paused';
    activeTone=null;requestEpoch++;
    for(const id of ids)taken.add(id);
  }
  if(restoredProgress!==null)applyRestoredProgress(restoredProgress);

  function syncControllerStatus() {
    const data=sessionController.getSession();
    // The audio adapter can pause asynchronously when a tone expires or a
    // browser route is lost. Invalidate the coordinator's cached tone state
    // as soon as it is observed; manual resume must remain possible.
    if(data.status==='paused' && phase!=='paused' && phase!=='completed'){
      requestEpoch++;activeTone=null;phase='paused';
    }
    return data;
  }
  function snapshot() {
    const data=syncControllerStatus();
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
    band.intervalDbfs=band.status==='bounded-subjective-interval'&&coherent
      ?{notHeardAtDbfs:loudestNotHeard,heardAtDbfs:quietestHeard}:null;
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
    const valid=state.status==='ready' && recorded &&
      recorded.toneId===expected.toneId &&
      recorded.frequencyHz===expected.frequencyHz &&
      recorded.digitalLevelDbfs===expected.digitalLevelDbfs &&
      recorded.channel===expected.channel &&
      recorded.response===response &&
      recorded.provenance==='user-response' &&
      !taken.has(recorded.toneId);
    if(!valid){
      requestEpoch++;activeTone=null;phase='paused';
      sessionController.interrupt({routeMayHaveChanged:true});
      throw Error('Unverified or duplicate tone observation');
    }
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
    phase=position>=bands.length?'completed':contradiction?'awaiting-confirmation':'ready';
    activeTone=null;
    return snapshot();
  }
  function finish(){
    check(phase==='completed','All bands must be reviewed before finishing');
    return sessionController.finish();
  }
  return Object.freeze({snapshot,exportProgress,playNext,answer,confirmContradiction,interrupt,confirmRoute,resume,finish});
}
