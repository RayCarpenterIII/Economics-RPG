/* ============================================================
   DUNGEON: THE OLD MINE
   ============================================================ */
const DW=40,DH=25;
function generateDungeon(){
  const cells=Array.from({length:DH},()=>Array(DW).fill(1));
  const carveRoom=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)cells[yy][xx]=0};
  carveRoom(1,9,8,8);carveRoom(8,11,11,4);carveRoom(17,6,11,13);carveRoom(27,11,7,4);carveRoom(32,5,7,15);
  for(let y=8;y<=16;y++)cells[y][22]=1;
  cells[12][22]=0;cells[13][22]=0;
  dungeon.cells=cells;dungeon.entry={x:3*TILE,y:12*TILE};dungeon.chest={x:36*TILE,y:12*TILE};
  dungeon.cleared=false;dungeon.chestOpened=false;dungeon.wardenDead=false;
  paintDungeon();
  dungeonEnemies=[];
  const spawns=[
    ["cave rat",11,12],["cave rat",15,13],["shade",19,9],["shade",25,16],
    ["cave rat",25,8],["shade",30,12],["warden",35,12]
  ];
  for(const s of spawns)spawnEnemy(s[0],s[1]*TILE,s[2]*TILE,true);
}
function paintDungeon(){
  dungeonCanvas=document.createElement("canvas");dungeonCanvas.width=DW*TILE;dungeonCanvas.height=DH*TILE;
  const w=dungeonCanvas.getContext("2d");
  for(let y=0;y<DH;y++)for(let x=0;x<DW;x++){
    const px=x*TILE,py=y*TILE;
    if(dungeon.cells[y][x]){
      w.fillStyle=(x+y)%2?"#292b33":"#2d3038";w.fillRect(px,py,TILE,TILE);
      w.fillStyle="#3a3e48";w.fillRect(px+2,py+2,12,4);w.fillStyle="#1e2026";w.fillRect(px,py+13,TILE,3);
    }else{
      w.fillStyle=(x+y)%2?"#4b4948":"#454445";w.fillRect(px,py,TILE,TILE);
      w.fillStyle="#565251";w.fillRect(px+3,py+4,2,2);w.fillRect(px+11,py+10,2,2);
    }
  }
  w.fillStyle="#9e8e69";w.fillRect(dungeon.entry.x,dungeon.entry.y,16,16);
  w.fillStyle="#544b39";for(let i=0;i<4;i++)w.fillRect(dungeon.entry.x+2,dungeon.entry.y+3+i*3,12,1);
  w.fillStyle="#9a6b32";w.fillRect(dungeon.chest.x-5,dungeon.chest.y-3,20,14);w.fillStyle="#d2ac52";w.fillRect(dungeon.chest.x-5,dungeon.chest.y+1,20,3);
  w.fillStyle="#eadfc7";w.font="7px monospace";w.textAlign="center";w.fillText("HEART VAULT",dungeon.chest.x+5,dungeon.chest.y-8);
}

function dungeonBlocked(px,py){
  const margin=3,points=[[px+margin,py+margin],[px+TILE-margin,py+margin],[px+margin,py+TILE-margin],[px+TILE-margin,py+TILE-margin]];
  return points.some(p=>{
    const x=Math.floor(p[0]/TILE),y=Math.floor(p[1]/TILE);
    return x<0||y<0||x>=DW||y>=DH||dungeon.cells[y][x]===1;
  });
}
function enterDungeon(){
  if(scene!=="world")return;
  returnPosition={x:player.x,y:player.y};scene="dungeon";
  player.x=dungeon.entry.x;player.y=dungeon.entry.y;player.face={x:1,y:0};
  closePanels();toast("The air below tastes of iron. The Heart Vault lies east.");
}
function leaveDungeon(){
  scene="world";player.x=returnPosition.x;player.y=returnPosition.y+18;player.face={x:0,y:1};
  closePanels();toast(dungeon.chestOpened?"You return carrying the mine's Heartstone.":"You climb back into the valley.");
}
function openDungeonChest(){
  if(dungeon.chestOpened){toast("The Heart Vault stands empty.");return}
  if(!dungeon.wardenDead){toast("The iron seal holds. Something deeper still guards it.");return}
  dungeon.chestOpened=true;dungeon.cleared=true;quest.dungeon=true;
  player.coins+=20;player.relics+=1;
  const reward=[3,4,2,3];
  let stored=0;for(let i=0;i<4;i++)for(let q=0;q<reward[i];q++)if(canAddCargo(i,1)){player.cargo[i]++;stored++}
  toast("Heartstone recovered: +20 coins and "+stored+" supplies packed"+(stored<reward.reduce((a,b)=>a+b,0)?"; the rest would not fit.":"."));
  updateUI();saveGame(true);
}
