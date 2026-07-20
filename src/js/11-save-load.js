/* ============================================================
   SAVE / LOAD
   ============================================================ */
const SAVE_KEY="egglands_v1";
function snapshot(){
  return {
    version:10,seed,dayNo,dayClock,roadSafety,kills,selectedClass,spentPoints,purchased:[...purchased],quest,
    living:{villageEvents,nextEventId,godMode,llmConfig:{enabled:false,backend:llmConfig.backend,serverUrl:llmConfig.serverUrl,serverModel:llmConfig.serverModel,model:llmConfig.model,status:"Lightweight villager mind ready to load on the first conversation.",lastDecision:llmConfig.lastDecision}},
    player:{x:player.x,y:player.y,hp:player.hp,maxHp:player.maxHp,coins:player.coins,relics:player.relics,cargo:player.cargo,capacity:player.capacity,
      materials:player.materials,materialCapacity:player.materialCapacity,stamina:player.stamina,guardBroken:player.guardBroken,
      influenceDay:player.influenceDay,tradeOrigins:player.tradeOrigins,level:player.level,xp:player.xp,specialtyPoints:player.specialtyPoints,
      skillPoints:player.skillPoints,lifeSkills:player.lifeSkills,equipment:player.equipment,homeTownName:player.homeTownName,backpackCols:player.backpackCols,backpackRows:player.backpackRows,
      gearInventory:player.gearInventory,equippedSlots:player.equippedSlots,nextItemUid:player.nextItemUid},
    towns:towns.map(t=>({name:t.name,building:t.building,materialStock:t.materialStock,walls:t.walls,chronicle:t.chronicle,institutions:t.institutions,houses:t.houses.map(h=>({id:h.id,familyName:h.familyName,stock:h.stock,plan:h.plan,planHistory:h.planHistory,lastCouncilDay:h.lastCouncilDay,lastHungerEvent:h.lastHungerEvent})),
      market:{prices:t.market.prices,lastPrices:t.market.lastPrices,inventory:t.market.inventory,treasury:t.market.treasury,avgUtility:t.market.avgUtility,lastUtility:t.market.lastUtility,shortage:t.market.shortage}})),
    agents:agents.map(a=>({id:a.id,cls:a.cls,town:a.town.name,name:a.name,alphas:a.alphas,productivity:a.productivity,wealth:a.wealth,
      utility:a.utility,lastUtility:a.lastUtility,trend:a.trend,leisure:a.leisure,plan:a.plan,memory:a.memory,
      isGuard:a.isGuard,guardHp:a.guardHp,guardMaxHp:a.guardMaxHp,guardDays:a.guardDays,combatClass:a.combatClass,level:a.level,xp:a.xp,
      specialtyPoints:a.specialtyPoints,skillPoints:a.skillPoints,specialtyPurchased:[...a.specialtyPurchased],lifeSkills:a.lifeSkills,equipment:a.equipment,houseId:a.houseId,
      firstName:a.firstName,ageGroup:a.ageGroup,gender:a.gender,age:a.age,familyName:a.familyName,spouseId:a.spouseId,parentIds:a.parentIds,childrenIds:a.childrenIds,
      traits:a.traits,needs:a.needs,relationships:a.relationships,eventMemory:a.eventMemory,rumors:a.rumors,rumorNotes:a.rumorNotes,dialogueHistory:(a.dialogueHistory||[]).slice(-16),playerMemories:(a.playerMemories||[]).slice(-8),schedule:a.schedule,currentActivity:a.currentActivity,publicRationale:a.publicRationale})),
    dungeon:{chestOpened:dungeon.chestOpened,wardenDead:dungeon.wardenDead,cleared:dungeon.cleared},
    resourceState:[...resourceState.entries()],
    resourceNodes:Object.fromEntries(Object.entries(resourceNodes).map(([k,n])=>[k,{stock:n.stock}]))
  };
}
function saveGame(silent=false){
  if(!selectedClass)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));if(!silent)toast("Game saved in this browser.")}
  catch(e){if(!silent)toast("This browser blocked local saving.")}
}
function applySave(data){
  setupGame(data.seed,true);
  dayNo=data.dayNo||1;dayClock=data.dayClock||0;roadSafety=data.roadSafety??62;kills=data.kills||0;
  selectedClass=data.selectedClass;spentPoints=data.spentPoints||0;purchased=new Set(data.purchased||[]);quest=Object.assign({gathered:false,traded:false,escort:false,dungeon:false,built:false},data.quest||{});
  const savedPlayer=data.player||{};Object.assign(player,savedPlayer);player.cargo=(savedPlayer.cargo||[0,0,0,0]).slice();
  player.materials=(savedPlayer.materials||[0,0,0,0]).slice();player.tradeOrigins=(savedPlayer.tradeOrigins||[null,null,null,null]).slice();
  player.lifeSkills=Object.assign({fishing:0,forestry:0,mining:0,hunting:0},savedPlayer.lifeSkills||{});
  player.equipment=Object.assign({fishing:false,forestry:false,mining:false,hunting:false},savedPlayer.equipment||{});
  player.backpackCols=savedPlayer.backpackCols||8;player.backpackRows=savedPlayer.backpackRows||5;player.gearInventory=(savedPlayer.gearInventory||[]).map(item=>Object.assign({},item));
  player.equippedSlots=Object.assign({helmet:null,shield:null,weapon:null,gauntlets:null,pants:null,amulet:null,ring:null},savedPlayer.equippedSlots||{});player.nextItemUid=savedPlayer.nextItemUid||1;
  if(!Number.isFinite(savedPlayer.specialtyPoints))player.specialtyPoints=Math.max(0,Math.floor(kills/3)-spentPoints);
  for(const savedTown of data.towns||[]){
    const town=towns.find(t=>t.name===savedTown.name);if(!town)continue;
    town.building=savedTown.building||null;town.materialStock=(savedTown.materialStock||[0,0,0,0]).slice();Object.assign(town.market,savedTown.market||{});
    if(savedTown.walls){town.walls=Object.assign({placed:0,complete:false},savedTown.walls);const wallCells=wallPlan(town);for(let i=0;i<Math.min(town.walls.placed,wallCells.length);i++){const c=wallCells[i];if(!c.gate){tiles[c.y][c.x]=8;solid.add(keyOf(c.x,c.y))}}}
    if(data.version>=8&&savedTown.chronicle)town.chronicle=savedTown.chronicle.slice();if(data.version>=8&&savedTown.institutions)town.institutions=Object.assign(town.institutions||{},savedTown.institutions);
    if(data.version>=8)for(const savedHouse of savedTown.houses||[]){const house=town.houses.find(h=>h.id===savedHouse.id);if(house)Object.assign(house,savedHouse)}
    const specialty=Object.keys(SPECIALTY_BUILDING).find(cls=>SPECIALTY_BUILDING[cls]===town.building);
    if(specialty&&!town.shops.some(s=>s.key===town.building))town.shops.push({key:town.building,specialty,x:town.plot.x,y:town.plot.y+24});
  }
  if(data.agents&&data.version>=8){
    towns.forEach(t=>{t.agents=[];t.houses.forEach(h=>h.residentIds=[])});
    const savedById=new Map(data.agents.map(a=>[a.id,a]));
    for(const a of agents){
      const saved=savedById.get(a.id),originalTown=a.town,stableId=a.id;if(saved){Object.assign(a,saved);a.id=stableId}
      const requested=data.version>=4?(towns.find(t=>t.name===(saved&&saved.town))||originalTown):originalTown;
      a.town=townHasHousing(requested)?requested:towns.find(t=>townHasHousing(t))||originalTown;
      a.combatClass=a.combatClass||"peasant";a.level=a.level||1;a.xp=a.xp||0;
      a.specialtyPoints=Number.isFinite(a.specialtyPoints)?a.specialtyPoints:1;a.skillPoints=Number.isFinite(a.skillPoints)?a.skillPoints:1;
      a.specialtyPurchased=new Set(saved&&saved.specialtyPurchased||[]);
      a.lifeSkills=Object.assign({fishing:0,forestry:0,mining:0,hunting:0},saved&&saved.lifeSkills||a.lifeSkills||{});
      a.equipment=Object.assign({fishing:false,forestry:false,mining:false,hunting:false},saved&&saved.equipment||a.equipment||{});
      initializeAgentMind(a);
      if(data.version<5)a.name=a.firstName+" "+a.familyName+" of "+townTitle(a.town.name);
      assignHouse(a,a.town,saved&&Number.isFinite(saved.houseId)?saved.houseId:null);a.x=a.home.x;a.y=a.home.y;a.town.agents.push(a);updateAgentSpecialization(a);buildDailySchedule(a);
    }
  }
  if(data.dungeon){
    Object.assign(dungeon,data.dungeon);
    if(dungeon.wardenDead)dungeonEnemies=dungeonEnemies.filter(e=>e.type!=="warden");
    if(dungeon.cleared)dungeonEnemies=[];
  }
  resourceState=new Map(data.resourceState||[]);
  if((data.version||0)<10)for(const [key,state] of resourceState){const [x,y]=key.split(",").map(Number),tile=tiles[y]?.[x];if(state.readyDay>dayNo&&(tile===1||tile===4))state.originalTile=tile}
  refreshDepletedResourceTerrain();
  if(data.resourceNodes)for(const k of Object.keys(resourceNodes))if(data.resourceNodes[k])resourceNodes[k].stock=clamp(data.resourceNodes[k].stock,0,resourceNodes[k].max);
  if(data.living){if(data.version>=8){villageEvents=(data.living.villageEvents||[]).slice();nextEventId=data.living.nextEventId||((villageEvents.length?villageEvents[villageEvents.length-1].id:0)+1)}godMode=!!data.living.godMode;llmConfig=Object.assign(llmConfig,data.living.llmConfig||{},{enabled:false})}
  if((data.version||0)<9){llmEngine=null;llmConfig.backend="browser-lite";llmConfig.model=LITE_LLM_MODEL;llmConfig.enabled=false;llmConfig.status="Lightweight villager mind ready to load on the first conversation."}
  updateGodModeVisibility();
  scene="world";currentShop=null;shopCanvas=null;shopCells=null;player.maxHp=mods().maxHp;player.hp=clamp(player.hp,1,player.maxHp);player.stamina=clamp(player.stamina||100,0,mods().maxStamina);
  Object.assign(player,{jumpZ:0,jumpV:0,jumpsUsed:0,landingSquash:0,attackQueued:0,attackLunge:0,dashHitTargets:null,moveBlend:0,walkTime:0,moving:false,moveVX:0,moveVY:0,stepDust:0,harvestAnim:0,harvestKind:null});
  if((data.version||0)<7&&insideTownBounds(player.x,player.y,0))placePlayerAtWorldSpawn();
  document.getElementById("classPanel").classList.remove("open");activePanel=null;
  document.getElementById("dayNo").textContent=dayNo;paintWorld();renderLedger();updateUI();toast("Saved valley restored.");
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw){toast("No saved valley exists in this browser.");return}
    applySave(JSON.parse(raw));
  }catch(e){toast("The saved valley could not be restored.")}
}
