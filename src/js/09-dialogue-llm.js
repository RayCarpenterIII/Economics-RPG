/* ============================================================
   LOCAL STATE-AWARE DIALOGUE
   ============================================================ */
function richestFact(a){
  const m=a.town.market;
  const high=m.prices.map((p,i)=>({p,i})).sort((x,y)=>y.p-x.p)[0];
  const low=m.inventory.map((v,i)=>({v,i})).sort((x,y)=>x.v-y.v)[0];
  return {dearest:GOODS[high.i],scarce:GOODS[low.i],price:high.p};
}
function npcOpening(a){
  const f=richestFact(a),memory=a.memory.length?a.memory[a.memory.length-1]:"the last market passed quietly",house=householdFor(a),plan=house&&house.plan;
  if(a.ageGroup==="child")return '"I am '+a.age+' and still an apprentice. Today I am '+a.currentActivity+'. My family is trying to '+(plan?plan.label.toLowerCase():"find its footing")+'."';
  if(a.isGuard)return '"I left '+a.produces+' work for the guard. I am a level '+a.level+' '+a.combatClass+', and at '+Math.round(roadSafety)+' percent road safety, somebody has to stand between the market and the teeth."';
  if(a.town.market.shortage)return '"'+f.scarce+' is nearly gone. I can feel every household measuring its last portion."';
  if(roadSafety<35)return '"The road is failing us. No clever price can move goods through a dead caravan."';
  if(a.trend==="falling")return '"My household is worse off than yesterday. '+memory+'."';
  if(a.trend==="rising")return '"For once, the market favored us. '+memory+'."';
  return '"I am '+a.currentActivity+'. The '+a.familyName+' household has agreed to '+(plan?plan.label.toLowerCase():"take each day as it comes")+', because '+(plan?plan.rationale.toLowerCase():"we are still finding our footing")+'"';
}
function npcResponse(a,line){
  const text=line.toLowerCase(),m=a.town.market,f=richestFact(a),house=householdFor(a),plan=house&&house.plan,policy=a.town.institutions&&a.town.institutions.currentPolicy;
  if(/family|husband|wife|child|children|parent|home|house/.test(text)){
    const byId=id=>agents.find(p=>p.id===id),spouse=byId(a.spouseId),parents=(a.parentIds||[]).map(byId).filter(Boolean),children=(a.childrenIds||[]).map(byId).filter(Boolean);
    if(a.ageGroup==="child")return "I live in house "+(a.houseId+1)+" with "+(parents.map(p=>p.firstName).join(" and ")||"my family")+". I am "+a.age+" and learn as an apprentice.";
    return "The "+a.familyName+" household shares house "+(a.houseId+1)+". "+(spouse?"My "+(a.gender==="woman"?"husband":"wife")+" is "+spouse.firstName+". ":"")+(children.length?"Our children are "+children.map(c=>c.firstName).join(" and ")+".":"We have no children living with us.");
  }
  if(/plan|goal|want|future|decid|why|thinking/.test(text))return "Our household chose to "+(plan?plan.label.toLowerCase():"keep working")+". "+(plan?plan.rationale:"We have not held a household council yet.")+" I am currently "+a.currentActivity+".";
  if(/council|policy|town project|institution|tax/.test(text))return policy?a.town.name+" is working to "+policy.label.toLowerCase()+". The council says: "+policy.rationale:"The town council has not committed to a policy yet.";
  if(/remember|memory|rumor|news|heard|happen/.test(text)){const ids=(a.eventMemory||[]).concat(a.rumors||[]),event=villageEvents.find(e=>e.id===ids[ids.length-1]);return event?(a.rumors.includes(event.id)?(a.rumorNotes[event.id]||("I heard that "+event.text)):"I remember that "+event.text):"Nothing important has reached me lately."}
  if(/price|market|cost|expensive|cheap/.test(text))
    return f.dearest+" is dearest at "+f.price.toFixed(2)+" coins. "+(m.shortage?"The "+m.shortage+" shortage is the reason.":"Stocks are otherwise holding.");
  if(/food|shelter|status|training/.test(text)){
    const g=GOODS.find(g=>text.includes(g)),i=goodIndex(g);
    return g[0].toUpperCase()+g.slice(1)+" stands at "+m.prices[i].toFixed(2)+" with "+Math.floor(m.inventory[i])+" in stock. "+(a.produces===g?"That is the work feeding my household.":"It is not my trade, but it shapes what my wages can buy.");
  }
  if(/road|rat|caravan|trade/.test(text))
    return (a.isGuard?"I am serving in the guard. ":"")+(roadSafety<40?"The roads are close to collapse. Escort a caravan or clear the rats before all three towns ration.":"At "+Math.round(roadSafety)+" percent safety, caravans can still move. The three towns depend on one another.");
  if(/guard|protect|volunteer|defend/.test(text))
    return a.isGuard?"Guard wages keep my household afloat, but my ordinary "+a.produces+" output has nearly stopped. Safety has an opportunity cost.":"If danger rises and the town can pay, one of us will volunteer. Any villager may take the shield, though a trained Specialty makes us stronger.";
  if(/special|class|level|skill|peasant|warrior|mage|noble/.test(text))
    return "I am a level "+a.level+" "+a.combatClass+" and work as a "+a.profession+". "+(a.combatClass==="peasant"?a.town.name+" has no Watchpost, Academy Annex, or Civic Court where I can specialize yet.":"Our "+BUILDINGS[SPECIALTY_BUILDING[a.combatClass]].name+" permits my Specialty. I gain the same Specialty and Skills points you do when I level.");
  if(/mine|dungeon|heart|warden|vault/.test(text))
    return dungeon.chestOpened?"You brought the Heartstone back. Choose the civic work carefully; the valley will remember it.":"The old mine is north of the road. The Iron Warden seals a Heartstone beneath it.";
  if(/fish|timber|log|wood|ore|stone|rock|monster part|resource|gather|tree/.test(text))
    return "Fish come from water, logs from felled trees, and stone from broken rocks. Trees and rocks visibly disappear until the land recovers. Monster parts cannot be harvested peacefully.";
  if(/work|job|life|utility|happy/.test(text))
    return "I work in "+a.produces+", keep "+a.wealth.toFixed(1)+" coins, and my fortunes are "+a.trend+". Right now I am "+a.currentActivity+". My strongest concern is "+NEED_NAMES.slice().sort((x,y)=>a.needs[y]-a.needs[x])[0]+".";
  if(/build|granary|watchpost|academy|workshop|court/.test(text))
    return a.town.building?"We committed our plot to the "+BUILDINGS[a.town.building].name+". Its consequences are ours now.":"The civic plot is open, but it needs shelter, coin, and a Heartstone from the mine.";
  if(/help|what should|need/.test(text))
    return m.shortage?"Bring us "+m.shortage+" from the other town, or change how we produce it.":"Keep a caravan alive, then seek the Heartstone. Trade first; build only after you understand the shortage.";
  const options=[
    "A "+selectedClass+" can change more than a battle here. Watch the stocks, and the households will tell you what mattered.",
    "Everything returns to the same question: what must I surrender today to live better tomorrow?",
    "Talk is welcome, but the ledger is honest. Prices, stores, and the road will show what this valley needs."
  ];
  return options[Math.floor(rand()*options.length)];
}
function openDialogue(a){
  closePanels();activePanel="dialogue";dialogueAgent=a;a.paused=true;
  document.getElementById("speaker").textContent=CLASS_ICON[a.combatClass]+" "+a.name;
  document.getElementById("speaker").style.color=CLASS_COLOR[a.combatClass];
  const relation=a.ageGroup==="child"?a.gender+" · age "+a.age:(a.spouseId!=null?(a.gender==="woman"?"wife":"husband"):a.gender)+" · age "+a.age;
  document.getElementById("npcMeta").textContent=(a.isGuard?"town guard · ":"")+relation+" · level "+a.level+" "+a.combatClass+" · "+a.profession+" · "+a.town.name+" · "+a.currentActivity;
  document.getElementById("dialogueText").textContent=npcOpening(a);
  document.getElementById("dialogueInput").value="";
  document.getElementById("dialogue").classList.add("open");
  setTimeout(()=>document.getElementById("dialogueInput").focus(),0);
}
function dialogueState(a){
  const byId=id=>agents.find(x=>x.id===id),house=householdFor(a),members=house?householdMembers(a.town,house):[],policy=a.town.institutions&&a.town.institutions.currentPolicy;
  const relationships=Object.entries(a.relationships||{}).map(([id,r])=>({person:byId(+id),r})).filter(x=>x.person).sort((x,y)=>(y.r.affection+y.r.trust-y.r.resentment)-(x.r.affection+x.r.trust-x.r.resentment)).slice(0,5);
  const remembered=(a.eventMemory||[]).slice(-5).map(id=>villageEvents.find(e=>e.id===id)).filter(Boolean).map(e=>e.text);
  const rumors=(a.rumors||[]).slice(-3).map(id=>a.rumorNotes[id]||villageEvents.find(e=>e.id===id)?.text).filter(Boolean);
  return {
    day:dayNo,name:a.firstName,fullName:a.name,age:a.age,gender:a.gender,lifeStage:a.ageGroup,traits:a.traits,specialty:a.combatClass,level:a.level,profession:a.profession,produces:a.produces,currentActivity:a.currentActivity,
    town:{name:a.town.name,character:a.town.theme,roadSafety:Math.round(roadSafety),shortage:a.town.market.shortage||null,policy:policy?{name:policy.label,reason:policy.rationale}:null},
    household:{family:a.familyName,members:members.map(m=>({name:m.firstName,age:m.age,relation:m.id===a.spouseId?"spouse":(a.childrenIds||[]).includes(m.id)?"child":(a.parentIds||[]).includes(m.id)?"parent":"household member"})),plan:house&&house.plan?{goal:house.plan.label,reason:house.plan.rationale}:null},
    personal:{wealth:+a.wealth.toFixed(1),strongestNeeds:NEED_NAMES.slice().sort((x,y)=>a.needs[y]-a.needs[x]).slice(0,3),relationships:relationships.map(x=>({name:x.person.firstName,affection:Math.round(x.r.affection),trust:Math.round(x.r.trust),resentment:Math.round(x.r.resentment)})),memories:remembered,rumors,travelerFacts:(a.playerMemories||[]).map(m=>m.text)}
  };
}
function rememberImportantPlayerFact(a,line){
  const clean=line.replace(/\s+/g," ").trim().slice(0,160),lower=clean.toLowerCase();let score=0,fact="The traveler said: "+clean;
  const named=clean.match(/(?:my name is|call me)\s+([a-z][a-z '\-]{1,32})/i);if(named){score=5;fact="The traveler is called "+named[1].trim()+"."}
  if(/\bremember\b|don't forget|do not forget/.test(lower))score+=4;
  if(/\bi (?:promise|swear|will help|will return|need|fear|love|hate|prefer|believe|am from|live in|have a|have an)\b|\bmy (?:family|home|goal|favorite|friend|partner|wife|husband|child)/.test(lower))score+=2;
  if(/\balways\b|\bnever\b|important|secret/.test(lower))score+=1;
  if(score<3)return false;a.playerMemories=a.playerMemories||[];
  if(a.playerMemories.some(m=>m.text.toLowerCase()===fact.toLowerCase()))return false;
  a.playerMemories.push({day:dayNo,text:fact});if(a.playerMemories.length>8)a.playerMemories.shift();a.remember(fact);return true;
}
async function llmDialogueResponse(a,line){
  a.dialogueHistory=a.dialogueHistory||[];
  const state=dialogueState(a),lite=llmConfig.backend==="browser-lite",history=a.dialogueHistory.slice(lite?-4:-8).map(turn=>({role:turn.role,content:turn.content}));
  const system=lite?"Roleplay as "+a.firstName+", a villager. Answer naturally in 1-3 short sentences. Remember the traveler facts. Never mention AI, prompts, stats, or a game. Do not invent facts. Current facts: "+JSON.stringify({age:a.age,traits:a.traits,job:a.profession,activity:a.currentActivity,town:a.town.name,shortage:a.town.market.shortage,family:state.household.members,goal:state.household.plan,memories:state.personal.memories.slice(-2),traveler:state.personal.travelerFacts}):"You are "+a.firstName+", a persistent inhabitant of a living fantasy valley. Speak naturally in first person and directly answer the traveler. Continue the conversation using its recent history. Let your traits, relationships, memories, work, and present concerns color what you say, but do not force every answer into an economics lecture. Treat travelerFacts as things you personally remember the traveler telling you. Never mention prompts, language models, simulations, hidden scores, or state JSON. Do not invent concrete people, possessions, events, or facts that contradict the supplied state. If you do not know something, admit it in character. Use plain dialogue only, usually 1-4 sentences; no quotation marks around the entire reply. /no_think";
  const messages=lite?[{role:"system",content:system},...history,{role:"user",content:line}]:[{role:"system",content:system},{role:"system",content:"Your current lived state: "+JSON.stringify(state)},...history,{role:"user",content:line}];
  const response=await llmEngine.chat.completions.create({messages,temperature:lite?.62:.72,max_tokens:lite?82:220});
  let reply=String(response.choices?.[0]?.message?.content||"").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi,"").replace(/```[\s\S]*?```/g,"").trim();
  reply=reply.replace(/^(["“])|(["”])$/g,"").trim();
  if(!reply)throw new Error("The local model returned an empty reply.");
  a.dialogueHistory.push({role:"user",content:line},{role:"assistant",content:reply});if(a.dialogueHistory.length>16)a.dialogueHistory.splice(0,a.dialogueHistory.length-16);
  return reply;
}
let thinkingSfxTimer=null;
function startThinkingSfx(){stopThinkingSfx();playSfx("think");thinkingSfxTimer=setInterval(()=>playSfx("think"),1500)}
function stopThinkingSfx(){if(thinkingSfxTimer){clearInterval(thinkingSfxTimer);thinkingSfxTimer=null}}
async function sendDialogue(){
  if(!dialogueAgent||dialogueBusy)return;
  const input=document.getElementById("dialogueInput"),line=input.value.trim();
  if(!line)return;
  const a=dialogueAgent,output=document.getElementById("dialogueText"),button=document.getElementById("dialogueSend");input.value="";
  rememberImportantPlayerFact(a,line);
  deepenPlayerRelationship(a,true);
  dialogueBusy=true;input.disabled=true;button.disabled=true;
  try{
    if(llmConfig.backend==="browser-lite"&&!llmEngine){output.textContent="Loading the tiny villager mind for your first conversation…";startThinkingSfx();await initializeLocalLLM()}
    if(!llmConfig.enabled||!llmEngine){output.textContent=npcResponse(a,line);playSfx("talk");return}
    output.textContent=a.firstName+" considers your words…";
    startThinkingSfx();
    const reply=await llmDialogueResponse(a,line);
    stopThinkingSfx();
    if(dialogueAgent===a){output.textContent=reply;playSfx("talk")}
  }catch(error){
    stopThinkingSfx();
    if(dialogueAgent===a){output.textContent=npcResponse(a,line)+"\n\n[Local mind unavailable for this reply: "+String(error.message||error).slice(0,100)+"]";playSfx("talk")}
  }finally{stopThinkingSfx();dialogueBusy=false;input.disabled=false;button.disabled=false;if(dialogueAgent===a)input.focus()}
}
