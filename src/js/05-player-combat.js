/* ============================================================
   PLAYER CLASSES, SKILLS, AND COMBAT
   ============================================================ */
const PLAYER_CLASSES=["warrior","mage","noble"];
const SPECIALTY={
  warrior:{name:"Greatblade Quake",desc:"Carve a circle around you with a crushing ground wave.",cooldown:2.0},
  mage:{name:"Astral Orb",desc:"Cast an explosive orb of seeking arcane light.",cooldown:1.15},
  noble:{name:"Rapier Lunge",desc:"Flash through a line of enemies with one precise thrust.",cooldown:1.45}
};
const CLASS_POWER={
  warrior:{name:"Secure the Road",desc:"Raise road safety by 14."},
  mage:{name:"Conjure Supply",desc:"Create four units of the scarcest local good."},
  noble:{name:"Royal Charter",desc:"Dispatch a protected emergency caravan."}
};
const CLASS_BLURB={
  warrior:"Hold the road by force. Strongest close-range fighter and caravan guardian.",
  mage:"Cast chained arcane attacks at range, blink through danger, and conjure emergency supply.",
  noble:"Fight and govern. Broker protected trade when markets pull apart."
};
const SKILLS={
  warrior:{branches:["Might","Bulwark","March"],nodes:[
    [["Heavy Hands","Greatblade swings reach farther"],["Warlord's Tempo","Greatblade Quake recharges faster"],["Earthsplitter","The quake expands and erupts in a second shockwave"]],
    [["Thick Hide","Maximum health +3"],["Shieldwall","Blocks launch enemies much farther"],["Thorned Mail","Blocks punish each attacker once"]],
    [["Forced March","Move 15% faster"],["Charge","Dash recharges faster"],["Trample","Charge through each enemy once"]]
  ]},
  mage:{branches:["Artifice","Wards","Winds"],nodes:[
    [["Spellthread","Basic spells fly farther and seek nearby targets"],["Quickcast","Astral Orb recharges faster"],["Astral Cascade","Cast three piercing stars that burst with arcane light"]],
    [["Warded Robes","Maximum health +3"],["Repulsion Ward","Blocks launch enemies much farther"],["Thorn Sigil","Blocks retaliate with an arcane sigil"]],
    [["Windstep","Move 15% faster"],["Blink Discipline","Blink recharges faster"],["Phase Rush","Blink through enemies in a damaging arcane trail"]]
  ]},
  noble:{branches:["Duel","Court","Grace"],nodes:[
    [["Fencer's Reach","Rapier thrusts reach farther"],["Duelist's Cadence","Rapier Lunge recharges faster"],["Perfect Thrust","The lunge travels farther and leaves a cutting afterimage"]],
    [["Fine Armor","Maximum health +3"],["Retinue's Shove","Blocks launch enemies much farther"],["Bodyguard's Blade","A block answers with one clean countercut"]],
    [["Court Poise","Move 15% faster"],["Sidestep","Dash recharges faster"],["Flourish","Dash cuts each crossed enemy once"]]
  ]}
};
const EQUIPMENT={
  fishing:{name:"Fishing Rod",icon:"⌁",price:5},
  forestry:{name:"Wood Axe",icon:"⌁",price:6},
  mining:{name:"Pickaxe",icon:"⚒",price:7},
  hunting:{name:"Salvage Kit",icon:"✚",price:8}
};
const LIFE_SKILLS={
  fishing:{name:"Fishing",icon:"≈",material:0,nodes:[
    ["Patient Cast","Land fish with one fewer action."],["Double Haul","Gain +1 fish from each catch."],["River Lore","Fishing spots recover one day sooner."]]},
  forestry:{name:"Forestry",icon:"♠",material:1,nodes:[
    ["True Edge","Fell trees with one fewer chop."],["Clean Limbs","Gain +1 log from each tree."],["Grovekeeping","Trees recover one day sooner."]]},
  mining:{name:"Mining",icon:"◆",material:2,nodes:[
    ["Stone Sense","Break rocks with one fewer strike."],["Deep Cut","Gain +1 stone from each rock."],["Prospector","Rocks recover one day sooner."]]},
  hunting:{name:"Hunting",icon:"✹",material:3,nodes:[
    ["Field Dressing","Recover +1 monster part."],["Trailcraft","Kills restore extra road safety."],["Trophy Hunter","Recover +2 more parts from elite monsters."]]}
};
const GEAR_SLOTS=["helmet","shield","weapon","gauntlets","pants","amulet","ring"];
const GEAR_DEFS={
  patched_cap:{name:"Patched Cap",icon:"⌂",slot:"helmet",w:2,h:1,desc:"A humble cap with a little padding.",stats:{health:1}},
  spellweave_hood:{name:"Spellweave Hood",icon:"△",slot:"helmet",w:2,h:2,desc:"A Mage hood threaded with warding silver.",stats:{health:2,special:1}},
  wood_shield:{name:"Wood Shield",icon:"◖",slot:"shield",w:2,h:2,desc:"Reliable cover made from valley timber.",stats:{defense:1,block:12}},
  tower_shield:{name:"Tower Shield",icon:"▣",slot:"shield",w:2,h:3,desc:"A massive Warrior shield that controls space.",stats:{defense:2,block:25}},
  simple_sword:{name:"Ironwood Blade",icon:"†",slot:"weapon",w:1,h:3,desc:"A balanced blade for any traveler.",stats:{power:1}},
  iron_sword:{name:"Ember Greatsword",icon:"⚔",slot:"weapon",w:2,h:3,desc:"A Watchpost-forged blade built for Warriors.",stats:{power:2,special:1}},
  runed_staff:{name:"Runed Staff",icon:"⚕",slot:"weapon",w:1,h:4,desc:"An Academy focus that amplifies spellwork.",stats:{power:1,special:2}},
  court_rapier:{name:"Court Rapier",icon:"⌁",slot:"weapon",w:1,h:3,desc:"A Civic Court dueling weapon of exacting balance.",stats:{power:2,speed:5}},
  apprentice_wand:{name:"Apprentice Wand",icon:"✧",slot:"weapon",w:1,h:2,desc:"A simple arcane focus for a beginning Mage.",stats:{power:1,special:1}},
  work_gloves:{name:"Work Gloves",icon:"∪",slot:"gauntlets",w:2,h:1,desc:"Reinforced gloves for tools and fighting.",stats:{stamina:8}},
  iron_gauntlets:{name:"Iron Gauntlets",icon:"▰",slot:"gauntlets",w:2,h:1,desc:"Heavy gauntlets from the Warrior forge.",stats:{power:1,defense:1}},
  trail_pants:{name:"Trail Trousers",icon:"Ⅱ",slot:"pants",w:2,h:2,desc:"Weatherproof trousers with deep pockets.",stats:{speed:4}},
  courtly_pants:{name:"Courtly Greaves",icon:"♜",slot:"pants",w:2,h:2,desc:"Noble legwear made for graceful footwork.",stats:{speed:8,defense:1}},
  reed_amulet:{name:"Reed Amulet",icon:"◇",slot:"amulet",w:1,h:1,desc:"A simple charm tied beside the fishing pond.",stats:{health:1,stamina:5}},
  moon_amulet:{name:"Moon Amulet",icon:"☾",slot:"amulet",w:1,h:1,desc:"An Academy charm brimming with stored magic.",stats:{special:2}},
  copper_ring:{name:"Copper Ring",icon:"○",slot:"ring",w:1,h:1,desc:"A practical ring traded throughout the valley.",stats:{stamina:5}},
  signet_ring:{name:"Valley Signet",icon:"◉",slot:"ring",w:1,h:1,desc:"A Noble seal that carries economic authority.",stats:{health:1,speed:4}}
};
const CRAFT_RECIPES=[
  {id:"cap",name:"Patched Cap",output:"patched_cap",materials:[0,1,0,1],coins:1,desc:"Light protection for the road."},
  {id:"shield",name:"Wood Shield",output:"wood_shield",materials:[0,4,1,0],coins:1,desc:"A broad, dependable shield."},
  {id:"sword",name:"Ironwood Blade",output:"simple_sword",materials:[0,2,3,1],coins:2,desc:"A general-purpose weapon."},
  {id:"gloves",name:"Work Gloves",output:"work_gloves",materials:[1,1,0,1],coins:1,desc:"More stamina for blocking and labor."},
  {id:"pants",name:"Trail Trousers",output:"trail_pants",materials:[2,2,0,0],coins:1,desc:"Travel faster through the valley."},
  {id:"amulet",name:"Reed Amulet",output:"reed_amulet",materials:[2,1,0,0],coins:1,desc:"A small health and stamina charm."},
  {id:"ring",name:"Copper Ring",output:"copper_ring",materials:[0,0,2,0],coins:1,desc:"A compact stamina charm."},
  {id:"satchel",name:"Backpack Expansion",effect:"backpack",materials:[0,5,1,3],coins:6,desc:"Sew another eight slots onto your backpack. Maximum two expansions."},
  {id:"greatsword",name:"Ember Greatsword",output:"iron_sword",shop:"warrior",materials:[0,2,5,2],coins:4,desc:"High damage and stronger Warrior Specialty attacks."},
  {id:"tower",name:"Tower Shield",output:"tower_shield",shop:"warrior",materials:[0,4,4,3],coins:4,desc:"Exceptional defense and blocking power."},
  {id:"ironhands",name:"Iron Gauntlets",output:"iron_gauntlets",shop:"warrior",materials:[0,1,3,2],coins:3,desc:"Power and defense in one compact piece."},
  {id:"staff",name:"Runed Staff",output:"runed_staff",shop:"mage",materials:[0,4,3,3],coins:4,desc:"Greatly amplifies Mage Specialty damage."},
  {id:"hood",name:"Spellweave Hood",output:"spellweave_hood",shop:"mage",materials:[3,1,2,3],coins:4,desc:"Health and Specialty power woven together."},
  {id:"moon",name:"Moon Amulet",output:"moon_amulet",shop:"mage",materials:[2,0,2,4],coins:4,desc:"A tiny but potent magical focus."},
  {id:"rapier",name:"Court Rapier",output:"court_rapier",shop:"noble",materials:[0,1,5,2],coins:4,desc:"A fast Noble weapon with excellent damage."},
  {id:"greaves",name:"Courtly Greaves",output:"courtly_pants",shop:"noble",materials:[3,2,2,2],coins:4,desc:"Graceful armor for defense and speed."},
  {id:"signet",name:"Valley Signet",output:"signet_ring",shop:"noble",materials:[0,0,3,3],coins:4,desc:"A compact seal for health and speed."}
];
const PACK_DEFS={
  good_0:{name:"Food",icon:GOOD_ICON[0],w:1,h:1,stack:5},good_1:{name:"Shelter Goods",icon:GOOD_ICON[1],w:2,h:1,stack:3},good_2:{name:"Status Goods",icon:GOOD_ICON[2],w:1,h:1,stack:4},good_3:{name:"Training Goods",icon:GOOD_ICON[3],w:2,h:1,stack:3},
  material_0:{name:"Fish",icon:MATERIAL_ICON[0],w:1,h:1,stack:5},material_1:{name:"Timber",icon:MATERIAL_ICON[1],w:2,h:1,stack:3},material_2:{name:"Ore",icon:MATERIAL_ICON[2],w:1,h:2,stack:3},material_3:{name:"Monster Parts",icon:MATERIAL_ICON[3],w:1,h:1,stack:4},
  tool_fishing:{name:"Fishing Rod",icon:"⌁",w:1,h:3,stack:1},tool_forestry:{name:"Wood Axe",icon:"⌁",w:2,h:2,stack:1},tool_mining:{name:"Pickaxe",icon:"⚒",w:2,h:2,stack:1},tool_hunting:{name:"Salvage Kit",icon:"✚",w:2,h:1,stack:1}
};
function gearBonuses(){
  const total={health:0,defense:0,power:0,special:0,stamina:0,speed:0,block:0};
  for(const slot of GEAR_SLOTS){const item=player.gearInventory&&player.gearInventory.find(g=>g.uid===player.equippedSlots[slot]);if(!item)continue;const stats=GEAR_DEFS[item.key].stats||{};Object.keys(stats).forEach(k=>total[k]+=stats[k])}
  return total;
}
function backpackEntries(state=player){
  const entries=[],addStacks=(key,quantity,source)=>{const def=PACK_DEFS[key];for(let n=0;n<quantity;n+=def.stack)entries.push({id:key+"_"+n,key,name:def.name,icon:def.icon,w:def.w,h:def.h,qty:Math.min(def.stack,quantity-n),kind:source})};
  state.cargo.forEach((q,i)=>addStacks("good_"+i,q,"good"));state.materials.forEach((q,i)=>addStacks("material_"+i,q,"material"));
  Object.keys(EQUIPMENT).forEach(key=>{if(state.equipment[key]){const def=PACK_DEFS["tool_"+key];entries.push({id:"tool_"+key,key:"tool_"+key,name:def.name,icon:def.icon,w:def.w,h:def.h,qty:1,kind:"tool"})}});
  const equipped=new Set(Object.values(state.equippedSlots||{}));
  (state.gearInventory||[]).forEach(item=>{if(equipped.has(item.uid))return;const def=GEAR_DEFS[item.key];entries.push({id:item.uid,key:item.key,name:def.name,icon:def.icon,w:def.w,h:def.h,qty:1,kind:"gear",uid:item.uid,slot:def.slot})});
  return entries.sort((a,b)=>b.w*b.h-a.w*a.h||b.h-a.h);
}
function packBackpack(state=player){
  const cols=state.backpackCols||8,rows=state.backpackRows||5,grid=Array.from({length:rows},()=>Array(cols).fill(false)),placed=[],overflow=[];
  for(const item of backpackEntries(state)){
    let spot=null;
    for(let y=0;y<=rows-item.h&&!spot;y++)for(let x=0;x<=cols-item.w&&!spot;x++){
      let free=true;for(let yy=0;yy<item.h;yy++)for(let xx=0;xx<item.w;xx++)if(grid[y+yy][x+xx])free=false;
      if(free)spot={x,y};
    }
    if(!spot){overflow.push(item);continue}
    for(let yy=0;yy<item.h;yy++)for(let xx=0;xx<item.w;xx++)grid[spot.y+yy][spot.x+xx]=true;
    placed.push(Object.assign({},item,spot));
  }
  return {cols,rows,placed,overflow,used:placed.reduce((n,i)=>n+i.w*i.h,0),capacity:cols*rows};
}
function inventoryState(changes={}){return Object.assign({},player,{cargo:player.cargo.slice(),materials:player.materials.slice(),equipment:Object.assign({},player.equipment),gearInventory:player.gearInventory.slice(),equippedSlots:Object.assign({},player.equippedSlots)},changes)}
function canAddCargo(index,amount=1){const s=inventoryState();s.cargo[index]+=amount;return packBackpack(s).overflow.length===0}
function canAddMaterial(index,amount=1){const s=inventoryState();s.materials[index]+=amount;return packBackpack(s).overflow.length===0}
function canAcquireTool(key){const s=inventoryState();s.equipment[key]=true;return packBackpack(s).overflow.length===0}
function backpackUsed(){const packed=packBackpack();return packed.used}
function findGear(uid){return player.gearInventory.find(item=>item.uid===uid)}
const CLASS_STARTER_LOADOUT={
  warrior:{weapon:"simple_sword",shield:"wood_shield"},
  mage:{weapon:"apprentice_wand"},
  noble:{weapon:"court_rapier"}
};
function nextGearUid(){
  player.gearInventory=Array.isArray(player.gearInventory)?player.gearInventory:[];
  let n=Number.isFinite(player.nextItemUid)?Math.max(1,Math.floor(player.nextItemUid)):1;
  const used=new Set(player.gearInventory.map(g=>String(g&&g.uid)));
  while(used.has("gear_"+n))n++;
  player.nextItemUid=n+1;
  return "gear_"+n;
}
function grantStarterEquipment(force=false){
  const loadout=selectedClass&&CLASS_STARTER_LOADOUT[selectedClass];if(!loadout)return false;
  player.gearInventory=Array.isArray(player.gearInventory)?player.gearInventory:[];
  player.equippedSlots=Object.assign({helmet:null,shield:null,weapon:null,gauntlets:null,pants:null,amulet:null,ring:null},player.equippedSlots||{});
  let changed=false;
  const seen=new Set();
  for(const g of player.gearInventory){if(!g.uid||seen.has(String(g.uid))){g.uid=nextGearUid();changed=true}seen.add(String(g.uid))}
  for(const [slot,key] of Object.entries(loadout)){
    const current=findGear(player.equippedSlots[slot]);
    if(current&&(!force||current.key===key))continue;
    let item=player.gearInventory.find(g=>g&&g.key===key);
    if(!item){item={uid:nextGearUid(),key,craftedDay:dayNo,starter:true};player.gearInventory.push(item);changed=true}
    if(player.equippedSlots[slot]!==item.uid){player.equippedSlots[slot]=item.uid;changed=true}
  }
  player.starterLoadoutVersion=1;
  player.maxHp=mods().maxHp;
  player.hp=clamp(Number.isFinite(player.hp)?player.hp:player.maxHp,1,player.maxHp);
  if(changed){updateUI();saveGame(true)}
  return changed;
}
function playerHasShield(){const uid=player.equippedSlots&&player.equippedSlots.shield;return !!(uid&&findGear(uid))}
function equipGear(uid){
  const item=findGear(uid);if(!item)return;const def=GEAR_DEFS[item.key],next=Object.assign({},player.equippedSlots,{[def.slot]:uid}),s=inventoryState({equippedSlots:next});
  if(packBackpack(s).overflow.length){toast("The item currently in that slot will not fit back into your backpack.");return}
  const oldMax=player.maxHp,previous=findGear(player.equippedSlots[def.slot]);
  player.equippedSlots=next;player.maxHp=mods().maxHp;player.hp=Math.min(player.maxHp,player.hp+Math.max(0,player.maxHp-oldMax));renderInventory();updateUI();
  toast("Equipped "+def.name+(previous?"; "+GEAR_DEFS[previous.key].name+" moved to your backpack.":"."));saveGame(true);
}
function unequipGear(slot){
  const uid=player.equippedSlots[slot];if(!uid)return;const next=Object.assign({},player.equippedSlots,{[slot]:null}),s=inventoryState({equippedSlots:next});
  if(packBackpack(s).overflow.length){toast("Your backpack has no room for that "+slot+".");return}
  const item=findGear(uid);
  player.equippedSlots=next;player.maxHp=mods().maxHp;player.hp=Math.min(player.hp,player.maxHp);renderInventory();updateUI();
  toast((item?GEAR_DEFS[item.key].name:"Item")+" moved to your backpack.");saveGame(true);
}
function recipeShopOpen(recipe){return !recipe.shop||(selectedClass===recipe.shop&&scene==="shop"&&currentShop&&currentShop.specialty===recipe.shop)}
function recipeAffordable(recipe){return player.coins>=recipe.coins&&recipe.materials.every((q,i)=>player.materials[i]>=q)}
function recipePreview(recipe){
  const s=inventoryState();recipe.materials.forEach((q,i)=>s.materials[i]-=q);
  if(recipe.effect==="backpack")s.backpackRows=Math.min(7,s.backpackRows+1);
  if(recipe.output)s.gearInventory.push({uid:"preview",key:recipe.output});
  return s;
}
function canCraftRecipe(recipe){
  if(!recipeShopOpen(recipe)||!recipeAffordable(recipe))return false;
  if(recipe.effect==="backpack"&&player.backpackRows>=7)return false;
  return packBackpack(recipePreview(recipe)).overflow.length===0;
}
function recipeCost(recipe){
  const parts=[];recipe.materials.forEach((q,i)=>{if(q)parts.push(q+" "+MATERIALS[i])});if(recipe.coins)parts.push(recipe.coins+" coins");return parts.join(" · ");
}
function craftRecipe(id){
  const recipe=CRAFT_RECIPES.find(r=>r.id===id);if(!recipe)return;
  if(recipe.shop&&selectedClass!==recipe.shop){toast("Only a "+recipe.shop+" can craft and use this Specialty equipment.");return}
  if(!recipeShopOpen(recipe)){toast("This item must be made inside a "+SPECIALTY_BUILDING[recipe.shop]+" shop.");return}
  if(!recipeAffordable(recipe)){toast("You do not have the required crafting materials.");return}
  if(!canCraftRecipe(recipe)){toast(recipe.effect==="backpack"?"Your backpack is already fully expanded.":"The crafted item will not fit in your backpack.");return}
  recipe.materials.forEach((q,i)=>player.materials[i]-=q);player.coins-=recipe.coins;
  if(recipe.effect==="backpack")player.backpackRows++;
  if(recipe.output)player.gearInventory.push({uid:"gear_"+(player.nextItemUid++),key:recipe.output,craftedDay:dayNo});
  gainPlayerXP(3,"crafting");toast("Crafted "+recipe.name+".");renderCrafting();updateUI();saveGame(true);
}
function renderCrafting(){
  const wrap=document.getElementById("craftingContent");wrap.innerHTML="";
  document.getElementById("craftingLead").textContent=scene==="shop"&&currentShop?"You are crafting inside "+currentShop.name+". Its "+currentShop.specialty+" recipes are available.":"General recipes can be made anywhere. Enter a Watchpost, Academy Annex, or Civic Court for Specialty gear.";
  CRAFT_RECIPES.forEach(recipe=>{
    const def=recipe.output&&GEAR_DEFS[recipe.output],card=document.createElement("div");card.className="recipeCard"+(recipe.shop?" specialty":"")+(recipeShopOpen(recipe)?"":" locked");
    const shop=recipe.shop?'<div class="shopBadge">'+CLASS_ICON[recipe.shop]+' '+recipe.shop+' shop only</div>':'';
    card.innerHTML=shop+'<h3>'+(def?def.icon+" ":"▦ ")+recipe.name+'</h3><div class="recipeMeta">'+recipe.desc+(def?'<br>Size '+def.w+'×'+def.h+' · '+def.slot+' slot':'')+'</div><div class="recipeCost">'+recipeCost(recipe)+'</div>';
    const btn=document.createElement("button");btn.className="uibtn";btn.textContent=recipe.shop&&selectedClass!==recipe.shop?"Requires "+recipe.shop:!recipeShopOpen(recipe)?"Visit shop":recipe.effect==="backpack"&&player.backpackRows>=7?"Fully expanded":canCraftRecipe(recipe)?"Craft":"Missing materials / space";btn.disabled=!canCraftRecipe(recipe);btn.addEventListener("click",()=>craftRecipe(recipe.id));card.appendChild(btn);wrap.appendChild(card);
  });
}
const JOB_SKILL={warrior:"fishing",mage:"mining",noble:"hunting",builder:"forestry"};
function xpNeeded(level){return 8+level*4}
function availablePoints(){return player.specialtyPoints||0}
function entityHasEquipment(entity,key){return !!(entity.equipment&&entity.equipment[key])}
function lifeRank(entity,key){return entity.lifeSkills&&entity.lifeSkills[key]||0}
function gainPlayerXP(amount,reason=""){
  player.xp+=amount;
  let leveled=false;
  while(player.xp>=xpNeeded(player.level)){
    player.xp-=xpNeeded(player.level);player.level++;player.specialtyPoints++;player.skillPoints++;leveled=true;
  }
  if(leveled)toast("Level "+player.level+"! You earned a Specialty point and a Skills point"+(reason?" from "+reason:"")+".");
}
function autoSpendAgentSpecialty(a){
  if(a.combatClass==="peasant")return;
  const tree=SKILLS[a.combatClass];
  while(a.specialtyPoints>0){
    const choices=[];
    for(let t=0;t<3;t++)for(let offset=0;offset<3;offset++){
      const b=(a.id+offset)%3,key=b+","+t;
      if(!a.specialtyPurchased.has(key)&&(t===0||a.specialtyPurchased.has(b+","+(t-1))))choices.push(key);
    }
    if(!choices.length)break;
    a.specialtyPurchased.add(choices[0]);a.specialtyPoints--;
  }
  const tough=a.specialtyPurchased.has("1,0")?3:0;
  a.guardMaxHp=4+Math.floor((a.level-1)/2)+tough;a.guardHp=Math.min(a.guardMaxHp,Math.max(a.guardHp,4));
}
function autoSpendAgentSkill(a,key){
  if(!entityHasEquipment(a,key))return;
  while(a.skillPoints>0&&lifeRank(a,key)<3){a.lifeSkills[key]++;a.skillPoints--}
}
function gainAgentXP(a,amount){
  a.xp+=amount;
  while(a.xp>=xpNeeded(a.level)){
    a.xp-=xpNeeded(a.level);a.level++;a.specialtyPoints++;a.skillPoints++;
    a.remember("I reached level "+a.level+" through work and danger");
  }
  autoSpendAgentSpecialty(a);autoSpendAgentSkill(a,JOB_SKILL[a.cls]);
}
function townHasFacility(town,key){return town.building===key||(town.facilities||[]).includes(key)}
function townSpecialty(town,a=null){
  if(a&&a.ageGroup==="child")return "peasant";
  const facilities=(town.facilities||[]).concat(town.building?[town.building]:[]);
  const available=Object.keys(SPECIALTY_BUILDING).filter(cls=>facilities.includes(SPECIALTY_BUILDING[cls]));
  return available.length?available[(a?a.id:0)%available.length]:"peasant";
}
function updateAgentSpecialization(a,announce=false){
  const next=townSpecialty(a.town,a),changed=a.combatClass!==next;
  if(!changed)return false;
  a.specialtyPoints+=(a.specialtyPurchased&&a.specialtyPurchased.size)||0;a.combatClass=next;a.specialtyPurchased=new Set();
  if(next==="peasant")a.remember("I am a Peasant until my town builds a place where I can specialize");
  else a.remember("I specialized as a "+next+" at the "+BUILDINGS[SPECIALTY_BUILDING[next]].name);
  autoSpendAgentSpecialty(a);
  if(announce&&next!=="peasant")toast(a.town.name+"'s peasants specialize as "+next+"s.");
  return true;
}
function practiceAgentSkills(a){
  if(a.ageGroup==="child"){gainAgentXP(a,1);return}
  const key=JOB_SKILL[a.cls],tool=EQUIPMENT[key];
  if(!entityHasEquipment(a,key)&&a.wealth>tool.price*1.25){a.wealth-=tool.price;a.equipment[key]=true;a.remember("I bought a "+tool.name+" for my "+a.profession.toLowerCase()+" work")}
  autoSpendAgentSkill(a,key);
  if(key!=="hunting"&&entityHasEquipment(a,key))a.town.materialStock[LIFE_SKILLS[key].material]+=.25+lifeRank(a,key)*.12;
  gainAgentXP(a,2);
}
function agentCombatMods(a){
  const has=(b,t)=>a.specialtyPurchased&&a.specialtyPurchased.has(b+","+t);
  return {damage:1+(has(0,2)?1:0),specialDamage:2+(has(0,2)?2:0),speed:1+(has(2,0)?.15:0),cooldown:has(0,1)?.48:.62,
    specialCd:(a.combatClass==="peasant"?99:SPECIALTY[a.combatClass].cooldown)*(has(0,1)?.7:1),knock:has(1,1)?175:125,thorns:has(1,2)};
}
function agentSpecialtyAttack(a,e){
  if(a.combatClass==="peasant"||a.guardSpecialCd>0)return false;
  const combat=agentCombatMods(a),range=a.combatClass==="mage"?105:a.combatClass==="noble"?52:35;
  if(Math.hypot(e.x-a.x,e.y-a.y)>range)return false;
  a.guardSpecialCd=combat.specialCd;e.hp-=combat.specialDamage;e.hurt=.2;recoilEnemy(e,combat.knock+30,a.x,a.y);screenShake=Math.max(screenShake,3);
  const color=CLASS_COLOR[a.combatClass];
  if(a.combatClass==="warrior")particles.push({scene:"world",ring:true,x:a.x+5,y:a.y+8,r:4,maxR:35,life:.25,color});
  else for(let i=0;i<6;i++)particles.push({scene:"world",x:e.x+5,y:e.y+5,vx:(rand()-.5)*55,vy:(rand()-.5)*55,life:.28,color});
  if(e.hp<=0){defeatEnemy(e,a);a.remember("I defeated a monster with my "+SPECIALTY[a.combatClass].name);worldEnemies=worldEnemies.filter(enemy=>!enemy.dead)}
  return true;
}
function mods(){
  const has=(b,t)=>purchased.has(b+","+t),g=gearBonuses();
  return {range:has(0,0)?1.35:1,specialCd:has(0,1)?.65:1,specialPower:has(0,2),
    maxHp:10+(has(1,0)?3:0)+g.health,knock:has(1,1),thorns:has(1,2),speed:(has(2,0)?1.15:1)*(1+g.speed/100),
    dashCd:has(2,1)?.6:1,dashStrike:has(2,2),attackPower:g.power,specialBonus:g.special,defense:g.defense,maxStamina:100+g.stamina,blockBonus:g.block};
}
const player={
  x:0,y:0,face:{x:0,y:1},speed:70,hp:10,maxHp:10,coins:24,relics:0,cargo:[0,0,0,0],capacity:20,
  materials:[0,0,0,0],materialCapacity:30,
  level:1,xp:0,specialtyPoints:1,skillPoints:1,lifeSkills:{fishing:0,forestry:0,mining:0,hunting:0},
  equipment:{fishing:false,forestry:false,mining:false,hunting:false},
  backpackCols:8,backpackRows:5,gearInventory:[],equippedSlots:{helmet:null,shield:null,weapon:null,gauntlets:null,pants:null,amulet:null,ring:null},nextItemUid:1,
  swing:0,swingHit:false,combo:0,comboWindow:0,attackQueued:0,attackLunge:0,specialCd:0,dashCd:0,dashTime:0,dashHitTargets:null,hurt:0,
  jumpZ:0,jumpV:0,jumpsUsed:0,landingSquash:0,
  moveBlend:0,walkTime:0,moving:false,moveVX:0,moveVY:0,stepDust:0,harvestAnim:0,harvestKind:null,
  stamina:100,guardBroken:0,blockFresh:0,knockTime:0,knockX:0,knockY:0,
  pointerAim:false,pointerX:VW/2,pointerY:VH/2,
  influenceDay:0,escortTime:0,tradeOrigins:[null,null,null,null]
};
const keys={};let blockHeld=false;
function cargoCount(){return player.cargo.reduce((a,b)=>a+b,0)}
function materialCount(){return player.materials.reduce((a,b)=>a+b,0)}
function materialPrice(town,index){
  const factor=town.name==="EGG LANDS"?[1.05,.92,1.18,1.22][index]:[1.30,1.16,.94,1.04][index];
  return Math.max(.35,MATERIAL_BASE_PRICE[index]*factor/(1+town.materialStock[index]/24));
}
function resourceDefinition(tile){
  if(tile===2)return {index:0,skill:"fishing",name:"fish",verb:"fish",required:1,cooldown:1};
  if(tile===1)return {index:1,skill:"forestry",name:"log",plural:"logs",verb:"chop tree",required:2,cooldown:3};
  if(tile===4)return {index:2,skill:"mining",name:"stone",plural:"stone",verb:"break rock",required:3,cooldown:4};
  return null;
}
function refreshDepletedResourceTerrain(){
  let changed=false;
  for(const [key,state] of [...resourceState.entries()]){
    if(state.originalTile!==1&&state.originalTile!==4)continue;
    const [x,y]=key.split(",").map(Number);if(!tiles[y]||tiles[y][x]==null)continue;
    if(dayNo>=state.readyDay){tiles[y][x]=state.originalTile;solid.add(key);resourceState.delete(key);changed=true}
    else{const depletedTile=state.originalTile===1?9:10;if(tiles[y][x]!==depletedTile){tiles[y][x]=depletedTile;changed=true}solid.delete(key)}
  }
  return changed;
}
function findGatherTarget(){
  if(scene!=="world")return null;
  const px=Math.floor((player.x+8)/TILE),py=Math.floor((player.y+8)/TILE);
  if(gatherLockKey){
    const parts=gatherLockKey.split(","),x=Number(parts[0]),y=Number(parts[1]),def=resourceDefinition(tiles[y]&&tiles[y][x]);
    const d=Math.hypot(x*TILE+8-(player.x+8),y*TILE+8-(player.y+8)),state=resourceState.get(gatherLockKey)||{hits:0,readyDay:0};
    if(def&&d<35&&state.hits>0)return {x,y,key:gatherLockKey,state,def,distance:d,ready:dayNo>=state.readyDay};
    gatherLockKey=null;
  }
  let best=null,bestScore=Infinity;
  for(let y=py-2;y<=py+2;y++)for(let x=px-2;x<=px+2;x++){
    if(x<0||y<0||x>=MW||y>=MH)continue;
    const def=resourceDefinition(tiles[y][x]);if(!def)continue;
    const d=Math.hypot(x*TILE+8-(player.x+8),y*TILE+8-(player.y+8));
    if(d<35){
      const key=keyOf(x,y),state=resourceState.get(key)||{hits:0,readyDay:0};
      const dx=x*TILE+8-(player.x+8),dy=y*TILE+8-(player.y+8),facing=(player.face.x*dx+player.face.y*dy)/Math.max(1,d);
      const ready=dayNo>=state.readyDay,score=d-facing*10+(ready?0:100);
      if(score<bestScore){best={x,y,key,state,def,distance:d,ready};bestScore=score}
    }
  }
  return best;
}
function gatherNearby(){
  const target=findGatherTarget();
  if(!target){toast("Find water, a tree, or a mountain face to gather from.");return false}
  const skill=target.def.skill,tool=EQUIPMENT[skill];
  if(!entityHasEquipment(player,skill)){toast("You need a "+tool.name+". Buy one at either town market.");return true}
  if(!target.ready){toast("This "+target.def.name+" source recovers on day "+target.state.readyDay+".");return true}
  if(!canAddMaterial(target.def.index,1)){toast("Your backpack has no space shaped for more "+target.def.name+".");return true}
  target.state.hits++;
  gatherLockKey=target.key;
  resourceState.set(target.key,target.state);
  const cx=target.x*TILE+8,cy=target.y*TILE+8;
  const faceDx=cx-(player.x+5),faceDy=cy-(player.y+8),faceDistance=Math.max(1,Math.hypot(faceDx,faceDy));player.face={x:faceDx/faceDistance,y:faceDy/faceDistance};player.pointerAim=false;player.harvestAnim=.30;player.harvestKind=skill;
  playSfx(skill==="forestry"?"chop":skill==="mining"?"mine":"harvest");
  for(let i=0;i<5;i++)particles.push({scene:"world",x:cx,y:cy,vx:(rand()-.5)*42,vy:(rand()-.5)*42,life:.28,color:["#83b9d7","#8e6842","#b8b7b1"][target.def.index]});
  screenShake=Math.max(screenShake,target.def.index===2?3:1);
  const rank=lifeRank(player,skill),required=Math.max(1,target.def.required-(rank>=1?1:0));
  if(target.state.hits<required){
    toast((target.def.index===1?"Chopping":"Mining")+" "+target.state.hits+"/"+required+"…");return true;
  }
  const amount=(target.def.index===0?1+(rand()<.35?1:0):2+Math.floor(rand()*2))+(rank>=2?1:0);
  let gained=0;while(gained<amount&&canAddMaterial(target.def.index,gained+1))gained++;
  if(gained<=0){toast("Your backpack cannot fit the gathered stack.");return true}
  player.materials[target.def.index]+=gained;target.state.hits=0;target.state.readyDay=dayNo+Math.max(1,target.def.cooldown-(rank>=3?1:0));gatherLockKey=null;
  if(target.def.index===1||target.def.index===2){target.state.originalTile=tiles[target.y][target.x];tiles[target.y][target.x]=target.def.index===1?9:10;solid.delete(target.key);paintWorld()}
  const depletedNode=Object.values(resourceNodes).find(n=>n.index===target.def.index&&Math.hypot(n.x-cx,n.y-cy)<90);
  if(depletedNode)depletedNode.stock=Math.max(0,depletedNode.stock-gained);
  resourceState.set(target.key,target.state);quest.gathered=true;
  gainPlayerXP(2+gained,"gathering");
  const gatheredName=gained===1?target.def.name:(target.def.plural||target.def.name);toast("Gathered "+gained+" "+gatheredName+". "+(target.def.index===0?"This fishing spot recovers on day "+target.state.readyDay+".":"The "+(target.def.index===1?"tree":"rock")+" is gone until day "+target.state.readyDay+"."));
  updateUI();return true;
}
function wantsBlock(){return !!selectedClass&&(keys.c||blockHeld)&&!activePanel&&player.jumpZ<3}
function blocking(){return wantsBlock()&&playerHasShield()&&player.stamina>0&&player.guardBroken<=0}
function startBlock(){
  if(!selectedClass||activePanel)return;
  if(!playerHasShield()){toast("You need a shield equipped to block. Craft a Wood Shield or equip one from your backpack.");return}
  player.blockFresh=.18;
}
function stopBlock(){blockHeld=false}
function updatePointerAim(){
  if(!player.pointerAim)return;
  const dx=camera.x+player.pointerX/worldZoom-(player.x+5),dy=camera.y+player.pointerY/worldZoom-(player.y+8),d=Math.hypot(dx,dy);
  if(d>3)player.face={x:dx/d,y:dy/d};
}
function enemyInBlockArc(e){
  const dx=e.x+5-(player.x+5),dy=e.y+5-(player.y+8),d=Math.max(1,Math.hypot(dx,dy));
  return player.face.x*dx/d+player.face.y*dy/d>-.05;
}
function recoilEnemy(e,strength,fromX=player.x,fromY=player.y){
  const dx=e.x-fromX,dy=e.y-fromY,d=Math.max(1,Math.hypot(dx,dy));
  e.vx=dx/d*strength;e.vy=dy/d*strength;e.knockTime=.20+strength/900;
}
function sceneBlocked(px,py){
  if(scene==="dungeon")return dungeonBlocked(px,py);
  if(scene==="shop")return shopBlocked(px,py);
  const margin=3,points=[[px+margin,py+margin],[px+TILE-margin,py+margin],[px+margin,py+TILE-margin],[px+TILE-margin,py+TILE-margin]];
  return points.some(p=>solid.has(keyOf(Math.floor(p[0]/TILE),Math.floor(p[1]/TILE))));
}
function terrainUnderPlayer(){return scene==="world"?(tiles[Math.floor((player.y+12)/TILE)]?.[Math.floor((player.x+5)/TILE)]??0):0}
function terrainMoveFactor(tile){return tile===5||tile===6?1.08:tile===13 ? .72:tile===3 ? .88:tile===14 ? .91:1}
function tryMove(nx,ny){
  const width=scene==="world"?MW:scene==="dungeon"?DW:SW,height=scene==="world"?MH:scene==="dungeon"?DH:SH;
  const maxX=width*TILE-TILE,maxY=height*TILE-TILE;
  nx=clamp(nx,0,maxX);ny=clamp(ny,0,maxY);
  if(!sceneBlocked(nx,player.y))player.x=nx;
  if(!sceneBlocked(player.x,ny))player.y=ny;
}
function currentEnemies(){return scene==="world"?worldEnemies:scene==="dungeon"?dungeonEnemies:[]}
function setCurrentEnemies(list){if(scene==="world")worldEnemies=list;else if(scene==="dungeon")dungeonEnemies=list}
function spawnEnemy(type,x,y,inDungeon=false){
  const specs={
    rat:{hp:1,speed:32,damage:1,color:"#6d5b4b"},
    "cave rat":{hp:2,speed:34,damage:1,color:"#85705e"},
    shade:{hp:3,speed:26,damage:1,color:"#716783"},
    warden:{hp:10,speed:22,damage:2,color:"#aa7443"}
  };
  const s=specs[type]||specs.rat;
  const e={type,x,y,hp:s.hp,maxHp:s.hp,speed:s.speed,damage:s.damage,color:s.color,vx:0,vy:0,wander:0,biteCd:0,attackWindup:0,hurt:0,knockTime:0,dead:false};
  (inDungeon?dungeonEnemies:worldEnemies).push(e);return e;
}
function enemyWalkable(e,nx,ny){
  const width=scene==="world"?MW:DW,height=scene==="world"?MH:DH,x=clamp(nx,0,width*TILE-TILE),y=clamp(ny,0,height*TILE-TILE);
  return !sceneBlocked(x,y);
}
function damageEnemiesWhere(predicate,amount,impact=null){
  const survivors=[];let hits=0;
  for(const e of currentEnemies()){
    if(predicate(e)){
      hits++;
      e.hp-=amount;e.hurt=.16;
      if(impact)recoilEnemy(e,impact.strength||85,impact.x,impact.y);
      screenShake=Math.max(screenShake,impact&&impact.shake||2);
    }
    if(e.hp<=0)defeatEnemy(e,"player");else survivors.push(e);
  }
  setCurrentEnemies(survivors);
  return hits;
}
function defeatEnemy(e,source="player"){
  if(e.dead)return;e.dead=true;playSfx("defeat");
  if(source==="player"){
    kills++;player.coins+=e.type==="warden"?8:1;
    const hunt=lifeRank(player,"hunting");
    if(scene==="world")roadSafety=clamp(roadSafety+(selectedClass==="warrior"?5:3)+(hunt>=2?2:0),0,100);
    if(entityHasEquipment(player,"hunting")){
      const possible=({rat:1,"cave rat":1,shade:2,warden:5}[e.type]||1)+(hunt>=1?1:0)+(hunt>=3&&e.type==="warden"?2:0);
      let parts=0;while(parts<possible&&canAddMaterial(3,parts+1))parts++;
      if(parts>0){player.materials[3]+=parts;quest.gathered=true;if(e.type!=="warden")toast("Recovered "+parts+" monster "+(parts===1?"part":"parts")+".")}
    }else if(e.type!=="warden")toast("The monster leaves salvage, but you need a Salvage Kit to recover it.");
    gainPlayerXP(e.type==="warden"?16:4,"combat");
  }else if(source instanceof Agent){
    roadSafety=clamp(roadSafety+2+(lifeRank(source,"hunting")>=2?2:0),0,100);
    const town=towns.reduce((a,b)=>Math.hypot(a.cx-e.x,a.cy-e.y)<Math.hypot(b.cx-e.x,b.cy-e.y)?a:b);
    if(entityHasEquipment(source,"hunting"))town.materialStock[3]+=1+(lifeRank(source,"hunting")>=1?1:0);
    gainAgentXP(source,e.type==="warden"?16:4);
  }
  if(e.type==="warden"){dungeon.wardenDead=true;for(const town of towns)recordVillageEvent(town,"VICTORY","The Iron Warden falls and the Heart Vault is unsealed.",{emotion:"awe",salience:10});toast("The Iron Warden falls. The Heart Vault is unsealed.")}
  for(let i=0;i<7;i++)particles.push({scene,x:e.x+5,y:e.y+5,vx:(rand()-.5)*60,vy:(rand()-.5)*60,life:.4,color:e.color});
  updateUI();
}
function attackDurationFor(cls,combo){
  if(cls==="mage")return combo===3?.32:combo===2?.20:.18;
  if(cls==="noble")return combo===3?.25:.17;
  return combo===3?.32:.23;
}
function spawnArcaneBolt(angle,options={}){
  const speed=options.speed||220,x=options.x??player.x+5,y=options.y??player.y+7;
  bolts.push({scene,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:options.life||.82,damage:options.damage||1,kind:options.kind||"spark",homing:options.homing||0,blastRadius:options.blastRadius||0,pierces:options.pierces||0,hitTargets:new Set()});
}
function pointSegmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,lengthSq=dx*dx+dy*dy,t=clamp(((px-ax)*dx+(py-ay)*dy)/Math.max(1,lengthSq),0,1),x=ax+dx*t,y=ay+dy*t;return {distance:Math.hypot(px-x,py-y),t}}
function arcaneBurst(x,y,radius,color="#8fb5ff"){
  particles.push({scene,ring:true,x,y,r:2,maxR:radius,life:.22,color});for(let i=0;i<7;i++)particles.push({scene,glyph:"spark",x,y,vx:(rand()-.5)*85,vy:(rand()-.5)*85,life:.28,color:i%2?color:"#eadcff"});
}
function beginAttack(){
  player.combo=player.comboWindow>0?player.combo%3+1:1;
  player.comboWindow=selectedClass==="mage"?.82:.68;player.swing=attackDurationFor(selectedClass,player.combo);player.swingHit=false;
  player.attackLunge=selectedClass==="mage"?0:selectedClass==="noble"?(player.combo===3?.15:.09):(player.combo===3?.11:.07);playSfx(selectedClass==="mage"?"cast":"swing");
  if(selectedClass==="mage")particles.push({scene,ring:true,x:player.x+5+player.face.x*7,y:player.y+7+player.face.y*7,r:2,maxR:7+player.combo*2,life:.18,color:player.combo===3?"#d9b7ff":"#85b9ff"});
}
function attack(){
  if(!selectedClass||activePanel)return;
  if(player.swing>0){player.attackQueued=.42;return}
  beginAttack();
}
function jump(){
  if(!selectedClass||activePanel||player.jumpsUsed>=2)return;
  player.jumpV=player.jumpsUsed===0?155:142;player.jumpZ=Math.max(2,player.jumpZ);player.jumpsUsed++;player.landingSquash=0;blockHeld=false;playSfx("jump");
  for(let i=0;i<5;i++)particles.push({scene,x:player.x+5,y:player.y+13,vx:(rand()-.5)*42,vy:10+rand()*22,life:.24,color:player.jumpsUsed===2?"#f0c969":"#a7d9e8"});
  if(player.jumpsUsed===2){particles.push({scene,ring:true,x:player.x+5,y:player.y+11,r:3,maxR:18,life:.20,color:"#f0c969"});screenShake=Math.max(screenShake,2)}
}
function dash(){
  if(!selectedClass||activePanel||player.dashCd>0||player.dashTime>0)return;
  player.dashTime=.16;player.dashCd=1.45*mods().dashCd;player.dashHitTargets=new Set();playSfx(selectedClass==="mage"?"cast":"dash");
  if(selectedClass==="mage")arcaneBurst(player.x+5,player.y+8,purchased.has("2,2")?18:11,"#8cbcff");
}
function specialty(){
  if(!selectedClass||activePanel||player.specialCd>0)return;
  const m=mods();player.specialCd=SPECIALTY[selectedClass].cooldown*m.specialCd;playSfx("skill");
  if(selectedClass==="warrior"){
    const radius=m.specialPower?48:32,damage=(m.specialPower?4:2)+m.specialBonus;
    damageEnemiesWhere(e=>Math.hypot(e.x-player.x,e.y-player.y)<radius,damage,{x:player.x,y:player.y,strength:m.specialPower?205:150,shake:m.specialPower?8:5});
    particles.push({scene,ring:true,x:player.x+5,y:player.y+8,r:5,maxR:radius,life:.32,color:"#eadfc7"});
    if(m.specialPower){particles.push({scene,ring:true,x:player.x+5,y:player.y+8,r:10,maxR:radius+15,life:.42,color:"#d89b4a"});for(let i=0;i<12;i++)particles.push({scene,x:player.x+5,y:player.y+9,vx:Math.cos(i*Math.PI/6)*(55+rand()*45),vy:Math.sin(i*Math.PI/6)*(55+rand()*45),life:.34,color:"#a9743d"})}
  }else if(selectedClass==="mage"){
    const base=Math.atan2(player.face.y,player.face.x);if(m.specialPower){for(const offset of [-.20,0,.20])spawnArcaneBolt(base+offset,{kind:"star",speed:235,life:1.35,damage:2+m.specialBonus,homing:.16,blastRadius:15,pierces:1});arcaneBurst(player.x+5,player.y+7,24,"#c998ff")}else{spawnArcaneBolt(base,{kind:"orb",speed:185,life:1.25,damage:2+m.specialBonus,homing:.14,blastRadius:25});arcaneBurst(player.x+5,player.y+7,15,"#84b8ff")}
  }else{
    const start={x:player.x+5,y:player.y+8},length=m.specialPower?88:56;
    for(let i=1;i<=10;i++){
      tryMove(start.x-5+player.face.x*length*i/10,start.y-8+player.face.y*length*i/10);
    }
    const end={x:player.x+5,y:player.y+8},width=m.specialPower?17:12;
    damageEnemiesWhere(e=>pointSegmentDistance(e.x+5,e.y+7,start.x,start.y,end.x,end.y).distance<width,(m.specialPower?4:2)+m.specialBonus,{x:start.x,y:start.y,strength:m.specialPower?170:125,shake:m.specialPower?7:4});
    for(let i=0;i<10;i++)particles.push({scene,glyph:"slash",x:start.x+(end.x-start.x)*i/9,y:start.y+(end.y-start.y)*i/9,vx:(rand()-.5)*18,vy:(rand()-.5)*18,life:.22,color:m.specialPower?"#f1d27a":"#e7e7e7"});
  }
}
function classInfluence(){
  if(!selectedClass||activePanel)return;
  if(player.influenceDay>=dayNo){toast("Your influence is spent until tomorrow.");return}
  if(scene!=="world"){toast("Your civic influence cannot reach the valley from this deep.");return}
  const town=nearestTown();
  if(selectedClass==="warrior"){
    roadSafety=clamp(roadSafety+14,0,100);toast("You organize patrols. Road safety rises.");
  }else if(selectedClass==="mage"){
    const low=town.market.inventory.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v)[0];
    town.market.inventory[low.i]+=4;town.market.prices[low.i]*=.94;
    toast("You conjure 4 "+GOODS[low.i]+" for "+town.name+".");
  }else{
    const sent=scheduleCaravan(true);
    if(!sent){roadSafety=clamp(roadSafety+5,0,100);toast("The charter finds no profitable cargo; its guards patrol instead.")}
    else toast("A protected royal caravan departs under your seal.");
  }
  player.influenceDay=dayNo;updateUI();
}
function stepPlayer(dt){
  if(!selectedClass||activePanel)return;
  const m=mods(),oldX=player.x,oldY=player.y;
  player.swing=Math.max(0,player.swing-dt);player.comboWindow=Math.max(0,player.comboWindow-dt);player.attackQueued=Math.max(0,player.attackQueued-dt);player.attackLunge=Math.max(0,player.attackLunge-dt);
  player.specialCd=Math.max(0,player.specialCd-dt);player.dashCd=Math.max(0,player.dashCd-dt);
  player.hurt=Math.max(0,player.hurt-dt);player.blockFresh=Math.max(0,player.blockFresh-dt);
  player.guardBroken=Math.max(0,player.guardBroken-dt);player.knockTime=Math.max(0,player.knockTime-dt);
  player.landingSquash=Math.max(0,player.landingSquash-dt);player.harvestAnim=Math.max(0,(player.harvestAnim||0)-dt);
  if(player.jumpZ>0||player.jumpV>0){
    player.jumpV-=420*dt;player.jumpZ+=player.jumpV*dt;
    if(player.jumpZ<=0){player.jumpZ=0;player.jumpV=0;player.jumpsUsed=0;player.landingSquash=.12;particles.push({scene,ring:true,x:player.x+5,y:player.y+12,r:3,maxR:17,life:.18,color:"#a7d9e8"});screenShake=Math.max(screenShake,2);playSfx("land")}
  }
  if(wantsBlock()&&player.guardBroken<=0){
    player.stamina=Math.max(0,player.stamina-dt*10);
    if(player.stamina<=0){player.guardBroken=.8;screenShake=5;toast("Your guard breaks!")}
  }else player.stamina=Math.min(m.maxStamina,player.stamina+dt*30);
  updatePointerAim();
  if(player.knockTime>0){
    tryMove(player.x+player.knockX*dt,player.y+player.knockY*dt);
    player.knockX*=Math.pow(.02,dt);player.knockY*=Math.pow(.02,dt);
  }else if(player.dashTime>0){
    player.dashTime-=dt;tryMove(player.x+player.face.x*275*dt,player.y+player.face.y*275*dt);
    if(selectedClass==="mage"&&rand()<dt*40)particles.push({scene,glyph:"spark",x:player.x+5-player.face.x*5,y:player.y+8-player.face.y*5,vx:-player.face.x*45+(rand()-.5)*18,vy:-player.face.y*45+(rand()-.5)*18,life:.20,color:"#8cbcff"});
    if(m.dashStrike){player.dashHitTargets=player.dashHitTargets||new Set();const radius=selectedClass==="mage"?19:14,targets=currentEnemies().filter(e=>!player.dashHitTargets.has(e)&&Math.hypot(e.x-player.x,e.y-player.y)<radius);targets.forEach(e=>player.dashHitTargets.add(e));if(targets.length){damageEnemiesWhere(e=>targets.includes(e),1,{x:player.x-player.face.x*12,y:player.y-player.face.y*12,strength:selectedClass==="warrior"?125:95,shake:2});if(selectedClass==="mage")arcaneBurst(player.x+5,player.y+8,16,"#8cbcff")}}
  }else{
    let vx=0,vy=0;
    if(keys.ArrowLeft||keys.a)vx--;if(keys.ArrowRight||keys.d)vx++;
    if(keys.ArrowUp||keys.w)vy--;if(keys.ArrowDown||keys.s)vy++;
    if(vx||vy){
      const n=Math.hypot(vx,vy);vx/=n;vy/=n;
      if(!player.pointerAim)player.face={x:vx,y:vy};
    }
    const terrain=terrainUnderPlayer(),speed=player.speed*m.speed*(blocking()?.38:1)*(player.jumpZ>0?1.08:1)*terrainMoveFactor(terrain),response=1-Math.exp(-dt*((vx||vy)?20:25));
    player.moveVX+=(vx*speed-player.moveVX)*response;player.moveVY+=(vy*speed-player.moveVY)*response;
    tryMove(player.x+player.moveVX*dt,player.y+player.moveVY*dt);
  }
  if(player.attackLunge>0&&!blocking())tryMove(player.x+player.face.x*(selectedClass==="noble"?(player.combo===3?105:76):(player.combo===3?78:56))*dt,player.y+player.face.y*(selectedClass==="noble"?(player.combo===3?105:76):(player.combo===3?78:56))*dt);
  const attackDuration=attackDurationFor(selectedClass,player.combo),attackProgress=player.swing>0?1-player.swing/attackDuration:1;
  if(player.swing>0&&!player.swingHit&&attackProgress>=.27){
    if(selectedClass==="mage"){
      const base=Math.atan2(player.face.y,player.face.x),spellthread=purchased.has("0,0"),seeking=spellthread?.09:0,life=spellthread?1.05:.78;
      if(player.combo===2){spawnArcaneBolt(base-.10,{kind:"spark",life,damage:.7+m.attackPower*.5,homing:seeking});spawnArcaneBolt(base+.10,{kind:"spark",life,damage:.7+m.attackPower*.5,homing:seeking})}
      else if(player.combo===3)spawnArcaneBolt(base,{kind:"orb",speed:205,life:life+.18,damage:2+m.attackPower,homing:seeking+.04,blastRadius:18});
      else spawnArcaneBolt(base,{kind:"spark",life,damage:1+m.attackPower,homing:seeking});
    }else{
      const noble=selectedClass==="noble",range=(noble?34+player.combo*4:27+player.combo*3)*m.range,arc=noble?(player.combo===3?.86:.78):(player.combo===2?.30:.50),damage=(player.combo===3?2:1)+m.attackPower;
      const hit=e=>{const dx=e.x+5-(player.x+5),dy=e.y+5-(player.y+8),d=Math.max(1,Math.hypot(dx,dy));return d<range&&player.face.x*dx/d+player.face.y*dy/d>arc};
      const hits=damageEnemiesWhere(hit,damage,{x:player.x+5,y:player.y+8,strength:noble?(player.combo===3?135:78):(player.combo===3?175:110),shake:player.combo===3?6:3});
      if(hits>0){playSfx("hit");hitStop=Math.max(hitStop,player.combo===3?.075:.04);screenShake=Math.max(screenShake,player.combo===3?7:4);const impactX=player.x+player.face.x*range,impactY=player.y+player.face.y*range;for(let i=0;i<4;i++)particles.push({scene,glyph:noble?"slash":null,x:impactX,y:impactY,vx:(rand()-.5)*45,vy:(rand()-.5)*45,life:.22,color:noble?"#f2d488":"#eadfc7"})}
    }
    player.swingHit=true;
  }
  if(player.swing<=0&&player.attackQueued>0){player.attackQueued=0;beginAttack()}
  const moved=Math.hypot(player.x-oldX,player.y-oldY),moving=moved>.025,response=1-Math.exp(-dt*15);
  player.moving=moving;player.moveBlend+=(Number(moving)-player.moveBlend)*response;if(moving)player.walkTime+=moved*.42;
  player.stepDust=Math.max(0,(player.stepDust||0)-dt);if(moving&&player.jumpZ<=0&&player.stepDust<=0){const terrain=terrainUnderPlayer(),colors={3:"#c4ac77",5:"#9c7d50",11:"#54734b",13:"#50675d",14:"#80705f",15:"#898258"};if(colors[terrain])for(let i=0;i<2;i++)particles.push({scene,x:player.x+5+(rand()-.5)*6,y:player.y+14,vx:(rand()-.5)*18,vy:-4-rand()*8,life:.20,color:colors[terrain]});player.stepDust=.18}
}
function stepBolts(dt){
  const keep=[];
  for(const b of bolts){
    if(b.scene!==scene){keep.push(b);continue}
    b.life-=dt;b.hitTargets=b.hitTargets||new Set();
    if(b.homing>0){let target=null,best=110;for(const e of currentEnemies()){if(b.hitTargets.has(e))continue;const d=Math.hypot(e.x+5-b.x,e.y+6-b.y);if(d<best){best=d;target=e}}if(target){const speed=Math.hypot(b.vx,b.vy),tx=(target.x+5-b.x)/Math.max(1,best),ty=(target.y+6-b.y)/Math.max(1,best),turn=1-Math.exp(-dt*(4+b.homing*30));b.vx+=(tx*speed-b.vx)*turn;b.vy+=(ty*speed-b.vy)*turn}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(rand()<dt*42)particles.push({scene,glyph:"spark",x:b.x,y:b.y,vx:-b.vx*.08+(rand()-.5)*18,vy:-b.vy*.08+(rand()-.5)*18,life:.18,color:b.kind==="star"?"#d6a6ff":"#83bfff"});
    if(b.life<=0||sceneBlocked(b.x,b.y)){if(b.blastRadius)arcaneBurst(b.x,b.y,Math.min(12,b.blastRadius),b.kind==="star"?"#d6a6ff":"#83bfff");continue}
    const hit=currentEnemies().find(e=>!b.hitTargets.has(e)&&Math.hypot(e.x+5-b.x,e.y+6-b.y)<10);if(!hit){keep.push(b);continue}
    const victims=currentEnemies().filter(e=>e===hit||(b.blastRadius&&Math.hypot(e.x+5-b.x,e.y+6-b.y)<b.blastRadius));victims.forEach(e=>b.hitTargets.add(e));
    damageEnemiesWhere(e=>victims.includes(e),b.damage,{x:b.x-b.vx*.03,y:b.y-b.vy*.03,strength:b.kind==="orb"?155:115,shake:b.blastRadius?5:3});playSfx("arcane");arcaneBurst(b.x,b.y,b.blastRadius||10,b.kind==="star"?"#d6a6ff":"#83bfff");
    if(b.pierces>0){b.pierces--;keep.push(b)}
  }
  bolts=keep;
}
function hurtPlayer(amount,source=null){
  if(player.hurt>0)return;
  player.hp-=Math.max(.25,amount-mods().defense*.25);player.hurt=.55;screenShake=Math.max(screenShake,7);playSfx("hurt");
  if(source){
    const dx=player.x-source.x,dy=player.y-source.y,d=Math.max(1,Math.hypot(dx,dy));
    player.knockX=dx/d*105;player.knockY=dy/d*105;player.knockTime=.18;
  }
  if(player.hp<=0){
    player.coins=Math.max(0,player.coins-5);player.hp=player.maxHp;
    placePlayerAtWorldSpawn();
    toast("You wake beside the road outside Egg Lands, five coins lighter.");
  }
  updateUI();
}
function blockEnemyAttack(e){
  const perfect=player.blockFresh>0;
  if(perfect)player.blockFresh=0;playSfx(perfect?"parry":"block");
  const m=mods(),cost=e.damage*(perfect?8:18)*Math.max(.45,1-m.blockBonus/100);
  player.stamina=Math.max(0,player.stamina-cost);
  recoilEnemy(e,perfect?235+m.blockBonus:(m.knock?185:145)+m.blockBonus,player.x,player.y);
  player.knockX=-player.face.x*(perfect?38:62);player.knockY=-player.face.y*(perfect?38:62);player.knockTime=.10;
  screenShake=Math.max(screenShake,perfect?8:5);
  particles.push({scene,ring:true,x:player.x+5+player.face.x*13,y:player.y+8+player.face.y*13,r:3,maxR:perfect?24:16,life:.22,color:perfect?"#f4d979":"#a7d9e8"});
  if(perfect||m.thorns){
    e.hp-=1;e.hurt=.2;
    if(m.thorns&&selectedClass==="mage")arcaneBurst(e.x+5,e.y+6,14,"#b596ff");
    if(e.hp<=0)defeatEnemy(e,"player");
  }
  if(player.stamina<=0){player.guardBroken=.8;toast("Your guard breaks under the impact!")}
  else if(perfect)toast("Perfect block!");
}
function stepEnemies(dt){
  const list=currentEnemies();
  for(const e of list){
    if(e.dead)continue;
    const winding=e.attackWindup>0;e.biteCd=Math.max(0,e.biteCd-dt);e.attackWindup=Math.max(0,e.attackWindup-dt);e.hurt=Math.max(0,e.hurt-dt);e.wander-=dt;e.knockTime=Math.max(0,e.knockTime-dt);
    let target=player,targetType="player",bestDist=Math.hypot(player.x-e.x,player.y-e.y);
    if(scene==="world"){
      for(const c of caravans){
        const d=Math.hypot(c.x-e.x,c.y-e.y);
        if(d<bestDist*.92){target=c;targetType="caravan";bestDist=d}
      }
      for(const guard of agents){
        if(!guard.isGuard||guard.guardStun>0)continue;
        const d=Math.hypot(guard.x-e.x,guard.y-e.y);
        if(d<bestDist*.9){target=guard;targetType="guard";bestDist=d}
      }
    }
    if(e.knockTime>0){
      e.vx*=Math.pow(.08,dt);e.vy*=Math.pow(.08,dt);
    }else if(e.attackWindup>0){
      e.vx=0;e.vy=0;
    }else if(bestDist<135){
      const n=Math.max(1,bestDist);e.vx=(target.x-e.x)/n*e.speed;e.vy=(target.y-e.y)/n*e.speed;
    }else if(e.wander<=0){
      const angle=rand()*Math.PI*2;e.vx=Math.cos(angle)*e.speed*.55;e.vy=Math.sin(angle)*e.speed*.55;e.wander=.8+rand()*1.4;
    }
    const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;
    if(enemyWalkable(e,nx,e.y))e.x=nx;else e.vx*=-1;
    if(enemyWalkable(e,e.x,ny))e.y=ny;else e.vy*=-1;
    const contact=Math.hypot(target.x-e.x,target.y-e.y);
    if(winding&&e.attackWindup<=0&&contact<16){
      e.biteCd=.85;
      if(targetType==="player"){
        if(player.jumpZ>8){e.biteCd=.18;particles.push({scene,ring:true,x:player.x+5,y:player.y+11,r:2,maxR:12,life:.14,color:"#a7d9e8"})}
        else if(blocking()&&enemyInBlockArc(e))blockEnemyAttack(e);else hurtPlayer(e.damage,e);
      }else if(targetType==="caravan"){
        target.hp-=1;if(target.hp<=0)destroyCaravan(target);
      }else{
        const combat=agentCombatMods(target),blockChance=.12+(target.combatClass!=="peasant"?.20:0)+Math.min(.18,target.level*.015);
        if(target.guardStamina>=18&&rand()<blockChance){
          target.guardStamina-=18;recoilEnemy(e,combat.knock,target.x,target.y);
          if(combat.thorns){e.hp--;if(e.hp<=0)defeatEnemy(e,target)}
        }else{
          target.guardHp-=e.damage;target.guardStun=.18;
          if(target.guardHp<=0)guardDefeated(target);
        }
      }
    }else if(!winding&&contact<13&&e.biteCd<=0){
      e.attackWindup=.18;
    }
  }
  setCurrentEnemies(currentEnemies().filter(e=>!e.dead));
}
function stepParticles(dt){
  particles=particles.filter(p=>{
    p.life-=dt;if(p.ring)p.r+=(p.maxR-p.r)*Math.min(1,dt*18);else{p.x+=p.vx*dt;p.y+=p.vy*dt}
    return p.life>0;
  });
}
