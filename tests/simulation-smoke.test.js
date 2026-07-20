const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const noop = () => {};

function createElement(context2d) {
  const classes = new Set();
  return {
    style: {}, dataset: {}, value: "", checked: false, disabled: false,
    textContent: "", innerHTML: "", width: 640, height: 400, children: [],
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name)
    },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener: noop, setPointerCapture: noop, setAttribute: noop,
    focus: noop, blur: noop, remove: noop, closest: () => null,
    querySelectorAll: () => [], getContext: () => context2d,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 400 })
  };
}

function loadGame() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(match, "index.html must contain an embedded game script");

  const gradient = { addColorStop: noop };
  const context2d = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient
  }, {
    get: (target, key) => key in target ? target[key] : noop,
    set: (target, key, value) => (target[key] = value, true)
  });
  const elements = new Map();
  const document = {
    createElement: () => createElement(context2d),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement(context2d));
      return elements.get(id);
    },
    querySelectorAll: () => [], addEventListener: noop,
    documentElement: createElement(context2d), fullscreenElement: null,
    exitFullscreen: async () => {}
  };
  const local = new Map();
  const sandbox = {
    console, document, window: null, addEventListener: noop,
    localStorage: { getItem: key => local.get(key) || null, setItem: (key, value) => local.set(key, value) },
    performance: { now: () => 1000 }, requestAnimationFrame: noop,
    setTimeout, clearTimeout, setInterval: () => 1, clearInterval: noop,
    confirm: () => true, screen: { orientation: { lock: async () => {} } },
    location: { reload: noop }, fetch: async () => ({ ok: false, status: 404, text: async () => "" }),
    Math, Date, JSON, Map, Set, WeakSet, Float32Array, Array, Object,
    Number, String, Boolean, RegExp, Error, Promise
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: "index.html" });
  return { sandbox, run: code => vm.runInContext(code, sandbox) };
}

async function testDialogue(run) {
  const result = await run(`(async()=>{
    setupGame(424242,true);selectedClass="mage";activePanel=null;
    const villager=agents[0],mundane=rememberImportantPlayerFact(villager,"How is the weather?"),named=rememberImportantPlayerFact(villager,"My name is Ray"),duplicate=rememberImportantPlayerFact(villager,"My name is Ray"),preference=rememberImportantPlayerFact(villager,"Please remember that I prefer helping builders.");
    globalThis.__capturedMessages=null;llmConfig.backend="browser-lite";llmConfig.enabled=true;
    llmEngine={chat:{completions:{create:async request=>{globalThis.__capturedMessages=request.messages;return {choices:[{message:{content:"I remember you, Ray. The builders could use another steady pair of hands."}}]}}}}};
    const reply=await llmDialogueResponse(villager,"What do you remember about me?"),fallback=npcResponse(villager,"What work do you do?");
    const id=villager.id,saved=snapshot();applySave(saved);const restored=agents.find(agent=>agent.id===id);
    return {mundane,named,duplicate,preference,reply,fallback,prompt:globalThis.__capturedMessages.map(message=>message.content).join(" "),history:villager.dialogueHistory.length,restoredFacts:restored.playerMemories.map(memory=>memory.text),restoredHistory:restored.dialogueHistory.length};
  })()`);
  assert.equal(result.mundane, false, "routine dialogue must not become permanent memory");
  assert.equal(result.named, true, "the player's name should be remembered");
  assert.equal(result.duplicate, false, "identical important memories should be deduplicated");
  assert.equal(result.preference, true, "explicit preferences should be remembered");
  assert.match(result.reply, /remember/i);
  assert.ok(result.fallback.length > 20, "deterministic dialogue fallback should remain useful");
  assert.match(result.prompt, /Ray/i, "model prompt should contain remembered player facts");
  assert.ok(result.history >= 2, "successful model conversation should enter recent history");
  assert.ok(result.restoredFacts.some(fact => /Ray/i.test(fact)), "important facts must survive save/load");
  assert.ok(result.restoredHistory >= 2, "conversation history must survive save/load");
  return result;
}

function testNpcUpdates(run) {
  const result = run(`(()=>{
    setupGame(987654,true);selectedClass="warrior";activePanel=null;worldEnemies=[];updateCamera();const nearProbe=agents[agents.length-1],outside=[{x:camera.x-NPC_UPDATE_REGIME.viewportMargin-8,y:player.y},{x:camera.x+VW+NPC_UPDATE_REGIME.viewportMargin+8,y:player.y},{x:player.x,y:camera.y-NPC_UPDATE_REGIME.viewportMargin-8},{x:player.x,y:camera.y+VH+NPC_UPDATE_REGIME.viewportMargin+8}].sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];nearProbe.x=outside.x;nearProbe.y=outside.y;
    const calls={visible:0,near:0,far:0},original=stepAgentCore;stepAgentCore=function(agent,dt,tier){calls[tier]++;return original(agent,dt,tier)};
    const frames=600,baseline=agents.length*frames;for(let frame=0;frame<frames;frame++){stepAgents(1/60);stepParticles(1/60)}stepAgentCore=original;
    const afterMovement=agents.map(agent=>({id:agent.id,x:agent.x,y:agent.y,activity:agent.currentActivity,tier:agentUpdateTier(agent)}));
    for(let day=0;day<40;day++)newDay();
    const allFinite=agents.every(agent=>Number.isFinite(agent.x)&&Number.isFinite(agent.y)&&Number.isFinite(agent.wealth)&&Object.values(agent.needs).every(value=>Number.isFinite(value)&&value>=0&&value<=100));
    const marketsValid=towns.every(town=>town.market.prices.every(value=>Number.isFinite(value)&&value>0)&&town.market.inventory.every(value=>Number.isFinite(value)&&value>=0));
    const ids=agents.map(agent=>agent.id),uniqueIds=new Set(ids).size===ids.length,townPopulation=towns.reduce((sum,town)=>sum+town.agents.length,0);
    const plansValid=towns.every(town=>town.houses.every(house=>house.plan&&typeof house.plan.label==="string")&&town.institutions.currentPolicy&&typeof town.institutions.currentPolicy.label==="string");
    return {population:agents.length,baseline,calls,totalCalls:calls.visible+calls.near+calls.far,afterMovement,dayNo,allFinite,marketsValid,uniqueIds,townPopulation,plansValid,metrics:npcUpdateMetrics.last};
  })()`);
  assert.ok(result.totalCalls < result.baseline * 0.75, "distance-aware scheduler should avoid most full-rate NPC updates");
  assert.ok(result.calls.visible > 0 && result.calls.near > 0 && result.calls.far > 0, "scheduler should exercise visible, nearby, and distant tiers");
  assert.ok(result.afterMovement.every(agent => agent.activity && Number.isFinite(agent.x) && Number.isFinite(agent.y)), "NPC movement and schedules must remain valid");
  assert.equal(result.dayNo, 41, "long-run test should advance forty complete days");
  assert.equal(result.allFinite, true, "NPC values and needs must remain finite and bounded");
  assert.equal(result.marketsValid, true, "market state must remain positive and finite");
  assert.equal(result.uniqueIds, true, "NPC IDs must remain unique through lifecycle updates");
  assert.equal(result.townPopulation, result.population, "town rosters and global population must agree");
  assert.equal(result.plansValid, true, "households and councils must keep valid plans");
  return result;
}

function testStarterEquipment(run) {
  const result = run(`(()=>{
    const outcomes={};
    for(const cls of ["warrior","mage","noble"]){
      setupGame(11111,true);selectedClass=cls;activePanel=null;
      grantStarterEquipment(true);
      const countAfterFirst=player.gearInventory.length;
      grantStarterEquipment(true);
      const weapon=findGear(player.equippedSlots.weapon),shield=findGear(player.equippedSlots.shield);
      const uids=player.gearInventory.map(g=>g.uid);
      outcomes[cls]={
        weaponKey:weapon&&weapon.key,shieldKey:shield&&shield.key,
        idempotent:player.gearInventory.length===countAfterFirst,
        uniqueUids:new Set(uids).size===uids.length,
        hasShield:playerHasShield(),
        maxHp:player.maxHp
      };
    }
    return outcomes;
  })()`);
  assert.equal(result.warrior.weaponKey, "simple_sword", "warrior starts with the Ironwood Blade");
  assert.equal(result.warrior.shieldKey, "wood_shield", "warrior starts with the Wood Shield");
  assert.equal(result.warrior.hasShield, true, "warrior can block from the start");
  assert.equal(result.mage.weaponKey, "apprentice_wand", "mage starts with the Apprentice Wand");
  assert.equal(result.mage.hasShield, false, "mage has no shield and cannot block yet");
  assert.equal(result.noble.weaponKey, "court_rapier", "noble starts with the Court Rapier");
  assert.equal(result.noble.hasShield, false, "noble has no shield and cannot block yet");
  for (const cls of ["warrior", "mage", "noble"]) {
    assert.equal(result[cls].idempotent, true, cls + " starter grant must not duplicate gear");
    assert.equal(result[cls].uniqueUids, true, cls + " gear uids must stay unique");
    assert.ok(result[cls].maxHp >= 10, cls + " maxHp must be recomputed");
  }
  return result;
}

function testEquipUnequipOccupancy(run) {
  const result = run(`(()=>{
    setupGame(22222,true);selectedClass="warrior";activePanel=null;
    grantStarterEquipment(true);
    const weapon=findGear(player.equippedSlots.weapon),def=GEAR_DEFS[weapon.key],area=def.w*def.h;
    const usedEquipped=packBackpack().used;
    unequipGear("weapon");
    const usedUnequipped=packBackpack().used;
    const savedAfterUnequip=JSON.parse(localStorage.getItem(SAVE_KEY)).player.equippedSlots.weapon;
    equipGear(weapon.uid);
    const usedReequipped=packBackpack().used;
    const savedAfterEquip=JSON.parse(localStorage.getItem(SAVE_KEY)).player.equippedSlots.weapon;
    return {area,usedEquipped,usedUnequipped,usedReequipped,savedAfterUnequip,savedAfterEquip,weaponUid:weapon.uid};
  })()`);
  assert.equal(result.usedUnequipped - result.usedEquipped, result.area, "unequipped weapon must occupy its real w×h footprint");
  assert.equal(result.usedReequipped, result.usedEquipped, "re-equipping must free the backpack space");
  assert.equal(result.savedAfterUnequip, null, "unequip must save immediately");
  assert.equal(result.savedAfterEquip, result.weaponUid, "equip must save immediately");
  return result;
}

function testGovernment(run) {
  const result = run(`(()=>{
    setupGame(33333,true);selectedClass="warrior";activePanel=null;
    const town=homeGovernmentTown();
    setGovernmentType(town,"democracy");
    requestTownFocus(town,"food");
    const focusDecision=governmentFor(town).lastDecision;
    setGovernmentType(town,"empire");
    beginRaid(town,"dungeon");
    const raidStarted=governmentFor(town).raid;
    const started={phase:raidStarted&&raidStarted.phase,countdown:raidStarted&&raidStarted.countdown,members:raidStarted&&raidStarted.memberIds.length};
    const treasuryBefore=town.market.treasury;
    for(let i=0;i<4000&&governmentFor(town).raid;i++)stepGovernmentRaids(.15);
    const historyEntry=governmentFor(town).raidHistory[0];
    const populationMatches=agents.length===towns.reduce((sum,t)=>sum+t.agents.length,0);
    const target=closestOtherTown(town),defendersBefore=target.agents.length;
    beginRaid(town,"town");
    for(let i=0;i<6000&&governmentFor(town).raid;i++)stepGovernmentRaids(.15);
    const townRaidDone=!governmentFor(town).raid;
    const populationStillMatches=agents.length===towns.reduce((sum,t)=>sum+t.agents.length,0);
    const casualties=defendersBefore-target.agents.length+(governmentFor(town).raidHistory[0]?governmentFor(town).raidHistory[0].casualties:0);
    const relation=governmentFor(town).relations[target.name];
    const allValid=agents.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&!a.eliminated);
    return {focusDecision:{passed:focusDecision.passed,type:focusDecision.type,votes:focusDecision.yes+focusDecision.no},focus:governmentFor(town).focus,started,treasuryGain:town.market.treasury-treasuryBefore,historyEntry,populationMatches,townRaidDone,populationStillMatches,casualties,relationScore:relation.score,relationStatus:relation.status,allValid};
  })()`);
  assert.equal(result.focusDecision.type, "democracy", "focus vote must run under democracy");
  assert.ok(result.focusDecision.votes > 1, "democracy must collect multiple votes");
  assert.equal(result.started.phase, "gathering", "raid must begin in the 30-second rally phase");
  assert.equal(result.started.countdown, 30, "rally countdown must start at 30 seconds");
  assert.ok(result.started.members > 0, "raid must call adult citizens");
  assert.ok(result.historyEntry, "finished raid must be recorded in history");
  if (result.historyEntry.success) assert.ok(result.treasuryGain > 0, "successful dungeon raid must add treasury");
  assert.equal(result.populationMatches, true, "population invariant must hold after the dungeon raid");
  assert.equal(result.townRaidDone, true, "town raid must resolve");
  assert.equal(result.populationStillMatches, true, "population invariant must hold after NPC-vs-NPC combat");
  assert.ok(result.relationScore <= -25, "raiding a town must permanently damage relations");
  assert.equal(result.allValid, true, "surviving agents must stay finite and non-eliminated");
  return result;
}

function testSaveMigration(run) {
  const result = run(`(()=>{
    setupGame(44444,true);selectedClass="mage";activePanel=null;
    grantStarterEquipment(true);
    const data=snapshot();
    data.version=10;
    delete data.governments;
    delete data.player.relationships;delete data.player.familyAgentIds;
    delete data.player.worldZoom;delete data.player.exploredWorldCells;
    delete data.player.starterLoadoutVersion;delete data.player.governmentChosen;
    data.player.gearInventory=[];data.player.equippedSlots={helmet:null,shield:null,weapon:null,gauntlets:null,pants:null,amulet:null,ring:null};
    for(const a of data.agents){delete a.species;delete a.opennessBias}
    applySave(data);
    const town=homeGovernmentTown(),govt=governmentFor(town);
    const weapon=findGear(player.equippedSlots.weapon);
    const gearKeys=player.gearInventory.map(g=>g.key);
    const speciesValid=agents.every(a=>SPECIES[a.species]&&Number.isFinite(a.opennessBias)&&a.opennessBias>=0&&a.opennessBias<=1);
    const rels=Object.values(player.relationships||{});
    const family=new Set(playerFamilyIds());
    const expectedHeard=town.agents.filter(a=>!family.has(a.id)).length;
    const reSnap=snapshot();
    return {
      governmentType:govt.type,focus:govt.focus,raid:govt.raid,
      weaponKey:weapon&&weapon.key,duplicates:gearKeys.length!==new Set(gearKeys).size,
      speciesValid,
      familyCount:rels.filter(r=>r.kind==="family").length,heardCount:rels.filter(r=>r.kind==="heard").length,expectedHeard,
      worldZoom,explored:exploredWorldCells.size,
      version:reSnap.version,promptOpen:activePanel==="governmentEntryPanel"
    };
  })()`);
  assert.equal(result.governmentType, "council", "old saves must default to a Council government");
  assert.equal(result.focus, "balanced", "old saves must default to balanced focus");
  assert.equal(result.raid, null, "no raid may be in flight after load");
  assert.equal(result.weaponKey, "apprentice_wand", "empty-inventory save must have starter gear restored");
  assert.equal(result.duplicates, false, "gear repair must not duplicate items");
  assert.equal(result.speciesValid, true, "every agent must gain a valid species and openness bias");
  assert.ok(result.familyCount >= 1, "player must start with family relationships");
  assert.equal(result.heardCount, result.expectedHeard, "every non-family home villager must start as Heard of");
  assert.equal(result.worldZoom, 2.25, "old saves must adopt the new default zoom");
  assert.ok(result.explored > 0, "fog must be revealed around the player after load");
  assert.equal(result.version, 19, "re-snapshot must use the new save version");
  assert.equal(result.promptOpen, true, "loaded save without a government choice must prompt for one");
  return result;
}

(async () => {
  const { run } = loadGame();
  const dialogue = await testDialogue(run);
  const npc = testNpcUpdates(run);
  const starter = testStarterEquipment(run);
  const occupancy = testEquipUnequipOccupancy(run);
  const government = testGovernment(run);
  const migration = testSaveMigration(run);
  console.log("Dialogue tests passed:", { facts: dialogue.restoredFacts.length, history: dialogue.restoredHistory });
  console.log("NPC tests passed:", { population: npc.population, days: npc.dayNo - 1, scheduledUpdates: npc.totalCalls, fullRateBaseline: npc.baseline, calls: npc.calls });
  console.log("Starter equipment tests passed:", { warrior: starter.warrior.weaponKey + "+" + starter.warrior.shieldKey, mage: starter.mage.weaponKey, noble: starter.noble.weaponKey });
  console.log("Backpack occupancy tests passed:", { footprint: occupancy.area, equipped: occupancy.usedEquipped, unequipped: occupancy.usedUnequipped });
  console.log("Government tests passed:", { votes: government.focusDecision.votes, dungeonRaid: government.historyEntry.success ? "victory" : "defeat", relation: government.relationStatus });
  console.log("Save migration tests passed:", { version: migration.version, family: migration.familyCount, heard: migration.heardCount, explored: migration.explored });
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
