/* ============================================================
   LIVING VILLAGES: HOUSEHOLDS, MEMORY, RELATIONSHIPS, COUNCILS
   ============================================================ */
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function relationRecord(a,targetId){
  if(!a.relationships)a.relationships={};
  return a.relationships[targetId]||(a.relationships[targetId]={affection:25,trust:25,respect:25,obligation:0,resentment:0,mentorship:0});
}
function changeRelationship(a,b,changes){
  if(!a||!b||a===b)return;
  const compatibility=.72+opennessCompatibility(a,b)*.42;
  const forward=relationRecord(a,b.id),back=relationRecord(b,a.id);
  for(const key of Object.keys(changes)){
    const delta=changes[key]*(key==="resentment"?1.08-.22*compatibility:compatibility);
    forward[key]=clamp((forward[key]||0)+delta,0,100);back[key]=clamp((back[key]||0)+delta*.82,0,100);
  }
}
function rememberEvent(a,event,heard=false){
  if(!a)return;a.eventMemory=a.eventMemory||[];a.rumors=a.rumors||[];a.rumorNotes=a.rumorNotes||{};
  if(heard){if(!a.rumors.includes(event.id))a.rumors.push(event.id);if(a.rumors.length>12)a.rumors.shift();const lens=a.traits.includes("cautious")?"Some say the danger was worse than reported: ":a.traits.includes("ambitious")?"People credit the council, though not everyone agrees: ":a.traits.includes("sociable")?"Everyone at the market is saying that ":"Word around town is that ";a.rumorNotes[event.id]=lens+event.text.charAt(0).toLowerCase()+event.text.slice(1)}
  else{a.eventMemory.push(event.id);if(a.eventMemory.length>12)a.eventMemory.shift()}
  a.remember((heard?"I heard that ":"")+event.text);
}
function recordVillageEvent(town,kind,text,options={}){
  if(!town)return null;
  const event={id:nextEventId++,day:dayNo,town:town.name,kind,text,actorId:options.actorId??null,targetId:options.targetId??null,emotion:options.emotion||"reflective",salience:options.salience||4};
  villageEvents.push(event);if(villageEvents.length>220)villageEvents.shift();
  town.chronicle=town.chronicle||[];town.chronicle.push(event.id);if(town.chronicle.length>90)town.chronicle.shift();
  rememberEvent(agents.find(a=>a.id===event.actorId),event);rememberEvent(agents.find(a=>a.id===event.targetId),event);
  return event;
}
function initializeAgentMind(a){
  if(!a.traits||!a.traits.length){const start=(a.id*3+(a.cls||"").length)%PERSONAL_TRAITS.length;a.traits=[PERSONAL_TRAITS[start],PERSONAL_TRAITS[(start+3+a.id)%PERSONAL_TRAITS.length]]}
  a.needs=Object.assign({hunger:20,safety:30,belonging:20,comfort:25,status:35,purpose:20},a.needs||{});
  initializeSocialIdentity(a);
  a.relationships=a.relationships||{};a.eventMemory=a.eventMemory||[];a.rumors=a.rumors||[];a.rumorNotes=a.rumorNotes||{};a.dialogueHistory=(a.dialogueHistory||[]).slice(-16);a.playerMemories=(a.playerMemories||[]).slice(-8);a.face=a.face||{x:0,y:1};a.moveBlend=Number.isFinite(a.moveBlend)?a.moveBlend:0;a.updateAccumulator=Number.isFinite(a.updateAccumulator)?a.updateAccumulator:(a.id%7)*.011;a.targetRefresh=0;a.cachedTarget=null;a.combatRefresh=0;a.cachedEnemy=null;a.schedule=a.schedule||[];a.currentActivity=a.currentActivity||"settling in";a.publicRationale=a.publicRationale||"I am balancing work with the needs of my household.";
}
function initializeRelationships(town){
  for(const a of town.agents){
    initializeAgentMind(a);
    for(const b of town.agents){
      if(a===b)continue;
      const family=a.houseId===b.houseId,spouse=a.spouseId===b.id,parent=(a.parentIds||[]).includes(b.id)||(b.parentIds||[]).includes(a.id),coworker=a.cls===b.cls;
      if(family||coworker){const r=relationRecord(a,b.id);r.affection=family?spouse?82:parent?74:62:28;r.trust=family?72:32;r.respect=spouse?66:parent?68:coworker?42:48;r.obligation=family?60:8;r.mentorship=parent?55:(coworker&&a.level>b.level?18:0)}
    }
  }
}
function householdFor(a){return a&&a.town&&a.town.houses.find(h=>h.id===a.houseId)}
function householdMembers(town,house){return town.agents.filter(a=>house.residentIds.includes(a.id))}
function initializeHousehold(town,house){
  const members=householdMembers(town,house),adults=members.filter(a=>a.ageGroup!=="child");
  house.familyName=members[0]?.familyName||("House "+(house.id+1));
  house.stock=Object.assign({food:Math.max(3,members.length*2.2),coins:adults.reduce((s,a)=>s+a.wealth*.08,0),shelter:68,materials:[0,0,0,0],debt:0},house.stock||{});house.stock.materials=(house.stock.materials||[0,0,0,0]).slice();
  house.plan=house.plan||{id:"build_savings",goal:"build_savings",label:PLAN_LABELS.build_savings,action:"save_coins",duration:7,started:dayNo,rationale:"The household wants a cushion against the next shortage.",source:"utility"};
  house.planHistory=house.planHistory||[];house.lastCouncilDay=house.lastCouncilDay||0;
}
function initializeInstitutions(town){
  const adults=town.agents.filter(a=>a.ageGroup!=="child"),ranked=adults.slice().sort((a,b)=>(b.cls==="noble")-(a.cls==="noble")||b.level-a.level||b.wealth-a.wealth);
  town.institutions=Object.assign({taxRate:.06,councilIds:ranked.slice(0,Math.min(3,ranked.length)).map(a=>a.id),guilds:{},currentPolicy:null,policyHistory:[],project:null,lastCouncilDay:0},town.institutions||{});
  town.institutions.guilds={food:town.agents.filter(a=>a.produces==="food").map(a=>a.id),shelter:town.agents.filter(a=>a.produces==="shelter").map(a=>a.id),status:town.agents.filter(a=>a.produces==="status").map(a=>a.id),training:town.agents.filter(a=>a.produces==="training").map(a=>a.id)};
  town.chronicle=town.chronicle||[];
}
function initializeLivingWorld(addFoundingEvents=true){
  for(const town of towns){
    town.houses.forEach(h=>initializeHousehold(town,h));initializeRelationships(town);initializeInstitutions(town);
    if(addFoundingEvents)recordVillageEvent(town,"FOUNDING",town.name+" begins a new chapter under a council of households and trades.",{salience:8});
    town.houses.forEach(h=>chooseHouseholdPlan(town,h,false));runTownCouncil(town,false);for(const a of town.agents)buildDailySchedule(a);
  }
}
function averageHouseholdNeed(town,house,key){const members=householdMembers(town,house);return members.reduce((s,a)=>s+(a.needs[key]||0),0)/Math.max(1,members.length)}
function householdCandidates(town,house){
  const members=householdMembers(town,house),children=members.filter(a=>a.ageGroup==="child").length,guards=members.filter(a=>a.isGuard).length,foodDays=house.stock.food/Math.max(1,members.length),traits=members.flatMap(a=>a.traits||[]);
  const candidates=[
    {id:"secure_food",action:"assign_food_work",score:(3-foodDays)*32+averageHouseholdNeed(town,house,"hunger")+(traits.includes("cautious")?12:0),rationale:"The household has "+foodDays.toFixed(1)+" days of food and wants a safer reserve."},
    {id:"improve_shelter",action:"repair_home",score:100-house.stock.shelter+averageHouseholdNeed(town,house,"comfort")*.7+(traits.includes("dutiful")?9:0),rationale:"The home is at "+Math.round(house.stock.shelter)+"% condition and needs maintenance."},
    {id:"build_savings",action:"save_coins",score:55-house.stock.coins+house.stock.debt*5+(traits.includes("frugal")?18:0),rationale:"A larger shared purse would protect the family from price shocks."},
    {id:"strengthen_bonds",action:"share_meal",score:averageHouseholdNeed(town,house,"belonging")+(traits.includes("sociable")||traits.includes("generous")?16:0),rationale:"The family needs time together after work and worry."},
    {id:"seek_status",action:"seek_office",score:averageHouseholdNeed(town,house,"status")+(traits.includes("ambitious")?22:0),rationale:"The household believes a stronger civic voice could improve its future."},
    {id:"support_guard",action:"join_patrol",score:averageHouseholdNeed(town,house,"safety")+(roadSafety<50?25:0)+(guards?8:0)+(traits.includes("protective")?18:0),rationale:"Road danger is affecting both work and the family's sense of safety."},
    {id:"educate_children",action:"teach_child",score:children?averageHouseholdNeed(town,house,"purpose")+24+(townHasFacility(town,"academy")?15:0):-100,rationale:"The children need instruction, mentorship, and a path into adult work."}
  ];
  return candidates.filter(c=>PLAN_ACTIONS.has(c.action)).sort((a,b)=>b.score-a.score);
}
function makeHouseholdPlan(candidate,source="utility",rationale=null){return {id:candidate.id,goal:candidate.id,label:PLAN_LABELS[candidate.id],action:candidate.action,duration:7,started:dayNo,rationale:(rationale||candidate.rationale).slice(0,180),source}}
function chooseHouseholdPlan(town,house,allowLLM=true){
  const candidates=householdCandidates(town,house),chosen=candidates[0];if(!chosen)return;
  const previous=house.plan&&house.plan.id;house.plan=makeHouseholdPlan(chosen);house.lastCouncilDay=dayNo;house.planHistory.push({day:dayNo,id:chosen.id,source:"utility"});if(house.planHistory.length>12)house.planHistory.shift();
  if(previous!==chosen.id||dayNo===1)recordVillageEvent(town,"HOUSEHOLD",house.familyName+" household chooses to "+PLAN_LABELS[chosen.id].toLowerCase()+".",{actorId:house.residentIds[0],salience:5});
  if(allowLLM)queueLLMChoice("household",town.id+":"+house.id,candidates,{town:town.name,household:house.familyName,food:house.stock.food,coins:house.stock.coins,shelter:house.stock.shelter,members:householdMembers(town,house).map(a=>({name:a.firstName,age:a.age,traits:a.traits,needs:a.needs}))});
}
function townCandidates(town){
  const hunger=town.agents.reduce((s,a)=>s+a.needs.hunger,0)/Math.max(1,town.agents.length),belonging=town.agents.reduce((s,a)=>s+a.needs.belonging,0)/Math.max(1,town.agents.length),children=town.agents.filter(a=>a.ageGroup==="child").length,weakHomes=town.houses.reduce((s,h)=>s+(100-h.stock.shelter),0)/Math.max(1,town.houses.length);
  return [
    {id:"food_reserve",action:"food_reserve",score:hunger+(town.market.inventory[0]<8?35:0),rationale:"Food security is the council's most urgent material concern."},
    {id:"road_patrol",action:"road_patrol",score:100-roadSafety+guardCount(town)*3,rationale:"Safer roads protect trade and every household that depends on it."},
    {id:"apprenticeships",action:"apprenticeships",score:children*8+(townHasFacility(town,"academy")?18:0),rationale:"Young villagers need mentors and a route into useful work."},
    {id:"festival",action:"festival",score:belonging+(town.market.treasury>30?12:-12),rationale:"A shared celebration could restore trust and belonging."},
    {id:"housing_repair",action:"housing_repair",score:weakHomes,rationale:"Several homes need communal repair before conditions worsen."},
    {id:"market_fair",action:"market_fair",score:town.market.inventory.reduce((s,v)=>s+v,0)/4+(town.market.treasury<20?18:0),rationale:"A fair can attract caravans, exchange surplus, and replenish the treasury."},
    {id:"build_walls",action:"build_walls",score:town.walls&&town.walls.complete?-999:(100-roadSafety)*.9+worldEnemies.filter(e=>!e.dead&&Math.hypot(e.x-town.cx,e.y-town.cy)<300).length*8+(town.materialStock[1]>5?12:-12)+(town.walls&&town.walls.placed>0?20:0),rationale:town.walls&&town.walls.placed>0?"The half-built palisade should be finished before raiders test it.":"A palisade with a gate would keep raiders off the streets for good."}
  ].filter(c=>TOWN_ACTIONS.has(c.action)).sort((a,b)=>b.score-a.score);
}
function setTownPolicy(town,candidate,source="utility",rationale=null){
  town.institutions.currentPolicy={id:candidate.id,label:POLICY_LABELS[candidate.id],action:candidate.action,started:dayNo,duration:14,progress:0,rationale:(rationale||candidate.rationale).slice(0,180),source};
  town.institutions.policyHistory.push({day:dayNo,id:candidate.id,source});if(town.institutions.policyHistory.length>10)town.institutions.policyHistory.shift();town.institutions.lastCouncilDay=dayNo;
  recordVillageEvent(town,"COUNCIL",town.name+" council votes to "+POLICY_LABELS[candidate.id].toLowerCase()+".",{actorId:town.institutions.councilIds[0],salience:8});
}
function runTownCouncil(town,allowLLM=true){const candidates=townCandidates(town);if(!candidates.length)return;setTownPolicy(town,candidates[0]);if(allowLLM)queueLLMChoice("town",String(town.id),candidates,{town:town.name,roadSafety,treasury:town.market.treasury,stock:town.market.inventory,shortage:town.market.shortage,population:town.agents.length})}
function applyTownPolicy(town){
  const p=town.institutions&&town.institutions.currentPolicy;if(!p)return;p.progress=clamp(p.progress+100/p.duration,0,100);
  if(p.action==="food_reserve"&&town.market.treasury>=.5){town.market.treasury-=.5;town.market.inventory[0]+=.8}
  if(p.action==="road_patrol"&&town.market.treasury>=.7){town.market.treasury-=.7;roadSafety=clamp(roadSafety+.8,0,100)}
  if(p.action==="apprenticeships"){for(const a of town.agents.filter(x=>x.ageGroup==="child")){a.needs.purpose=clamp(a.needs.purpose-8,0,100);a.xp+=1}town.market.inventory[3]+=.5}
  if(p.action==="festival"){for(const a of town.agents)a.needs.belonging=clamp(a.needs.belonging-7,0,100);town.market.treasury=Math.max(0,town.market.treasury-.4)}
  if(p.action==="housing_repair"){for(const h of town.houses)h.stock.shelter=clamp(h.stock.shelter+1.8,0,100);town.materialStock[1]=Math.max(0,town.materialStock[1]-.25)}
  if(p.action==="market_fair"){town.market.treasury+=.6;if(dayNo%3===0&&caravans.length<3)scheduleCaravan(false)}
  if(p.action==="build_walls"){
    const cells=wallPlan(town);town.walls=town.walls||{placed:0,complete:false};
    const builders=town.agents.filter(a=>a.cls==="builder"&&a.ageGroup!=="child").length;
    let budget=4+builders*2,built=false;
    while(budget>0&&town.walls.placed<cells.length&&town.materialStock[1]>=.4){
      const c=cells[town.walls.placed++];town.materialStock[1]-=.4;
      if(!c.gate){tiles[c.y][c.x]=8;solid.add(keyOf(c.x,c.y))}
      budget--;built=true;
    }
    p.progress=clamp(100*town.walls.placed/Math.max(1,cells.length),0,100);
    if(built)paintWorld();
    if(town.walls.placed>=cells.length&&!town.walls.complete){town.walls.complete=true;p.completed=true;recordVillageEvent(town,"PROJECT",townTitle(town.name)+" completes its palisade and hangs the town gate.",{salience:9})}
    else if(!built&&town.walls.placed<cells.length&&dayNo%4===0)recordVillageEvent(town,"SHORTAGE","Wall construction in "+townTitle(town.name)+" stalls for lack of timber.",{salience:6});
  }
  if(p.progress>=100&&!p.completed){p.completed=true;recordVillageEvent(town,"PROJECT",town.name+" completes its effort to "+p.label.toLowerCase()+".",{salience:7})}
}
function applyInstitutionsDaily(town){
  const institution=town.institutions;let revenue=0;
  for(const a of town.agents.filter(x=>x.ageGroup!=="child")){const contribution=Math.min(.12,a.wealth*institution.taxRate*.006+a.dailyOutput*.002);a.wealth=Math.max(.1,a.wealth-contribution);revenue+=contribution}town.market.treasury+=revenue;
  for(const ids of Object.values(institution.guilds||{})){const members=ids.map(id=>agents.find(a=>a.id===id&&a.town===town)).filter(Boolean).sort((a,b)=>b.level-a.level);if(members.length>1){const mentor=members[0],learner=members[members.length-1];changeRelationship(mentor,learner,{respect:.15,trust:.08,mentorship:.45});learner.needs.purpose=clamp(learner.needs.purpose-.6,0,100)}}
  if(townHasFacility(town,"academy"))for(const child of town.agents.filter(a=>a.ageGroup==="child")){child.xp+=.25;child.needs.purpose=clamp(child.needs.purpose-1,0,100)}
}
function updateHouseholdDay(town,house){
  const members=householdMembers(town,house);if(!members.length)return;const adults=members.filter(a=>a.ageGroup!=="child"),plan=house.plan||makeHouseholdPlan(householdCandidates(town,house)[0]);
  house.stock.coins=clamp(house.stock.coins+adults.reduce((s,a)=>s+a.dailyOutput*.025,0),0,250);
  house.stock.food+=members.filter(a=>a.produces==="food").reduce((s,a)=>s+a.dailyOutput*.18,0)+(plan.action==="assign_food_work"?.7:0);
  const consumption=members.reduce((s,a)=>s+(a.ageGroup==="child"?.48:.78),0);house.stock.food=Math.max(0,house.stock.food-consumption);house.stock.shelter=clamp(house.stock.shelter-.38,0,100);
  if(house.stock.food<consumption*1.4&&town.market.inventory[0]>=1&&house.stock.coins>=town.market.prices[0]){const qty=Math.min(2,town.market.inventory[0],house.stock.coins/town.market.prices[0]);town.market.inventory[0]-=qty;house.stock.coins-=qty*town.market.prices[0];town.market.treasury+=qty*town.market.prices[0];house.stock.food+=qty}
  if(plan.action==="repair_home"&&house.stock.coins>=.35){house.stock.coins-=.35;house.stock.shelter=clamp(house.stock.shelter+3.2,0,100)}
  if(plan.action==="save_coins")house.stock.coins=clamp(house.stock.coins+.35,0,250);
  const foodDays=house.stock.food/Math.max(1,members.length),localThreats=worldEnemies.filter(e=>!e.dead&&Math.hypot(e.x-town.cx,e.y-town.cy)<280).length;
  for(const a of members){
    a.needs.hunger=clamp(66-foodDays*22,0,100);a.needs.safety=clamp(86-roadSafety+localThreats*7-guardCount(town)*4,0,100);a.needs.comfort=clamp(100-house.stock.shelter,0,100);a.needs.status=clamp(52-a.wealth*.8-(town.institutions.councilIds.includes(a.id)?18:0),0,100);a.needs.purpose=clamp(a.needs.purpose+(a.ageGroup==="child"?2:-2),0,100);a.needs.belonging=clamp(a.needs.belonging+1-(plan.action==="share_meal"?8:0),0,100);a.publicRationale=plan.rationale;buildDailySchedule(a)
  }
  for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){const delta=plan.action==="share_meal"?{affection:2.5,trust:1.5,resentment:-1}:{affection:.2,trust:.1};changeRelationship(members[i],members[j],delta)}
  if(house.stock.food===0&&(!house.lastHungerEvent||dayNo-house.lastHungerEvent>=4)){house.lastHungerEvent=dayNo;recordVillageEvent(town,"SHORTAGE",house.familyName+" household runs out of food.",{actorId:members[0].id,emotion:"fear",salience:8})}
}
function gatherFocus(a){return Object.keys(SKILL_INDEX).find(k=>a.equipment&&a.equipment[k])||null}
function buildDailySchedule(a){
  const h=householdFor(a),plan=h&&h.plan,policy=a.town.institutions&&a.town.institutions.currentPolicy,child=a.ageGroup==="child";
  const focus=gatherFocus(a),node=focus&&resourceNodes[focus];
  const gathering=!child&&!a.isGuard&&focus&&node&&a.town.materialStock[SKILL_INDEX[focus]]<20&&(a.id+dayNo)%4<3&&!(plan&&plan.action==="assign_food_work"&&focus!=="fishing");
  const workEntry=child?{activity:"apprenticeship",place:"school"}:a.isGuard?{activity:"guard patrol",place:"patrol"}:gathering?{activity:GATHER_ACTIVITY[focus],place:"gather",skill:focus}:plan&&plan.action==="assign_food_work"?{activity:"helping secure food",place:"food"}:{activity:"working as "+a.profession.toLowerCase(),place:"work"};
  a.schedule=[{until:.18,activity:"family breakfast",place:"home"},Object.assign({until:.60},workEntry),{until:.78,activity:policy&&policy.action==="festival"?"town festival":plan&&plan.action==="share_meal"?"family supper":a.town.institutions.councilIds.includes(a.id)&&dayNo%7===0?"council meeting":"market and neighbors",place:policy&&policy.action==="festival"?"market":plan&&plan.action==="share_meal"?"home":a.town.institutions.councilIds.includes(a.id)&&dayNo%7===0?"council":"social"},{until:1,activity:"resting at home",place:"home"}];
}
function scheduleTarget(a){
  const phase=dayClock/DAY_SECONDS,entry=(a.schedule||[]).find(s=>phase<s.until)||(a.schedule||[]).slice(-1)[0];if(!entry)return a.home;a.currentActivity=entry.activity;a.currentPlace=entry.place;a.gatherSkill=entry.skill||null;
  if(entry.place==="home")return a.home;if(entry.place==="patrol"){const angle=a.id*1.9+phase*Math.PI*2,radius=58+(a.id%3)*13;return {x:a.town.cx+Math.cos(angle)*radius,y:a.town.cy+Math.sin(angle)*radius*.65}}
  if(entry.place==="gather"){const node=resourceNodes[entry.skill];if(node)return {x:node.x+(a.id%5-2)*7,y:node.y+(Math.floor(a.id/5)%3-1)*8}}
  if(entry.place==="school")return a.town.sites.training;if(entry.place==="food")return a.town.sites.food;if(entry.place==="work")return a.town.sites[a.produces];if(entry.place==="council"||entry.place==="market")return a.town.marketPoint;
  if(entry.place==="social"){const rel=Object.entries(a.relationships||{}).sort((x,y)=>(y[1].affection-y[1].resentment)-(x[1].affection-x[1].resentment))[0],friend=rel&&agents.find(x=>x.id===+rel[0]&&x.town===a.town);return friend&&friend.home||a.town.marketPoint}
  return a.home;
}
function spreadRumors(town){
  const recent=villageEvents.filter(e=>e.town===town.name&&e.salience>=6&&dayNo-e.day<=10);if(!recent.length)return;
  for(const a of town.agents){if(rand()>.24)continue;const event=recent[Math.floor(rand()*recent.length)];if(!(a.eventMemory||[]).includes(event.id)&&!(a.rumors||[]).includes(event.id))rememberEvent(a,event,true)}
}
function updateSocialTies(town){
  const adults=town.agents.filter(a=>a.ageGroup!=="child");if(adults.length<2)return;
  for(let i=0;i<Math.min(3,adults.length);i++){const a=adults[(dayNo+i*3)%adults.length],b=adults[(dayNo*2+i*5+1)%adults.length];if(a!==b)changeRelationship(a,b,{affection:a.traits.includes("sociable")?1.2:.4,trust:.3,respect:a.cls===b.cls?.6:.15})}
}
function runLifeCycle(){
  if(dayNo%28!==0)return;
  for(const town of towns){
    for(const a of town.agents.slice()){a.age++;if(a.ageGroup==="child"&&a.age>=18){a.ageGroup="adult";a.gender=a.gender==="girl"?"woman":"man";recordVillageEvent(town,"COMING OF AGE",a.firstName+" "+a.familyName+" comes of age and may enter a full trade.",{actorId:a.id,salience:7})}}
    const singles=town.agents.filter(a=>a.ageGroup!=="child"&&a.spouseId==null&&a.age>=20&&a.age<60);
    if(singles.length>=2&&rand()<.24){const a=singles[0],b=singles.find(x=>x!==a&&householdFor(a)!==householdFor(x)&&householdFor(a).residentIds.length<4);if(b){a.spouseId=b.id;b.spouseId=a.id;releaseHouse(b);assignHouse(b,town,a.houseId);b.familyName=a.familyName;b.name=b.firstName+" "+b.familyName+" of "+townTitle(town.name);changeRelationship(a,b,{affection:55,trust:45,obligation:50});recordVillageEvent(town,"MARRIAGE",a.firstName+" and "+b.firstName+" establish a shared household.",{actorId:a.id,targetId:b.id,emotion:"joy",salience:9})}}
    const couples=town.agents.filter(a=>a.gender==="woman"&&a.spouseId!=null&&a.age>=20&&a.age<44&&householdFor(a)?.residentIds.length<4);
    if(couples.length&&rand()<.18){const parent=couples[Math.floor(rand()*couples.length)],other=agents.find(a=>a.id===parent.spouseId),id=Math.max(-1,...agents.map(a=>a.id))+1,child=new Agent(id,parent.cls,town);child.ageGroup="child";child.age=0;child.gender=rand()<.5?"boy":"girl";child.parentIds=[parent.id,other.id];child.familyName=parent.familyName;child.name=child.firstName+" "+child.familyName+" of "+townTitle(town.name);parent.childrenIds.push(child.id);other.childrenIds.push(child.id);assignHouse(child,town,parent.houseId);child.x=child.home.x;child.y=child.home.y;town.agents.push(child);agents.push(child);initializeAgentMind(child);initializeRelationships(town);updateAgentSpecialization(child);initializeHousehold(town,householdFor(child));recordVillageEvent(town,"BIRTH",parent.firstName+" and "+other.firstName+" welcome "+child.firstName+" into the "+parent.familyName+" household.",{actorId:parent.id,targetId:child.id,emotion:"joy",salience:9})}
    for(const a of town.agents.slice().filter(x=>x.age>=78)){if(rand()<(a.age>90?.28:.055)){recordVillageEvent(town,"DEATH",a.firstName+" "+a.familyName+" dies at age "+a.age+". The household keeps their memory.",{actorId:a.id,emotion:"grief",salience:10});releaseHouse(a);town.agents=town.agents.filter(x=>x!==a);agents=agents.filter(x=>x!==a);for(const survivor of agents){if(survivor.spouseId===a.id)survivor.spouseId=null;survivor.parentIds=(survivor.parentIds||[]).filter(id=>id!==a.id);survivor.childrenIds=(survivor.childrenIds||[]).filter(id=>id!==a.id)}}}
    initializeInstitutions(town)
  }
}
function runLivingDay(){
  for(const town of towns){applyInstitutionsDaily(town);applyTownPolicy(town);town.houses.forEach(h=>{initializeHousehold(town,h);updateHouseholdDay(town,h);if(dayNo-h.lastCouncilDay>=7||h.stock.food<1)chooseHouseholdPlan(town,h,true)});updateSocialTies(town);spreadRumors(town);if(!town.institutions.currentPolicy||dayNo-town.institutions.lastCouncilDay>=14)runTownCouncil(town,true)}runLifeCycle();
}
function queueLLMChoice(kind,targetId,candidates,context){if(!llmConfig.enabled||!llmEngine||llmConfig.backend==="browser-lite"||!candidates.length)return;llmQueue.push({kind,targetId,candidates:candidates.map(c=>Object.assign({},c)),context});pumpLLMQueue()}
function applyLLMChoice(job,choice,rationale){
  const candidate=job.candidates.find(c=>c.id===choice);if(!candidate)return false;
  if(job.kind==="household"){const [tid,hid]=job.targetId.split(":").map(Number),town=towns.find(t=>t.id===tid),house=town&&town.houses.find(h=>h.id===hid);if(!town||!house)return false;house.plan=makeHouseholdPlan(candidate,"local LLM",rationale);house.planHistory.push({day:dayNo,id:candidate.id,source:"local LLM"});recordVillageEvent(town,"HOUSEHOLD",house.familyName+" household revises its plan: "+PLAN_LABELS[candidate.id]+".",{actorId:house.residentIds[0],salience:6})}
  else{const town=towns.find(t=>t.id===+job.targetId);if(!town)return false;setTownPolicy(town,candidate,"local LLM",rationale)}
  llmConfig.lastDecision=(job.kind==="town"?"Town council":"Household")+" chose "+candidate.id+": "+rationale;return true;
}
async function pumpLLMQueue(){
  if(llmBusy||!llmEngine||!llmConfig.enabled)return;const job=llmQueue.shift();if(!job)return;llmBusy=true;llmConfig.status="Local LLM is considering a "+job.kind+" decision…";renderGodMode();renderSettings();
  try{const choices=job.candidates.map(c=>({id:c.id,score:+c.score.toFixed(1),meaning:(PLAN_LABELS[c.id]||POLICY_LABELS[c.id]),reason:c.rationale})),prompt="You are a bounded village planner. Choose exactly one candidate id. Do not invent actions or resources. Return JSON only: {\"choice\":\"id\",\"rationale\":\"one short public reason\"}. State: "+JSON.stringify(job.context)+" Candidates: "+JSON.stringify(choices),response=await llmEngine.chat.completions.create({messages:[{role:"system",content:"Choose a legal plan for a simulated village. Output strict JSON and no hidden reasoning. /no_think"},{role:"user",content:prompt}],temperature:.2,max_tokens:400,response_format:{type:"json_object"}}),raw=(response.choices[0].message.content||"").replace(/<think>[\s\S]*?<\/think>/g,"").replace(/```(?:json)?/g,"").trim(),data=JSON.parse((raw.match(/\{[\s\S]*\}/)||[raw])[0]);if(!applyLLMChoice(job,data.choice,String(data.rationale||"The choice best fits current needs.")))throw new Error("The model returned an action outside the legal candidate list.");llmConfig.status="Local LLM ready for conversations. Plan decisions remain validated by game rules."}
  catch(error){llmConfig.status="LLM decision rejected; deterministic plan kept. "+String(error.message||error).slice(0,140)}finally{llmBusy=false;renderGodMode();renderSettings();if(llmQueue.length)setTimeout(pumpLLMQueue,50)}
}
function createServerEngine(baseUrl,modelId){
  const root=baseUrl.replace(/\/+$/,"");
  return {chat:{completions:{create:async request=>{
    const body=Object.assign({model:modelId},request);
    const res=await fetch(root+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok)throw new Error("LLM server replied "+res.status+": "+(await res.text()).slice(0,120));
    return res.json();
  }}}};
}
async function initializeLiteLLM(){
  const modelId=(llmConfig.model||LITE_LLM_MODEL).trim()||LITE_LLM_MODEL;
  llmConfig.model=modelId;llmConfig.status="Downloading the tiny 4-bit villager mind once, then it stays in the browser cache…";renderSettings();
  const {pipeline}=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm");
  const generator=await pipeline("text-generation",modelId,{dtype:"q4",progress_callback:p=>{if(p.status==="progress")llmConfig.status="Loading "+modelId+" · "+Math.round(p.progress||0)+"%";else if(p.status)llmConfig.status=String(p.status)+" · "+modelId;renderSettings()}});
  llmEngine={kind:"browser-lite",chat:{completions:{create:async request=>{
    const output=await generator(request.messages,{max_new_tokens:Math.min(96,request.max_tokens||80),temperature:request.temperature??.65,top_p:.9,do_sample:(request.temperature??.65)>0});
    const generated=output?.[0]?.generated_text,last=Array.isArray(generated)?generated[generated.length-1]:generated;
    const content=typeof last==="object"?last.content:String(last||"");return {choices:[{message:{content}}]};
  }}}};
  llmConfig.status="Tiny CPU villager mind ready: "+modelId;playSfx("mind");
}
async function initializeServerLLM(){
  const root=(llmConfig.serverUrl||"").trim().replace(/\/+$/,"");
  if(!root)throw new Error("Enter the server URL first, e.g. http://localhost:11434/v1 for Ollama.");
  let modelId=(llmConfig.serverModel||"").trim();
  try{
    const res=await fetch(root+"/models");
    if(res.ok){const list=(await res.json()).data||[];if(!modelId&&list.length)modelId=list[0].id;if(!modelId)throw new Error("The server lists no models. Pull one first, e.g. `ollama pull qwen2.5:3b`.")}
    else if(!modelId)throw new Error("Could not list models (HTTP "+res.status+"). Enter a model name manually.");
  }catch(error){
    if(!modelId||error instanceof TypeError)throw error instanceof TypeError?new Error("Could not reach "+root+". Is the local LLM server running?"):error;
  }
  llmConfig.serverModel=modelId;llmConfig.model=modelId;
  const engine=createServerEngine(root,modelId);
  const probe=await engine.chat.completions.create({messages:[{role:"user",content:"Reply with the single word: ready"}],max_tokens:8,temperature:0});
  if(!probe.choices||!probe.choices[0])throw new Error("The server responded but returned no completion.");
  llmEngine=engine;
  llmConfig.status="Local server LLM ready: "+modelId+" @ "+root;
}
async function initializeWebLLM(){
  const webllm=await import("https://esm.run/@mlc-ai/web-llm"),models=webllm.prebuiltAppConfig?.model_list||[],preferred=models.find(m=>m.model_id===llmConfig.model)||models.find(m=>/(0\.5B|1B|1\.5B|2B|3B).*Instruct/i.test(m.model_id))||models[0];
  if(!preferred)throw new Error("No compatible prebuilt model was reported.");
  llmConfig.model=preferred.model_id;
  llmEngine=await webllm.CreateMLCEngine(preferred.model_id,{initProgressCallback:p=>{llmConfig.status=p.text||("Loading "+Math.round((p.progress||0)*100)+"%");renderGodMode();renderSettings()}});
  llmConfig.status="In-browser LLM ready: "+preferred.model_id;
}
async function initializeLocalLLM(){
  syncSettingsLLMConfig();
  if(llmBusy)return;llmBusy=true;
  llmConfig.status=llmConfig.backend==="browser-lite"?"Loading the tiny CPU villager mind…":llmConfig.backend==="webllm"?"Loading the larger WebGPU LLM…":"Connecting to the local LLM server…";renderGodMode();renderSettings();
  try{
    if(llmConfig.backend==="browser-lite")await initializeLiteLLM();else if(llmConfig.backend==="webllm")await initializeWebLLM();else await initializeServerLLM();
    llmConfig.enabled=true;runAllPlanners(llmConfig.backend!=="browser-lite");
  }catch(error){llmEngine=null;llmConfig.enabled=false;llmConfig.status="Local LLM unavailable; deterministic planning continues. "+String(error.message||error).slice(0,150)}finally{llmBusy=false;renderGodMode();renderSettings();pumpLLMQueue()}
}
function runAllPlanners(withLLM=false){for(const town of towns){town.houses.forEach(h=>chooseHouseholdPlan(town,h,withLLM));runTownCouncil(town,withLLM)}}
