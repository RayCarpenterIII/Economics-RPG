/* ============================================================
   ENTERABLE SPECIALTY SHOPS
   ============================================================ */
const SW=40,SH=25;
const SHOP_STYLE={
  warrior:{name:"Warrior Forge",floor:"#554536",wall:"#2e3035",accent:"#cf6547",bench:"FORGE"},
  mage:{name:"Arcane Atelier",floor:"#343b55",wall:"#252839",accent:"#7396ea",bench:"ENCHANT"},
  noble:{name:"Court Outfitter",floor:"#574c38",wall:"#332d28",accent:"#e0ad43",bench:"TAILOR"}
};
function generateShop(shop){
  const style=SHOP_STYLE[shop.specialty];shopCells=Array.from({length:SH},(_,y)=>Array.from({length:SW},(_,x)=>x===0||y===0||x===SW-1||y===SH-1?1:0));
  shopCells[SH-1][19]=0;shopCells[SH-1][20]=0;
  const blocks=[];
  if(shop.specialty==="warrior")blocks.push([7,6,5,2],[28,6,5,2],[8,16,4,2],[28,16,4,2]);
  if(shop.specialty==="mage")blocks.push([7,6,4,4],[29,6,4,4],[9,16,3,3],[28,16,3,3]);
  if(shop.specialty==="noble")blocks.push([6,6,7,2],[27,6,7,2],[7,16,6,2],[27,16,6,2]);
  for(const b of blocks)for(let y=b[1];y<b[1]+b[3];y++)for(let x=b[0];x<b[0]+b[2];x++)shopCells[y][x]=1;
  for(let y=3;y<=4;y++)for(let x=18;x<=21;x++)shopCells[y][x]=1;
  currentShop=Object.assign({},shop,{name:style.name,bench:{x:19.5*TILE,y:6*TILE},exit:{x:19.5*TILE,y:22.5*TILE}});
  shopCanvas=document.createElement("canvas");shopCanvas.width=SW*TILE;shopCanvas.height=SH*TILE;const c=shopCanvas.getContext("2d");
  for(let y=0;y<SH;y++)for(let x=0;x<SW;x++){
    c.fillStyle=shopCells[y][x]?style.wall:((x+y)%2?style.floor:"#"+(parseInt(style.floor.slice(1),16)+0x080808).toString(16).slice(-6));c.fillRect(x*TILE,y*TILE,TILE,TILE);
    if(shopCells[y][x]){c.fillStyle="rgba(255,255,255,.05)";c.fillRect(x*TILE,y*TILE,TILE,2)}
  }
  c.fillStyle=style.accent;c.fillRect(18*TILE,3*TILE,4*TILE,2*TILE);c.fillStyle="#eadfc7";c.font="7px monospace";c.textAlign="center";c.fillText(style.bench,20*TILE,4*TILE+11);
  c.strokeStyle=style.accent;c.lineWidth=2;
  if(shop.specialty==="warrior"){for(const x of [9,30]){c.beginPath();c.moveTo(x*TILE,7*TILE);c.lineTo((x+2)*TILE,5*TILE);c.stroke()}c.fillStyle="#dc7a48";c.fillRect(19*TILE,5*TILE,2*TILE,4)}
  if(shop.specialty==="mage"){for(const p of [[9,8],[31,8],[10,17],[30,17]]){c.beginPath();c.arc(p[0]*TILE,p[1]*TILE,6,0,Math.PI*2);c.stroke()}c.fillStyle="#b7c9ff";c.fillRect(19*TILE,5*TILE,2*TILE,3)}
  if(shop.specialty==="noble"){c.fillStyle="#7e2537";c.fillRect(15*TILE,8*TILE,10*TILE,12*TILE);c.strokeStyle="#e0ad43";c.strokeRect(15*TILE+.5,8*TILE+.5,10*TILE-1,12*TILE-1)}
  c.fillStyle="#15181e";c.fillRect(19*TILE,(SH-1)*TILE,2*TILE,TILE);c.fillStyle="#eadfc7";c.font="8px monospace";c.fillText("EXIT",20*TILE,(SH-1)*TILE-3);
}
function shopBlocked(px,py){
  const margin=3,points=[[px+margin,py+margin],[px+TILE-margin,py+margin],[px+margin,py+TILE-margin],[px+TILE-margin,py+TILE-margin]];
  return points.some(p=>{const x=Math.floor(p[0]/TILE),y=Math.floor(p[1]/TILE);return x<0||y<0||x>=SW||y>=SH||shopCells[y][x]===1});
}
function enterShop(town,shop){
  if(scene!=="world")return;returnPosition={x:player.x,y:player.y};generateShop(Object.assign({townName:town.name},shop));scene="shop";player.x=19.5*TILE;player.y=22*TILE;player.face={x:0,y:-1};closePanels();toast("You enter the "+currentShop.name+". Its specialty bench is ahead.");renderLedger();
}
function leaveShop(){scene="world";player.x=returnPosition.x;player.y=returnPosition.y+12;player.face={x:0,y:1};currentShop=null;shopCanvas=null;shopCells=null;closePanels();renderLedger();toast("You step back into the valley.")}
