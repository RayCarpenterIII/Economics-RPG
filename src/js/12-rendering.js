/* ============================================================
   RENDERING
   ============================================================ */
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
ctx.imageSmoothingEnabled=false;
const camera={x:0,y:0};
function updateCamera(){
  const width=(scene==="world"?MW:scene==="dungeon"?DW:SW)*TILE,height=(scene==="world"?MH:scene==="dungeon"?DH:SH)*TILE;
  camera.x=clamp(player.x-VW/2,0,Math.max(0,width-VW));
  camera.y=clamp(player.y-VH/2,0,Math.max(0,height-VH));
  if(screenShake>0){
    camera.x=clamp(camera.x+(rand()-.5)*screenShake,0,Math.max(0,width-VW));
    camera.y=clamp(camera.y+(rand()-.5)*screenShake,0,Math.max(0,height-VH));
  }
}
function drawPerson(x,y,color,bob,outlined=false,guard=null,child=false,motion=null){
  if(child){ctx.save();ctx.translate(x+2,y+6);ctx.scale(.72,.72);drawPerson(0,0,color,bob,outlined,null,false,motion);ctx.restore();return}
  const phase=motion?motion.walkTime:bob,move=motion?clamp(motion.move||0,0,1):1,step=Math.round(Math.sin(phase)*2*move),b=motion?Math.round(Math.abs(Math.cos(phase))*move):Math.round(Math.sin(bob)*1.3),face=motion?.face||{x:0,y:1},lean=motion?.attack?Math.round(face.x*2):0;
  ctx.save();ctx.translate(lean,0);
  if(outlined){ctx.strokeStyle="#eadfc7";ctx.strokeRect(x-3,y-2+b,16,20)}
  ctx.fillStyle="#20242c";ctx.fillRect(x+1+Math.max(0,step),y+12+b,3,4);ctx.fillRect(x+6+Math.min(0,step),y+12+b,3,4);
  ctx.fillStyle=color;ctx.fillRect(x,y+5+b,10,8);
  ctx.fillStyle="#b87f62";ctx.fillRect(x-2,y+6+b+step,2,5);ctx.fillRect(x+10,y+6+b-step,2,5);
  ctx.fillStyle="#dfb38b";ctx.fillRect(x+2,y+b,6,6);
  ctx.fillStyle="#20242c";
  if(Math.abs(face.x)>.55){const eyeX=face.x>0?x+6:x+3;ctx.fillRect(eyeX,y+2+b,1,1);ctx.fillRect(face.x>0?x+1:x+7,y+b,1,5)}else{ctx.fillRect(x+3,y+2+b,1,1);ctx.fillRect(x+6,y+2+b,1,1);if(face.y<-.3)ctx.fillRect(x+2,y+b,6,2)}
  if(guard){
    ctx.fillStyle="#737d8b";ctx.fillRect(x+1,y-1+b,8,3);
    ctx.fillStyle="#b7c1ce";ctx.fillRect(x-4,y+5+b,4,8);ctx.fillStyle="#4b5562";ctx.fillRect(x-3,y+7+b,2,4);
    ctx.fillStyle="#d8c38c";ctx.fillRect(x+11,y+1+b,1,14);ctx.fillRect(x+10,y+1+b,3,2);
    if(guard.guardHp<guard.guardMaxHp){
      ctx.fillStyle="#261f21";ctx.fillRect(x-3,y-6,16,2);ctx.fillStyle="#79c56b";ctx.fillRect(x-3,y-6,16*guard.guardHp/guard.guardMaxHp,2);
    }
  }
  if(motion?.harvest>0){
    const progress=1-motion.harvest/.30,base=Math.atan2(face.y,face.x),angle=base-1.15+clamp(progress,0,1)*2.3,handX=x+5+face.x*3,handY=y+8+b+face.y*3,length=motion.harvestKind==="forestry"?14:12;
    ctx.strokeStyle=motion.harvestKind==="mining"?"#aeb5b8":"#76502f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(handX+Math.cos(angle)*length,handY+Math.sin(angle)*length);ctx.stroke();ctx.lineWidth=1;
    ctx.fillStyle=motion.harvestKind==="mining"?"#d0d5d4":"#9fa8aa";ctx.fillRect(handX+Math.cos(angle)*length-2,handY+Math.sin(angle)*length-1,4,3);
  }
  ctx.restore();
}
function drawEnemy(e){
  const x=e.x-camera.x,y=e.y-camera.y;
  if(e.attackWindup>0){ctx.strokeStyle="#f0c969";ctx.beginPath();ctx.arc(x+5,y+6,11-e.attackWindup*18,0,Math.PI*2);ctx.stroke()}
  if(e.type==="rat"||e.type==="cave rat"){
    ctx.fillStyle="#c4a08a";ctx.fillRect(x-3,y+3,4,1);ctx.fillStyle=e.hurt>0?"#e6d0bd":e.color;ctx.fillRect(x,y,9,6);ctx.fillStyle="#171616";ctx.fillRect(x+7,y+1,1,1);
  }else if(e.type==="shade"){
    ctx.fillStyle=e.hurt>0?"#c6bdd5":e.color;ctx.fillRect(x+1,y+2,10,11);ctx.fillRect(x+3,y,6,5);ctx.fillStyle="#d8c66b";ctx.fillRect(x+4,y+3,1,1);ctx.fillRect(x+7,y+3,1,1);
  }else{
    ctx.fillStyle=e.hurt>0?"#edc79f":e.color;ctx.fillRect(x,y+5,15,13);ctx.fillStyle="#4a4546";ctx.fillRect(x+2,y,11,8);ctx.fillStyle="#e5b94f";ctx.fillRect(x+4,y+3,2,2);ctx.fillRect(x+9,y+3,2,2);
  }
  if(e.maxHp>2){
    ctx.fillStyle="#281f20";ctx.fillRect(x,y-5,Math.max(10,e.maxHp*2),3);
    ctx.fillStyle="#d96a5a";ctx.fillRect(x,y-5,Math.max(0,Math.max(10,e.maxHp*2)*e.hp/e.maxHp),3);
  }
}
function drawCaravan(c){
  const x=c.x-camera.x,y=c.y-camera.y;
  ctx.fillStyle="#6a4c32";ctx.fillRect(x,y+5,18,9);ctx.fillStyle="#b68a4b";ctx.fillRect(x+2,y,13,8);
  ctx.fillStyle="#29282a";ctx.fillRect(x+2,y+13,5,5);ctx.fillRect(x+12,y+13,5,5);
  ctx.fillStyle=CLASS_COLOR.noble;ctx.fillRect(x+7,y+2,2,4);
  if(c.protected){ctx.strokeStyle="#e2ad45";ctx.strokeRect(x-2,y-2,22,21)}
  ctx.fillStyle="#1e2025";ctx.fillRect(x,y-5,18,2);ctx.fillStyle="#79c56b";ctx.fillRect(x,y-5,18*c.hp/c.maxHp,2);
}
function contextualPrompt(){
  if(scene==="shop"){
    if(Math.hypot(player.x-currentShop.exit.x,player.y-currentShop.exit.y)<30)return "E · leave "+currentShop.name.toLowerCase();
    if(Math.hypot(player.x-currentShop.bench.x,player.y-currentShop.bench.y)<38)return "E · craft "+currentShop.specialty+" gear";
    return "Find the crafting bench";
  }
  if(scene==="dungeon"){
    if(Math.hypot(player.x-dungeon.entry.x,player.y-dungeon.entry.y)<25)return "E · climb out";
    if(Math.hypot(player.x-dungeon.chest.x,player.y-dungeon.chest.y)<29)return dungeon.wardenDead?"E · open Heart Vault":"The vault is sealed";
    return "";
  }
  if(Math.hypot(player.x-dungeon.entrance.x,player.y-dungeon.entrance.y)<30)return "E · enter old mine";
  for(const t of towns){
    const shop=t.shops.find(s=>Math.hypot(player.x-s.x,player.y-s.y)<18);if(shop)return "E · enter "+SHOP_STYLE[shop.specialty].name.toLowerCase();
    if(Math.hypot(player.x-t.marketPoint.x,player.y-t.marketPoint.y)<28)return "E · trade";
    if(Math.hypot(player.x-t.plot.x,player.y-t.plot.y)<30)return t.building?"E · inspect "+BUILDINGS[t.building].name.toLowerCase():"E · construct";
  }
  if(nearestAgent())return "E · talk";
  if(caravans.some(c=>Math.hypot(c.x-player.x,c.y-player.y)<28))return "E · inspect caravan";
  const resource=findGatherTarget();
  if(resource){
    if(!entityHasEquipment(player,resource.def.skill))return EQUIPMENT[resource.def.skill].name+" required";
    return resource.ready?"E · "+resource.def.verb:resource.def.name+" recovers day "+resource.state.readyDay;
  }
  return "";
}
function drawGatherHighlight(){
  const resource=findGatherTarget();if(!resource)return;
  const x=resource.x*TILE-camera.x,y=resource.y*TILE-camera.y;
  ctx.strokeStyle=resource.ready?"#f0cf72":"rgba(166,156,135,.45)";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,TILE-2,TILE-2);ctx.lineWidth=1;
  ctx.fillStyle=resource.ready?"#f0cf72":"#77736a";ctx.font="8px monospace";ctx.textAlign="center";
  ctx.fillText(MATERIAL_ICON[resource.def.index],x+8,y-3);
}
function drawCombatEffects(){
  for(const b of bolts){
    if(b.scene!==scene)continue;
    const x=b.x-camera.x,y=b.y-camera.y;if(b.kind==="orb"){ctx.fillStyle="rgba(109,137,255,.28)";ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#c9d7ff";ctx.fillRect(x-3,y-3,6,6);ctx.fillStyle="#715dcc";ctx.fillRect(x-1,y-1,3,3)}else if(b.kind==="star"){ctx.strokeStyle="#d9afff";ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke();ctx.fillStyle="#fff0ff";ctx.fillRect(x-1,y-1,3,3)}else{ctx.fillStyle="#c8d8ff";ctx.fillRect(x-3,y-1,7,3);ctx.fillRect(x-1,y-3,3,7);ctx.fillStyle="#7396ea";ctx.fillRect(x,y,2,2)}
  }
  for(const p of particles){
    if(p.scene!==scene)continue;
    if(p.ring){ctx.strokeStyle=p.color;ctx.beginPath();ctx.arc(p.x-camera.x,p.y-camera.y,p.r,0,Math.PI*2);ctx.stroke()}
    else if(p.glyph==="spark"){const x=p.x-camera.x,y=p.y-camera.y;ctx.fillStyle=p.color;ctx.fillRect(x-2,y,5,1);ctx.fillRect(x,y-2,1,5)}
    else if(p.glyph==="slash"){const x=p.x-camera.x,y=p.y-camera.y;ctx.strokeStyle=p.color;ctx.beginPath();ctx.moveTo(x-4,y+3);ctx.lineTo(x+4,y-3);ctx.stroke()}
    else{ctx.fillStyle=p.color;ctx.fillRect(p.x-camera.x,p.y-camera.y,2,2)}
  }
  if(player.swing>0){
    const m=mods(),duration=attackDurationFor(selectedClass,player.combo),progress=clamp(1-player.swing/duration,0,1),base=Math.atan2(player.face.y,player.face.x),x=player.x+5-camera.x,y=player.y+8-camera.y-(player.jumpZ||0);
    if(selectedClass==="mage"){
      const handX=x+player.face.x*8,handY=y+player.face.y*8,r=4+player.combo*1.5;ctx.strokeStyle=player.combo===3?"#d9afff":"#83bfff";ctx.beginPath();ctx.arc(handX,handY,r,base+progress*5,base+progress*5+Math.PI*1.5);ctx.stroke();for(let i=0;i<3;i++){const a=base+progress*6+i*Math.PI*2/3;ctx.fillStyle=i===0?"#fff0ff":"#85b9ff";ctx.fillRect(handX+Math.cos(a)*r-1,handY+Math.sin(a)*r-1,2,2)}
    }else if(selectedClass==="noble"){
      const length=(26+player.combo*4)*m.range,ease=Math.sin(progress*Math.PI);ctx.strokeStyle=player.combo===3?"#f0c969":"#e5e5ea";ctx.lineWidth=player.combo===3?2:1;ctx.beginPath();ctx.moveTo(x+player.face.x*4-player.face.y*2,y+player.face.y*4+player.face.x*2);ctx.lineTo(x+player.face.x*length*ease,y+player.face.y*length*ease);ctx.stroke();ctx.lineWidth=1;
    }else{
      const sweep=player.combo===2?2.55:1.95,angle=base-sweep/2+progress*sweep,length=(21+player.combo*3)*m.range;ctx.strokeStyle=player.combo===3?"#f0c969":"#e5e5ea";ctx.lineWidth=player.combo===3?4:3;ctx.beginPath();ctx.arc(x,y,length,angle-.28,angle+.12);ctx.stroke();ctx.lineWidth=1;
    }
  }
  const aimX=player.pointerAim?player.pointerX:player.x+5-camera.x+player.face.x*34;
  const aimY=player.pointerAim?player.pointerY:player.y+8-camera.y+player.face.y*34;
  if(selectedClass&&!activePanel){
    ctx.strokeStyle="rgba(234,223,199,.38)";ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(player.x+5-camera.x,player.y+8-camera.y);ctx.lineTo(aimX,aimY);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle="#eadfc7";ctx.beginPath();ctx.arc(aimX,aimY,5,0,Math.PI*2);
    ctx.moveTo(aimX-8,aimY);ctx.lineTo(aimX-3,aimY);ctx.moveTo(aimX+3,aimY);ctx.lineTo(aimX+8,aimY);
    ctx.moveTo(aimX,aimY-8);ctx.lineTo(aimX,aimY-3);ctx.moveTo(aimX,aimY+3);ctx.lineTo(aimX,aimY+8);ctx.stroke();
  }
}
function drawHUD(){
  ctx.fillStyle="rgba(15,18,24,.88)";ctx.fillRect(5,5,182,42);
  ctx.fillStyle="#eadfc7";ctx.font="8px monospace";ctx.textAlign="left";
  ctx.fillText((selectedClass?CLASS_ICON[selectedClass]+" "+selectedClass.toUpperCase():"TRAVELER")+"  HP "+player.hp+"/"+player.maxHp,10,16);
  ctx.fillStyle="#3b414c";ctx.fillRect(10,21,70,4);ctx.fillStyle="#d96a5a";ctx.fillRect(10,21,70*player.hp/player.maxHp,4);
  const packed=packBackpack();ctx.fillStyle="#a69c87";ctx.fillText("BAG "+packed.used+"/"+packed.capacity+"  KILLS "+kills,88,25);
  ctx.fillText("LV "+player.level+"  XP "+player.xp+"/"+xpNeeded(player.level),10,34);
  ctx.fillStyle="#3b414c";ctx.fillRect(88,30,88,4);
  ctx.fillStyle=player.guardBroken>0?"#df6c5d":"#8cc8d8";ctx.fillRect(88,30,88*player.stamina/mods().maxStamina,4);
  ctx.fillStyle="#a69c87";ctx.fillText(player.guardBroken>0?"GUARD BROKEN":"GUARD",88,43);
  const ability=selectedClass?CLASS_POWER[selectedClass].name:"";
  ctx.fillStyle=player.influenceDay<dayNo?"#79c56b":"#626873";ctx.fillText("Q "+ability,10,43);
  ctx.fillStyle="rgba(15,18,24,.88)";ctx.fillRect(VW-157,5,152,31);
  ctx.fillStyle="#eadfc7";ctx.textAlign="left";ctx.fillText("SUPPLIES "+materialCount(),VW-151,15);
  ctx.fillStyle="#a69c87";
  ctx.fillText("≈"+player.materials[0]+"  ♠"+player.materials[1]+"  ◆"+player.materials[2]+"  ✹"+player.materials[3],VW-151,28);
  const prompt=contextualPrompt();
  if(prompt){
    const width=Math.max(84,ctx.measureText(prompt).width+18);
    ctx.fillStyle="rgba(15,18,24,.91)";ctx.fillRect(VW/2-width/2,VH-28,width,17);
    ctx.fillStyle="#eadfc7";ctx.textAlign="center";ctx.fillText(prompt,VW/2,VH-17);
  }
  if(toastTimer>0){
    ctx.font="8px monospace";const width=Math.min(500,Math.max(190,ctx.measureText(toastText).width+24));
    ctx.fillStyle="rgba(15,18,24,.94)";ctx.fillRect(VW/2-width/2,42,width,19);
    ctx.fillStyle="#eadfc7";ctx.textAlign="center";ctx.fillText(toastText,VW/2,55);
  }
}
function render(){
  updateCamera();
  ctx.clearRect(0,0,VW,VH);
  const base=scene==="world"?worldCanvas:scene==="dungeon"?dungeonCanvas:shopCanvas;
  ctx.drawImage(base,camera.x,camera.y,VW,VH,0,0,VW,VH);
  if(scene==="world")drawGatherHighlight();
  const near=nearestAgent(),entities=[];
  if(scene==="world"){
    for(const a of agents){if(a.x<camera.x-30||a.x>camera.x+VW+30||a.y<camera.y-35||a.y>camera.y+VH+30)continue;entities.push({y:a.y,draw:()=>{drawPerson(a.x-camera.x,a.y-camera.y,CLASS_COLOR[a.combatClass]||CLASS_COLOR.peasant,a.bob,a===near&&!activePanel,a.isGuard?a:null,a.ageGroup==="child",{move:a.moveBlend,walkTime:a.bob,face:a.face,attack:a.isGuard&&a.guardAttackCd>.42});if(godMode){const urgent=NEED_NAMES.slice().sort((x,y)=>a.needs[y]-a.needs[x])[0];ctx.fillStyle="rgba(15,18,24,.82)";ctx.fillRect(a.x-camera.x-8,a.y-camera.y-12,28,7);ctx.fillStyle=a.needs[urgent]>70?"#df6c5d":"#e2ad45";ctx.font="6px monospace";ctx.textAlign="center";ctx.fillText(urgent.toUpperCase(),a.x-camera.x+6,a.y-camera.y-7)}}})}
    for(const c of caravans)entities.push({y:c.y,draw:()=>drawCaravan(c)});
  }
  for(const e of currentEnemies())entities.push({y:e.y,draw:()=>drawEnemy(e)});
  entities.push({y:player.y,draw:()=>{
    const lift=Math.round(player.jumpZ||0),squash=player.landingSquash>0?2:0;
    ctx.fillStyle="rgba(8,10,13,"+clamp(.38-lift/300,.16,.38)+")";ctx.beginPath();ctx.ellipse(player.x+5-camera.x,player.y+15-camera.y,Math.max(3,7-lift/22),Math.max(1,3-lift/55),0,0,Math.PI*2);ctx.fill();
    drawPerson(player.x-camera.x,player.y-camera.y-lift+squash,selectedClass?CLASS_COLOR[selectedClass]:"#eadfc7",player.walkTime,false,null,false,{move:player.moveBlend,walkTime:player.walkTime,face:player.face,attack:player.swing>0,harvest:player.harvestAnim,harvestKind:player.harvestKind});
    if(blocking()){
      const base=Math.atan2(player.face.y,player.face.x);
      ctx.strokeStyle=player.blockFresh>0?"#f4d979":"#a7d9e8";ctx.lineWidth=3;ctx.beginPath();
      ctx.arc(player.x+5-camera.x,player.y+8-camera.y-lift,14,base-.86,base+.86);ctx.stroke();ctx.lineWidth=1;
    }
  }});
  entities.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  drawCombatEffects();
  if(scene==="world"&&isNight()){ctx.fillStyle="rgba(10,14,48,.34)";ctx.fillRect(0,0,VW,VH)}
  if(scene==="dungeon"){
    const gradient=ctx.createRadialGradient(player.x-camera.x,player.y-camera.y,45,player.x-camera.x,player.y-camera.y,220);
    gradient.addColorStop(0,"rgba(0,0,0,0)");gradient.addColorStop(1,"rgba(0,0,0,.48)");ctx.fillStyle=gradient;ctx.fillRect(0,0,VW,VH);
  }
  if(player.hurt>0){ctx.fillStyle="rgba(180,40,30,"+(player.hurt*.28)+")";ctx.fillRect(0,0,VW,VH)}
  drawHUD();
}
