/* ============================================================
   CARAVANS, DAYS, CITIZEN SCHEDULES
   ============================================================ */
function nearestTown(){
  return towns.reduce((a,b)=>Math.hypot(a.cx-player.x,a.cy-player.y)<Math.hypot(b.cx-player.x,b.cy-player.y)?a:b);
}
function scheduleCaravan(protectedRun=false){
  if(scene!=="world"&&protectedRun)return false;
  let best=null;
  const pairs=[];for(const from of towns)for(const to of towns)if(from!==to)pairs.push([from,to]);
  for(let i=0;i<4;i++){
    for(const pair of pairs){
      const from=pair[0],to=pair[1],stock=from.market.inventory[i];
      if(stock<5)continue;
      const ratio=to.market.prices[i]/Math.max(.01,from.market.prices[i]);
      const scarcity=(to.market.inventory[i]+2)/(from.market.inventory[i]+2);
      const score=ratio/Math.max(.35,scarcity);
      if(!best||score>best.score)best={from,to,i,score};
    }
  }
  if(!best||(!protectedRun&&best.score<1.10))return false;
  const capacity=Math.max(2,Math.floor(2+roadSafety/22)+(protectedRun?2:0));
  const qty=Math.min(capacity,Math.max(1,Math.floor(best.from.market.inventory[best.i]-3)));
  if(qty<=0)return false;
  best.from.market.inventory[best.i]-=qty;
  const c={
    id:Date.now()+rand(),x:best.from.marketPoint.x,y:best.from.marketPoint.y,
    from:best.from,to:best.to,good:best.i,qty,hp:protectedRun?6:3,maxHp:protectedRun?6:3,
    protected:protectedRun,escorted:0,
    path:roadBetween(best.from,best.to),waypoint:0
  };
  caravans.push(c);
  return true;
}
function destroyCaravan(caravan){
  if(!caravans.includes(caravan))return;
  caravans=caravans.filter(c=>c!==caravan);roadSafety=clamp(roadSafety-13,0,100);
  recordVillageEvent(caravan.from,"CARAVAN LOST","A caravan from "+caravan.from.name+" is lost carrying "+caravan.qty+" "+GOODS[caravan.good]+" toward "+caravan.to.name+".",{emotion:"fear",salience:9});
  toast("A "+caravan.from.name+" caravan was lost with "+caravan.qty+" "+GOODS[caravan.good]+".");
  updateUI();
}
function deliverCaravan(c){
  c.to.market.inventory[c.good]+=c.qty;
  const settlement=c.qty*(c.from.market.prices[c.good]+c.to.market.prices[c.good])*.5;
  const paid=Math.min(settlement,c.to.market.treasury);
  c.to.market.treasury-=paid;c.from.market.treasury+=paid;
  c.to.market.prices[c.good]*=.94;c.from.market.prices[c.good]*=1.02;
  roadSafety=clamp(roadSafety+2,0,100);
  recordVillageEvent(c.to,"TRADE","A "+c.from.name+" caravan delivers "+c.qty+" "+GOODS[c.good]+" to "+c.to.name+".",{emotion:"relief",salience:c.escorted>=6?8:6});
  if(c.escorted>=6){quest.escort=true;toast("Your escorted caravan reaches "+c.to.name+" with "+c.qty+" "+GOODS[c.good]+".")}
  else toast("A caravan delivers "+c.qty+" "+GOODS[c.good]+" to "+c.to.name+".");
  updateUI();
}
function stepCaravans(dt){
  const survivors=[];
  for(const c of caravans){
    const target=c.path[Math.min(c.waypoint,c.path.length-1)]||c.to.marketPoint;
    const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy);
    if(d<7){
      c.waypoint++;
      if(c.waypoint>=c.path.length){deliverCaravan(c);continue}
    }
    const speed=22+roadSafety*.10+(c.protected?5:0);
    if(d>0){c.x+=dx/d*speed*dt;c.y+=dy/d*speed*dt}
    if(Math.hypot(player.x-c.x,player.y-c.y)<58)c.escorted+=dt;
    survivors.push(c);
  }
  caravans=survivors;
}
function isNight(){return dayClock/DAY_SECONDS>.66}
function spawnRoadRat(){
  if(scene!=="world"||worldEnemies.length>=12)return;
  for(let tries=0;tries<8;tries++){
    const road=valleyRoad[Math.floor(rand()*valleyRoad.length)],x=road.x+(rand()-.5)*75,y=road.y+(rand()-.5)*75;
    if(x>16&&y>16&&x<(MW-2)*TILE&&y<(MH-2)*TILE&&!solid.has(keyOf(Math.floor(x/TILE),Math.floor(y/TILE)))){
      spawnEnemy("rat",x,y,false);return;
    }
  }
}
function considerMigration(){
  if(dayNo<4||rand()>.25)return;
  const ranked=towns.slice().sort((a,b)=>a.market.avgUtility-b.market.avgUtility),worse=ranked[0],better=ranked.slice().reverse().find(t=>t!==worse&&townHasHousing(t));
  if(!worse||!better||worse.agents.length<=5||worse.market.avgUtility>=better.market.avgUtility*.82)return;
  const migrant=worse.agents.filter(a=>!a.isGuard&&a.ageGroup!=="child"&&a.spouseId==null).sort((a,b)=>a.utility-b.utility)[0];
  if(!migrant)return;
  releaseHouse(migrant);worse.agents=worse.agents.filter(a=>a!==migrant);migrant.town=better;
  if(!assignHouse(migrant,better)){migrant.town=worse;assignHouse(migrant,worse);worse.agents.push(migrant);return}
  better.agents.push(migrant);migrant.x=better.marketPoint.x;migrant.y=better.marketPoint.y;
  updateAgentSpecialization(migrant);
  migrant.remember("I left "+worse.name+" after its shortages made life untenable");
  initializeHousehold(better,householdFor(migrant));buildDailySchedule(migrant);recordVillageEvent(better,"MIGRATION",migrant.firstName+" "+migrant.familyName+" migrates from "+worse.name+" to "+better.name+" after worsening shortages.",{actorId:migrant.id,emotion:"hope",salience:8});
  paintWorld();
  toast(migrant.name.split(" ")[0]+" migrates from "+worse.name+" to "+better.name+".");
}
function guardCount(town){return town.agents.filter(a=>a.isGuard).length}
function promoteGuard(a){
  if(a.ageGroup==="child")return;
  a.isGuard=true;a.guardHp=a.guardMaxHp;a.guardStun=0;a.guardStamina=100;a.guardDays=0;a.plan="guard";
  a.remember("I volunteered for the town guard when danger made protection more valuable than my ordinary trade");
  recordVillageEvent(a.town,"GUARD",a.firstName+" volunteers for the "+a.town.name+" guard.",{actorId:a.id,emotion:"resolve",salience:6});
}
function releaseGuard(a){
  a.isGuard=false;a.guardHp=a.guardMaxHp;a.guardStun=0;a.plan="work";
  a.remember("I returned to "+a.produces+" work after the road stabilized");
}
function guardDefeated(a){
  a.isGuard=false;a.guardHp=a.guardMaxHp;a.guardStun=3;a.guardStamina=100;a.x=a.home.x;a.y=a.home.y;
  a.remember("I was wounded defending "+a.town.name+" and returned to civilian work");
  recordVillageEvent(a.town,"WOUNDED",a.firstName+" is wounded while defending "+a.town.name+".",{actorId:a.id,emotion:"pain",salience:8});
  roadSafety=clamp(roadSafety-3,0,100);toast(a.name.split(" ")[0]+" is wounded and leaves the guard.");
}
function updateTownGuards(){
  for(const town of towns){
    const threat=worldEnemies.filter(e=>!e.dead&&Math.hypot(e.x-town.cx,e.y-town.cy)<290).length;
    let desired=Math.ceil(Math.max(0,62-roadSafety)/20)+Math.ceil(threat/3);
    if(townHasFacility(town,"watchpost"))desired=Math.max(1,desired);
    if(town.market.treasury<8)desired=Math.max(0,desired-1);
    desired=clamp(desired,0,2);
    const current=town.agents.filter(a=>a.isGuard);
    if(current.length<desired){
      const candidates=town.agents.filter(a=>a.ageGroup!=="child"&&!a.isGuard&&a.guardStun<=0).sort((a,b)=>{
        const score=x=>(x.cls==="warrior"?4:x.cls==="noble"?2:0)+(30-x.wealth)*.03+x.productivity;
        return score(b)-score(a);
      });
      const recruit=candidates.slice(0,desired-current.length);
      recruit.forEach(promoteGuard);
      if(recruit.length)toast(recruit.map(a=>a.name.split(" ")[0]).join(" and ")+" volunteer for the "+town.name+" guard.");
    }else if(current.length>desired&&roadSafety>72&&threat===0){
      current.sort((a,b)=>b.guardDays-a.guardDays).slice(0,current.length-desired).forEach(releaseGuard);
    }
    for(const a of town.agents){
      a.guardHp=Math.min(a.guardMaxHp,a.guardHp+1);
      a.guardStun=Math.max(0,a.guardStun-1);
    }
  }
}
function newDay(){
  dayNo++;document.getElementById("dayNo").textContent=dayNo;playSfx("day");
  if(refreshDepletedResourceTerrain())paintWorld();
  for(const town of towns){
    town.market.tick(town);
    town.materialStock=town.materialStock.map((v,i)=>Math.max(0,v-(i===0?1.2:.45)));
  }
  for(const key of Object.keys(resourceNodes)){const n=resourceNodes[key];n.stock=Math.min(n.max,n.stock+n.regen)}
  runLivingDay();
  considerMigration();
  const watchposts=towns.filter(t=>townHasFacility(t,"watchpost")).length;
  roadSafety=clamp(roadSafety-Math.max(1,7-watchposts*4),0,100);
  updateTownGuards();
  if(caravans.length<2)scheduleCaravan(false);
  if(dayNo%2===0&&caravans.length<2)scheduleCaravan(false);
  worldEnemies=worldEnemies.filter(e=>e.type!=="rat"||towns.every(t=>Math.hypot(e.x-t.cx,e.y-t.cy)>80));
  for(const a of agents){a.targetRefresh=0;a.cachedTarget=null;a.combatRefresh=0;if(a.cachedEnemy&&a.cachedEnemy.dead)a.cachedEnemy=null}
  saveGame(true);renderLedger();updateUI();
}
function wallPlan(town){
  if(town.wallCells)return town.wallCells;
  const x0=town.rx-1,y0=town.ry-1,x1=town.rx+TOWN_W,y1=town.ry+TOWN_H,per=[];
  for(let x=x0;x<=x1;x++)per.push([x,y0]);
  for(let y=y0+1;y<=y1;y++)per.push([x1,y]);
  for(let x=x1-1;x>=x0;x--)per.push([x,y1]);
  for(let y=y1-1;y>y0;y--)per.push([x0,y]);
  town.wallCells=per.filter(([x,y])=>x>=1&&y>=1&&x<MW-1&&y<MH-1&&!solid.has(keyOf(x,y))).map(([x,y])=>({x,y,gate:tiles[y][x]===5||tiles[y][x]===6}));
  if(!town.wallCells.some(c=>c.gate)){const south=town.wallCells.find(c=>c.y===y1&&Math.abs(c.x-(town.rx+8))<3);if(south)south.gate=true}
  return town.wallCells;
}
function insideTownWalls(town,x,y){return x>=(town.rx-1)*TILE&&x<(town.rx+TOWN_W+1)*TILE&&y>=(town.ry-1)*TILE&&y<(town.ry+TOWN_H+1)*TILE}
function nearestGate(town,x,y){
  const gates=wallPlan(town).filter(c=>c.gate);if(!gates.length)return null;
  let best=null,bestD=Infinity;
  for(const c of gates){const d=Math.hypot(c.x*TILE+8-x,c.y*TILE+8-y);if(d<bestD){best=c;bestD=d}}
  return {x:best.x*TILE,y:best.y*TILE};
}
function agentTarget(a){
  const target=scheduleTarget(a),t=a.town;
  if(t.walls&&t.walls.placed>0){
    const inA=insideTownWalls(t,a.x,a.y),inT=insideTownWalls(t,target.x,target.y);
    if(inA!==inT){const gate=nearestGate(t,a.x,a.y);if(gate&&Math.hypot(a.x-gate.x,a.y-gate.y)>14)return gate}
  }
  return target;
}
function agentGatherTick(a,dt){
  const skill=a.gatherSkill,node=skill&&resourceNodes[skill];if(!node)return;
  a.gatherTick=(a.gatherTick||0)+dt;if(a.gatherTick<4)return;
  a.gatherTick=0;
  const idx=node.index;
  if(node.stock<=.1){
    a.currentActivity="finding "+node.label+" picked bare";
    if(node.exhaustedDay!==dayNo){node.exhaustedDay=dayNo;recordVillageEvent(a.town,"SHORTAGE","Gatherers report "+node.label+" is nearly exhausted; it needs time to recover.",{actorId:a.id,salience:7})}
    return;
  }
  const take=Math.min(node.stock,.12+lifeRank(a,skill)*.04);
  node.stock-=take;a.town.materialStock[idx]+=take;gainAgentXP(a,.4);
  particles.push({scene:"world",x:node.x+(rand()-.5)*16,y:node.y+(rand()-.5)*12,vx:(rand()-.5)*30,vy:-12-rand()*14,life:.3,color:["#83b9d7","#8e6842","#b8b7b1","#c98f6a"][idx]});
}
function agentUpdateTier(a){
  const visible=a.x>=camera.x-NPC_UPDATE_REGIME.viewportMargin&&a.x<=camera.x+VW+NPC_UPDATE_REGIME.viewportMargin&&a.y>=camera.y-NPC_UPDATE_REGIME.viewportMargin&&a.y<=camera.y+VH+NPC_UPDATE_REGIME.viewportMargin;
  if(visible)return "visible";return Math.hypot(a.x-player.x,a.y-player.y)<NPC_UPDATE_REGIME.nearDistance?"near":"far";
}
function scanAgentEnemy(a){
  let enemy=null,best=230;for(const e of worldEnemies){if(e.dead)continue;const d=Math.hypot(e.x-a.x,e.y-a.y);if(d<best){enemy=e;best=d}}return enemy;
}
function stepAgentCore(a,dt,tier){
  a.guardAttackCd=Math.max(0,a.guardAttackCd-dt);a.guardSpecialCd=Math.max(0,a.guardSpecialCd-dt);a.guardStun=Math.max(0,a.guardStun-dt);a.guardStamina=Math.min(100,a.guardStamina+dt*18);
  let enemy=null,enemyDistance=Infinity;
  if(a.isGuard&&a.guardStun<=0){
    a.combatRefresh=(a.combatRefresh||0)-dt;if(a.combatRefresh<=0||!a.cachedEnemy||a.cachedEnemy.dead||!worldEnemies.includes(a.cachedEnemy)){a.cachedEnemy=scanAgentEnemy(a);a.combatRefresh=tier==="visible"?NPC_UPDATE_REGIME.combatVisible:NPC_UPDATE_REGIME.combatFar}
    enemy=a.cachedEnemy;if(enemy&&!enemy.dead)enemyDistance=Math.hypot(enemy.x-a.x,enemy.y-a.y);
    if(enemy&&!enemy.dead)agentSpecialtyAttack(a,enemy);
    if(enemy&&!enemy.dead&&enemyDistance<19&&a.guardAttackCd<=0){
      const combat=agentCombatMods(a);a.guardAttackCd=combat.cooldown;enemy.hp-=combat.damage;enemy.hurt=.18;recoilEnemy(enemy,combat.knock,a.x,a.y);screenShake=Math.max(screenShake,2);particles.push({scene:"world",x:enemy.x+5,y:enemy.y+4,vx:(rand()-.5)*35,vy:(rand()-.5)*35,life:.18,color:"#e2ad45"});
      if(enemy.hp<=0){defeatEnemy(enemy,a);a.remember("I helped clear a threat from the road");worldEnemies=worldEnemies.filter(e=>!e.dead);a.cachedEnemy=null;enemy=null}
    }
  }
  if(!enemy||enemyDistance<19){a.targetRefresh=(a.targetRefresh||0)-dt;if(a.targetRefresh<=0||!a.cachedTarget){a.cachedTarget=agentTarget(a);a.targetRefresh=tier==="visible"?NPC_UPDATE_REGIME.targetVisible:tier==="near"?NPC_UPDATE_REGIME.targetNear:NPC_UPDATE_REGIME.targetFar}}
  const target=enemy&&enemyDistance>=19?enemy:(a.cachedTarget||a.home),jx=a.isGuard?0:Math.sin(a.bob*2.8)*5,jy=a.isGuard?0:Math.cos(a.bob*2.2)*4,dx=target.x+jx-a.x,dy=target.y+jy-a.y,d=Math.hypot(dx,dy);
  const moving=d>2&&a.guardStun<=0,response=1-Math.exp(-dt*12);a.moveBlend+=(Number(moving)-a.moveBlend)*response;
  if(moving){const speed=(a.isGuard?43*agentCombatMods(a).speed:30)*dt;a.face={x:dx/d,y:dy/d};a.x+=a.face.x*speed;a.y+=a.face.y*speed;a.bob+=speed*.42}else a.bob+=dt*.7;
  if(!a.isGuard&&a.currentPlace==="gather"&&d<=26)agentGatherTick(a,dt);
}
function stepAgents(dt){
  if(scene!=="world")return;npcUpdateMetrics.seconds+=dt;
  for(const a of agents){
    if(a.paused)continue;const tier=agentUpdateTier(a),interval=tier==="visible"?0:tier==="near"?NPC_UPDATE_REGIME.nearInterval:NPC_UPDATE_REGIME.farInterval;
    if(!interval){a.updateAccumulator=0;stepAgentCore(a,dt,tier);npcUpdateMetrics.visible++;continue}
    a.updateAccumulator=(a.updateAccumulator||0)+dt;if(a.updateAccumulator<interval){npcUpdateMetrics.skipped++;continue}
    const elapsed=Math.min(NPC_UPDATE_REGIME.maxStep,a.updateAccumulator);a.updateAccumulator=0;stepAgentCore(a,elapsed,tier);npcUpdateMetrics[tier]++;
  }
  if(npcUpdateMetrics.seconds>=1){npcUpdateMetrics.last={visible:npcUpdateMetrics.visible,near:npcUpdateMetrics.near,far:npcUpdateMetrics.far,skipped:npcUpdateMetrics.skipped};npcUpdateMetrics.visible=0;npcUpdateMetrics.near=0;npcUpdateMetrics.far=0;npcUpdateMetrics.skipped=0;npcUpdateMetrics.seconds%=1}
}
