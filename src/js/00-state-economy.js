"use strict";
/* ============================================================
   STATE, ECONOMY, AND UTILITY-DRIVEN CITIZENS
   ============================================================ */
const GOODS=["food","shelter","status","training"];
const GOOD_ICON=["●","■","◆","▲"];
const MATERIALS=["fish","logs","stone","monster parts"];
const MATERIAL_ICON=["≈","♠","◆","✹"];
const MATERIAL_BASE_PRICE=[1.2,1.5,2.1,3.2];
const CLASS_COLOR={peasant:"#a8adb6",warrior:"#cf6547",mage:"#7396ea",noble:"#e0ad43",builder:"#a8adb6"};
const CLASS_ICON={peasant:"♙",warrior:"⚔",mage:"✦",noble:"♛",builder:"⚒"};
const CLASS_PRODUCES={warrior:"food",mage:"training",noble:"status",builder:"shelter"};
const PROFESSION_NAME={warrior:"Farmer",mage:"Scholar",noble:"Courtier",builder:"Builder"};
const SPECIALTY_BUILDING={warrior:"watchpost",mage:"academy",noble:"court"};
const BASE_PROD={warrior:1.05,mage:.92,noble:.82,builder:1.0};
const CLASS_ALPHAS={
  warrior:[.31,.16,.06,.27,.20],
  mage:[.19,.15,.10,.36,.20],
  noble:[.14,.20,.36,.10,.20],
  builder:[.23,.29,.08,.13,.27]
};
const TRAITS={
  warrior:"direct, proud, and protective of the food stores",
  mage:"curious, abstract, and attentive to training and strange relics",
  noble:"diplomatic, status-conscious, and alert to political opportunities",
  builder:"practical, patient, and quietly proud of every finished roof"
};
const NAME_BANK={
  warrior:["Brann","Ilyra","Torren","Mara","Holt","Sera"],
  mage:["Orin","Vey","Elowen","Nim","Tal","Ysra"],
  noble:["Cassian","Delia","Aurel","Mirelle","Lucan","Sabine"],
  builder:["Perrin","Tamsin","Bram","Nessa","Colm","Edda"]
};
const HOUSEHOLD_NAMES=["Ashbrook","Vale","Thorne","Miller","Fenwick","Rowan","Marsh","Bell","Cairn","Wren","Hearth","Dale"];
const TIME_ENDOWMENT=16;
const DAY_SECONDS=300;
const SKILL_INDEX={fishing:0,forestry:1,mining:2,hunting:3};
const GATHER_ACTIVITY={fishing:"fishing at the pond",forestry:"felling trees at the grove",mining:"working the quarry",hunting:"hunting in the wild range"};
const TILE=16,MW=72,MH=48,VW=640,VH=400;
const TOWN_W=16,TOWN_H=12;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const keyOf=(x,y)=>x+","+y;
const townTitle=name=>name.toLowerCase().replace(/(^|\s)[a-z]/g,c=>c.toUpperCase());
const goodIndex=g=>GOODS.indexOf(g);

let seed=1,rand=Math.random,tiles=[],solid=new Set(),worldCanvas=null;
let towns=[],agents=[],caravans=[],worldEnemies=[],dungeonEnemies=[],particles=[],bolts=[],valleyRoad=[],roadPaths=new Map(),resourceLandmarks=[];
let resourceState=new Map(),gatherLockKey=null,resourceNodes={};
let scene="world",returnPosition={x:0,y:0},dungeon={},dungeonCanvas=null;
let currentShop=null,shopCanvas=null,shopCells=null;
let dayNo=1,dayClock=0,roadSafety=62,kills=0,lastTime=performance.now();
let selectedClass=null,purchased=new Set(),spentPoints=0;
let activePanel=null,dialogueAgent=null,dialogueBusy=false,ledgerTown=null;
let toastText="",toastTimer=0,autosaveTimer=0,screenShake=0;
let hitStop=0;
let quest={gathered:false,traded:false,escort:false,dungeon:false,built:false};
let villageEvents=[],nextEventId=1,godMode=false,llmEngine=null,llmQueue=[],llmBusy=false;
const NPC_UPDATE_REGIME={viewportMargin:72,nearDistance:430,nearInterval:.10,farInterval:.34,maxStep:.40,targetVisible:.18,targetNear:.55,targetFar:1.35,combatVisible:.10,combatFar:.30};
let npcUpdateMetrics={visible:0,near:0,far:0,skipped:0,seconds:0,last:{visible:0,near:0,far:0,skipped:0}};
const LITE_LLM_MODEL="onnx-community/SmolLM2-135M-Instruct-ONNX-MHA";
let llmConfig={enabled:false,backend:"browser-lite",model:LITE_LLM_MODEL,serverUrl:"http://localhost:11434/v1",serverModel:"",status:"Lightweight villager mind ready to load when you begin a conversation.",lastDecision:"Deterministic village planning active."};
const AUDIO_PREF_KEY="egglands_audio_v1";let audioConfig={music:true,sfx:true};
try{audioConfig=Object.assign(audioConfig,JSON.parse(localStorage.getItem(AUDIO_PREF_KEY)||"{}"))}catch(error){}
let audioCtx=null,musicTimer=null,musicStep=0,lastSfx={};

function synthTone(freq,duration=.08,type="square",volume=.05,delay=0){
  if(!audioCtx||audioCtx.state!=="running")return;
  const start=audioCtx.currentTime+delay,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(audioCtx.destination);osc.start(start);osc.stop(start+duration+.02);
}
function musicTick(){
  if(!audioConfig.music||!audioCtx||audioCtx.state!=="running")return;
  const bright=[0,4,7,11,7,4,2,7,0,4,9,7,4,2,0,-1],dark=[0,3,7,10,7,3,1,7,0,3,8,7,3,1,0,-2],notes=scene==="dungeon"?dark:bright,root=scene==="dungeon"?110:130.81,n=notes[musicStep%notes.length];
  synthTone(root*Math.pow(2,n/12),.12,"square",.026);if(musicStep%4===0)synthTone(root/2*Math.pow(2,[0,5,3,7][(musicStep/4)%4]/12),.28,"triangle",.035);
  musicStep++;
}
function ensureAudio(){
  if(!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioCtx=new Audio()}
  if(audioCtx.state==="suspended")audioCtx.resume();if(!musicTimer)musicTimer=setInterval(musicTick,175);
}
function playSfx(name){
  if(!audioConfig.sfx)return;ensureAudio();const now=performance.now();if(now-(lastSfx[name]||0)<45)return;lastSfx[name]=now;
  const sounds={swing:[[190,.05,"square",.045,0],[120,.06,"sawtooth",.025,.035]],cast:[[392,.045,"triangle",.032,0],[587,.07,"square",.025,.035]],arcane:[[740,.04,"square",.04,0],[370,.11,"triangle",.03,.025]],jump:[[260,.06,"square",.035,0],[390,.08,"square",.028,.045]],land:[[95,.08,"triangle",.05,0]],dash:[[150,.05,"sawtooth",.035,0],[260,.05,"square",.025,.035]],hit:[[90,.05,"square",.065,0],[65,.08,"sawtooth",.035,.025]],chop:[[118,.055,"square",.05,0],[82,.08,"triangle",.035,.035]],mine:[[410,.035,"square",.045,0],[205,.10,"triangle",.04,.025]],harvest:[[523,.055,"square",.03,0],[659,.09,"triangle",.03,.05]],block:[[310,.06,"square",.055,0],[465,.09,"triangle",.04,.04]],parry:[[520,.06,"square",.055,0],[780,.12,"triangle",.035,.045]],hurt:[[72,.12,"sawtooth",.055,0]],defeat:[[220,.07,"square",.045,0],[165,.07,"square",.04,.07],[110,.14,"triangle",.045,.14]],coin:[[660,.06,"square",.035,0],[880,.09,"square",.03,.06]],skill:[[330,.07,"square",.035,0],[495,.07,"square",.035,.055],[660,.13,"triangle",.035,.11]],menu:[[440,.04,"square",.025,0]],day:[[392,.09,"square",.03,0],[523,.09,"square",.03,.08],[659,.16,"triangle",.035,.16]],mind:[[330,.08,"triangle",.03,0],[440,.08,"triangle",.03,.07],[554,.14,"triangle",.03,.14]]};
  for(const spec of sounds[name]||[])synthTone(...spec);
}
function saveAudioPrefs(){try{localStorage.setItem(AUDIO_PREF_KEY,JSON.stringify(audioConfig))}catch(error){}}

const NEED_NAMES=["hunger","safety","belonging","comfort","status","purpose"];
const PERSONAL_TRAITS=["generous","cautious","ambitious","stubborn","curious","dutiful","sociable","frugal","protective","independent"];
const PLAN_ACTIONS=new Set(["assign_food_work","repair_home","save_coins","share_meal","seek_office","join_patrol","teach_child"]);
const TOWN_ACTIONS=new Set(["food_reserve","road_patrol","apprenticeships","festival","housing_repair","market_fair","build_walls"]);
const PLAN_LABELS={secure_food:"Secure food",improve_shelter:"Repair the home",build_savings:"Build savings",strengthen_bonds:"Strengthen family bonds",seek_status:"Seek influence",support_guard:"Support the guard",educate_children:"Educate the children"};
const POLICY_LABELS={food_reserve:"Fill the public reserve",road_patrol:"Fund road patrols",apprenticeships:"Expand apprenticeships",festival:"Hold a town festival",housing_repair:"Repair village homes",market_fair:"Sponsor a market fair",build_walls:"Raise a palisade wall"};

function seeded(seedValue){
  let s=(seedValue>>>0)||1;
  return function(){
    s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;
    return (s%1000000)/1000000;
  };
}
function jitterAlphas(base){
  const values=base.map(v=>v*(.88+rand()*.24));
  const total=values.reduce((a,b)=>a+b,0);
  return values.map(v=>v/total);
}
function buildingBonus(town,good){
  const has=key=>town.building===key||(town.facilities||[]).includes(key);
  if(has("granary")&&good==="food")return 1.18;
  if(has("workshop")&&good==="shelter")return 1.40;
  if(has("academy")&&good==="training")return 1.40;
  if(has("court")&&good==="status")return 1.32;
  return 1;
}
function townAdvantage(town,good){
  return (town.advantages&&town.advantages[good]||1)*buildingBonus(town,good);
}

class Agent{
  constructor(id,cls,town){
    this.id=id;this.cls=cls;this.town=town;
    const bank=NAME_BANK[cls];
    this.firstName=bank[id%bank.length];this.name=this.firstName+" of "+townTitle(town.name);
    this.alphas=jitterAlphas(CLASS_ALPHAS[cls]);
    this.productivity=BASE_PROD[cls]*(.86+rand()*.28);
    this.wealth=18+rand()*8;this.utility=1;this.lastUtility=1;this.trend="steady";
    this.leisure=4;this.plan="work";this.memory=[];this.home=null;this.x=0;this.y=0;
    this.bob=rand()*6.28;this.face={x:0,y:1};this.moveBlend=0;this.updateAccumulator=(id%7)*.011;this.targetRefresh=0;this.cachedTarget=null;this.combatRefresh=0;this.cachedEnemy=null;this.paused=false;this.dailyOutput=0;
    this.isGuard=false;this.guardHp=4;this.guardMaxHp=4;this.guardAttackCd=0;this.guardSpecialCd=0;this.guardStun=0;this.guardDays=0;this.guardStamina=100;
    this.combatClass="peasant";this.level=1;this.xp=0;this.specialtyPoints=1;this.skillPoints=1;
    this.ageGroup="adult";this.gender="adult";this.age=25;this.familyName="";this.spouseId=null;this.parentIds=[];this.childrenIds=[];
    this.specialtyPurchased=new Set();this.lifeSkills={fishing:0,forestry:0,mining:0,hunting:0};
    this.equipment={fishing:false,forestry:false,mining:false,hunting:false};
    this.traits=[];this.needs={hunger:20,safety:30,belonging:20,comfort:25,status:35,purpose:20};this.relationships={};this.eventMemory=[];this.rumors=[];this.rumorNotes={};this.dialogueHistory=[];this.playerMemories=[];this.schedule=[];this.currentActivity="settling in";this.publicRationale="I am learning the rhythm of my household.";
    const focus={warrior:"fishing",mage:"mining",noble:"hunting",builder:"forestry"}[cls];
    this.equipment[focus]=true;
  }
  get produces(){return CLASS_PRODUCES[this.cls]}
  get profession(){return this.ageGroup==="child"?"Apprentice":PROFESSION_NAME[this.cls]||"Worker"}
  remember(text){this.memory.push(text);if(this.memory.length>8)this.memory.shift()}
  decide(){
    const town=this.town,m=town.market,own=goodIndex(this.produces);
    if(this.ageGroup==="child"){this.leisure=8;this.plan="learn";return}
    if(this.isGuard){this.leisure=4;this.plan="guard";return}
    const timeValue=Math.max(.08,m.prices[own]*this.productivity*townAdvantage(town,this.produces));
    const full=timeValue*TIME_ENDOWMENT+.05*this.wealth;
    this.leisure=clamp(this.alphas[4]*full/timeValue,2,11);
    const expected=this.productivity*townAdvantage(town,this.produces)*m.prices[own];
    const alternatives=Object.keys(CLASS_PRODUCES).map(cls=>{
      const gi=goodIndex(CLASS_PRODUCES[cls]);
      return {cls,value:BASE_PROD[cls]*townAdvantage(town,CLASS_PRODUCES[cls])*m.prices[gi]};
    }).sort((a,b)=>b.value-a.value);
    if(dayNo>2&&alternatives[0].cls!==this.cls&&alternatives[0].value>expected*1.48&&rand()<.11){
      const old=this.produces;
      this.cls=alternatives[0].cls;
      this.productivity=BASE_PROD[this.cls]*(.82+rand()*.25);
      this.remember("I left "+old+" work to supply "+this.produces+" when its reward became impossible to ignore");
    }
    this.plan=this.leisure>7?"rest":m.inventory[own]<4?"work":"trade";
  }
}

class Market{
  constructor(initial){
    this.prices=initial.prices.slice();
    this.lastPrices=this.prices.slice();
    this.inventory=initial.inventory.slice();
    this.treasury=120;
    this.avgUtility=1;this.lastUtility=1;this.shortage=null;this.volume=0;
  }
  tick(town){
    this.lastPrices=this.prices.slice();
    this.lastUtility=this.avgUtility;
    const residents=town.agents;
    const production=[0,0,0,0],outputs=new Map(),demands=[0,0,0,0];
    const materialFactor=GOODS.map((g,i)=>.55+.45*clamp(town.materialStock[i]/10,0,1));
    for(const a of residents){
      if(a.isGuard){
        const guardPay=Math.min(2.2,this.treasury);
        this.treasury-=guardPay;a.wealth+=guardPay;a.guardDays++;
      }
      a.decide();
      practiceAgentSkills(a);
      const idx=goodIndex(a.produces);
      const hours=TIME_ENDOWMENT-a.leisure;
      const q=hours*a.productivity*townAdvantage(town,a.produces)*.28*materialFactor[idx]*(a.isGuard?.15:1)*(a.ageGroup==="child"?.22:1);
      a.dailyOutput=q;production[idx]+=q;outputs.set(a.id,q);
      const budget=clamp(a.wealth*.20+1.1,1.3,6.5);
      const goodsWeight=1-a.alphas[4];
      for(let i=0;i<4;i++)demands[i]+=a.alphas[i]/goodsWeight*budget/this.prices[i];
    }
    const available=this.inventory.map((v,i)=>v+production[i]);
    const ratios=available.map((v,i)=>Math.min(1,v/Math.max(.0001,demands[i])));
    const sold=[0,0,0,0],spentByGood=[0,0,0,0];
    let utilitySum=0;
    for(const a of residents){
      const budget=clamp(a.wealth*.20+1.1,1.3,6.5);
      const goodsWeight=1-a.alphas[4],cons=[0,0,0,0];
      let spent=0;
      for(let i=0;i<4;i++){
        const want=a.alphas[i]/goodsWeight*budget/this.prices[i];
        cons[i]=want*ratios[i];
        const payment=cons[i]*this.prices[i];
        spent+=payment;sold[i]+=cons[i];spentByGood[i]+=payment;
      }
      a.wealth=Math.max(.1,a.wealth-spent);
      let u=1;
      for(let i=0;i<4;i++)u*=Math.pow(Math.max(cons[i],.015),a.alphas[i]);
      u*=Math.pow(Math.max(a.leisure,.1),a.alphas[4]);
      a.lastUtility=a.utility;a.utility=u;
      const change=u-a.lastUtility;
      a.trend=Math.abs(change)<.04*Math.max(.1,a.lastUtility)?"steady":change>0?"rising":"falling";
      if(a.trend!=="steady")a.remember("my household utility was "+a.trend+" after the last market");
      utilitySum+=u;
    }
    for(let i=0;i<4;i++){
      const producerList=residents.filter(a=>goodIndex(a.produces)===i);
      const producerShare=production[i]/Math.max(.001,available[i]);
      const producerPool=spentByGood[i]*producerShare;
      for(const a of producerList)a.wealth+=producerPool*(outputs.get(a.id)||0)/Math.max(.001,production[i]);
      this.treasury+=spentByGood[i]-producerPool;
      this.inventory[i]=Math.max(0,available[i]-sold[i]);
      town.materialStock[i]=Math.max(0,town.materialStock[i]-production[i]*.05);
      if(i===0){
        const decay=townHasFacility(town,"granary")?.015:.07;
        this.inventory[i]*=1-decay;
      }
      const pressure=(demands[i]-available[i])/Math.max(3,available[i]);
      this.prices[i]=clamp(this.prices[i]*(1+.16*clamp(pressure,-.32,.42)),.18,12);
    }
    this.volume=sold.reduce((a,b)=>a+b,0);
    this.avgUtility=utilitySum/Math.max(1,residents.length);
    const low=this.inventory.map((v,i)=>({i,v})).sort((a,b)=>a.v-b.v)[0];
    this.shortage=low.v<4?GOODS[low.i]:null;
  }
}
