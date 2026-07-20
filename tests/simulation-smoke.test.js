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

(async () => {
  const { run } = loadGame();
  const dialogue = await testDialogue(run);
  const npc = testNpcUpdates(run);
  console.log("Dialogue tests passed:", { facts: dialogue.restoredFacts.length, history: dialogue.restoredHistory });
  console.log("NPC tests passed:", { population: npc.population, days: npc.dayNo - 1, scheduledUpdates: npc.totalCalls, fullRateBaseline: npc.baseline, calls: npc.calls });
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
