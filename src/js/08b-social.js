/* ============================================================
   SPECIES, OPENNESS, AND PLAYER RELATIONSHIPS
   ============================================================ */
const SPECIES={
  human:{label:"Human",icon:"◆",description:"Strong and physically forceful.",strength:1.24,speed:1,magic:1},
  grung:{label:"Grung",icon:"●",description:"Small amphibious people with exceptional speed.",strength:.92,speed:1.28,magic:1},
  cat:{label:"Cat",icon:"♠",description:"Upright talking cats with humanlike hands and natural magic.",strength:.88,speed:1.08,magic:1.34}
};
function deterministic01(value){let x=((value+1)*2654435761)>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;x>>>=0;return (x%10000)/10000}
function initializeSocialIdentity(a){
  if(!a)return;
  if(!SPECIES[a.species]){const roll=deterministic01(a.id*17+(a.firstName||"").length*13);a.species=roll<.58?"human":roll<.79?"grung":"cat"}
  if(!Number.isFinite(a.opennessBias))a.opennessBias=Math.round((.18+deterministic01(a.id*31+7)*.72)*100)/100;
}
function speciesDef(a){initializeSocialIdentity(a);return SPECIES[a.species]}
function speciesStrength(a){return speciesDef(a).strength}
function speciesSpeed(a){return speciesDef(a).speed}
function speciesMagic(a){return speciesDef(a).magic}
function opennessCompatibility(a,b){initializeSocialIdentity(a);initializeSocialIdentity(b);return 1-Math.abs(a.opennessBias-b.opennessBias)}
const PLAYER_RELATION_DEFAULT={familiarity:0,affection:0,trust:0,respect:0,resentment:0,kind:"heard"};
function playerRelationshipStore(){player.relationships=player.relationships||{};return player.relationships}
function playerFamilyIds(){
  player.familyAgentIds=Array.isArray(player.familyAgentIds)?player.familyAgentIds:[];
  const home=homeGovernmentTown();
  if(!player.familyAgentIds.length&&home){
    const firstHouse=home.houses&&home.houses[0];
    player.familyAgentIds=((firstHouse&&firstHouse.residentIds&&firstHouse.residentIds.length?firstHouse.residentIds:home.agents.slice(0,2).map(a=>a.id))||[]).slice();
  }
  return player.familyAgentIds;
}
function ensurePlayerRelationships(){
  const home=homeGovernmentTown();if(!home)return;
  const store=playerRelationshipStore(),family=new Set(playerFamilyIds());
  for(const a of home.agents){
    const key=String(a.id),existing=store[key];
    if(!existing){
      store[key]=family.has(a.id)?{familiarity:90,affection:68,trust:62,respect:52,resentment:0,kind:"family"}:{familiarity:10,affection:2,trust:0,respect:1,resentment:0,kind:"heard"};
    }else if(family.has(a.id)){existing.kind="family";existing.familiarity=Math.max(existing.familiarity||0,80)}
  }
}
function playerRelation(a){ensurePlayerRelationships();return playerRelationshipStore()[String(a.id)]||Object.assign({},PLAYER_RELATION_DEFAULT)}
function playerRelationScore(r){return (r.affection||0)*.38+(r.trust||0)*.32+(r.respect||0)*.20+(r.familiarity||0)*.10-(r.resentment||0)*.62}
function playerRelationLabel(r){
  if(r.kind==="family")return "Family";
  if((r.familiarity||0)<20)return "Heard of";
  const score=playerRelationScore(r);
  return score>=46?"Close friend":score>=23?"Friend":score>=7?"Acquaintance":score>-9?"Known":score>-28?"Rival":"Enemy";
}
function deepenPlayerRelationship(a,positive=true){
  if(!a)return;
  ensurePlayerRelationships();
  const store=playerRelationshipStore(),key=String(a.id);
  const r=store[key]||(store[key]=Object.assign({},PLAYER_RELATION_DEFAULT));
  r.familiarity=clamp((r.familiarity||0)+14,0,100);
  if(positive){r.affection=clamp((r.affection||0)+3,0,100);r.trust=clamp((r.trust||0)+2,0,100)}
  else r.resentment=clamp((r.resentment||0)+5,0,100);
  if(r.kind==="heard"&&r.familiarity>=20)r.kind="known";
}
function renderPlayerRelationships(){
  const wrap=document.getElementById("relationshipsContent");if(!wrap||!towns.length)return;
  ensurePlayerRelationships();
  const town=homeGovernmentTown(),family=new Set(playerFamilyIds());
  const people=town.agents.map(a=>{initializeSocialIdentity(a);return {a,r:playerRelation(a)}});
  people.sort((x,y)=>{const order={family:0,known:1,heard:2};return (order[x.r.kind]??1)-(order[y.r.kind]??1)||playerRelationScore(y.r)-playerRelationScore(x.r)});
  const cards=people.map(({a,r})=>{
    const label=playerRelationLabel(r),score=playerRelationScore(r);
    const cls=r.kind==="family"?"family":score>=23?"friend":score<=-28?"enemy":label==="Heard of"?"heard":"";
    return '<div class="playerRelationshipCard '+cls+'"><strong>'+SPECIES[a.species].icon+' '+escapeHTML(a.firstName)+'</strong><br>'+escapeHTML(SPECIES[a.species].label)+' · openness '+Math.round(a.opennessBias*100)+'%<br><span class="relationshipStatus">'+label+'</span><br><small>Familiarity '+Math.round(r.familiarity||0)+' · affection '+Math.round(r.affection||0)+' · trust '+Math.round(r.trust||0)+(r.resentment?' · resentment '+Math.round(r.resentment):'')+'</small></div>';
  }).join('');
  const familyNames=town.agents.filter(a=>family.has(a.id)).map(a=>a.firstName).join(", ")||"None";
  wrap.innerHTML='<div class="menuCard"><h3>Your relationship tree</h3><div class="townStat"><span>Home village</span><span>'+escapeHTML(town.name)+'</span></div><div class="townStat"><span>Family</span><span>'+escapeHTML(familyNames)+'</span></div><div class="townStat"><span>Known people</span><span>'+people.filter(x=>(x.r.familiarity||0)>=20).length+' / '+people.length+'</span></div><div class="sub" style="margin-top:8px">Family begins with established bonds. Everyone else in your village begins as <b>Heard of</b> until you speak with them.</div></div><div class="playerRelationshipList">'+cards+'</div>';
}
