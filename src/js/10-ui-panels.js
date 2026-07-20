/* ============================================================
   PANELS, SKILLS, AND HUD
   ============================================================ */
function toast(text){toastText=text;toastTimer=3.2}
function renderSkills(){
  if(!selectedClass)return;
  document.getElementById("skillPts").textContent=availablePoints();
  document.getElementById("lifeSkillPts").textContent=player.skillPoints;
  document.getElementById("specialtySummary").textContent=CLASS_ICON[selectedClass]+" "+selectedClass.toUpperCase()+" · Level "+player.level+" · "+player.xp+"/"+xpNeeded(player.level)+" XP · Your Specialty choice is permanent. Tiers unlock from top to bottom.";
  const wrap=document.getElementById("skillCols");wrap.innerHTML="";
  const tree=SKILLS[selectedClass];
  tree.branches.forEach((branch,b)=>{
    const col=document.createElement("div");col.className="branch";
    const title=document.createElement("div");title.className="branchTitle";title.textContent=branch;col.appendChild(title);
    tree.nodes[b].forEach((node,t)=>{
      const owned=purchased.has(b+","+t),unlocked=t===0||purchased.has(b+","+(t-1));
      const btn=document.createElement("button");btn.className="node";
      if(owned)btn.classList.add("owned");else if(unlocked&&availablePoints()>0)btn.classList.add("buyable");else btn.classList.add("locked");
      btn.innerHTML="<strong>"+(owned?"✓ ":"")+node[0]+"</strong>"+node[1];
      btn.addEventListener("click",()=>{
        if(owned||!unlocked||availablePoints()<=0)return;
        purchased.add(b+","+t);spentPoints++;player.specialtyPoints--;player.maxHp=mods().maxHp;player.hp=Math.min(player.maxHp,player.hp+3);
        renderSkills();updateUI();
      });
      col.appendChild(btn);
    });
    wrap.appendChild(col);
  });
  renderLifeSkills();
}
function renderLifeSkills(){
  const wrap=document.getElementById("lifeSkillTrees");wrap.innerHTML="";
  Object.keys(LIFE_SKILLS).forEach(key=>{
    const skill=LIFE_SKILLS[key],tool=EQUIPMENT[key],rank=lifeRank(player,key),ready=entityHasEquipment(player,key);
    const tree=document.createElement("div");tree.className="lifeTree";
    const head=document.createElement("div");head.className="lifeHead";
    head.innerHTML='<span class="branchTitle">'+skill.icon+' '+skill.name+' · '+rank+'/3</span><span class="toolStatus '+(ready?'ready':'')+'">'+(ready?'✓ '+tool.name:'Requires '+tool.name)+'</span>';
    tree.appendChild(head);
    skill.nodes.forEach((node,t)=>{
      const owned=t<rank,unlocked=t===rank&&ready&&player.skillPoints>0;
      const btn=document.createElement("button");btn.className="node";
      if(owned)btn.classList.add("owned");else if(unlocked)btn.classList.add("buyable");else btn.classList.add("locked");
      btn.innerHTML="<strong>"+(owned?"✓ ":"")+node[0]+"</strong>"+node[1];
      btn.addEventListener("click",()=>{
        if(t!==lifeRank(player,key)||!entityHasEquipment(player,key)||player.skillPoints<=0)return;
        player.lifeSkills[key]++;player.skillPoints--;renderSkills();updateUI();
      });
      tree.appendChild(btn);
    });
    wrap.appendChild(tree);
  });
}
function renderInventory(){
  const wrap=document.getElementById("inventoryContent"),packed=packBackpack(),bonus=gearBonuses(),line=(name,value)=>'<div class="inventoryLine"><span>'+name+'</span><span>'+value+'</span></div>';
  wrap.innerHTML='<div><div class="menuCard"><h3>Character equipment</h3><div id="paperDoll"><div class="characterFigure">'+CLASS_ICON[selectedClass]+'<small>Level '+player.level+' '+selectedClass+'<br>HP '+player.hp+'/'+player.maxHp+'</small></div></div></div><div class="menuCard"><h3>Equipped bonuses</h3>'+line("Attack","+"+bonus.power)+line("Specialty","+"+bonus.special)+line("Defense","+"+bonus.defense)+line("Stamina","+"+bonus.stamina)+line("Speed","+"+bonus.speed+"%")+line("Block power","+"+bonus.block)+line("Coins",player.coins.toFixed(1))+line("Heartstones",player.relics)+'</div></div><div class="menuCard"><h3>Backpack</h3><div id="bagSummary">'+packed.used+' / '+packed.capacity+' occupied slots · '+packed.cols+'×'+packed.rows+' grid'+(packed.overflow.length?' · '+packed.overflow.length+' STACKS DO NOT FIT':'')+'</div><div class="bagWrap"><div id="bagGrid" style="--bag-cols:'+packed.cols+';--bag-rows:'+packed.rows+'"></div></div><div class="bagTip">Items have real dimensions. Crafted gear can be clicked to equip it; equipped items no longer occupy backpack space.</div><div id="overflowItems"></div></div>';
  const doll=document.getElementById("paperDoll");
  for(const slot of GEAR_SLOTS){
    const uid=player.equippedSlots[slot],item=uid&&findGear(uid),def=item&&GEAR_DEFS[item.key],button=document.createElement("button");button.className="equipSlot"+(item?" filled":"");button.dataset.slot=slot;
    button.innerHTML='<span>'+slot.toUpperCase()+'</span><strong>'+(def?def.icon+" "+def.name:"Empty")+'</strong>';
    if(item){button.title="Click to place this "+def.w+"×"+def.h+" item back in the backpack.";button.addEventListener("click",()=>unequipGear(slot))}else button.disabled=true;
    doll.appendChild(button);
  }
  const grid=document.getElementById("bagGrid");for(let i=0;i<packed.capacity;i++){const cell=document.createElement("div");cell.className="bagCell";grid.appendChild(cell)}
  for(const item of packed.placed){
    const button=document.createElement("button");button.className="bagItem "+item.kind;button.style.gridColumn=(item.x+1)+" / span "+item.w;button.style.gridRow=(item.y+1)+" / span "+item.h;
    button.innerHTML='<strong>'+item.icon+' '+item.name+'</strong>'+(item.qty>1?'×'+item.qty+'<br>':'')+item.w+'×'+item.h;button.title=item.name+' occupies '+item.w+'×'+item.h+' slots.'+(item.kind==="gear"?' Click to equip.':'');
    if(item.kind==="gear")button.addEventListener("click",()=>equipGear(item.uid));else button.disabled=true;grid.appendChild(button);
  }
  const overflow=document.getElementById("overflowItems");for(const item of packed.overflow){const box=document.createElement("div");box.className="bagItem overflow";box.innerHTML='<strong>'+item.icon+' '+item.name+'</strong>Needs '+item.w+'×'+item.h+' contiguous slots';overflow.appendChild(box)}
}
function abilityState(kind){
  if(!selectedClass)return {ready:false,spent:false,remaining:0,total:1};
  const m=mods();
  if(kind==="specialty"){const total=SPECIALTY[selectedClass].cooldown*m.specialCd;return {ready:player.specialCd<=0,spent:false,remaining:player.specialCd,total}}
  if(kind==="dash"){const total=1.45*m.dashCd;return {ready:player.dashCd<=0&&player.dashTime<=0,spent:false,remaining:player.dashCd,total}}
  const spent=player.influenceDay>=dayNo;
  return {ready:!spent,spent,remaining:0,total:1};
}
function installAbilityBubbles(){
  const dock=document.getElementById("skillBubbleDock");
  if(!dock||dock.children.length)return;
  const bubbles=[
    {id:"abilitySpecialty",kind:"specialty",key:"F",icon:"✦",action:()=>specialty()},
    {id:"abilityInfluence",kind:"influence",key:"Q",icon:"♛",action:()=>classInfluence()},
    {id:"abilityDash",kind:"dash",key:"SHIFT",icon:"➤",action:()=>dash()}
  ];
  for(const spec of bubbles){
    const b=document.createElement("button");
    b.className="abilityBubble";b.id=spec.id;b.type="button";b.dataset.kind=spec.kind;
    b.innerHTML='<span class="abilityKey">'+spec.key+'</span><span class="abilityIcon">'+spec.icon+'</span><span class="abilityStatus">Ready</span>';
    b.addEventListener("click",()=>{if(selectedClass&&!activePanel)spec.action()});
    dock.appendChild(b);
  }
}
function refreshAbilityBubbles(){
  const dock=document.getElementById("skillBubbleDock");if(!dock)return;
  installAbilityBubbles();
  dock.style.display=selectedClass?"flex":"none";
  if(!selectedClass)return;
  const names={specialty:SPECIALTY[selectedClass].name,influence:CLASS_POWER[selectedClass].name,dash:selectedClass==="mage"?"Blink":"Dash"};
  for(const b of Array.from(dock.children)){
    const kind=b.dataset.kind,state=abilityState(kind);
    const status=state.ready?"Ready":state.spent?"Tomorrow":state.remaining.toFixed(1)+"s";
    const cls="abilityBubble "+(state.ready?"ready":state.spent?"spent":"cooling");
    if(b.className!==cls)b.className=cls;
    const label=b.querySelector(".abilityStatus");
    if(label&&label.textContent!==status)label.textContent=status;
    const title=names[kind]+" · "+status;
    if(b.title!==title){b.title=title;b.setAttribute("aria-label",title)}
  }
}
function statLine(name,value){return '<div class="townStat"><span>'+name+'</span><span>'+value+'</span></div>'}
function equippedSlotName(slot){const uid=player.equippedSlots&&player.equippedSlots[slot],item=uid&&findGear(uid),def=item&&GEAR_DEFS[item.key];return def?def.icon+" "+escapeHTML(def.name):"Empty"}
function renderPlayerStats(){
  const wrap=document.getElementById("statsContent");if(!wrap)return;
  if(!selectedClass){wrap.innerHTML='<div class="emptyState">Choose a Specialty to begin your story.</div>';return}
  const m=mods(),g=gearBonuses(),packed=packBackpack(),town=homeGovernmentTown(),gov=town?governmentFor(town):null;
  const specialtyState=abilityState("specialty"),dashState=abilityState("dash"),influenceState=abilityState("influence");
  const phaseEl=document.getElementById("phaseText"),phase=phaseEl?phaseEl.textContent:"";
  const gearLines=GEAR_SLOTS.map(slot=>statLine(slot.charAt(0).toUpperCase()+slot.slice(1),equippedSlotName(slot))).join("");
  const lifeLines=Object.keys(LIFE_SKILLS).map(key=>statLine(LIFE_SKILLS[key].icon+" "+LIFE_SKILLS[key].name,(player.lifeSkills[key]||0)+"/3")).join("");
  const cargoLines=GOODS.map((good,i)=>statLine(GOOD_ICON[i]+" "+good,Math.floor(player.cargo[i]||0))).join("");
  const materialLines=MATERIALS.map((mat,i)=>statLine(MATERIAL_ICON[i]+" "+mat,Math.floor(player.materials[i]||0))).join("");
  const abilityCard=(name,key,state,description)=>{
    const cls=state.ready?"ready":state.spent?"spent":"cooling";
    const status=state.ready?"Ready":state.spent?"Available tomorrow":state.remaining.toFixed(1)+" seconds";
    return '<div class="statsAbility '+cls+'"><strong>'+key+' · '+escapeHTML(name)+'</strong><div class="townStat"><span>Status</span><span>'+status+'</span></div><small>'+escapeHTML(description)+'</small></div>';
  };
  wrap.innerHTML='<div class="menuCard statsHero"><div class="statsPortrait">'+CLASS_ICON[selectedClass]+'</div><div><h3>'+selectedClass.toUpperCase()+' · LEVEL '+player.level+'</h3><div class="statsGrid">'+statLine("Experience",player.xp+" / "+xpNeeded(player.level))+statLine("Home",town?escapeHTML(town.name):"Unknown")+statLine("Government",gov?GOVERNMENT_TYPES[gov.type].label:"Council")+statLine("Time","Day "+dayNo+" · "+escapeHTML(phase))+statLine("Coins",player.coins.toFixed(1))+statLine("Heartstones",player.relics)+'</div></div></div>'+
  '<div class="statsColumns"><div><div class="menuCard"><h3>Combat statistics</h3>'+statLine("Health",player.hp+" / "+player.maxHp)+statLine("Attack bonus","+"+g.power)+statLine("Specialty bonus","+"+g.special)+statLine("Defense","+"+g.defense)+statLine("Maximum stamina",m.maxStamina)+statLine("Movement speed",Math.round(m.speed*100)+"%")+statLine("Block power","+"+g.block)+statLine("Shield",playerHasShield()?"Equipped":"None — blocking unavailable")+statLine("Kills",kills)+'</div><div class="menuCard"><h3>Active abilities</h3>'+abilityCard(SPECIALTY[selectedClass].name,"F",specialtyState,SPECIALTY[selectedClass].desc)+abilityCard(CLASS_POWER[selectedClass].name,"Q",influenceState,CLASS_POWER[selectedClass].desc)+abilityCard(selectedClass==="mage"?"Blink":"Dash","SHIFT",dashState,"Rapid movement with a short recharge.")+'</div></div><div><div class="menuCard"><h3>Equipment</h3>'+gearLines+'</div><div class="menuCard"><h3>Progression</h3>'+statLine("Specialty points",player.specialtyPoints||0)+statLine("Skills points",player.skillPoints||0)+statLine("Specialty perks",purchased.size)+lifeLines+'</div><div class="menuCard"><h3>Economy and backpack</h3>'+statLine("Backpack",packed.used+" / "+packed.capacity+" slots")+statLine("Road safety",Math.round(roadSafety)+"%")+cargoLines+materialLines+'</div></div></div>';
}
function renderMenuMap(){
  const map=document.getElementById("menuMap"),m=map.getContext("2d"),sx=map.width/(MW*TILE),sy=map.height/(MH*TILE);
  m.clearRect(0,0,map.width,map.height);m.drawImage(worldCanvas,0,0,map.width,map.height);
  for(const town of towns){
    const x=town.cx*sx,y=town.cy*sy,home=town.name===(player.homeTownName||towns[0].name);
    m.fillStyle=home?"#e2ad45":"#eadfc7";m.beginPath();m.arc(x,y,home?7:5,0,Math.PI*2);m.fill();
    m.strokeStyle="#171a20";m.stroke();m.fillStyle="#ffffff";m.font="bold 11px monospace";m.textAlign="center";m.fillText(town.name,x,y-11);
    for(const shop of town.shops){m.fillStyle=CLASS_COLOR[shop.specialty];m.fillRect(shop.x*sx-2,shop.y*sy-2,5,5)}
  }
  for(const site of resourceLandmarks){m.fillStyle="#79c56b";m.font="13px monospace";m.fillText(MATERIAL_ICON[[2,1,4].indexOf(site.tile)],(site.x*TILE+8)*sx,(site.y*TILE+8)*sy)}
  const cw=map.width/MW,ch=map.height/MH;
  m.fillStyle="rgba(5,7,10,.93)";
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(!exploredWorldCells.has(keyOf(x,y)))m.fillRect(Math.floor(x*cw),Math.floor(y*ch),Math.ceil(cw)+1,Math.ceil(ch)+1);
  const mapPos=scene==="world"?player:scene==="shop"?returnPosition:dungeon.entrance,px=mapPos.x*sx,py=mapPos.y*sy;
  m.fillStyle="#ffef79";m.beginPath();m.arc(px,py,4,0,Math.PI*2);m.fill();m.strokeStyle="#14161c";m.stroke();
  document.getElementById("mapLegend").innerHTML='<span style="color:#ffef79">● You</span><span style="color:#e2ad45">● Home</span><span>○ Town</span><span style="color:#cf6547">■ Specialty shops</span><span style="color:#79c56b">≈ ♠ ◆ Resources</span><span>▣ Old Mine</span><span class="fogLegend">Fog clears permanently as you explore</span>';
}
function renderHomeTown(){
  const home=towns.find(t=>t.name===(player.homeTownName||towns[0].name))||towns[0];player.homeTownName=home.name;
  const specialtyCounts={peasant:0,warrior:0,mage:0,noble:0},professionCounts={};
  home.agents.forEach(a=>{specialtyCounts[a.combatClass]=(specialtyCounts[a.combatClass]||0)+1;professionCounts[a.profession]=(professionCounts[a.profession]||0)+1});
  const facilityKeys=[...new Set((home.facilities||[]).concat(home.building?[home.building]:[]))],facilities=facilityKeys.length?facilityKeys.map(k=>BUILDINGS[k]?BUILDINGS[k].name:k).join(", "):"No civic facilities";
  const houseLines=home.houses.map((h,i)=>'<div class="townStat"><span>House '+(i+1)+' · '+escapeHTML(h.familyName||"Unclaimed")+'</span><span>'+h.residentIds.length+' / 4 · '+escapeHTML(h.plan?.label||"No plan")+'</span></div>').join("");
  const profLines=Object.keys(professionCounts).sort().map(k=>'<div class="townStat"><span>'+k+'</span><span>'+professionCounts[k]+'</span></div>').join("");
  const tradeLines=GOODS.map((g,i)=>'<div class="townStat"><span>'+GOOD_ICON[i]+' '+g+' · '+Math.round(townAdvantage(home,g)*100)+'% output</span><span>'+home.market.prices[i].toFixed(2)+'c · '+Math.floor(home.market.inventory[i])+' stock</span></div>').join("");
  const specialtyLines=Object.keys(specialtyCounts).filter(k=>specialtyCounts[k]).map(k=>'<div class="townStat"><span>'+CLASS_ICON[k]+' '+k+'</span><span>'+specialtyCounts[k]+'</span></div>').join("");
  const relationship=a=>{if(a.ageGroup==="child"){const parents=a.parentIds.map(id=>home.agents.find(p=>p.id===id)).filter(Boolean).map(p=>p.firstName).join(" & ");return (a.gender==="girl"?"Daughter":"Son")+(parents?" of "+parents:"")}const spouse=home.agents.find(p=>p.id===a.spouseId);return spouse?(a.gender==="woman"?"Wife":"Husband")+" of "+spouse.firstName:(a.gender==="woman"?"Woman":"Man")};
  const people=home.agents.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>'<div class="residentItem" data-agent-id="'+a.id+'"><span style="color:'+CLASS_COLOR[a.combatClass]+'">'+CLASS_ICON[a.combatClass]+' '+escapeHTML(a.name.split(" of ")[0])+'</span><br>'+relationship(a)+' · age '+a.age+'<br>Level '+a.level+' '+a.combatClass+' · '+a.profession+'<br>House '+(a.houseId+1)+(a.isGuard?' · Guard':'')+'<br><span style="color:var(--dim)">'+escapeHTML(a.currentActivity||"")+'</span></div>').join("");
  document.getElementById("homeTownTitle").textContent=home.name+" · HOME TOWN";
  document.getElementById("homeTownLead").textContent=home.name+" is "+home.theme+". Its strongest natural trade is "+home.dominantGood+".";
  const policy=home.institutions?.currentPolicy;
  document.getElementById("homeTownContent").innerHTML='<div><div class="menuCard"><h3>Town</h3><div class="townStat"><span>Population</span><span>'+home.agents.length+'</span></div><div class="townStat"><span>Adults / children</span><span>'+home.agents.filter(a=>a.ageGroup!=="child").length+' / '+home.agents.filter(a=>a.ageGroup==="child").length+'</span></div><div class="townStat"><span>Houses</span><span>'+home.houses.length+'</span></div><div class="townStat"><span>Residents per house</span><span>Maximum 4</span></div><div class="townStat"><span>Buildings</span><span>'+facilities+'</span></div><div class="townStat"><span>Guards</span><span>'+guardCount(home)+'</span></div><div class="townStat"><span>Council policy</span><span>'+(policy?escapeHTML(policy.label):"Uncommitted")+'</span></div></div><div class="menuCard"><h3>Households and public plans</h3>'+houseLines+'</div><div class="menuCard"><h3>Professions</h3>'+profLines+'</div><div class="menuCard"><h3>Local trades</h3>'+tradeLines+'</div><div class="menuCard"><h3>Specialties</h3>'+specialtyLines+'</div></div><div class="menuCard"><h3>Residents and families</h3><div class="residentList">'+people+'</div></div>';
  if(godMode)document.querySelectorAll("#homeTownContent [data-agent-id]").forEach(el=>{el.style.cursor="pointer";el.title="Inspect in God mode";el.addEventListener("click",()=>{document.getElementById("godTown").value=String(home.id);renderGodMode(+el.dataset.agentId);selectMenuTab("god")})});
  renderGovernment();
}
function renderChronicle(){
  const select=document.getElementById("chronicleTown"),previous=select.value||"ALL";select.innerHTML='<option value="ALL">All settlements</option>'+towns.map(t=>'<option value="'+t.name+'">'+escapeHTML(t.name)+'</option>').join("");select.value=["ALL",...towns.map(t=>t.name)].includes(previous)?previous:"ALL";
  const events=villageEvents.filter(e=>select.value==="ALL"||e.town===select.value).slice().sort((a,b)=>b.day-a.day||b.id-a.id),wrap=document.getElementById("chronicleContent");
  wrap.innerHTML=events.length?'<div class="chronicleList">'+events.map(e=>'<div class="chronicleEntry '+(e.salience>=8?'major':'')+'"><span class="chronicleDay">Day '+e.day+'</span><span class="chronicleKind">'+escapeHTML(e.kind)+'</span><span>'+escapeHTML(e.text)+'</span></div>').join("")+'</div>':'<div class="emptyState">The chronicle is waiting for the valley\'s first public event.</div>';
}
function needBar(name,value){return '<div class="needBar"><span>'+name+'</span><span class="needTrack"><span class="needFill" style="display:block;width:'+clamp(value,0,100)+'%;background:'+(value>70?'var(--bad)':value>40?'var(--gold)':'var(--good)')+'"></span></span><span>'+Math.round(value)+'</span></div>'}
function renderGodMode(forceAgentId=null){
  if(!godMode)return;const townSelect=document.getElementById("godTown"),agentSelect=document.getElementById("godAgent"),previousTown=townSelect.value||String(towns[0]?.id||0);townSelect.innerHTML=towns.map(t=>'<option value="'+t.id+'">'+escapeHTML(t.name)+'</option>').join("");townSelect.value=towns.some(t=>String(t.id)===previousTown)?previousTown:String(towns[0]?.id||0);const town=towns.find(t=>String(t.id)===townSelect.value)||towns[0];
  const previousAgent=forceAgentId!=null?String(forceAgentId):(agentSelect.value||String(town.agents[0]?.id||0));agentSelect.innerHTML=town.agents.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>'<option value="'+a.id+'">'+escapeHTML(a.name.split(" of ")[0])+'</option>').join("");agentSelect.value=town.agents.some(a=>String(a.id)===previousAgent)?previousAgent:String(town.agents[0]?.id||0);const a=town.agents.find(x=>String(x.id)===agentSelect.value)||town.agents[0],house=a&&householdFor(a),members=house?householdMembers(town,house):[],policy=town.institutions.currentPolicy;
  const rels=a?Object.entries(a.relationships||{}).map(([id,r])=>({other:agents.find(x=>x.id===+id),r})).filter(x=>x.other).sort((x,y)=>(y.r.affection+y.r.trust-y.r.resentment)-(x.r.affection+x.r.trust-x.r.resentment)).slice(0,8):[];
  const memories=a?(a.eventMemory||[]).concat(a.rumors||[]).slice(-10).reverse().map(id=>villageEvents.find(e=>e.id===id)).filter(Boolean):[];
  document.getElementById("godContent").innerHTML='<div><div class="menuCard"><h3>'+escapeHTML(town.name)+' institutions</h3><div class="townStat"><span>Council</span><span>'+town.institutions.councilIds.map(id=>agents.find(x=>x.id===id)?.firstName).filter(Boolean).join(", ")+'</span></div><div class="townStat"><span>Tax rate</span><span>'+Math.round(town.institutions.taxRate*100)+'%</span></div><div class="townStat"><span>Policy</span><span>'+(policy?escapeHTML(policy.label):'None')+'</span></div>'+(policy?'<div class="aiStatus">'+escapeHTML(policy.rationale)+'<br>Source: '+escapeHTML(policy.source)+' · progress '+Math.round(policy.progress)+'%</div>':'')+'</div>'+(house?'<div class="menuCard"><h3>'+escapeHTML(house.familyName)+' household</h3><div class="townStat"><span>Members</span><span>'+members.map(x=>x.firstName).join(", ")+'</span></div><div class="townStat"><span>Food</span><span>'+house.stock.food.toFixed(1)+'</span></div><div class="townStat"><span>Shared purse</span><span>'+house.stock.coins.toFixed(1)+'c</span></div><div class="townStat"><span>Home condition</span><span>'+Math.round(house.stock.shelter)+'%</span></div><div class="planAction">'+escapeHTML(house.plan.label)+'</div><div class="aiStatus">'+escapeHTML(house.plan.rationale)+'<br>Source: '+escapeHTML(house.plan.source)+' · chosen day '+house.plan.started+'</div></div>':'')+'<div class="menuCard"><h3>Bounded planner</h3><label><input type="checkbox" id="localLLMToggle" '+(llmConfig.enabled?'checked':'')+'> Use optional local LLM</label><div style="margin-top:7px"><label>Backend <select id="llmBackend"><option value="server"'+(llmConfig.backend!=="webllm"?' selected':'')+'>Local server (Ollama / LM Studio / llama.cpp / vLLM)</option><option value="webllm"'+(llmConfig.backend==="webllm"?' selected':'')+'>In-browser (WebGPU, downloads a model)</option></select></label></div>'+(llmConfig.backend!=="webllm"?'<div style="margin-top:6px"><input class="godInput" id="llmServerUrl" placeholder="http://localhost:11434/v1" value="'+escapeHTML(llmConfig.serverUrl)+'"></div><div style="margin-top:6px"><input class="godInput" id="llmServerModel" placeholder="Model id (blank = first model the server lists)" value="'+escapeHTML(llmConfig.serverModel)+'"></div>':'')+'<div class="aiStatus" style="margin-top:7px">'+escapeHTML(llmConfig.status)+'<br><br>Last: '+escapeHTML(llmConfig.lastDecision)+'</div><div class="row" style="margin-top:8px"><button class="uibtn mini" id="localLLMInit">Initialize local LLM</button><button class="uibtn mini" id="rerunPlanners">Run councils now</button></div></div></div><div>'+(a?'<div class="menuCard"><h3>'+escapeHTML(a.name.split(" of ")[0])+'</h3><div class="townStat"><span>Traits</span><span>'+a.traits.join(", ")+'</span></div><div class="townStat"><span>Current activity</span><span>'+escapeHTML(a.currentActivity)+'</span></div><div class="townStat"><span>Public rationale</span><span>'+escapeHTML(a.publicRationale)+'</span></div>'+NEED_NAMES.map(n=>needBar(n,a.needs[n])).join("")+'</div><div class="menuCard"><h3>Relationships</h3>'+(rels.length?rels.map(x=>'<div class="relationshipRow"><span style="color:'+CLASS_COLOR[x.other.combatClass]+'">'+escapeHTML(x.other.firstName)+'</span> · affection '+Math.round(x.r.affection)+' · trust '+Math.round(x.r.trust)+' · respect '+Math.round(x.r.respect)+' · resentment '+Math.round(x.r.resentment)+'</div>').join(""):'No established relationships')+'</div><div class="menuCard"><h3>Schedule</h3>'+a.schedule.map(s=>'<div class="townStat"><span>until '+Math.round(s.until*100)+'%</span><span>'+escapeHTML(s.activity)+'</span></div>').join("")+'</div><div class="menuCard"><h3>Memories and rumors</h3>'+(memories.length?memories.map(e=>'<div class="relationshipRow">Day '+e.day+' · '+escapeHTML(a.rumors.includes(e.id)?(a.rumorNotes[e.id]||e.text):e.text)+(a.rumors.includes(e.id)?' <span style="color:var(--dim)">(heard; may be distorted)</span>':'')+'</div>').join(""):'No salient memories yet.')+'</div>':'No villager selected.')+'</div>';
  document.getElementById("localLLMToggle")?.closest(".menuCard")?.remove();
  document.getElementById("localLLMToggle")?.addEventListener("change",e=>{llmConfig.enabled=e.target.checked&&!!llmEngine;if(e.target.checked&&!llmEngine)llmConfig.status="Initialize the local LLM before enabling it.";else if(llmConfig.enabled)llmConfig.status="Local LLM ready for conversations and bounded planning.";renderGodMode()});document.getElementById("localLLMInit")?.addEventListener("click",initializeLocalLLM);document.getElementById("rerunPlanners")?.addEventListener("click",()=>{runAllPlanners(llmConfig.enabled);renderGodMode()});
  document.getElementById("llmBackend")?.addEventListener("change",e=>{llmConfig.backend=e.target.value;llmEngine=null;llmConfig.enabled=false;llmConfig.status="Backend changed. Initialize the local LLM to connect.";renderGodMode()});
  document.getElementById("llmServerUrl")?.addEventListener("change",e=>{llmConfig.serverUrl=e.target.value.trim()});
  document.getElementById("llmServerModel")?.addEventListener("change",e=>{llmConfig.serverModel=e.target.value.trim()});
}
function updateGodModeVisibility(){document.getElementById("godModeToggle").checked=godMode;document.getElementById("godTabBtn").classList.toggle("enabled",godMode);if(!godMode&&document.getElementById("godTab").classList.contains("active"))selectMenuTab("help")}
function syncSettingsLLMConfig(){
  const backend=document.getElementById("settingsLLMBackend"),model=document.getElementById("settingsLLMModel"),url=document.getElementById("settingsLLMUrl");
  if(backend)llmConfig.backend=backend.value;
  if(model){if(llmConfig.backend==="server")llmConfig.serverModel=model.value.trim();else llmConfig.model=model.value.trim()||(llmConfig.backend==="browser-lite"?LITE_LLM_MODEL:llmConfig.model)}
  if(url)llmConfig.serverUrl=url.value.trim()||"http://localhost:11434/v1";
}
let serverModelFetchToken=0;
function refreshServerModelChoices(){
  if(llmConfig.backend!=="server")return;
  const list=document.getElementById("settingsModelChoices");if(!list)return;
  const root=(llmConfig.serverUrl||"").trim().replace(/\/+$/,"");if(!root)return;
  const token=++serverModelFetchToken;
  fetch(root+"/models").then(res=>res.ok?res.json():null).then(data=>{
    if(!data||token!==serverModelFetchToken)return;
    const ids=(data.data||[]).map(m=>m.id).filter(Boolean);
    if(!ids.length)return;
    list.innerHTML=ids.map(id=>'<option value="'+escapeHTML(id)+'">').join("");
    const status=document.getElementById("settingsLLMStatus");
    if(status&&!llmConfig.enabled)status.textContent="Server reachable. Models available: "+ids.join(", ")+". Leave the model box blank to use the first one.";
  }).catch(()=>{});
}
function renderSettings(){
  const backend=document.getElementById("settingsLLMBackend");if(!backend)return;
  backend.value=llmConfig.backend;document.getElementById("settingsLLMModel").value=llmConfig.backend==="server"?llmConfig.serverModel:llmConfig.model;
  document.getElementById("settingsLLMUrl").value=llmConfig.serverUrl;document.getElementById("settingsServerField").style.display=llmConfig.backend==="server"?"grid":"none";
  document.getElementById("settingsLLMToggle").checked=!!llmConfig.enabled;document.getElementById("settingsLLMStatus").textContent=llmConfig.status+(llmConfig.model?"\nSelected: "+llmConfig.model:"");
  document.getElementById("settingsLLMNote").textContent=llmConfig.backend==="browser-lite"?"Tiny 135M 4-bit model on CPU/WASM. It loads on the first conversation and handles speech; reliable deterministic rules handle village plans.":llmConfig.backend==="server"?"Best conversation quality. Connect to an OpenAI-compatible Ollama, LM Studio, llama.cpp, or vLLM server.":"Larger experimental browser model. Requires working WebGPU and a much bigger download.";
  document.getElementById("musicToggle").checked=audioConfig.music;document.getElementById("sfxToggle").checked=audioConfig.sfx;
  refreshServerModelChoices();
}
function selectMenuTab(tab){
  if(tab==="god"&&!godMode)tab="help";
  document.querySelectorAll(".menuTabBtn").forEach(btn=>btn.classList.toggle("active",btn.dataset.menuTab===tab));
  document.querySelectorAll("#menuBody>.menuTab").forEach(panel=>panel.classList.toggle("active",panel.id===tab+"Tab"));
  if(tab==="stats")renderPlayerStats();else if(tab==="relationships")renderPlayerRelationships();else if(tab==="inventory")renderInventory();else if(tab==="map")renderMenuMap();else if(tab==="skills")renderSkills();else if(tab==="crafting")renderCrafting();else if(tab==="chronicle")renderChronicle();else if(tab==="home")renderHomeTown();else if(tab==="settings")renderSettings();else if(tab==="god")renderGodMode();
  document.getElementById("menuBody").scrollTop=0;
}
function openMenu(tab="stats"){
  if(!selectedClass)return;
  if(activePanel&&activePanel!=="menuPanel")return;
  activePanel="menuPanel";document.getElementById("menuPanel").classList.add("open");playSfx("menu");selectMenuTab(tab);
}
function toggleMenu(){if(activePanel==="menuPanel")closePanels();else if(!activePanel)openMenu("stats")}
function toggleSkills(){
  if(!selectedClass)return;
  if(activePanel==="menuPanel"){if(document.getElementById("skillsTab").classList.contains("active"))closePanels();else selectMenuTab("skills");return}
  if(activePanel)return;
  openMenu("skills");
}
function renderLedger(){
  const ledger=document.getElementById("ledger");
  if(scene==="shop"){
    ledger.innerHTML='<span class="townName">'+currentShop.name.toUpperCase()+'</span><span>'+currentShop.townName+'</span><span>'+CLASS_ICON[currentShop.specialty]+' '+currentShop.specialty+' specialty crafting</span><span>Approach the bench and press E</span>';return;
  }
  if(scene==="dungeon"){
    ledger.innerHTML='<span class="townName">OLD MINE</span><span>Iron Warden '+(dungeon.wardenDead?'<span class="up">defeated</span>':'guards the east vault')+'</span><span>Heart Vault '+(dungeon.chestOpened?'<span class="up">opened</span>':'sealed')+'</span>';
    return;
  }
  const town=nearestTown();ledgerTown=town;
  let html='<span class="townName">'+town.name+'</span>';
  GOODS.forEach((g,i)=>{
    const p=town.market.prices[i],last=town.market.lastPrices[i],cls=p>last*1.003?"up":p<last*.997?"down":"";
    const arrow=cls==="up"?"▲":cls==="down"?"▼":"·";
    html+='<span class="price"><span class="label">'+g+'</span><span>'+p.toFixed(2)+'</span><span class="'+cls+'">'+arrow+'</span><span class="label">['+Math.floor(town.market.inventory[i])+']</span></span>';
  });
  const utilityChange=town.market.avgUtility-town.market.lastUtility;
  html+='<span class="'+(utilityChange>0?"up":utilityChange<0?"down":"")+'">U '+town.market.avgUtility.toFixed(2)+'</span>';
  html+='<span class="price"><span class="label">guards</span><span>'+guardCount(town)+'</span></span>';
  ledger.innerHTML=html;
}
function updateQuest(){
  const items=[
    [quest.gathered,"Gather a natural or monster resource"],
    [quest.traded,"Trade a good between towns"],
    [quest.escort,"Escort a caravan to safety"],
    [quest.dungeon,"Recover the Heartstone"],
    [quest.built,"Complete a civic building"]
  ];
  document.getElementById("questbar").innerHTML='<span>VALLEY COMPACT</span>'+items.map(x=>'<span class="'+(x[0]?"done":"")+'">'+(x[0]?"✓":"○")+' '+x[1]+'</span>').join("");
  if(items.every(x=>x[0])&&!quest.announced){quest.announced=true;toast("The Valley Compact is fulfilled. The simulation continues—and remembers your choices.")}
}
function updateUI(){
  document.getElementById("coins").textContent=player.coins.toFixed(1);
  document.getElementById("relics").textContent=player.relics;
  const packed=packBackpack();document.getElementById("materialCount").textContent=packed.used+"/"+packed.capacity;
  document.getElementById("road").textContent=Math.round(roadSafety)+"%";
  document.getElementById("road").style.color=roadSafety<35?"var(--bad)":roadSafety>70?"var(--good)":"var(--gold)";
  document.getElementById("skillPts").textContent=availablePoints();
  document.getElementById("lifeSkillPts").textContent=player.skillPoints||0;
  updateQuest();
}
function updatePhase(){
  const p=dayClock/DAY_SECONDS;
  document.getElementById("phaseText").textContent=p<.22?"Morning":p<.52?"Afternoon":p<.66?"Dusk":"Night";
}
