/* ============================================================
   GOVERNMENT, VOTING, RELATIONS, AND NPC RAIDS
   ============================================================ */
const GOVERNMENT_TYPES={
  council:{label:"Council",description:"A small civic council chooses policy. Stable, but only council members vote.",happiness:0},
  empire:{label:"Empire",description:"You rule directly. Decisions pass immediately, but residents are less happy.",happiness:-8},
  democracy:{label:"Democracy",description:"Every adult votes on major actions. Decisions are slower, but residents are generally happier.",happiness:7}
};
const GOVERNMENT_FOCI={
  balanced:{label:"Balanced growth",good:null,skill:null,description:"No single trade dominates public policy."},
  food:{label:"Food and fishing",good:"food",skill:"fishing",description:"Boost food production and encourage fishing skill."},
  shelter:{label:"Construction and forestry",good:"shelter",skill:"forestry",description:"Boost shelter production and encourage forestry skill."},
  status:{label:"Commerce and diplomacy",good:"status",skill:"hunting",description:"Boost status production and civic ambition."},
  training:{label:"Research and mining",good:"training",skill:"mining",description:"Boost training production and encourage mining skill."}
};
let governmentRaidId=1;
function governmentFor(town){
  if(!town.government)town.government={type:"council",focus:"balanced",relations:{},raid:null,lastDecision:null,raidHistory:[]};
  town.government.relations=town.government.relations||{};
  town.government.raidHistory=town.government.raidHistory||[];
  if(!GOVERNMENT_TYPES[town.government.type])town.government.type="council";
  if(!GOVERNMENT_FOCI[town.government.focus])town.government.focus="balanced";
  for(const other of towns){
    if(other===town)continue;
    if(!town.government.relations[other.name])town.government.relations[other.name]={score:25,status:"neutral",lastConflictDay:null};
  }
  return town.government;
}
function homeGovernmentTown(){return towns.find(t=>t.name===(player.homeTownName||towns[0]?.name))||towns[0]}
function adultCitizens(town){return town.agents.filter(a=>a.ageGroup!=="child"&&!a.eliminated)}
function adultMen(town){return adultCitizens(town).filter(a=>a.gender==="man"||a.gender==="male"||a.gender==="adult")}
function averageTownNeed(town,key){const people=adultCitizens(town);return people.reduce((sum,a)=>sum+(a.needs&&a.needs[key]||0),0)/Math.max(1,people.length)}
function relationStatus(score){return score<=-50?"war":score<=-15?"hostile":score<20?"neutral":score<55?"friendly":"allied"}
function adjustGovernmentRelation(from,to,delta){
  const relation=governmentFor(from).relations[to.name];
  relation.score=clamp(relation.score+delta,-100,100);relation.status=relationStatus(relation.score);
  const reverse=governmentFor(to).relations[from.name];
  reverse.score=clamp(reverse.score+delta*.8,-100,100);reverse.status=relationStatus(reverse.score);
}
function governmentHappiness(town){
  const govt=governmentFor(town),base=GOVERNMENT_TYPES[govt.type].happiness||0;
  return base-averageTownNeed(town,"hunger")*.08-averageTownNeed(town,"safety")*.05-averageTownNeed(town,"belonging")*.04;
}
function citizenVoteScore(agent,town,decision){
  const traits=agent.traits||[],needs=agent.needs||{},focus=GOVERNMENT_FOCI[decision.focus];
  let score=(agent.utility>=town.market.avgUtility?4:-4)+(traits.includes("dutiful")?5:0)+(traits.includes("stubborn")?-4:0);
  if(decision.kind==="focus"&&focus){
    if(focus.good===agent.produces)score+=22;
    if(focus.skill&&agent.lifeSkills&&agent.lifeSkills[focus.skill]>0)score+=12;
    if(decision.focus==="balanced")score+=traits.includes("cautious")?10:2;
  }
  if(decision.kind==="raid"){
    score+=(traits.includes("protective")?16:0)+(traits.includes("ambitious")?10:0)-(traits.includes("cautious")?18:0);
    score+=(needs.safety>55?-18:4)+(roadSafety<45?8:0);
    if(decision.targetType==="town")score-=10;
  }
  return score+(rand()-.5)*18;
}
function resolveGovernmentDecision(town,decision){
  const govt=governmentFor(town),type=govt.type;
  let voters=[],yes=0,no=0,passed=false;
  if(type==="empire"){passed=true;yes=1}
  else{
    voters=type==="democracy"?adultCitizens(town):adultCitizens(town).filter(a=>town.institutions&&town.institutions.councilIds&&town.institutions.councilIds.includes(a.id));
    if(!voters.length)voters=adultCitizens(town);
    for(const voter of voters){if(citizenVoteScore(voter,town,decision)>=0)yes++;else no++}
    passed=yes>no;
  }
  govt.lastDecision={day:dayNo,decision,passed,yes,no,type};
  recordVillageEvent(town,"GOVERNMENT",GOVERNMENT_TYPES[type].label+" decision: "+decision.label+" — "+(passed?"approved":"rejected")+(type==="empire"?" by decree.":" "+yes+"–"+no+"."),{salience:8});
  if(type==="democracy")for(const a of adultCitizens(town))a.needs.belonging=clamp(a.needs.belonging-(passed?3:1),0,100);
  if(type==="empire")for(const a of adultCitizens(town)){a.needs.belonging=clamp(a.needs.belonging+4,0,100);a.needs.status=clamp(a.needs.status+2,0,100)}
  return passed;
}
function setGovernmentType(town,type){
  if(!GOVERNMENT_TYPES[type])return;
  const govt=governmentFor(town),old=govt.type;if(old===type)return;
  govt.type=type;
  recordVillageEvent(town,"REGIME",town.name+" changes from "+GOVERNMENT_TYPES[old].label+" to "+GOVERNMENT_TYPES[type].label+".",{salience:10});
  for(const a of adultCitizens(town))a.needs.belonging=clamp(a.needs.belonging+(type==="empire"?8:type==="democracy"?-6:0),0,100);
  toast(town.name+" is now a "+GOVERNMENT_TYPES[type].label+".");
  renderGovernment();saveGame(true);
}
function requestTownFocus(town,focusKey){
  const focus=GOVERNMENT_FOCI[focusKey];if(!focus)return;
  const decision={kind:"focus",focus:focusKey,label:"Adopt "+focus.label+" as the town focus"};
  if(!resolveGovernmentDecision(town,decision)){toast("The government rejected the new focus.");renderGovernment();return}
  governmentFor(town).focus=focusKey;
  for(const a of adultCitizens(town)){
    if(focus.skill&&a.lifeSkills){a.lifeSkills[focus.skill]=a.lifeSkills[focus.skill]||0;if(rand()<.22)a.currentActivity="considering work in "+focus.label.toLowerCase()}
    a.needs.purpose=clamp(a.needs.purpose-(focus.good===a.produces?5:1),0,100);
  }
  toast(town.name+" now focuses on "+focus.label+".");renderGovernment();saveGame(true);
}
function closestOtherTown(town){return towns.filter(t=>t!==town).sort((a,b)=>Math.hypot(a.cx-town.cx,a.cy-town.cy)-Math.hypot(b.cx-town.cx,b.cy-town.cy))[0]}
function moveAgentToward(a,target,speed,dt){
  const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d<2)return true;
  const nx=a.x+dx/d*speed*dt,ny=a.y+dy/d*speed*dt;
  const open=(x,y)=>!solid.has(keyOf(Math.floor(x/TILE),Math.floor(y/TILE)));
  if(open(nx,ny)){a.x=nx;a.y=ny}
  else if(open(nx,a.y))a.x=nx;
  else if(open(a.x,ny))a.y=ny;
  a.face={x:dx/d,y:dy/d};
  return d<8;
}
function eliminateCitizen(agent,killerTown=null){
  if(!agent||agent.eliminated)return;
  agent.eliminated=true;agent.raidState=null;
  const town=agent.town;
  try{releaseHouse(agent)}catch(error){}
  town.agents=town.agents.filter(a=>a!==agent);agents=agents.filter(a=>a!==agent);
  for(const survivor of agents){
    if(survivor.spouseId===agent.id)survivor.spouseId=null;
    survivor.parentIds=(survivor.parentIds||[]).filter(id=>id!==agent.id);
    survivor.childrenIds=(survivor.childrenIds||[]).filter(id=>id!==agent.id);
  }
  recordVillageEvent(town,"DEATH",agent.firstName+" is killed in a clash"+(killerTown?" with "+killerTown.name:"")+".",{emotion:"grief",salience:10});
  for(const relative of town.agents.filter(a=>a.spouseId===agent.id||(a.parentIds||[]).includes(agent.id)||(a.childrenIds||[]).includes(agent.id))){
    relative.needs.belonging=clamp(relative.needs.belonging+24,0,100);relative.needs.safety=clamp(relative.needs.safety+18,0,100);
  }
}
function beginRaid(town,targetType){
  const men=adultMen(town);
  if(!men.length){toast("There are no adults available to form the raid.");return}
  if(governmentFor(town).raid){toast("A raid is already underway.");return}
  const targetTown=targetType==="town"?closestOtherTown(town):null;
  const label=targetType==="town"?"Raid "+targetTown.name:"Raid the old mine";
  if(!resolveGovernmentDecision(town,{kind:"raid",targetType,label})){toast("The raid proposal was rejected.");renderGovernment();return}
  const rally={x:town.marketPoint.x+24,y:town.marketPoint.y+18};
  const raid={id:governmentRaidId++,phase:"gathering",targetType,targetTownName:targetTown?targetTown.name:null,countdown:30,rally,memberIds:men.map(a=>a.id),casualties:0,startedDay:dayNo};
  governmentFor(town).raid=raid;
  for(const a of men){a.raidState={raidId:raid.id,phase:"gathering",hp:Math.max(3,a.level+2),attackCd:0};a.currentActivity="rallying for a raid"}
  recordVillageEvent(town,"RAID",men.length+" citizens begin gathering for "+label.toLowerCase()+".",{salience:10});
  toast("Raid called. The party will rally for 30 seconds.");renderGovernment();
}
function raidCombat(attacker,target,dt){
  attacker.raidState.attackCd=Math.max(0,attacker.raidState.attackCd-dt);
  target.worldHp=Number.isFinite(target.worldHp)?target.worldHp:Math.max(3,target.level+2);
  if(Math.hypot(attacker.x-target.x,attacker.y-target.y)>18){moveAgentToward(attacker,target,34*speciesSpeed(attacker),dt);return}
  if(attacker.raidState.attackCd<=0){
    const physical=(1+Math.floor(attacker.level/4))*speciesStrength(attacker);
    const arcane=attacker.combatClass==="mage"?.55*speciesMagic(attacker):0;
    target.worldHp-=Math.max(1,Math.round(physical+arcane));
    attacker.raidState.attackCd=(.75+rand()*.45)/speciesSpeed(attacker);
    changeRelationship(attacker,target,{resentment:14,trust:-10});
    if(target.worldHp<=0)eliminateCitizen(target,attacker.town);
  }
}
function finishRaid(town,success){
  const govt=governmentFor(town),raid=govt.raid;if(!raid)return;
  const survivors=raid.memberIds.map(id=>agents.find(a=>a.id===id)).filter(Boolean);
  for(const a of survivors){a.raidState=null;a.currentActivity="returning from the raid";a.needs.safety=clamp(a.needs.safety+(success?-5:12),0,100)}
  const target=raid.targetTownName&&towns.find(t=>t.name===raid.targetTownName);
  if(target){
    adjustGovernmentRelation(town,target,-55);
    governmentFor(town).relations[target.name].lastConflictDay=dayNo;
    governmentFor(target).relations[town.name].lastConflictDay=dayNo;
    initializeInstitutions(target);
  }
  initializeInstitutions(town);
  govt.raidHistory.unshift({day:dayNo,target:target?target.name:"Old Mine",success,casualties:raid.casualties});
  govt.raidHistory=govt.raidHistory.slice(0,8);
  recordVillageEvent(town,"RAID",town.name+"'s raid on "+(target?target.name:"the old mine")+" "+(success?"returns with plunder":"breaks apart")+".",{salience:10});
  govt.raid=null;
  toast(success?"The raid returns successfully.":"The raid has failed.");
  renderGovernment();saveGame(true);
}
function stepGovernmentRaids(dt){
  if(scene!=="world")return;
  for(const town of towns){
    const raid=governmentFor(town).raid;if(!raid)continue;
    raid.elapsed=(raid.elapsed||0)+dt;
    if(raid.elapsed>240){finishRaid(town,false);continue}
    const members=raid.memberIds.map(id=>agents.find(a=>a.id===id)).filter(a=>a&&!a.eliminated);
    raid.casualties=raid.memberIds.length-members.length;
    if(!members.length){finishRaid(town,false);continue}
    if(raid.phase==="gathering"){
      raid.countdown=Math.max(0,raid.countdown-dt);
      for(const a of members)moveAgentToward(a,raid.rally,30*speciesSpeed(a),dt);
      if(raid.countdown<=0){
        raid.phase="marching";
        for(const a of members){a.raidState.phase="marching";a.currentActivity="marching on a raid"}
        recordVillageEvent(town,"RAID","The raiding party marches from "+town.name+".",{salience:9});
      }
      continue;
    }
    if(raid.targetType==="dungeon"){
      const target=dungeon.entrance||{x:(MW-8)*TILE,y:(MH-8)*TILE};let arrived=0;
      for(const a of members){moveAgentToward(a,target,36*speciesSpeed(a),dt);if(Math.hypot(a.x-target.x,a.y-target.y)<30)arrived++}
      if(arrived>=Math.ceil(members.length*.7)){
        town.market.treasury+=10+members.length*2;
        town.materialStock[3]+=3+members.length*.5;
        finishRaid(town,true);
      }
      continue;
    }
    const targetTown=towns.find(t=>t.name===raid.targetTownName);if(!targetTown){finishRaid(town,false);continue}
    const defenders=targetTown.agents.filter(a=>!a.eliminated&&a.ageGroup!=="child");
    for(const a of members){
      const target=defenders.filter(d=>!d.eliminated).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];
      if(target)raidCombat(a,target,dt);else moveAgentToward(a,targetTown.marketPoint,36*speciesSpeed(a),dt);
    }
    for(const defender of defenders.filter(d=>!d.eliminated)){
      defender.worldAttackCd=Math.max(0,(defender.worldAttackCd||0)-dt);
      const target=members.filter(a=>!a.eliminated).sort((x,y)=>Math.hypot(x.x-defender.x,x.y-defender.y)-Math.hypot(y.x-defender.x,y.y-defender.y))[0];
      if(!target)continue;
      if(Math.hypot(defender.x-target.x,defender.y-target.y)>18){moveAgentToward(defender,target,32*speciesSpeed(defender),dt);continue}
      if(defender.worldAttackCd<=0){
        target.raidState.hp-=1+(defender.isGuard?1:0);
        defender.worldAttackCd=.9+rand()*.5;
        if(target.raidState.hp<=0)eliminateCitizen(target,targetTown);
      }
    }
    if(!targetTown.agents.some(a=>a.ageGroup!=="child"&&!a.eliminated)){
      town.market.treasury+=Math.min(35,targetTown.market.treasury*.35);
      targetTown.market.treasury*=.65;
      finishRaid(town,true);
    }else if(raid.casualties>=Math.ceil(raid.memberIds.length*.55))finishRaid(town,false);
  }
}
function separateCitizens(){
  if(scene!=="world")return;
  for(let i=0;i<agents.length;i++)for(let j=i+1;j<agents.length;j++){
    const a=agents[i],b=agents[j];if(a.raidState||b.raidState)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d>0&&d<9){const push=(9-d)*.18;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push}
  }
}
function applyGovernmentDailyEffects(){
  for(const town of towns){
    const govt=governmentFor(town);
    for(const a of adultCitizens(town)){
      if(govt.type==="empire")a.needs.belonging=clamp(a.needs.belonging+1.2,0,100);
      if(govt.type==="democracy")a.needs.belonging=clamp(a.needs.belonging-.8,0,100);
    }
    const focus=GOVERNMENT_FOCI[govt.focus];
    if(focus&&focus.skill)for(const a of adultCitizens(town))if(a.lifeSkills&&a.lifeSkills[focus.skill]!=null&&rand()<.08)a.lifeSkills[focus.skill]=Math.min(3,a.lifeSkills[focus.skill]+1);
  }
}
function renderGovernment(){
  const wrap=document.getElementById("governmentContent");if(!wrap||!towns.length)return;
  const town=homeGovernmentTown(),govt=governmentFor(town),type=GOVERNMENT_TYPES[govt.type],raid=govt.raid;
  const relationRows=towns.filter(t=>t!==town).map(other=>{
    const relation=govt.relations[other.name];
    return '<div class="governmentRelation"><div><strong>'+escapeHTML(other.name)+'</strong><small>'+escapeHTML(relation.status.toUpperCase())+'</small></div><div class="relationMeter"><span style="width:'+((relation.score+100)/2)+'%"></span></div><b>'+Math.round(relation.score)+'</b></div>';
  }).join("");
  const last=govt.lastDecision?'<div class="governmentNotice">Last decision: '+escapeHTML(govt.lastDecision.decision.label)+' — '+(govt.lastDecision.passed?'passed':'failed')+(govt.lastDecision.type==='empire'?' by decree':' '+govt.lastDecision.yes+'–'+govt.lastDecision.no)+'.</div>':'';
  const raidStatus=raid?'<div class="governmentNotice danger"><strong>Raid '+escapeHTML(raid.phase)+'</strong><br>'+(raid.phase==='gathering'?Math.ceil(raid.countdown)+' seconds until march':escapeHTML(raid.targetTownName||'Old Mine'))+' · '+raid.memberIds.length+' called · '+raid.casualties+' lost</div>':'<div class="sub">No active raid.</div>';
  const happiness=governmentHappiness(town);
  wrap.innerHTML='<div class="governmentColumns"><div><div class="menuCard"><h3>Government actions</h3><div class="governmentSummary"><strong>'+escapeHTML(town.name)+' · '+type.label+'</strong><span>'+escapeHTML(type.description)+'</span><span>Estimated civic happiness effect: '+(happiness>=0?'+':'')+happiness.toFixed(1)+'</span></div><label class="settingField"><span>Government type</span><select id="governmentType">'+Object.entries(GOVERNMENT_TYPES).map(([key,value])=>'<option value="'+key+'" '+(govt.type===key?'selected':'')+'>'+value.label+'</option>').join('')+'</select></label><label class="settingField"><span>Town focus</span><select id="governmentFocus">'+Object.entries(GOVERNMENT_FOCI).map(([key,value])=>'<option value="'+key+'" '+(govt.focus===key?'selected':'')+'>'+value.label+'</option>').join('')+'</select></label><button class="uibtn" id="governmentFocusApply">Propose focus change</button>'+last+'</div><div class="menuCard"><h3>Raid</h3><div class="sub">Adults rally for 30 seconds, then march. Town raids permanently damage relations, and citizens can wound or eliminate one another.</div><div class="governmentActions"><button class="uibtn" id="raidDungeon" '+(raid?'disabled':'')+'>Raid dungeon</button><button class="uibtn dangerBtn" id="raidTown" '+(raid?'disabled':'')+'>Raid closest town</button></div>'+raidStatus+'</div></div><div><div class="menuCard"><h3>Relations</h3>'+relationRows+'</div><div class="menuCard"><h3>Recent campaigns</h3>'+(govt.raidHistory.length?govt.raidHistory.map(r=>'<div class="townStat"><span>Day '+r.day+' · '+escapeHTML(r.target)+'</span><span>'+(r.success?'Victory':'Defeat')+' · '+r.casualties+' lost</span></div>').join(''):'<div class="sub">No campaigns recorded.</div>')+'</div></div></div>';
  const typeSelect=document.getElementById("governmentType");if(typeSelect)typeSelect.addEventListener("change",e=>setGovernmentType(town,e.target.value));
  const focusBtn=document.getElementById("governmentFocusApply");if(focusBtn)focusBtn.addEventListener("click",()=>{const sel=document.getElementById("governmentFocus");requestTownFocus(town,sel?sel.value:"balanced")});
  const dungeonBtn=document.getElementById("raidDungeon");if(dungeonBtn)dungeonBtn.addEventListener("click",()=>beginRaid(town,"dungeon"));
  const townBtn=document.getElementById("raidTown");if(townBtn)townBtn.addEventListener("click",()=>beginRaid(town,"town"));
}
function governmentEffectSummary(key){
  if(key==="council")return "Councilors vote on policy. Moderate stability, slower decisions, no broad happiness modifier.";
  if(key==="empire")return "You issue decrees immediately. Policy is fast, but belonging and civic happiness are reduced.";
  return "Every adult votes on major policy. Decisions take consensus, while belonging and civic happiness improve.";
}
function renderGovernmentEntryPanel(){
  const panel=document.getElementById("governmentEntryPanel");if(!panel)return;
  panel.innerHTML='<div class="governmentEntryStep">CHARACTER CREATION · STEP 2 OF 2</div><h2>Choose your government</h2><div class="sub">Your class is set. Now choose how your home settlement begins. This can be changed later from the Town tab.</div><div class="governmentEntryChoices">'+Object.entries(GOVERNMENT_TYPES).map(([key,g])=>'<button class="governmentEntryChoice" data-entry-government="'+key+'"><strong>'+g.label+'</strong><small>'+escapeHTML(g.description)+'</small><span class="govEffect">'+escapeHTML(governmentEffectSummary(key))+'</span></button>').join('')+'</div>';
  panel.querySelectorAll("[data-entry-government]").forEach(btn=>btn.addEventListener("click",()=>{
    const town=homeGovernmentTown();
    setGovernmentType(town,btn.dataset.entryGovernment);
    player.governmentChosen=true;
    panel.classList.remove("open");activePanel=null;saveGame(true);
    toast(town.name+" begins as a "+GOVERNMENT_TYPES[btn.dataset.entryGovernment].label+".");
  }));
}
function promptGovernmentOnEntry(){
  if(!selectedClass||player.governmentChosen)return;
  const panel=document.getElementById("governmentEntryPanel");if(!panel)return;
  renderGovernmentEntryPanel();
  closePanels();
  activePanel="governmentEntryPanel";panel.classList.add("open");
}
