(() => {
  const root = document.getElementById('rock-saw-animations');
  const stage = root.querySelector('.sa-stage');
  const q = name => stage.querySelector('[data-' + name + ']');
  const lamps = [...root.querySelectorAll('.sa-lamp')];
  const buttons = Object.fromEntries(['g','h','center','j'].map(k => [k,q(k)]));
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  const HOLD_MS = 1500, HOLD_FEEDBACK_MS = 500, RESET_MS = 3000, STUCK_MS = 30000, NEUTRAL_MS = 100, BLINK_MS = 600, RIPPLE_MS = 180, STROKE_MS = 5000;
  const LAMP_PHASE_MS = 1000, LAMP_TEST_MS = 2 * LAMP_PHASE_MS;
  let power = false, on = false, level = 4, maximum = 100, draft = 100;
  let runOpening = 40, position = 0, target = 0, motion = null;
  let mode = 'normal', reference = 40, heldPosition = 0, fault = 'normal';
  const latchedFaults = new Set(), injectedCauses = new Set();
  const faultRows = [...stage.querySelectorAll('[data-fault-entry]')];
  const WARNING_MS = 1500, WARNING_STEP_MS = 250;
  let faultWarningStart = null, resetOffDisplay = false, faultCloseAttempted = false;
  let resumeOn = false, triggerCause = false, triggerTimer = null;
  let rocker = 'center', armed = true;
  let recovering = false, inputsReady = false, positionKnown = false, jInput = null;
  let neutralSince = null, neutralTimer = null, startupNeedsCenter = true;
  let lampTestStart = null;
  const faultCodes = {supply:1,stall:2,communication:3,driver:4,timeout:5,settings:6,input:7,position:8,temperature:9,trigger:10};
  // Only these operator/settings faults leave the modeled valve path healthy.
  // Any latched fault outside this allowlist inhibits drive until acknowledgement.
  const closeOnFault = new Set(['settings','input','trigger']);
  const faultInhibitsDrive = () => [...latchedFaults].some(cause=>!closeOnFault.has(cause));
  const faultResponse = () => fault==='normal'?'none':!power?'unpowered':motion?.kind==='fault-close'?'closing':positionKnown&&position===0?'closed':'inhibited';
  const faultNames = {supply:'supply / brownout',stall:'valve jam / overcurrent',communication:'valve / interface communication',driver:'motor driver',timeout:'motion timeout',settings:'invalid saved settings',input:'conflicting inputs',position:'position unknown',temperature:'controller overtemperature',trigger:'stuck J trigger'};
  let flashOrigin = 0, flashTimer = null;
  let press = null, holdTimer = null, suppressClickUntil = 0;
  let frame = null, lastTime = performance.now(), fluidPhase = 0;
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const fmt = n => String(Math.round(n * 10) / 10);
  const nearest = (opening,cap) => clamp(Math.round(opening * 10 / cap),1,10);
  const setText = (el,text) => { if (el.textContent !== text) el.textContent = text; };
  const testingLamps = () => power && fault==='normal' && lampTestStart!==null;
  const pausedMarker = () => power && fault==='normal' && !testingLamps() && mode==='normal' && !on && (!motion || resetOffDisplay);
  const ready = () => power && fault==='normal' && !recovering && positionKnown && inputsReady;
  const mustCenterRocker = () => startupNeedsCenter&&rocker!=='center';
  const holdingForMode = () => !!press?.feedback && !press.long && !press.consumed && press.holdEligible;
  const flashingLights = () => power && fault==='normal' && (mode==='max' || mode==='clean' || pausedMarker());

  const activeCause = cause => injectedCauses.has(cause)||(cause==='trigger'&&triggerCause);
  const causeActive = () => injectedCauses.size>0||triggerCause;
  // The display and completion handler share this state. A blocked indication
  // can never authorize acknowledgement, even if a previous warning was pending.
  function faultSignal(){
    if(!power)return 'off';
    if(fault==='normal')return 'none';
    if(faultWarningStart!==null&&causeActive())return 'rejected';
    if(press?.reset&&!press.consumed){
      if(press.resetAllowed&&canResetFault())return 'holding';
      return causeActive()?'blocked':'interlocked';
    }
    return causeActive()?'active':'cleared';
  }
  function resetInstruction(){
    if(causeActive())return 'Active cause remains · remove it and release J before resetting';
    if(jInput)return 'Release J, then start a fresh 3-second reset hold';
    return 'Causes cleared · hold J 3 s to reset';
  }
  function expireFaultWarning(now){
    if(faultWarningStart===null||now-faultWarningStart<WARNING_MS)return false;
    faultWarningStart=null;flashOrigin=now;return true;
  }
  const canResetFault = () => power&&fault!=='normal'&&!causeActive();

  function updatePosition(now) {
    if (!motion) return false;
    const p = clamp((now-motion.start)/motion.duration,0,1);
    position = motion.from + (motion.to-motion.from)*p;
    if (p >= 1) {
      position=motion.to;
      if(motion.kind==='boot'||motion.kind==='fault-close'){recovering=false;positionKnown=true;}
      motion=null;return true;
    }
    return false;
  }
  function stopMotor(now=performance.now()) {
    updatePosition(now);
    motion=null;
    target=position;
  }
  function moveTo(value,kind='adjust') {
    const now=performance.now();
    updatePosition(now);
    target=clamp(value,0,100);
    const distance=Math.abs(target-position);
    if (distance < .0001) { position=target; motion=null; }
    else motion={from:position,to:target,start:now,duration:Math.max(200,distance/100*STROKE_MS),kind};
    ensureFrame();
  }
  function tryArmInputs(){
    const eligible=power&&fault==='normal'&&!testingLamps()&&!recovering&&positionKnown&&!inputsReady&&!mustCenterRocker()&&!jInput;
    if(!eligible){
      neutralSince=null;
      if(neutralTimer!==null)clearTimeout(neutralTimer);
      neutralTimer=null;return;
    }
    const now=performance.now();
    if(neutralSince===null)neutralSince=now;
    if(now-neutralSince>=NEUTRAL_MS){
      inputsReady=true;armed=true;neutralSince=null;
      if(neutralTimer!==null)clearTimeout(neutralTimer);
      neutralTimer=null;
    }else if(neutralTimer===null){
      neutralTimer=setTimeout(()=>{neutralTimer=null;render();},NEUTRAL_MS-(now-neutralSince));
    }
  }
  function beginClosing(kind){
    updatePosition(performance.now());inputsReady=false;
    if(positionKnown&&position===0&&!motion){target=0;recovering=false;return;}
    recovering=kind==='boot';positionKnown=false;
    // Reuse an existing closing motion and its original deadline. A new fault
    // or acknowledgement must not restart travel that is already closing.
    if(motion?.to===0){motion.kind=kind;target=0;}
    else moveTo(0,kind);
    if(!motion){recovering=false;positionKnown=true;}
  }
  function beginRecovery(){beginClosing('boot');}
  function updateLampTest(now){
    if(!testingLamps()||now-lampTestStart<LAMP_TEST_MS)return false;
    lampTestStart=null;flashOrigin=now;
    return true;
  }
  function paintLights(now) {
    const colors=Array(10).fill('off');
    if (power) {
      if (fault !== 'normal') {
        const signal=faultSignal();
        if(signal==='rejected'||signal==='blocked'){
          const origin=signal==='rejected'?faultWarningStart:press.start;
          const interval=signal==='rejected'?WARNING_STEP_MS:BLINK_MS;
          const phase=Math.floor((now-origin)/interval)%2;
          for(let i=0;i<10;i++)colors[i]=media.matches?'white':(phase+(signal==='blocked'?i:0))%2?'white':'blue';
        }else if(signal==='holding'){
          // Sweep all ten physical positions at the same rate. Blue code lamps
          // cover the white fill without removing their time from the sweep.
          const filled=media.matches?0:Math.floor(clamp((now-press.start)/RESET_MS,0,1)*10);
          for(let i=0;i<10;i++){
            if([...latchedFaults].some(cause=>faultCodes[cause]-1===i))colors[i]='blue';
            else if(i<filled)colors[i]='white';
          }
        }else if(media.matches||Math.floor((now-flashOrigin)/BLINK_MS)%2===0){
          for(const cause of latchedFaults)colors[faultCodes[cause]-1]=activeCause(cause)?'white':'blue';
        }
      }
      else if (testingLamps()) {
        // All ten white for 1 s, then all ten blue for 1 s, in either motion preference.
        // Lamp outputs only; auxiliary/valve outputs are never part of this test.
        colors.fill(now-lampTestStart<LAMP_PHASE_MS?'white':'blue');
      }
      else if (holdingForMode()) {
        // Symmetric inward white fill is reserved for deliberate mode changes.
        const pairs=media.matches?5:clamp(Math.floor((now-press.start-HOLD_FEEDBACK_MS)/((HOLD_MS-HOLD_FEEDBACK_MS)/5))+1,1,5);
        for(let i=0;i<pairs;i++)colors[i]=colors[9-i]='white';
      }
      else if (mode==='max') colors[draft/10-1]=media.matches?'white':Math.floor((now-flashOrigin)/BLINK_MS)%2?'white':'blue';
      else if (mode==='clean') {
        colors.fill('blue');
        const ring=media.matches?0:Math.floor((now-flashOrigin)/RIPPLE_MS)%6;
        if(ring<5)colors[4-ring]=colors[5+ring]='white';
      }
      else {
        let blueCount=0;
        if (on) blueCount=motion?Math.floor(clamp(position/Math.max(runOpening,.001),0,1)*level+.00001):level;
        else if (motion && motion.kind!=='boot') blueCount=Math.ceil(clamp(position/Math.max(runOpening,.001),0,1)*level-.00001);
        for(let i=0;i<level;i++) colors[i]=i<blueCount?'blue':'white';
        // On the alternate phase, retain the underlying saved-level bar.
        if(pausedMarker() && (media.matches || Math.floor((now-flashOrigin)/BLINK_MS)%2===0)) colors[maximum/10-1]='blue';
      }
    }
    colors.forEach((color,i)=>{
      lamps[i].classList.toggle('sa-blue',color==='blue');
      lamps[i].classList.toggle('sa-white',color==='white');
      lamps[i].dataset.color=color;
    });
    stage.dataset.colors=colors.join(',');
  }
  function drawValve(now) {
    const dt=clamp(now-lastTime,0,100);
    lastTime=now;
    const p=position/100;
    if(!media.matches && p>.0001) fluidPhase=(fluidPhase+dt*(.035+.095*p))%34;
    q('ball').setAttribute('transform','rotate('+fmt((1-p)*90)+' 210 87)');
    const flowing=p>.0001;
    for(const name of ['water-stream','bore-stream']){
      const el=q(name);
      el.setAttribute('stroke-dashoffset',String(-fluidPhase));
      el.setAttribute('opacity',flowing?'1':'0');
    }
    for(const name of ['water-body','bore-water']){
      q(name).setAttribute('stroke-width',String(flowing?3+15*Math.sqrt(p):0));
      q(name).setAttribute('opacity',flowing?'.9':'0');
    }
    setText(q('valve-readout'),fmt(position)+'% open');
    setText(q('valve-state'),!power?'Unpowered':fault!=='normal'?(faultResponse()==='closing'?'Closing on fault':faultResponse()==='closed'?'Closed · fault latched':'Position unconfirmed'):motion?'Valve moving':mode==='max'&&on?'Position held':flowing?'Water moving':'Closed');
    q('valve-svg').setAttribute('aria-label','Simulated ball valve '+fmt(position)+' percent open. '+(flowing?'Water flows left to right.':'No water flow.')+(mode==='max'?(on?' Position held during Set Max.':motion?' OFF command continues closing during setup.':' Valve closed during setup.'):'')+(!positionKnown?' Controller position reference unknown.':''));
    stage.dataset.position=String(Number(position.toFixed(4)));
    stage.dataset.target=String(Number(target.toFixed(4)));
  }
  function render() {
    const now=performance.now();
    updatePosition(now);
    updateLampTest(now);
    tryArmInputs();
    expireFaultWarning(now);
    if(!causeActive())faultWarningStart=null;
    if(ready())resetOffDisplay=false;
    const failed=fault!=='normal';
    q('power').checked=power;
    setText(q('power-state'),power?'ON':'OFF');
    // Physical switches can move even while commands are inhibited. Keep them
    // operable so cold-start, recovery, and fault-held inputs can be exercised.
    Object.entries(buttons).forEach(([key,b])=>{
      b.disabled=false;
      b.dataset.commandEnabled=String(key==='center'||(key==='j'?(failed?canResetFault():ready()):ready()&&mode!=='clean'&&!jInput));
    });
    for(const row of faultRows){
      const cause=row.dataset.faultEntry, active=activeCause(cause);
      const toggle=row.querySelector('[data-fault-toggle]');
      toggle.disabled=!power;toggle.checked=injectedCauses.has(cause);
      setText(row.querySelector('[data-cause-status]'),active?(cause==='trigger'&&triggerCause?'Cause active · release J'+(injectedCauses.has(cause)?' and remove injected cause':''):'Cause active · reset blocked'):latchedFaults.has(cause)?'Cause cleared · reset pending':'Not latched');
    }
    q('clear-causes').disabled=!power||injectedCauses.size===0;
    q('reset-fault').disabled=!canResetFault()||!!jInput;
    buttons.g.setAttribute('aria-pressed',String(rocker==='g'));
    buttons.h.setAttribute('aria-pressed',String(rocker==='h'));
    buttons.center.setAttribute('aria-pressed',String(rocker==='center'));
    buttons.j.setAttribute('aria-pressed',String(!!jInput));
    setText(buttons.j.querySelector('small'),failed?(causeActive()?'Reset blocked':faultSignal()==='holding'?'Hold 3 s: reset':jInput?'Release J':'Hold 3 s: reset'):!ready()?(!power?'Power off':testingLamps()?'Startup test':recovering?'Closing valve':mustCenterRocker()?'Center '+rocker.toUpperCase()+' first':jInput?'Release J':startupNeedsCenter?'Wait for neutral':'Wait for release'):mode==='clean'?'Press: return':mode==='max'?'Tap: save & exit':on?'Tap: water off':'Tap: water on');
    buttons.j.setAttribute('aria-label',failed?'J reset: '+(faultSignal()==='holding'?'eligible hold in progress':resetInstruction()):!ready()?'J commands locked: '+(!power?'controller power off':testingLamps()?'startup lamp test':recovering?'valve closing':mustCenterRocker()?'center '+rocker.toUpperCase()+' and release J':jInput?'release J':startupNeedsCenter?'waiting for neutral controls':'waiting for stable J release'):mode==='clean'?'J: press to immediately leave Flush and restore normal operation':mode==='max'?'J: tap to save maximum; hold for 1.5 seconds for Flush':'J: tap to toggle water; hold for 1.5 seconds to enter Set Max');
    setText(q('mode-label'),!power?'POWER OFF':failed?'FAULT · '+faultSignal().toUpperCase():testingLamps()?'LAMP TEST':holdingForMode()?(mode==='max'?'HOLD → FLUSH':'HOLD → SET MAX'):mode==='clean'?'FLUSH · 100%':mode==='max'?'SET MAX':'NORMAL');
    setText(q('scale-start'),mode==='clean'?'FULL OPEN':mode==='max'?'10% OPEN':'LESS');
    setText(q('scale-end'),mode==='clean'?'100%':mode==='max'?'100% OPEN':'MORE');
    setText(q('blue-key'),failed?'Cause cleared / reset hold':testingLamps()?'Blue lamp check':mode==='clean'?'Full-open command':mode==='max'?'One lamp: maximum':pausedMarker()?'Maximum marker':'On command');
    setText(q('white-key'),failed?(faultSignal()==='holding'?'Reset progress':'Active cause / blocked reset'):testingLamps()?'White lamp check':holdingForMode()?'Hold progress':mode==='clean'?(media.matches?'Flush marker':'Outward ripple: Flush'):mode==='max'?'Lamp 5 = 50%':'Paused / saved level');
    let status='', detail='', helper='', label='';
    if(!power){
      status='Controller power off';
      detail='Saved level '+level+'/10 · Max '+maximum+'%';
      helper=position>.01?'Valve holds its position without power':'Power on starts with water off';
      label='All ten lamps off. Controller power off.';
    } else if(failed){
      const code=faultCodes[fault];
      status='Fault '+code+' · '+faultNames[fault];
      detail=faultResponse()==='closing'?'Fault response · closing valve':faultResponse()==='closed'?'Valve closed · fault remains latched':'Drive inhibited · water may still be flowing';
      helper=faultSignal()==='rejected'?'Reset refused · '+resetInstruction():faultSignal()==='blocked'?'Reset blocked · '+resetInstruction():faultSignal()==='holding'?'Reset eligible · keep holding 3 s · white fill passes behind blue codes':resetInstruction();
      if(latchedFaults.has('settings'))detail+=' · Reset restores level 4 / max 100%';
      if(latchedFaults.size>1)detail+=' · '+latchedFaults.size+' faults latched';
      label=[...latchedFaults].map(cause=>'Fault '+faultCodes[cause]+'. '+(activeCause(cause)?'Cause active.':'Cause cleared; reset pending.')).join(' ')+' '+detail+'. '+helper;
    } else if(testingLamps()){
      status='Startup · lamp test';
      detail=recovering?'Valve closing · opening commands locked':'Water command off · checking both colors';
      helper='White, then blue · release J and center G / H';
      label='Startup lamp test. All ten lamps white for one second, then all ten blue for one second. Operator commands inhibited.';
    } else if(recovering){
      status='Startup / recovery · closing valve';
      detail='Opening commands locked until the valve is closed';
      helper=(startupNeedsCenter?'Release J and center G / H':'Release J · G/H may stay held')+' · commands are not queued';
      label='Startup or recovery closing. Opening commands inhibited.';
    } else if(!inputsReady){
      status=mustCenterRocker()?'Water OFF · center '+rocker.toUpperCase()+' to enable J':jInput?'Water OFF · release J to enable controls':'Water OFF · qualifying '+(startupNeedsCenter?'neutral controls':'J release');detail='Valve closed · water stays off';
      helper=startupNeedsCenter?'Release J and center G / H for 0.1 s to arm':'Release J for 0.1 s to arm · G/H may stay held';
      label='Valve closed. '+(startupNeedsCenter?'Release J and center the rocker':'Release J')+' for 0.1 seconds before operating.';
    } else if(mode==='max'){
      const next=nearest(Math.min(reference,draft),draft), newOpening=next*draft/10;
      status='Set Max · '+draft+'% opening';
      detail='On exit: level '+next+'/10 · '+(on?(Math.abs(newOpening-heldPosition)>.02?'moves to '+fmt(newOpening)+'%':'stays at '+fmt(heldPosition)+'%'):'water stays off');
      helper=!on&&motion?'OFF command still closing · Flush requires a fresh hold after closed':'G / H adjusts maximum · Tap J to save · Hold J for Flush';
      label='Set Max. Only lamp '+draft/10+(media.matches?' is steady white.':' alternates blue and white.')+' Maximum '+draft+' percent. '+(on?'Valve held at '+fmt(position)+' percent.':motion?'OFF command continues closing.':'Valve closed.');
    } else if(mode==='clean'){
      status=motion?'Flush · opening fully':'Flush · ball 100% open';
      detail='Saved max '+maximum+'% · Return: '+(resumeOn?'level '+level+'/10 at '+fmt(runOpening)+'%':'water paused');
      helper='Press J to return immediately · G / H locked';
      label='Flush. '+(media.matches?'Blue lamps with a steady white center pair.':'White pairs ripple outward across blue lamps.')+' Target 100 percent open. Press J to return '+(resumeOn?'to level '+level+' of ten.':'to water paused.');
    } else {
      const approximate=Math.abs(runOpening-level*maximum/10)>.02;
      const shown=(approximate?'≈':'')+level+' / 10';
      status=motion?(motion.kind==='boot'?'Startup · closing valve':on?'Adjusting water':'Turning water off'):(on?'Water on · level '+shown:'Paused · level '+shown+' saved');
      detail='Max '+maximum+'% · '+(on?'Saved opening ':'Next on: ')+fmt(runOpening)+'%';
      helper=rocker==='center'?(pausedMarker()?'White = saved level · '+(media.matches?'blue':'blinking blue')+' = maximum':'Rocker centered · ready'):rocker.toUpperCase()+' held · J remains available · center or reverse for another adjustment';
      label=(on?'Water on. ':'Water paused. ')+'Level '+level+' of ten.'+(pausedMarker()?' Maximum lamp '+maximum/10+(media.matches?' is steady blue.':' alternates blue and '+(maximum/10<=level?'white.':'off.')):'');
    }
    if(power&&!failed&&holdingForMode()){
      helper='Keep holding J to enter '+(mode==='max'?'Flush':'Set Max');
      label=media.matches?'Steady white lamps while holding J.': 'White lamps fill inward from both ends while holding J.';
      label+=' Next mode: '+(mode==='max'?'Flush.':'Set Max.');
    }
    setText(q('status'),status);setText(q('target'),detail);setText(q('switch-state'),helper);
    q('panel').setAttribute('aria-label',label);
    setText(q('hold-caption'),!power?'Power on to operate':failed?(faultSignal()==='holding'?'Reset eligible · white fills left to right':resetInstruction()):testingLamps()?'Testing lamps · water command off':!ready()?'Waiting for closing / '+(startupNeedsCenter?'neutral':'J release'):press?.long||press?.consumed?'Release J to rearm':holdingForMode()?'Keep holding…':mode==='clean'?'Press J to return':mode==='max'?(!on&&motion?'Closing before Flush':'Hold 1.5 s for full open'):'Hold 1.5 s to set max');
    if(!press||(!press.feedback&&!press.reset)||press.consumed||(press.reset&&faultSignal()!=='holding')||mode==='clean')q('hold-progress').style.width='0%';
    else if(press.long)q('hold-progress').style.width='100%';
    stage.dataset.power=String(power);stage.dataset.on=String(on);stage.dataset.setting=String(level);
    stage.dataset.maximum=String(maximum);stage.dataset.draft=String(draft);stage.dataset.mode=mode;
    stage.dataset.runOpening=String(runOpening);stage.dataset.moving=String(!!motion);
    stage.dataset.armed=String(armed);
    stage.dataset.inputsReady=String(inputsReady);stage.dataset.recovering=String(recovering);stage.dataset.positionKnown=String(positionKnown);
    stage.dataset.lampTest=String(testingLamps());
    stage.dataset.rocker=rocker;stage.dataset.triggerHeld=String(!!jInput);
    stage.dataset.fault=fault;stage.dataset.faultCause=[...injectedCauses][0]||'normal';stage.dataset.latchedFaults=[...latchedFaults].join(',');
    stage.dataset.activeFaults=Object.keys(faultCodes).filter(activeCause).join(',');stage.dataset.faultSignal=faultSignal();
    stage.dataset.faultResponse=faultResponse();
    paintLights(now);drawValve(now);ensureFrame();
  }
  function needsFrame(){
    return !!motion||(!!press&&!press.consumed)||(position>.0001&&!media.matches);
  }
  function ensureFrame(){
    if(frame===null&&needsFrame())frame=requestAnimationFrame(tick);
    if(flashTimer!==null){clearTimeout(flashTimer);flashTimer=null;}
    // Startup and idle lamps need one wakeup per color change, not a frame loop.
    if(frame===null&&power&&fault!=='normal'&&(faultWarningStart!==null||!media.matches)){
      const now=performance.now();
      const interval=faultWarningStart!==null?WARNING_STEP_MS:BLINK_MS;
      const origin=faultWarningStart??flashOrigin;
      const next=interval-((now-origin)%interval);
      const delay=faultWarningStart!==null?Math.min(media.matches?WARNING_MS:next,WARNING_MS-(now-faultWarningStart)):next;
      flashTimer=setTimeout(()=>{flashTimer=null;render();},Math.max(1,delay));
    }else if(frame===null&&testingLamps()){
      const interval=LAMP_PHASE_MS;
      const delay=interval-((performance.now()-lampTestStart)%interval);
      flashTimer=setTimeout(()=>{flashTimer=null;render();},Math.max(1,delay));
    }else if(frame===null&&!media.matches&&flashingLights()){
      const interval=mode==='clean'?RIPPLE_MS:BLINK_MS;
      const delay=interval-((performance.now()-flashOrigin)%interval);
      flashTimer=setTimeout(()=>{
        flashTimer=null;paintLights(performance.now());ensureFrame();
      },Math.max(1,delay));
    }
  }
  function tick(now){
    frame=null;
    const ended=updatePosition(now);
    const testEnded=updateLampTest(now);
    const warningEnded=expireFaultWarning(now);
    const feedbackStarted=press&&press.holdEligible&&!press.consumed&&!press.feedback&&!press.long&&now-press.start>=HOLD_FEEDBACK_MS;
    if(feedbackStarted)press.feedback=true;
    if(faultSignal()==='holding')q('hold-progress').style.width=(clamp((now-press.start)/RESET_MS,0,1)*100)+'%';
    if(holdingForMode())q('hold-progress').style.width=(clamp((now-press.start-HOLD_FEEDBACK_MS)/(HOLD_MS-HOLD_FEEDBACK_MS),0,1)*100)+'%';
    if(ended||testEnded||feedbackStarted||warningEnded)render();
    else {paintLights(now);drawValve(now);ensureFrame();}
  }
  function enterMax(){
    if(!ready()||mode!=='normal')return;
    const now=performance.now();
    if(on)stopMotor(now);else updatePosition(now);
    heldPosition=position;reference=on?position:runOpening;
    draft=maximum;mode='max';flashOrigin=now;
    render();
  }
  function commitMaximum(){
    maximum=draft;
    level=nearest(Math.min(reference,maximum),maximum);
    runOpening=level*maximum/10;
  }
  function exitMax(){
    commitMaximum();
    mode='normal';
    // Quantize to a repeatable step under the new maximum, moving only after exit.
    if(on||!motion)moveTo(on?runOpening:0,'cap');
    render();
  }
  function enterCleaning(){
    if(!ready()||mode!=='max'||(!on&&motion))return;
    commitMaximum();resumeOn=on;on=true;mode='clean';
    armed=false;flashOrigin=performance.now();
    moveTo(100,'clean');render();
  }
  function exitCleaning(){
    mode='normal';on=resumeOn;resumeOn=false;
    moveTo(on?runOpening:0,on?'open':'close');render();
  }
  function tapJ(){
    if(!ready()||press||jInput)return;
    if(mode==='max'){exitMax();return;}
    if(mode==='clean'){exitCleaning();return;}
    on=!on;
    moveTo(on?runOpening:0,on?'open':'close');render();
  }
  function selectRocker(next){
    if(!['g','h','center'].includes(next))return;
    const previous=rocker;
    rocker=next;
    // Track G/H during faults without editing settings or interrupting J reset.
    // Startup requires neutral controls; fault recovery only requires J release.
    if(next==='center'){armed=true;render();return;}
    const activated=next!==previous;
    if(!ready()||mode==='clean'||jInput){armed=false;render();return;}
    if(activated){
      armed=false;
      if(mode==='max')draft=clamp(draft+(next==='g'?10:-10),10,100);
      else {
        const newLevel=clamp(level+(next==='g'?1:-1),1,10);
        if(newLevel!==level){level=newLevel;runOpening=level*maximum/10;if(on)moveTo(runOpening);}
      }
    }
    render();
  }
  function activateHold(){
    if(checkStuckTrigger())return;
    if(press?.reset){
      if(!press.consumed){
        const eligible=faultSignal()==='holding';
        press.consumed=true;
        if(eligible)resetFault(true);
        else if(causeActive())faultWarningStart=performance.now();
      }
      return;
    }
    if(!press||press.long||press.consumed||!press.holdEligible||!ready())return;
    press.long=true;
    if(mode==='normal')enterMax();
    else if(mode==='max')enterCleaning();
  }
  function startPress(source,pointerId=null,key=null){
    if(jInput)return;
    jInput={source,pointerId,key};
    armTriggerWatchdog();
    if(power&&fault!=='normal'){
      faultWarningStart=null;
      press={source,pointerId,start:performance.now(),reset:true,resetAllowed:canResetFault(),consumed:false};
      holdTimer=setTimeout(()=>{holdTimer=null;activateHold();render();},RESET_MS);
      render();return;
    }
    if(!ready()){render();return;}
    press={source,pointerId,start:performance.now(),long:false,feedback:false,consumed:mode==='clean',holdEligible:mode!=='clean'&&!(mode==='max'&&!on&&motion)};
    if(press.consumed){exitCleaning();return;}
    holdTimer=setTimeout(()=>{
      holdTimer=null;if(!press)return;
      activateHold();render();
    },HOLD_MS);
    render();
  }
  function endPress(allowTap=false){
    if(!press)return;
    const elapsed=performance.now()-press.start;
    // Classify by elapsed time even if a busy browser delayed the hold timer.
    if(allowTap&&elapsed>=(press.reset?RESET_MS:HOLD_MS))activateHold();
    const shouldTap=allowTap&&!press.reset&&!press.long&&!press.consumed&&elapsed<HOLD_FEEDBACK_MS;
    if(holdTimer!==null)clearTimeout(holdTimer);
    holdTimer=null;press=null;suppressClickUntil=performance.now()+500;
    render();
    if(shouldTap)tapJ();
  }
  function releaseInput(allowTap=false){
    // Classify a delayed release against the real elapsed hold duration before
    // clearing its watchdog; an overdue timer must not turn a stuck input into a tap.
    checkStuckTrigger();
    jInput=null;
    if(triggerCause)flashOrigin=performance.now();
    triggerCause=false;
    if(triggerTimer!==null)clearTimeout(triggerTimer);triggerTimer=null;
    suppressClickUntil=performance.now()+500;
    endPress(allowTap);render();
  }
  q('power').addEventListener('change',()=>{
    const wanted=q('power').checked;
    endPress(false);stopMotor();power=wanted;
    faultWarningStart=null;resetOffDisplay=false;flashOrigin=performance.now();
    if(triggerTimer!==null)clearTimeout(triggerTimer);triggerTimer=null;
    if(power&&jInput)armTriggerWatchdog();on=false;resumeOn=false;mode='normal';draft=maximum;
    armed=false;inputsReady=false;recovering=false;positionKnown=false;startupNeedsCenter=true;
    lampTestStart=null;
    if(power&&fault==='normal'){
      flashOrigin=performance.now();
      lampTestStart=flashOrigin;
      beginRecovery();
    }
    render();
  });
  buttons.g.addEventListener('click',()=>selectRocker('g'));
  buttons.h.addEventListener('click',()=>selectRocker('h'));
  buttons.center.addEventListener('click',()=>selectRocker('center'));
  buttons.j.addEventListener('pointerdown',e=>{
    if((e.pointerType==='mouse'&&e.button!==0)||jInput)return;
    startPress('pointer',e.pointerId);
    try{buttons.j.setPointerCapture(e.pointerId);}catch(_){}
  });
  const pointerUp=e=>{if(jInput?.source==='pointer'&&jInput.pointerId===e.pointerId&&!(e.pointerType==='mouse'&&e.button!==0))releaseInput(true);};
  buttons.j.addEventListener('pointerup',pointerUp);
  window.addEventListener('pointerup',pointerUp);
  buttons.j.addEventListener('pointercancel',e=>{if(jInput?.source==='pointer'&&jInput.pointerId===e.pointerId)releaseInput(false);});
  buttons.j.addEventListener('lostpointercapture',e=>{if(jInput?.source==='pointer'&&jInput.pointerId===e.pointerId)releaseInput(false);});
  buttons.j.addEventListener('contextmenu',e=>e.preventDefault());
  buttons.j.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)startPress('keyboard',null,e.key);}});
  const keyUp=e=>{if(jInput?.source==='keyboard'&&jInput.key===e.key){e.preventDefault();releaseInput(true);}};
  buttons.j.addEventListener('keyup',keyUp);window.addEventListener('keyup',keyUp);
  // Pointer clicks are already handled on down/up; retain accessibility activation.
  buttons.j.addEventListener('click',e=>{if(!e.detail&&performance.now()>=suppressClickUntil)tapJ();});
  window.addEventListener('blur',()=>releaseInput(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseInput(false);});
  function armTriggerWatchdog(){
    if(!power||!jInput)return;
    jInput.poweredAt=performance.now();
    if(triggerTimer!==null)clearTimeout(triggerTimer);
    triggerTimer=setTimeout(()=>{
      triggerTimer=null;
      checkStuckTrigger();
    },STUCK_MS);
  }
  function checkStuckTrigger(){
    if(power&&jInput&&performance.now()-jInput.poweredAt>=STUCK_MS){
      if(!triggerCause){triggerCause=true;latchFault('trigger');}
      return true;
    }
    return false;
  }
  function latchFault(cause){
    if(!Object.hasOwn(faultCodes,cause))return;
    endPress(false);updatePosition(performance.now());
    if(latchedFaults.size===0)faultCloseAttempted=false;
    latchedFaults.add(cause);
    faultWarningStart=null;resetOffDisplay=false;flashOrigin=performance.now();
    fault=[...latchedFaults].sort((a,b)=>faultCodes[a]-faultCodes[b])[0];
    mode='normal';draft=maximum;
    on=false;resumeOn=false;armed=false;inputsReady=false;recovering=false;
    lampTestStart=null;
    if(faultInhibitsDrive()){
      stopMotor();positionKnown=false;faultCloseAttempted=true;
    }else if(!faultCloseAttempted){
      faultCloseAttempted=true;beginClosing('fault-close');
    }
    render();
  }
  for(const row of faultRows){
    const cause=row.dataset.faultEntry, toggle=row.querySelector('[data-fault-toggle]');
    toggle.addEventListener('change',()=>{
      if(!power){render();return;}
      if(toggle.checked){injectedCauses.add(cause);latchFault(cause);}
      else {injectedCauses.delete(cause);flashOrigin=performance.now();render();}
    });
  }
  q('clear-causes').addEventListener('click',()=>{
    if(!power)return;
    injectedCauses.clear();flashOrigin=performance.now();render();
  });
  function resetFault(fromHold=false){
    if(!canResetFault()||(!fromHold&&jInput))return;
    if(latchedFaults.has('settings')){level=4;maximum=100;runOpening=40;}
    // Return to the paused lamp display immediately; closure/neutral still gate inputs.
    resetOffDisplay=true;faultWarningStart=null;flashOrigin=performance.now();
    latchedFaults.clear();fault='normal';draft=maximum;faultCloseAttempted=false;startupNeedsCenter=false;
    beginRecovery();render();
  }
  q('reset-fault').addEventListener('click',()=>resetFault());
  media.addEventListener?.('change',render);
  render();
})();
