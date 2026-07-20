/* ============================================================
   MARKETS AND CONSTRUCTION
   ============================================================ */
const BUILDINGS={
  granary:{name:"Granary",icon:"▤",cost:{coins:10,relics:1,goods:[0,4,0,0],materials:[2,4,1,0]},desc:"Food decays slowly and local food output rises 18%."},
  watchpost:{name:"Watchpost",icon:"♜",cost:{coins:12,relics:1,goods:[1,4,0,1],materials:[0,4,3,2]},desc:"Road safety decays four points less each day and local Peasants may specialize as Warriors."},
  workshop:{name:"Workshop",icon:"⚒",cost:{coins:12,relics:1,goods:[0,3,1,0],materials:[0,5,4,1]},desc:"Shelter production rises 40% in this town."},
  academy:{name:"Academy Annex",icon:"✦",cost:{coins:14,relics:1,goods:[1,4,2,0],materials:[0,3,3,4]},desc:"Training production rises 40% and local Peasants may specialize as Mages."},
  court:{name:"Civic Court",icon:"♛",cost:{coins:14,relics:1,goods:[1,4,3,0],materials:[1,3,2,3]},desc:"A center of civic command where local Peasants may specialize as Nobles."}
};
function formatCost(cost){
  const parts=[cost.coins+" coins",cost.relics+" Heartstone"];
  cost.goods.forEach((q,i)=>{if(q)parts.push(q+" "+GOODS[i])});
  (cost.materials||[]).forEach((q,i)=>{if(q)parts.push(q+" "+MATERIALS[i])});
  return parts.join(" · ");
}
function canAfford(cost){
  return player.coins>=cost.coins&&player.relics>=cost.relics&&cost.goods.every((q,i)=>player.cargo[i]>=q)&&
    (cost.materials||[]).every((q,i)=>player.materials[i]>=q);
}
function construct(town,key){
  const b=BUILDINGS[key];
  if(town.building){toast(town.name+" has already committed its civic plot.");return}
  if(!canAfford(b.cost)){toast("You do not carry the required treasury and materials.");return}
  player.coins-=b.cost.coins;player.relics-=b.cost.relics;
  b.cost.goods.forEach((q,i)=>player.cargo[i]-=q);
  (b.cost.materials||[]).forEach((q,i)=>player.materials[i]-=q);
  town.building=key;quest.built=true;
  recordVillageEvent(town,"CONSTRUCTION",town.name+" completes the "+b.name+", changing which work and Specialties are possible.",{salience:10,emotion:"pride"});
  const specialty=Object.keys(SPECIALTY_BUILDING).find(cls=>SPECIALTY_BUILDING[cls]===key);
  if(specialty&&!town.shops.some(s=>s.key===key))town.shops.push({key,specialty,x:town.plot.x,y:town.plot.y+24});
  if(key==="watchpost")roadSafety=clamp(roadSafety+18,0,100);
  let specialized=false;for(const a of town.agents)specialized=updateAgentSpecialization(a)||specialized;
  closePanels();paintWorld();toast(b.name+" completed in "+town.name+(specialized?". Its Peasants have chosen their Specialty.":".") );
  updateUI();saveGame(true);
}
function openBuild(town){
  if(town.building){toast(town.name+" built a "+BUILDINGS[town.building].name+" here.");return}
  closePanels();activePanel="buildPanel";
  document.getElementById("buildTitle").textContent=town.name+" · CIVIC PLOT";
  const wrap=document.getElementById("buildCards");wrap.innerHTML="";
  Object.keys(BUILDINGS).forEach(key=>{
    const b=BUILDINGS[key],card=document.createElement("div");card.className="card";
    card.innerHTML='<div class="icon">'+b.icon+'</div><div class="name">'+b.name+'</div><div class="desc">'+b.desc+'</div><div class="cost">'+formatCost(b.cost)+'</div>';
    const btn=document.createElement("button");btn.className="uibtn";btn.textContent=canAfford(b.cost)?"Construct":"Missing materials";btn.disabled=!canAfford(b.cost);
    btn.addEventListener("click",()=>construct(town,key));card.appendChild(btn);wrap.appendChild(card);
  });
  document.getElementById("buildPanel").classList.add("open");
}
function marketMood(town){
  const m=town.market;
  if(m.shortage)return m.shortage+" is critically scarce; households are rationing.";
  if(m.avgUtility>m.lastUtility*1.05)return "Household utility rose after the latest clearing.";
  if(m.avgUtility<m.lastUtility*.95)return "Household utility fell after the latest clearing.";
  return "The market is clearing without a severe shortage.";
}
function openMarket(town){
  closePanels();activePanel="marketPanel";
  document.getElementById("marketTitle").textContent=town.name+" MARKET";
  document.getElementById("marketSummary").textContent=marketMood(town);
  renderMarket(town);document.getElementById("marketPanel").classList.add("open");
}
function renderMarket(town){
  const tbody=document.getElementById("marketRows");tbody.innerHTML="";
  GOODS.forEach((good,i)=>{
    const row=document.createElement("tr"),buy=town.market.prices[i]*1.05,sell=town.market.prices[i]*.95;
    row.innerHTML="<td>"+GOOD_ICON[i]+" "+good+"</td><td>"+town.market.prices[i].toFixed(2)+"</td><td>"+Math.floor(town.market.inventory[i])+"</td><td>"+Math.floor(player.cargo[i])+"</td>";
    const controls=document.createElement("td"),buyBtn=document.createElement("button"),sellBtn=document.createElement("button");
    buyBtn.className="uibtn mini";sellBtn.className="uibtn mini";
    buyBtn.textContent="Buy "+buy.toFixed(2);sellBtn.textContent="Sell "+sell.toFixed(2);
    buyBtn.disabled=town.market.inventory[i]<1||player.coins<buy||!canAddCargo(i,1);
    sellBtn.disabled=player.cargo[i]<1;
    buyBtn.addEventListener("click",()=>tradeGood(town,i,1));
    sellBtn.addEventListener("click",()=>tradeGood(town,i,-1));
    controls.appendChild(buyBtn);controls.appendChild(document.createTextNode(" "));controls.appendChild(sellBtn);
    row.appendChild(controls);tbody.appendChild(row);
  });
  const packed=packBackpack();document.getElementById("cargoLine").textContent="Backpack "+packed.used+"/"+packed.capacity+" slots · "+packed.overflow.length+" unpacked stacks · Coins "+player.coins.toFixed(1);
  renderMaterialMarket(town);renderEquipmentMarket(town);
}
function renderMaterialMarket(town){
  const wrap=document.getElementById("materialRows");wrap.innerHTML="";
  MATERIALS.forEach((name,i)=>{
    const price=materialPrice(town,i),box=document.createElement("div");box.className="materialTrade";
    const label=document.createElement("span");label.textContent=MATERIAL_ICON[i]+" "+name+" "+player.materials[i]+" · "+price.toFixed(2)+"c";
    const one=document.createElement("button"),all=document.createElement("button");one.className="uibtn mini";all.className="uibtn mini";
    one.textContent="Sell 1";all.textContent="Sell all";one.disabled=player.materials[i]<1;all.disabled=player.materials[i]<1;
    one.addEventListener("click",()=>sellMaterial(town,i,1));all.addEventListener("click",()=>sellMaterial(town,i,player.materials[i]));
    box.appendChild(label);box.appendChild(one);box.appendChild(all);wrap.appendChild(box);
  });
}
function sellMaterial(town,index,quantity){
  const amount=Math.min(quantity,player.materials[index]);if(amount<=0)return;
  const unit=materialPrice(town,index),payment=Math.min(unit*amount,town.market.treasury);
  const sold=Math.min(amount,Math.floor(payment/unit+1e-6));if(sold<=0){toast("The town treasury cannot buy more materials.");return}
  player.materials[index]-=sold;town.materialStock[index]+=sold;town.market.treasury-=unit*sold;player.coins+=unit*sold;
  toast("Sold "+sold+" "+MATERIALS[index]+" in "+town.name+".");renderMarket(town);updateUI();
}
function renderEquipmentMarket(town){
  const wrap=document.getElementById("equipmentRows");wrap.innerHTML="";
  Object.keys(EQUIPMENT).forEach(key=>{
    const item=EQUIPMENT[key],owned=entityHasEquipment(player,key),box=document.createElement("div");box.className="materialTrade";
    const size=PACK_DEFS["tool_"+key];const label=document.createElement("span");label.textContent=item.icon+" "+item.name+" · "+size.w+"×"+size.h+" slots · "+(owned?"owned":item.price+"c");
    const buy=document.createElement("button");buy.className="uibtn mini";buy.textContent=owned?"Owned":canAcquireTool(key)?"Buy":"No space";buy.disabled=owned||player.coins<item.price||!canAcquireTool(key);
    buy.addEventListener("click",()=>buyEquipment(town,key));box.appendChild(label);box.appendChild(buy);wrap.appendChild(box);
  });
}
function buyEquipment(town,key){
  const item=EQUIPMENT[key];if(entityHasEquipment(player,key)||player.coins<item.price)return;
  if(!canAcquireTool(key)){toast("The "+item.name+" will not fit in your backpack.");return}
  player.coins-=item.price;player.equipment[key]=true;
  toast("Bought "+item.name+". The "+LIFE_SKILLS[key].name+" tree is now available.");renderMarket(town);updateUI();saveGame(true);
}
function tradeGood(town,i,direction){
  const m=town.market;
  if(direction>0){
    const price=m.prices[i]*1.05;
    if(m.inventory[i]<1||player.coins<price||!canAddCargo(i,1))return;
    player.coins-=price;m.treasury+=price;m.inventory[i]-=1;player.cargo[i]+=1;m.prices[i]*=1.012;
    player.tradeOrigins[i]=town.name;
  }else{
    if(player.cargo[i]<1)return;
    const price=m.prices[i]*.95,payment=Math.min(price,m.treasury);
    player.coins+=payment;m.treasury-=payment;m.inventory[i]+=1;player.cargo[i]-=1;m.prices[i]*=.99;
    if(player.tradeOrigins[i]&&player.tradeOrigins[i]!==town.name){const first=!quest.traded;quest.traded=true;if(first)gainPlayerXP(5,"trade")}
    if(player.cargo[i]<=0)player.tradeOrigins[i]=null;
  }
  playSfx("coin");renderMarket(town);renderLedger();updateUI();
}
