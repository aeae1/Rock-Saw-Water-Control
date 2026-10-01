(() => {
  const root = document.getElementById('rock-saw-animations');
  const stage = root.querySelector('.sa-stage');
  const q = name => stage.querySelector('[data-' + name + ']');
  const lamps = [...root.querySelectorAll('.sa-lamp')];
  const buttons = Object.fromEntries(['g','h','center','j'].map(k => [k,q(k)]));
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  const HOLD_MS = 1500, HOLD_FEEDBACK_MS = 500, BLINK_MS = 600, RIPPLE_MS = 180, STROKE_MS = 5000;
  let power = false, on = false, level = 4, maximum = 100, draft = 100;
  let runOpening = 40, position = 0, target = 0, motion = null;
  let mode = 'normal', reference = 40, heldPosition = 0, fault = 'normal';
  let resumeOn = false;
  let rocker = 'center', armed = true;
  let flashOrigin = 0, flashTimer = null;
  let press = null, holdTimer = null, suppressClickUntil = 0;
  let frame = null, lastTime = performance.now(), fluidPhase = 0;
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const fmt = n => String(Math.round(n * 10) / 10);
  const nearest = (opening,cap) => clamp(Math.round(opening * 10 / cap),1,10);
  const setText = (el,text) => { if (el.textContent !== text) el.textContent = text; };
  const pausedMarker = () => power && fault==='normal' && mode==='normal' && !on && !motion;
  const holdingForMode = () => !!press?.feedback && !press.long && mode!=='clean';
  const flashingLights = () => power && fault==='normal' && (mode==='max' || mode==='clean' || pausedMarker());

  function updatePosition(now) {
    if (!motion) return false;
    const p = clamp((now-motion.start)/motion.duration,0,1);
    position = motion.from + (motion.to-motion.from)*p;
    if (p >= 1) { position=motion.to; motion=null; return true; }
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
  function paintLights(now) {
    const colors=Array(10).fill('off');
    if (power) {
      if (fault !== 'normal') colors[(fault==='driver'?4:7)-1]='white';
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
      lamps[i].classList.toggle('sa-fault',power&&fault!=='normal'&&color==='white');
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
    setText(q('valve-state'),!power?'Unpowered':mode==='max'?'Position held':motion?'Valve moving':flowing?'Water moving':'Closed');
    q('valve-svg').setAttribute('aria-label','Simulated ball valve '+fmt(position)+' percent open. '+(flowing?'Water flows left to right.':'No water flow.')+(mode==='max'?' Position held during maximum setup.':''));
    stage.dataset.position=String(Number(position.toFixed(4)));
    stage.dataset.target=String(Number(target.toFixed(4)));
  }
  function render() {
    const now=performance.now();
    updatePosition(now);
    const failed=fault!=='normal';
    q('power').checked=power;
    setText(q('power-state'),power?'ON':'OFF');
    Object.entries(buttons).forEach(([key,b])=>{b.disabled=!power||failed||(mode==='clean'&&key!=='j');});
    q('fault').disabled=!power;
    buttons.g.setAttribute('aria-pressed',String(rocker==='g'));
    buttons.h.setAttribute('aria-pressed',String(rocker==='h'));
    buttons.center.setAttribute('aria-pressed',String(rocker==='center'));
    buttons.j.setAttribute('aria-pressed',String(!!press));
    setText(buttons.j.querySelector('small'),mode==='clean'?'Tap: return':mode==='max'?'Tap: save & exit':on?'Tap: water off':'Tap: water on');
    buttons.j.setAttribute('aria-label',mode==='clean'?'J: tap to leave cleaning and restore normal operation':mode==='max'?'J: tap to save maximum; hold for 1.5 seconds for full-open cleaning':'J: tap to toggle water; hold for 1.5 seconds to enter maximum setup');
    setText(q('mode-label'),!power?'POWER OFF':holdingForMode()?(mode==='max'?'HOLD → CLEANING':'HOLD → MAXIMUM'):mode==='clean'?'CLEANING · 100%':mode==='max'?'SET MAXIMUM':'10 LEVELS');
    setText(q('scale-start'),mode==='clean'?'FULL OPEN':mode==='max'?'10% OPEN':'LESS');
    setText(q('scale-end'),mode==='clean'?'100%':mode==='max'?'100% OPEN':'MORE');
    setText(q('blue-key'),mode==='clean'?'Full-open command':mode==='max'?'One lamp: maximum':pausedMarker()?'Maximum marker':'On command');
    setText(q('white-key'),holdingForMode()?'Hold progress':mode==='clean'?(media.matches?'Cleaning marker':'Outward ripple: cleaning'):mode==='max'?'Lamp 5 = 50%':'Paused / saved level');
    let status='', detail='', helper='', label='';
    if(!power){
      status='Machine power off';
      detail='Saved level '+level+'/10 · Max '+maximum+'%';
      helper=position>.01?'Valve holds its position without power':'Power on starts with water off';
      label='All ten lamps off. Machine power off.';
    } else if(failed){
      const code=fault==='driver'?4:7;
      status='Fault '+code+' · '+(code===4?'motor driver':'conflicting inputs');
      detail='Motor command stopped';helper='Valve position is not confirmed by the controller';
      label='Fault '+code+'. Lamp '+code+' white.';
    } else if(mode==='max'){
      const next=nearest(Math.min(reference,draft),draft), newOpening=next*draft/10;
      status='Set maximum · '+draft+'% opening';
      detail='On exit: level '+next+'/10 · '+(on?(Math.abs(newOpening-heldPosition)>.02?'moves to '+fmt(newOpening)+'%':'stays at '+fmt(heldPosition)+'%'):'water stays off');
      helper='G / H adjusts maximum · Tap J to save · Hold J for cleaning';
      label='Maximum setup. Only lamp '+draft/10+(media.matches?' is steady white.':' alternates blue and white.')+' Maximum '+draft+' percent. Valve held at '+fmt(position)+' percent.';
    } else if(mode==='clean'){
      status=motion?'Cleaning · opening fully':'Cleaning · ball 100% open';
      detail='Saved max '+maximum+'% · Return: '+(resumeOn?'level '+level+'/10 at '+fmt(runOpening)+'%':'water paused');
      helper='Tap J to restore normal operation · G / H locked';
      label='Full-open cleaning. '+(media.matches?'Blue lamps with a steady white center pair.':'White pairs ripple outward across blue lamps.')+' Target 100 percent open. Tap J to return '+(resumeOn?'to level '+level+' of ten.':'to water paused.');
    } else {
      const approximate=Math.abs(runOpening-level*maximum/10)>.02;
      const shown=(approximate?'≈':'')+level+' / 10';
      status=motion?(motion.kind==='boot'?'Startup · closing valve':on?'Adjusting water':'Turning water off'):(on?'Water on · level '+shown:'Paused · level '+shown+' saved');
      detail='Max '+maximum+'% · '+(on?'Saved opening ':'Next on: ')+fmt(runOpening)+'%';
      helper=rocker==='center'?(pausedMarker()?'White = saved level · '+(media.matches?'blue':'blinking blue')+' = maximum':'Rocker centered · ready'):rocker.toUpperCase()+' held · center or reverse to rearm';
      label=(on?'Water on. ':'Water paused. ')+'Level '+level+' of ten.'+(pausedMarker()?' Maximum lamp '+maximum/10+(media.matches?' is steady blue.':' alternates blue and '+(maximum/10<=level?'white.':'off.')):'');
    }
    if(power&&!failed&&holdingForMode()){
      helper='Keep holding J to enter '+(mode==='max'?'full-open cleaning':'maximum setup');
      label=media.matches?'Steady white lamps while holding J.': 'White lamps fill inward from both ends while holding J.';
      label+=' Next mode: '+(mode==='max'?'full-open cleaning.':'maximum setup.');
    }
    setText(q('status'),status);setText(q('target'),detail);setText(q('switch-state'),helper);
    q('panel').setAttribute('aria-label',label);
    setText(q('hold-caption'),!power?'Power on to operate':press?.long?'Release J to rearm':holdingForMode()?'Keep holding…':mode==='clean'?'Tap J to return':mode==='max'?'Hold 1.5 s for full open':'Hold 1.5 s to set max');
    if(!press||!press.feedback||mode==='clean')q('hold-progress').style.width='0%';
    else if(press.long)q('hold-progress').style.width='100%';
    stage.dataset.power=String(power);stage.dataset.on=String(on);stage.dataset.setting=String(level);
    stage.dataset.maximum=String(maximum);stage.dataset.draft=String(draft);stage.dataset.mode=mode;
    stage.dataset.runOpening=String(runOpening);stage.dataset.moving=String(!!motion);
    stage.dataset.armed=String(armed);
    paintLights(now);drawValve(now);ensureFrame();
  }
  function needsFrame(){
    return !!motion||!!press||(position>.0001&&!media.matches);
  }
  function ensureFrame(){
    if(frame===null&&needsFrame())frame=requestAnimationFrame(tick);
    if(flashTimer!==null){clearTimeout(flashTimer);flashTimer=null;}
    // Idle lamps need one wakeup per color change, not a continuous frame loop.
    if(frame===null&&!media.matches&&flashingLights()){
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
    const feedbackStarted=press&&!press.feedback&&!press.long&&mode!=='clean'&&now-press.start>=HOLD_FEEDBACK_MS;
    if(feedbackStarted)press.feedback=true;
    if(press&&mode!=='clean')q('hold-progress').style.width=(clamp((now-press.start-HOLD_FEEDBACK_MS)/(HOLD_MS-HOLD_FEEDBACK_MS),0,1)*100)+'%';
    if(ended||feedbackStarted)render();
    else {paintLights(now);drawValve(now);ensureFrame();}
  }
  function enterMax(){
    if(!power||fault!=='normal'||mode!=='normal')return;
    const now=performance.now();stopMotor(now);
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
    moveTo(on?runOpening:0,'cap');
    render();
  }
  function enterCleaning(){
    if(!power||fault!=='normal'||mode!=='max')return;
    commitMaximum();resumeOn=on;on=true;mode='clean';
    rocker='center';armed=true;flashOrigin=performance.now();
    moveTo(100,'clean');render();
  }
  function exitCleaning(){
    mode='normal';on=resumeOn;resumeOn=false;
    moveTo(on?runOpening:0,on?'open':'close');render();
  }
  function tapJ(){
    if(!power||fault!=='normal'||press)return;
    if(mode==='max'){exitMax();return;}
    if(mode==='clean'){exitCleaning();return;}
    on=!on;
    moveTo(on?runOpening:0,on?'open':'close');render();
  }
  function selectRocker(next){
    if(!power||fault!=='normal'||mode==='clean')return;
    if(press&&mode!=='max')return;
    if((rocker==='g'&&next==='h')||(rocker==='h'&&next==='g'))armed=true;
    rocker=next;
    if(next==='center')armed=true;
    else if(armed){
      armed=false;
      if(mode==='max')draft=clamp(draft+(next==='g'?10:-10),10,100);
      else {
        const newLevel=clamp(level+(next==='g'?1:-1),1,10);
        if(newLevel!==level){level=newLevel;runOpening=level*maximum/10;if(on)moveTo(runOpening);}
      }
    }
    render();
  }
  function startPress(source,pointerId=null){
    if(!power||fault!=='normal'||press)return;
    press={source,pointerId,start:performance.now(),long:false,feedback:false};
    holdTimer=setTimeout(()=>{
      holdTimer=null;if(!press)return;
      press.long=true;
      if(mode==='normal')enterMax();
      else if(mode==='max')enterCleaning();
      else render();
    },HOLD_MS);
    render();
  }
  function endPress(allowTap=false){
    if(!press)return;
    const wasLong=press.long;
    if(holdTimer!==null)clearTimeout(holdTimer);
    holdTimer=null;press=null;suppressClickUntil=performance.now()+500;
    render();
    if(allowTap&&!wasLong)tapJ();
  }
  q('power').addEventListener('change',()=>{
    const wanted=q('power').checked;
    endPress(false);stopMotor();power=wanted;on=false;resumeOn=false;mode='normal';draft=maximum;
    rocker='center';armed=true;
    if(power&&fault==='normal'){
      flashOrigin=performance.now();
      moveTo(0,'boot');
    }
    render();
  });
  buttons.g.addEventListener('click',()=>selectRocker('g'));
  buttons.h.addEventListener('click',()=>selectRocker('h'));
  buttons.center.addEventListener('click',()=>selectRocker('center'));
  buttons.j.addEventListener('pointerdown',e=>{
    if((e.pointerType==='mouse'&&e.button!==0)||press||!power)return;
    startPress('pointer',e.pointerId);
    try{buttons.j.setPointerCapture(e.pointerId);}catch(_){}
  });
  buttons.j.addEventListener('pointerup',e=>{if(press?.source==='pointer'&&press.pointerId===e.pointerId)endPress(true);});
  buttons.j.addEventListener('pointercancel',e=>{if(press?.source==='pointer'&&press.pointerId===e.pointerId)endPress(false);});
  buttons.j.addEventListener('lostpointercapture',()=>{if(press?.source==='pointer')endPress(false);});
  buttons.j.addEventListener('contextmenu',e=>e.preventDefault());
  buttons.j.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)startPress('keyboard');}});
  buttons.j.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(press?.source==='keyboard')endPress(true);}});
  buttons.j.addEventListener('click',()=>{if(performance.now()>=suppressClickUntil)tapJ();});
  window.addEventListener('blur',()=>endPress(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endPress(false);});
  q('fault').addEventListener('change',()=>{
    endPress(false);stopMotor();fault=q('fault').value;mode='normal';draft=maximum;
    on=false;resumeOn=false;rocker='center';armed=true;
    if(fault==='normal'&&power)moveTo(0,'boot');
    render();
  });
  media.addEventListener?.('change',render);
  render();
})();
