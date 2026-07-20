/* ============================================================
   PROCEDURAL VALLEY
   ============================================================ */
const HOUSE_CANDIDATES=[{dx:1,dy:1},{dx:4,dy:1},{dx:7,dy:1},{dx:10,dy:1},{dx:13,dy:1},{dx:1,dy:9},{dx:4,dy:9},{dx:7,dy:9}];
const REGIONAL_NAMES=["BRAMBLEWICK","GREYHAVEN","MOSSREACH","STARLING","HOLLOWMERE","IRONBROOK"];
const TOWN_THEMES=[
  "a river settlement of fishers, reed-cutters, and patient traders",
  "a wooded village whose households prize timber, shelter, and old craft",
  "a highland market built around ore, training, and dangerous roads",
  "a windswept crossroads where caravans and hunters exchange hard-won goods"
];
const FACILITY_VISUAL={
  watchpost:{label:"WATCH",roof:"#647381",wall:"#aab2be"},academy:{label:"ACADEMY",roof:"#586ca8",wall:"#aeb9d8"},
  court:{label:"COURT",roof:"#a87d2c",wall:"#c8b087"},granary:{label:"GRAIN",roof:"#9c5b38",wall:"#b59668"},
  workshop:{label:"WORKSHOP",roof:"#8d6f4d",wall:"#aa9c88"},hall:{label:"HALL",roof:"#6c4a37",wall:"#a99479"}
};
function shuffled(list){
  const copy=list.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy;
}
function makeTownLayout(town,houseCount){
  const chosen=shuffled(HOUSE_CANDIDATES).slice(0,houseCount);
  town.houses=chosen.map((h,i)=>({id:i,dx:h.dx,dy:h.dy,x:(town.rx+h.dx)*TILE,y:(town.ry+h.dy)*TILE,capacity:4,residentIds:[],entry:{x:(town.rx+h.dx+.7)*TILE,y:(town.ry+h.dy+2.15)*TILE}}));
  const visible=town.facilities.length?town.facilities.slice(0,3):["hall"];
  const buildings=visible.map((key,i)=>Object.assign({dx:3+i*4,dy:4,w:3,h:2,key},FACILITY_VISUAL[key]));
  town.shops=buildings.filter(b=>Object.values(SPECIALTY_BUILDING).includes(b.key)).map(b=>({key:b.key,specialty:Object.keys(SPECIALTY_BUILDING).find(cls=>SPECIALTY_BUILDING[cls]===b.key),x:(town.rx+b.dx+1.5)*TILE,y:(town.ry+b.dy+b.h+.35)*TILE}));
  town.layout={buildings,stalls:[[7,7],[9,7]],sites:{food:{dx:2.3,dy:7},status:{dx:5.2,dy:7},training:{dx:11.2,dy:7},shelter:{dx:13.7,dy:7}},market:{dx:8.2,dy:7.8},plot:{dx:11.2,dy:8.3}};
  Object.keys(town.layout.sites).forEach(k=>town.sites[k]={x:(town.rx+town.layout.sites[k].dx)*TILE,y:(town.ry+town.layout.sites[k].dy)*TILE});
  town.marketPoint={x:(town.rx+town.layout.market.dx)*TILE,y:(town.ry+town.layout.market.dy)*TILE};
  town.homePoints=town.houses.map(h=>h.entry);town.plot={x:(town.rx+town.layout.plot.dx)*TILE,y:(town.ry+town.layout.plot.dy)*TILE};
}
function assignHouse(a,town,preferredId=null){
  let house=preferredId!==null?town.houses.find(h=>h.id===preferredId&&h.residentIds.length<h.capacity):null;
  if(!house)house=town.houses.find(h=>h.residentIds.length<h.capacity);
  if(!house)return false;
  house.residentIds.push(a.id);a.houseId=house.id;a.home={x:house.entry.x,y:house.entry.y};return true;
}
function releaseHouse(a){
  if(!a.town||!a.town.houses)return;
  const house=a.town.houses.find(h=>h.id===a.houseId);if(house)house.residentIds=house.residentIds.filter(id=>id!==a.id);
}
function townHasHousing(town){return town.houses.some(h=>h.residentIds.length<h.capacity)}
function formFamilies(town){
  for(const house of town.houses){
    const family=town.agents.filter(a=>house.residentIds.includes(a.id)),surname=HOUSEHOLD_NAMES[(town.id*5+house.id+Math.floor(rand()*HOUSEHOLD_NAMES.length))%HOUSEHOLD_NAMES.length];
    family.forEach(a=>{a.familyName=surname;a.spouseId=null;a.parentIds=[];a.childrenIds=[];a.ageGroup="adult"});
    if(family.length===1){const a=family[0];a.gender=rand()<.5?"man":"woman";a.age=22+Math.floor(rand()*35)}
    if(family.length>=2){
      const husband=family[0],wife=family[1];husband.gender="man";wife.gender="woman";husband.age=28+Math.floor(rand()*25);wife.age=25+Math.floor(rand()*24);husband.spouseId=wife.id;wife.spouseId=husband.id;
      for(const child of family.slice(2)){child.ageGroup="child";child.age=6+Math.floor(rand()*11);child.gender=rand()<.5?"boy":"girl";child.parentIds=[husband.id,wife.id];husband.childrenIds.push(child.id);wife.childrenIds.push(child.id)}
    }
    family.forEach(a=>{a.name=a.firstName+" "+surname+" of "+townTitle(town.name)});
  }
}
function roadKey(from,to){return from.id+">"+to.id}
function roadBetween(from,to){return (roadPaths.get(roadKey(from,to))||[]).map(p=>({x:p.x,y:p.y}))}

function makeNoise(noiseSeed){
  const r=seeded(noiseSeed),G=40,grid=new Float32Array(G*G);
  for(let i=0;i<grid.length;i++)grid[i]=r();
  const at=(x,y)=>grid[((y%G+G)%G)*G+((x%G+G)%G)];
  return function(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const a=at(ix,iy),b=at(ix+1,iy),c=at(ix,iy+1),d=at(ix+1,iy+1);
    return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
  };
}
function generateWorld(newSeed){
  seed=newSeed>>>0;rand=seeded(seed);tiles=Array.from({length:MH},()=>Array(MW).fill(0));solid=new Set();
  const height=makeNoise(seed),moist=makeNoise(seed^0x9e3779b9);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const h=.64*height(x/12,y/12)+.36*height(x/4+33,y/4+33),m=moist(x/8+7,y/8+7);
    const detail=((x*73856093)^(y*19349663)^seed)>>>0;
    let t;
    if(h<.30)t=2;else if(h<.365)t=3;else if(h>.79||(h>.72&&m<.48))t=4;
    else if(m>.70)t=1;else if(m>.62&&h<.55)t=13;else if(h>.65)t=14;
    else if(m<.31)t=15;else if(m>.53&&detail%11===0)t=12;else if(detail%4===0)t=11;else t=0;
    tiles[y][x]=t;if(t===1||t===2||t===4)solid.add(keyOf(x,y));
  }
  const spots=[[3+Math.floor(rand()*3),4+Math.floor(rand()*3)],[51+Math.floor(rand()*3),4+Math.floor(rand()*4)],[47+Math.floor(rand()*5),31+Math.floor(rand()*3)]];
  const thirdName=REGIONAL_NAMES[Math.floor(rand()*REGIONAL_NAMES.length)];
  towns=[];
  spots.forEach((spot,index)=>{
    const rx=spot[0],ry=spot[1],name=index===0?"EGG LANDS":index===1?"DUSKMERE":thirdName,isCapital=index===0;
    for(let y=ry;y<ry+TOWN_H;y++)for(let x=rx;x<rx+TOWN_W;x++){tiles[y][x]=7;solid.delete(keyOf(x,y))}
    const dominant=isCapital?0:Math.floor(rand()*4),advantages={};
    GOODS.forEach((g,i)=>advantages[g]=isCapital?[1.24,1.08,1.03,1.10][i]:(i===dominant?1.45:.78+rand()*.34));
    const initial=isCapital?{prices:[.78,.92,1.28,1.34],inventory:[38,32,27,27]}:{prices:GOODS.map((g,i)=>clamp(1.45/advantages[g]+rand()*.25,.55,1.85)),inventory:GOODS.map((g,i)=>8+Math.floor(rand()*18)+(i===dominant?10:0))};
    let facilities;if(isCapital)facilities=["watchpost","academy","court"];
    else{const pool=shuffled(["watchpost","academy","court","granary","workshop"]),count=Math.floor(rand()*3);facilities=pool.slice(0,count)}
    const population=isCapital?4:3,houseCount=1;
    const town={id:index,name,rx,ry,cx:(rx+8)*TILE,cy:(ry+6)*TILE,isCapital,populationTarget:population,agents:[],market:new Market(initial),sites:{},homePoints:[],houses:[],
      building:null,facilities,advantages,dominantGood:GOODS[dominant],theme:isCapital?"the old capital, where three martial traditions meet a crowded regional market":TOWN_THEMES[Math.floor(rand()*TOWN_THEMES.length)],materialStock:[8,10,6,4],walls:{placed:0,complete:false}};
    makeTownLayout(town,houseCount);
    for(const b of town.layout.buildings)for(let yy=0;yy<b.h;yy++)for(let xx=0;xx<b.w;xx++)solid.add(keyOf(rx+b.dx+xx,ry+b.dy+yy));
    for(const h of town.houses)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)solid.add(keyOf(rx+h.dx+xx,ry+h.dy+yy));
    for(const stall of town.layout.stalls)solid.add(keyOf(rx+stall[0],ry+stall[1]));
    towns.push(town);
  });
  function carve(x,y,type=5){
    if(x<0||y<0||x>=MW||y>=MH)return;
    if(!towns.some(t=>x>=t.rx&&x<t.rx+TOWN_W&&y>=t.ry&&y<t.ry+TOWN_H))tiles[y][x]=type;
    solid.delete(keyOf(x,y));
  }
  roadPaths=new Map();valleyRoad=[];
  const carveRoad=(from,to)=>{
    let x=Math.round(from.marketPoint.x/TILE),y=Math.round(from.marketPoint.y/TILE),tx=Math.round(to.marketPoint.x/TILE),ty=Math.round(to.marketPoint.y/TILE),cells=[];
    while(x!==tx||y!==ty){
      carve(x,y,tiles[y][x]===2?6:5);cells.push({x,y});const dx=tx-x,dy=ty-y;
      if(rand()<Math.abs(dx)/(Math.abs(dx)+Math.abs(dy)||1))x+=Math.sign(dx);else y+=Math.sign(dy);
    }
    carve(tx,ty);cells.push({x:tx,y:ty});const path=cells.map(p=>({x:p.x*TILE,y:p.y*TILE}));
    roadPaths.set(roadKey(from,to),path);roadPaths.set(roadKey(to,from),path.slice().reverse());valleyRoad.push(...path);
  };
  carveRoad(towns[0],towns[1]);carveRoad(towns[0],towns[2]);carveRoad(towns[1],towns[2]);
  let x=36,y=12;const mid=valleyRoad.reduce((best,p)=>Math.hypot(p.x/TILE-36,p.y/TILE-12)<Math.hypot(best.x/TILE-36,best.y/TILE-12)?p:best,valleyRoad[0]);
  const caveTile={x:36,y:12};
  x=Math.round(mid.x/TILE);y=Math.round(mid.y/TILE);
  while(x!==caveTile.x||y!==caveTile.y){
    carve(x,y);if(x!==caveTile.x)x+=Math.sign(caveTile.x-x);else y+=Math.sign(caveTile.y-y);
  }
  for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)carve(caveTile.x+xx,caveTile.y+yy,3);
  resourceLandmarks=[
    {x:25,y:5,tile:2,label:"FISHING POND"},
    {x:28,y:30,tile:1,label:"TIMBER GROVE"},
    {x:45,y:43,tile:4,label:"MOUNTAIN QUARRY"}
  ];
  for(const site of resourceLandmarks){
    for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++){
      const gx=site.x+xx,gy=site.y+yy;if(gx<1||gy<1||gx>=MW-1||gy>=MH-1)continue;
      tiles[gy][gx]=0;solid.delete(keyOf(gx,gy));
    }
    const pattern=site.tile===1?[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]]:[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];
    for(const p of pattern){const gx=site.x+p[0],gy=site.y+p[1];tiles[gy][gx]=site.tile;solid.add(keyOf(gx,gy))}
  }
  dungeon.entrance={x:caveTile.x*TILE,y:caveTile.y*TILE};
  resourceNodes={
    fishing:{index:0,x:25*TILE+8,y:5*TILE+8,label:"the fishing pond",stock:60,max:60,regen:9},
    forestry:{index:1,x:28*TILE+8,y:30*TILE+8,label:"the timber grove",stock:80,max:80,regen:7},
    mining:{index:2,x:45*TILE+8,y:43*TILE+8,label:"the mountain quarry",stock:90,max:90,regen:5},
    hunting:{index:3,x:dungeon.entrance.x+8,y:dungeon.entrance.y+44,label:"the wild range",stock:45,max:45,regen:6}
  };
  agents=[];let id=0;
  for(const town of towns){
    const residentTypes=["warrior","mage","noble","builder"];
    const roster=town.isCapital?residentTypes.slice():Array.from({length:town.populationTarget},(_,i)=>residentTypes[(i+town.id)%residentTypes.length]);
    roster.forEach((cls,i)=>{
      const a=new Agent(id++,cls,town);assignHouse(a,town);
      a.x=a.home.x+(rand()*8-4);a.y=a.home.y+(rand()*6-3);
      town.agents.push(a);agents.push(a);
    });
    formFamilies(town);town.agents.forEach(a=>updateAgentSpecialization(a));
  }
  initializeLivingWorld(true);
  paintWorld();
}

function insideTownBounds(x,y,marginTiles=0){
  return towns.some(t=>x+TILE>(t.rx-marginTiles)*TILE&&x<(t.rx+TOWN_W+marginTiles)*TILE&&y+TILE>(t.ry-marginTiles)*TILE&&y<(t.ry+TOWN_H+marginTiles)*TILE);
}
function worldSpawnPoint(){
  const capital=towns[0],paths=towns.slice(1).flatMap(t=>roadPaths.get(roadKey(capital,t))||[]);
  const candidates=paths.filter(p=>!insideTownBounds(p.x,p.y,1)&&!sceneBlocked(p.x,p.y)).sort((a,b)=>Math.hypot(a.x-capital.cx,a.y-capital.cy)-Math.hypot(b.x-capital.cx,b.y-capital.cy));
  if(candidates.length)return {x:candidates[0].x,y:candidates[0].y};
  for(let radius=1;radius<Math.max(MW,MH);radius++)for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const px=x*TILE,py=y*TILE;if(Math.abs(x-capital.rx)>radius||Math.abs(y-capital.ry)>radius)continue;
    if(!insideTownBounds(px,py,1)&&!sceneBlocked(px,py))return {x:px,y:py};
  }
  return {x:capital.cx,y:(capital.ry+TOWN_H+2)*TILE};
}
function placePlayerAtWorldSpawn(){
  scene="world";const spawn=worldSpawnPoint();player.x=spawn.x;player.y=spawn.y;player.face={x:0,y:1};player.jumpZ=0;player.jumpV=0;player.jumpsUsed=0;
}

function paintWorld(){
  worldCanvas=document.createElement("canvas");worldCanvas.width=MW*TILE;worldCanvas.height=MH*TILE;
  const w=worldCanvas.getContext("2d");
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const t=tiles[y][x],px=x*TILE,py=y*TILE;
    if(t===2){w.fillStyle="#1c3b58";w.fillRect(px,py,TILE,TILE);w.fillStyle=(x+y)%3?"#315f80":"#3f6d98";w.fillRect(px+((x*5+y*3)%8),py+4+((x+y)%7),6,1)}
    else if(t===3){w.fillStyle="#c4ac77";w.fillRect(px,py,TILE,TILE);w.fillStyle="#a99162";w.fillRect(px+3,py+4,2,2);w.fillRect(px+10,py+11,2,2)}
    else if(t===4){w.fillStyle="#575e69";w.fillRect(px,py,TILE,TILE);w.fillStyle="#414750";w.fillRect(px,py+10,TILE,6);w.fillStyle="#7a818c";w.fillRect(px+3,py+2,6,4)}
    else if(t===5){w.fillStyle="#9c7d50";w.fillRect(px,py,TILE,TILE);w.fillStyle="#81623e";w.fillRect(px+3,py+3,2,2);w.fillRect(px+11,py+10,2,2)}
    else if(t===6){w.fillStyle="#21425e";w.fillRect(px,py,TILE,TILE);w.fillStyle="#8b6a41";w.fillRect(px,py+2,TILE,12);w.fillStyle="#634b30";for(let i=0;i<4;i++)w.fillRect(px+i*4+1,py+2,1,12)}
    else if(t===7){w.fillStyle=(x+y)%2?"#8d7a56":"#96825c";w.fillRect(px,py,TILE,TILE)}
    else if(t===8){w.fillStyle="#5c452b";w.fillRect(px,py,TILE,TILE);w.fillStyle="#6f5636";for(let i=0;i<4;i++)w.fillRect(px+i*4+1,py,2,TILE);w.fillStyle="#83683f";w.fillRect(px,py,TILE,2);w.fillStyle="#3d2d1b";w.fillRect(px,py+TILE-3,TILE,3)}
    else if(t===9){w.fillStyle="#315039";w.fillRect(px,py,TILE,TILE);w.fillStyle="#49331f";w.fillRect(px+5,py+9,7,5);w.fillStyle="#8c6940";w.fillRect(px+6,py+8,5,2);w.fillStyle="#2a251d";w.fillRect(px+8,py+9,1,1)}
    else if(t===10){w.fillStyle="#4a4d4b";w.fillRect(px,py,TILE,TILE);w.fillStyle="#777b78";w.fillRect(px+2,py+10,5,3);w.fillRect(px+9,py+6,4,4);w.fillStyle="#323634";w.fillRect(px+7,py+13,6,2)}
    else if(t===11){w.fillStyle=(x+y)%2?"#3a5b3c":"#365438";w.fillRect(px,py,TILE,TILE);w.fillStyle="#54734b";w.fillRect(px+3,py+7,1,5);w.fillRect(px+11,py+3,1,4);w.fillRect(px+7,py+11,1,3)}
    else if(t===12){w.fillStyle="#34533a";w.fillRect(px,py,TILE,TILE);w.fillStyle=(x+y)%2?"#d6b6df":"#e5d070";w.fillRect(px+4,py+5,2,2);w.fillRect(px+11,py+10,2,2);w.fillStyle="#79a65b";w.fillRect(px+5,py+7,1,3)}
    else if(t===13){w.fillStyle="#385047";w.fillRect(px,py,TILE,TILE);w.fillStyle="#263e3c";w.fillRect(px+1,py+9,9,3);w.fillStyle="#5e7256";w.fillRect(px+12,py+3,1,7);w.fillRect(px+3,py+2,1,5)}
    else if(t===14){w.fillStyle=(x+y)%2?"#4b5945":"#465340";w.fillRect(px,py,TILE,TILE);w.fillStyle="#80705f";w.fillRect(px+3,py+5,3,2);w.fillRect(px+10,py+11,2,2);w.fillStyle="#756284";w.fillRect(px+11,py+4,2,2)}
    else if(t===15){w.fillStyle=(x+y)%2?"#66704a":"#606b46";w.fillRect(px,py,TILE,TILE);w.fillStyle="#898258";w.fillRect(px+2,py+4,1,5);w.fillRect(px+8,py+9,1,4);w.fillRect(px+13,py+2,1,3)}
    else{w.fillStyle=(x+y)%2?"#315039":"#2d4934";w.fillRect(px,py,TILE,TILE);if((x*11+y*17)%9===0){w.fillStyle="#25402c";w.fillRect(px+6,py+9,2,2)}if(t===1){w.fillStyle="#4a3524";w.fillRect(px+6,py+8,4,8);w.fillStyle="#213a27";w.fillRect(px+2,py,12,10);w.fillStyle="#2b5135";w.fillRect(px+4,py+2,8,6);w.fillStyle="#386344";w.fillRect(px+6,py+1,4,3)}}
  }
  for(const town of towns){
    for(const b of town.layout.buildings){
      const bx=(town.rx+b.dx)*TILE,by=(town.ry+b.dy)*TILE;
      w.fillStyle=b.wall;w.fillRect(bx,by+TILE,b.w*TILE,(b.h-1)*TILE);
      w.fillStyle=b.roof;w.fillRect(bx,by,b.w*TILE,TILE+7);
      w.fillStyle="rgba(0,0,0,.25)";w.fillRect(bx,by+TILE+7,b.w*TILE,3);
      w.fillStyle="#392b21";w.fillRect(bx+Math.floor(b.w/2)*TILE+4,by+(b.h-1)*TILE+4,8,12);
      w.fillStyle="#eadfc7";w.font="7px monospace";w.textAlign="center";w.fillText(b.label,bx+b.w*TILE/2,by-2);
    }
    for(const h of town.houses){
      const hx=(town.rx+h.dx)*TILE,hy=(town.ry+h.dy)*TILE;
      w.fillStyle="#8f8272";w.fillRect(hx,hy+TILE,32,16);w.fillStyle="#6c4a37";w.fillRect(hx-2,hy,36,22);w.fillStyle="#392b21";w.fillRect(hx+11,hy+20,8,12);
      w.fillStyle="#eadfc7";w.font="6px monospace";w.textAlign="center";w.fillText(h.residentIds.length+"/4",hx+16,hy-2);
    }
    for(const stall of town.layout.stalls){
      const px=(town.rx+stall[0])*TILE,py=(town.ry+stall[1])*TILE;
      for(let i=0;i<4;i++){w.fillStyle=i%2?"#eadfc7":"#c75f44";w.fillRect(px+i*4,py,4,7)}
      w.fillStyle="#775a38";w.fillRect(px+2,py+7,2,9);w.fillRect(px+12,py+7,2,9);w.fillRect(px+1,py+9,14,4);
    }
    w.fillStyle="#eadfc7";w.font="8px monospace";w.textAlign="center";w.fillText("· "+town.name+" ·",town.cx,town.ry*TILE-8);
  }
  const ex=dungeon.entrance.x,ey=dungeon.entrance.y;
  w.fillStyle="#3d3d43";w.fillRect(ex-8,ey-10,32,30);w.fillStyle="#14161c";w.fillRect(ex,ey,16,20);
  w.fillStyle="#b9a884";w.font="7px monospace";w.textAlign="center";w.fillText("OLD MINE",ex+8,ey-13);
  for(const site of resourceLandmarks){
    w.fillStyle="#eadfc7";w.font="7px monospace";w.textAlign="center";w.fillText(site.label,site.x*TILE+8,(site.y-2)*TILE-4);
  }
  redrawTownProjects();
}

function redrawTownProjects(){
  if(!worldCanvas)return;
  const w=worldCanvas.getContext("2d");
  for(const town of towns){
    const x=town.plot.x-8,y=town.plot.y-8;
    w.fillStyle="#6e5a3e";w.fillRect(x,y,32,32);
    w.strokeStyle="#d3bd86";w.strokeRect(x+.5,y+.5,31,31);
    if(!town.building){
      w.fillStyle="#3c3023";w.fillRect(x+13,y+4,3,22);w.fillStyle="#eadfc7";w.fillRect(x+6,y+4,18,9);
      w.fillStyle="#352b21";w.font="6px monospace";w.textAlign="center";w.fillText("BUILD",x+15,y+11);
    }else{
      const colors={granary:"#9c5b38",watchpost:"#647381",workshop:"#8d6f4d",academy:"#586ca8",court:"#a87d2c"};
      w.fillStyle=colors[town.building];w.fillRect(x+3,y+8,26,21);w.fillStyle="#c5af84";w.fillRect(x+7,y+13,18,16);
      if(town.building==="watchpost"){w.fillStyle="#4c5662";w.fillRect(x+8,y+1,16,13)}
      if(town.building==="granary"){w.fillStyle="#dac17a";w.fillRect(x+5,y+4,22,7)}
      if(town.building==="academy"){w.fillStyle="#d7dcef";w.fillRect(x+14,y+3,4,12)}
      if(town.building==="court"){w.fillStyle="#e2ad45";w.fillRect(x+6,y+4,20,3);w.fillRect(x+9,y+7,3,10);w.fillRect(x+20,y+7,3,10)}
      w.fillStyle="#eadfc7";w.font="6px monospace";w.textAlign="center";w.fillText(town.building.toUpperCase(),x+15,y-2);
    }
  }
}
