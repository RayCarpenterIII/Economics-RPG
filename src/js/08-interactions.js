/* ============================================================
   CONTEXTUAL INTERACTION
   ============================================================ */
function nearestAgent(){
  if(scene!=="world")return null;
  let best=null,bestDistance=25;
  for(const a of agents){const d=Math.hypot(a.x-player.x,a.y-player.y);if(d<bestDistance){best=a;bestDistance=d}}
  return best;
}
function closePanels(){
  document.querySelectorAll(".overlay.open").forEach(el=>el.classList.remove("open"));
  if(dialogueAgent){dialogueAgent.paused=false;dialogueAgent=null}
  activePanel=null;document.getElementById("dialogueInput").blur();
}
function interact(){
  if(!selectedClass)return;
  if(activePanel){closePanels();return}
  if(scene==="shop"){
    if(Math.hypot(player.x-currentShop.exit.x,player.y-currentShop.exit.y)<30){leaveShop();return}
    if(Math.hypot(player.x-currentShop.bench.x,player.y-currentShop.bench.y)<38){openMenu("crafting");return}
    toast("The displays are beautiful, but the crafting bench is at the front of the shop.");return;
  }
  if(scene!=="world"){
    if(Math.hypot(player.x-dungeon.entry.x,player.y-dungeon.entry.y)<25){leaveDungeon();return}
    if(Math.hypot(player.x-dungeon.chest.x,player.y-dungeon.chest.y)<28){openDungeonChest();return}
    toast("The mine answers only with dripping stone.");return;
  }
  if(Math.hypot(player.x-dungeon.entrance.x,player.y-dungeon.entrance.y)<30){enterDungeon();return}
  for(const town of towns){
    const shop=town.shops.find(s=>Math.hypot(player.x-s.x,player.y-s.y)<18);if(shop){enterShop(town,shop);return}
    if(Math.hypot(player.x-town.marketPoint.x,player.y-town.marketPoint.y)<28){openMarket(town);return}
    if(Math.hypot(player.x-town.plot.x,player.y-town.plot.y)<30){openBuild(town);return}
  }
  const a=nearestAgent();if(a){openDialogue(a);return}
  const c=caravans.find(c=>Math.hypot(c.x-player.x,c.y-player.y)<28);
  if(c){toast(c.from.name+" caravan: "+c.qty+" "+GOODS[c.good]+" bound for "+c.to.name+".");return}
  if(gatherNearby())return;
  toast("Nothing here needs your attention.");
}
