/* ============================================================
   INPUT AND BOOT
   ============================================================ */
function buildClassCards(){
  const wrap=document.getElementById("classCards");wrap.innerHTML="";
  PLAYER_CLASSES.forEach(cls=>{
    const card=document.createElement("div");card.className="card";card.tabIndex=0;
    card.innerHTML='<div class="icon" style="color:'+CLASS_COLOR[cls]+'">'+CLASS_ICON[cls]+'</div><div class="name" style="color:'+CLASS_COLOR[cls]+'">'+cls+'</div><div class="desc">'+CLASS_BLURB[cls]+'</div><div class="ability">★ '+SPECIALTY[cls].name+'<br>Q '+CLASS_POWER[cls].name+'</div>';
    const choose=()=>{
      selectedClass=cls;player.maxHp=mods().maxHp;player.hp=player.maxHp;activePanel=null;
      document.getElementById("classPanel").classList.remove("open");scheduleCaravan(false);
      toast("You choose the "+cls+" Specialty. Your first Specialty and Skills points are ready.");updateUI();saveGame(true);
    };
    card.addEventListener("click",choose);card.addEventListener("keydown",e=>{if(e.key==="Enter")choose()});wrap.appendChild(card);
  });
}
function setupGame(newSeed,loading=false){
  closePanels();dayNo=1;dayClock=0;roadSafety=62;kills=0;caravans=[];worldEnemies=[];particles=[];bolts=[];villageEvents=[];nextEventId=1;llmQueue=[];
  generateWorld(newSeed);generateDungeon();
  scene="world";currentShop=null;shopCanvas=null;shopCells=null;
  resourceState=new Map();gatherLockKey=null;
  selectedClass=null;purchased=new Set();spentPoints=0;quest={gathered:false,traded:false,escort:false,dungeon:false,built:false};
  const spawn=worldSpawnPoint();
  Object.assign(player,{x:spawn.x,y:spawn.y,face:{x:0,y:1},hp:10,maxHp:10,coins:24,relics:0,
    cargo:[0,0,0,0],capacity:20,materials:[0,0,0,0],materialCapacity:30,level:1,xp:0,specialtyPoints:1,skillPoints:1,
    lifeSkills:{fishing:0,forestry:0,mining:0,hunting:0},equipment:{fishing:false,forestry:false,mining:false,hunting:false},
    backpackCols:8,backpackRows:5,gearInventory:[],equippedSlots:{helmet:null,shield:null,weapon:null,gauntlets:null,pants:null,amulet:null,ring:null},nextItemUid:1,
    swing:0,swingHit:false,combo:0,comboWindow:0,attackQueued:0,attackLunge:0,specialCd:0,dashCd:0,dashTime:0,dashHitTargets:null,hurt:0,
    jumpZ:0,jumpV:0,jumpsUsed:0,landingSquash:0,moveBlend:0,walkTime:0,moving:false,moveVX:0,moveVY:0,stepDust:0,harvestAnim:0,harvestKind:null,
    stamina:100,guardBroken:0,blockFresh:0,knockTime:0,knockX:0,knockY:0,pointerAim:false,pointerX:VW/2,pointerY:VH/2,
    influenceDay:0,tradeOrigins:[null,null,null,null],homeTownName:towns[0].name});
  document.getElementById("dayNo").textContent="1";ledgerTown=null;
  if(!loading){activePanel="classPanel";document.getElementById("classPanel").classList.add("open")}
  renderLedger();updateUI();updatePhase();
}
document.addEventListener("keydown",e=>{
  if(document.activeElement===document.getElementById("dialogueInput"))return;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  keys[e.key]=true;keys[e.key.toLowerCase()]=true;
  if((e.key==="c"||e.key==="C")&&!e.repeat)startBlock();
  if(e.key===" ")attack();
  if((e.key==="x"||e.key==="X")&&!e.repeat)jump();
  if((e.key==="e"||e.key==="E")&&!e.repeat)interact();
  if(e.key==="f"||e.key==="F")specialty();
  if(e.key==="q"||e.key==="Q")classInfluence();
  if(e.key==="Shift")dash();
  if((e.key==="m"||e.key==="M")&&!e.repeat)toggleMenu();
  if(e.key==="k"||e.key==="K")toggleSkills();
  if(e.key==="Escape"&&activePanel&&activePanel!=="classPanel")closePanels();
});
document.addEventListener("keyup",e=>{keys[e.key]=false;keys[e.key.toLowerCase()]=false});
function setPointerPosition(e){
  const rect=canvas.getBoundingClientRect();
  player.pointerX=(e.clientX-rect.left)*VW/Math.max(1,rect.width);
  player.pointerY=(e.clientY-rect.top)*VH/Math.max(1,rect.height);
  player.pointerAim=true;updatePointerAim();
}
canvas.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")setPointerPosition(e)});
canvas.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse"){setPointerPosition(e);player.pointerAim=true}});
canvas.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")player.pointerAim=false});
canvas.addEventListener("pointerdown",e=>{
  if(e.pointerType!=="mouse")return;
  setPointerPosition(e);
  if(e.button===0)attack();
  if(e.button===2){e.preventDefault();blockHeld=true;startBlock()}
});
window.addEventListener("pointerup",e=>{if(e.button===2)stopBlock()});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",closePanels));
document.getElementById("dialogueSend").addEventListener("click",sendDialogue);
document.getElementById("dialogueLeave").addEventListener("click",closePanels);
document.getElementById("dialogueInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendDialogue();e.stopPropagation()});
document.querySelectorAll(".menuTabBtn").forEach(btn=>btn.addEventListener("click",()=>selectMenuTab(btn.dataset.menuTab)));
document.getElementById("chronicleTown").addEventListener("change",renderChronicle);
document.getElementById("godModeToggle").addEventListener("change",e=>{godMode=e.target.checked;updateGodModeVisibility();toast(godMode?"God mode enabled. Private village state is now visible.":"God mode disabled. Villagers' private state is hidden.");saveGame(true)});
document.getElementById("settingsLLMBackend").addEventListener("change",e=>{llmConfig.backend=e.target.value;if(llmConfig.backend==="browser-lite")llmConfig.model=LITE_LLM_MODEL;llmEngine=null;llmConfig.enabled=false;llmConfig.status=llmConfig.backend==="browser-lite"?"Lightweight villager mind ready to load on the first conversation.":"Backend changed. Choose a model, then load or connect.";renderSettings()});
document.getElementById("settingsLLMModel").addEventListener("change",syncSettingsLLMConfig);
document.getElementById("settingsLLMUrl").addEventListener("change",syncSettingsLLMConfig);
document.getElementById("settingsLLMToggle").addEventListener("change",e=>{llmConfig.enabled=e.target.checked&&!!llmEngine;if(e.target.checked&&!llmEngine)llmConfig.status="Load or connect the selected model first.";renderSettings()});
document.getElementById("settingsLLMInit").addEventListener("click",initializeLocalLLM);
document.getElementById("settingsRunPlanners").addEventListener("click",()=>{const modelPlans=llmConfig.enabled&&llmConfig.backend!=="browser-lite";runAllPlanners(modelPlans);llmConfig.status=modelPlans?"Village planning queued with the selected model.":"Deterministic village plans refreshed; the tiny model remains dedicated to smooth conversations.";renderSettings()});
document.addEventListener("pointerdown",ensureAudio,{once:true});document.addEventListener("keydown",ensureAudio,{once:true});
document.getElementById("musicToggle").addEventListener("change",e=>{audioConfig.music=e.target.checked;ensureAudio();saveAudioPrefs()});
document.getElementById("sfxToggle").addEventListener("change",e=>{audioConfig.sfx=e.target.checked;ensureAudio();saveAudioPrefs()});
document.getElementById("audioPreview").addEventListener("click",()=>{ensureAudio();playSfx("day")});
document.getElementById("godTown").addEventListener("change",()=>renderGodMode());document.getElementById("godAgent").addEventListener("change",()=>renderGodMode());document.getElementById("godRefresh").addEventListener("click",()=>renderGodMode());
document.getElementById("helpBtn").addEventListener("click",()=>{if(!activePanel)openMenu("inventory")});
document.getElementById("mobileMenu").addEventListener("click",()=>{if(activePanel==="menuPanel")closePanels();else if(!activePanel)openMenu("inventory")});
document.getElementById("menuSave").addEventListener("click",()=>saveGame(false));
document.getElementById("menuLoad").addEventListener("click",loadGame);
document.getElementById("saveBtn").addEventListener("click",()=>saveGame(false));
document.getElementById("loadBtn").addEventListener("click",loadGame);
document.getElementById("newBtn").addEventListener("click",()=>{if(confirm("Begin a new valley? Your current game remains available only if you saved it."))setupGame((Math.random()*0xffffffff)>>>0)});
const lastDpadTap={};
document.querySelectorAll("#dpad [data-key]").forEach(btn=>{
  const key=btn.dataset.key;btn.addEventListener("pointerdown",e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);player.pointerAim=false;keys[key]=true;
    const direction={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}}[key],now=performance.now();
    if(now-(lastDpadTap[key]||0)<285){player.face=direction;dash();lastDpadTap[key]=0}else lastDpadTap[key]=now;
  });
  const release=e=>{e.preventDefault();keys[key]=false};btn.addEventListener("pointerup",release);btn.addEventListener("pointercancel",release);
});
function mobileAutoAim(){
  let best=null,bestDistance=175;
  for(const e of currentEnemies()){
    if(e.dead)continue;
    const d=Math.hypot(e.x-player.x,e.y-player.y);
    if(d<bestDistance){best=e;bestDistance=d}
  }
  player.pointerAim=false;
  if(best){
    const dx=best.x-player.x,dy=best.y-player.y,d=Math.max(1,Math.hypot(dx,dy));
    player.face={x:dx/d,y:dy/d};
  }
}
const touchAttack=document.getElementById("touchAtk");touchAttack.addEventListener("pointerdown",e=>{e.preventDefault();mobileAutoAim();attack()});
const touchBlock=document.getElementById("touchBlock");touchBlock.addEventListener("pointerdown",e=>{e.preventDefault();touchBlock.setPointerCapture?.(e.pointerId);mobileAutoAim();blockHeld=true;startBlock()});
const releaseTouchBlock=e=>{e.preventDefault();stopBlock()};touchBlock.addEventListener("pointerup",releaseTouchBlock);touchBlock.addEventListener("pointercancel",releaseTouchBlock);
document.getElementById("touchUse").addEventListener("click",interact);
document.getElementById("touchJump").addEventListener("click",jump);
const touchSkill=document.getElementById("touchSpec");let touchSkillTimer=null,touchInfluence=false;
touchSkill.addEventListener("pointerdown",e=>{e.preventDefault();touchSkill.setPointerCapture?.(e.pointerId);touchInfluence=false;clearTimeout(touchSkillTimer);touchSkillTimer=setTimeout(()=>{touchInfluence=true;classInfluence()},480)});
touchSkill.addEventListener("pointerup",e=>{e.preventDefault();clearTimeout(touchSkillTimer);if(!touchInfluence){mobileAutoAim();specialty()}touchInfluence=false});
touchSkill.addEventListener("pointercancel",()=>{clearTimeout(touchSkillTimer);touchInfluence=false});
document.getElementById("mobileFullscreen").addEventListener("click",async e=>{
  e.preventDefault();
  try{
    if(!document.fullscreenElement)await document.documentElement.requestFullscreen({navigationUI:"hide"});
    else await document.exitFullscreen();
  }catch(err){toast("Fullscreen is controlled by your browser. Rotate the phone sideways to use the HUD.")}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape")}catch(err){}
});

buildClassCards();setupGame((Math.random()*0xffffffff)>>>0);updateGodModeVisibility();
function frame(now){
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  if(selectedClass&&!activePanel){
    if(hitStop>0){hitStop=Math.max(0,hitStop-dt);screenShake=Math.max(0,screenShake-dt*28);render();requestAnimationFrame(frame);return}
    dayClock+=dt;if(dayClock>=DAY_SECONDS){dayClock-=DAY_SECONDS;newDay()}
    if(scene==="world"&&isNight()&&rand()<dt*.12)spawnRoadRat();
    stepAgents(dt);stepCaravans(dt);stepPlayer(dt);stepBolts(dt);stepEnemies(dt);stepParticles(dt);
    screenShake=Math.max(0,screenShake-dt*28);
    if(toastTimer>0)toastTimer-=dt;
    autosaveTimer+=dt;if(autosaveTimer>20){autosaveTimer=0;saveGame(true)}
  }
  if(scene!=="world"){
    if(ledgerTown!==null){ledgerTown=null;renderLedger()}
  }else{
    const town=nearestTown();if(town!==ledgerTown)renderLedger();
  }
  updatePhase();render();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
