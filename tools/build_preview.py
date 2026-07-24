"""Build The Egg Lands v0.27 authoritative economy preview and benchmark artifacts."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from egglands.economy import EconomyConfig, run_economy_scenario
from tools.export_content import export_content
from tools.audio_patch import build_audio_payload, render_audio_patch
from tools.economy_patch import render_economy_patch
from tools.ally_patch import render_ally_patch

SOURCE = PROJECT_ROOT / "legacy" / "the-egg-lands-v92-khajit-ground-fix.html"
OUTPUT = PROJECT_ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-trade-ally-escort-preview.html"
BENCHMARK = PROJECT_ROOT / "artifacts" / "benchmarks" / "v0.27-economy-benchmark.json"
REPORT = PROJECT_ROOT / "artifacts" / "BUILD_REPORT.txt"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _patch(payload: dict) -> str:
    compact = json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
    patch = r'''
<style id="phase2-v024-style">
#bridgeBadgeV024{position:fixed;z-index:999997;top:max(7px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);border:1px solid #68758a;border-radius:12px;background:rgba(17,23,34,.92);color:#a69c87;padding:4px 9px;font:8px "Courier New",monospace;letter-spacing:.7px;text-transform:uppercase;cursor:default;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35)}
#bridgeBadgeV024.connected{border-color:#79c56b;color:#79c56b}#bridgeBadgeV024.connecting{border-color:#e2ad45;color:#e2ad45}#bridgeBadgeV024.offline{border-color:#68758a;color:#a69c87}#bridgeBadgeV024.error{border-color:#df6c5d;color:#df6c5d}
#phase2PanelV024{display:none;position:fixed;inset:4%;z-index:999999;background:#111722;color:#eadfc7;border:2px solid #e2ad45;padding:18px;overflow:auto;text-align:left;font:12px "Courier New",monospace;box-shadow:0 8px 40px rgba(0,0,0,.65)}
#phase2PanelV024.open{display:block}#phase2PanelV024 button{background:#252d3a;color:#eadfc7;border:1px solid #68758a;padding:7px 12px;cursor:pointer}#phase2PanelV024 table{border-collapse:collapse;width:100%;margin-top:12px}#phase2PanelV024 td,#phase2PanelV024 th{border:1px solid #354052;padding:6px;vertical-align:top}#phase2PanelV024 code{color:#c9d6ef;overflow-wrap:anywhere}
#phase2PanelV024 .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.p2metricV024{border:1px solid #354052;padding:10px;background:#1a202a}.p2metricV024 strong{display:block;color:#e2ad45;font-size:17px;overflow-wrap:anywhere}.phase2SectionV024{margin-top:18px;border-top:1px solid #354052;padding-top:12px}.phase2GoodV024{color:#79c56b}.phase2WarnV024{color:#e2ad45}.phase2BadV024{color:#df6c5d}.shadowSignalV024{font-weight:bold;text-transform:uppercase}.shadowSignalV024.raise{color:#df6c5d}.shadowSignalV024.lower{color:#79c56b}.shadowSignalV024.hold{color:#e2ad45}
@media(max-width:650px){#phase2PanelV024{inset:0;padding:12px;border-width:1px}#bridgeBadgeV024{font-size:7px;top:4px}}
</style>
<button id="bridgeBadgeV024" class="offline" type="button">Python: standalone</button>
<div id="phase2PanelV024" aria-hidden="true">
  <button id="phase2CloseV024" style="float:right" type="button">Close</button>
  <h2>The Egg Lands v0.27 — Living Economy Diagnostics</h2>
  <p>Open this panel from Menu → Settings. Python now owns live town prices and inventories when connected; the older capped-price pilot remains visible only as a diagnostic comparison.</p>
  <div id="bridgeBodyV024"></div>
  <div class="phase2SectionV024"><h3>Manual market-price authority pilot</h3><div id="authorityBodyV024"></div></div>
  <div class="phase2SectionV024"><h3>Live shadow comparison</h3><div id="shadowBodyV024"></div></div>
  <div class="phase2SectionV024"><h3>Python economy benchmark</h3><div id="economyBodyV024"></div></div>
</div>
<script id="phase2-v024-script">
(function(){
  "use strict";
  var PROTOCOL_VERSION=6,CLIENT_VERSION="0.27",SHADOW_MODE="shadow-read-only",AUTHORITY_MODE="manual-market-price-pilot",embedded=__PAYLOAD__;
  var sessionId=(window.crypto&&typeof window.crypto.randomUUID==="function")?window.crypto.randomUUID():(Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
  var sequence=0,sendTimer=null,probeTimer=null,panelOpen=false,economyData=embedded;
  var connection={mode:location.protocol==="http:"||location.protocol==="https:"?"probing":"standalone",status:"offline",connected:false,lastAck:null,lastError:"",lastSentAt:0,lastReceivedAt:0,packetsSent:0,packetsAccepted:0,lastShadow:null,lastProposal:null};
  var authority={enabled:false,lastApplied:null,applyCount:0,undoCount:0,lastMessage:"Pilot disabled",maxStepPercent:5};
  var panel=document.getElementById("phase2PanelV024"),badge=document.getElementById("bridgeBadgeV024");
  function safeText(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
  function number(value,fallback){var n=Number(value);return Number.isFinite(n)?n:(fallback||0)}
  function integer(value,fallback){return Math.round(number(value,fallback||0))}
  function sumArray(value){return Array.isArray(value)?value.reduce(function(total,item){return total+Math.max(0,integer(item,0))},0):0}
  function cleanKey(value,index,prefix){var text=String(value==null?(prefix+"_"+index):value).trim().toLowerCase().replace(/\s+/g,"_");return text||prefix+"_"+index}
  function namedArray(values,names,prefix){var result={};if(!Array.isArray(values))return result;values.forEach(function(value,index){result[cleanKey(Array.isArray(names)?names[index]:null,index,prefix)]=Math.max(0,number(value,0))});return result}
  function currentRace(){try{if(typeof player!=="undefined"&&player){var app=player.appearanceV84||{};if(app.race)return String(app.race);if(player.ancestry==="cat")return "khajit";if(player.ancestry==="fey")return "tiefling";return String(player.ancestry||"human")}}catch(error){}return "unknown"}
  function inventoryCounts(){var result={};try{if(typeof player==="undefined"||!player)return result;if(Array.isArray(player.cargo)){var goods=typeof GOODS!=="undefined"&&Array.isArray(GOODS)?GOODS:[];player.cargo.forEach(function(value,index){result[String(goods[index]||("cargo_"+index))]=Math.max(0,integer(value,0))})}if(Array.isArray(player.materials)){var materials=typeof MATERIALS!=="undefined"&&Array.isArray(MATERIALS)?MATERIALS:[];player.materials.forEach(function(value,index){result[String(materials[index]||("material_"+index))]=Math.max(0,integer(value,0))})}if(Array.isArray(player.gearInventory))result.gear_items=player.gearInventory.length}catch(error){}return result}
  function raptorState(){var result={count:0,tamed_count:0,mounted:false};try{var api=window.__egglandsRaptorsV36;if(api&&typeof api.list==="function"){var list=api.list()||[];result.count=list.length;result.tamed_count=list.filter(function(value){return !!value.tamed}).length}if(api&&typeof api.riding==="function")result.mounted=!!api.riding()}catch(error){}return result}
  function nearestTownSafe(){try{if(typeof nearestTown==="function")return nearestTown()}catch(error){}return null}
  function townName(){var town=nearestTownSafe();return town&&town.name?String(town.name):"unknown"}
  function townEconomy(){
    var result={town_population:0,town_building_count:0,market_inventory:{},market_prices:{},material_stock:{},material_prices:{}};
    try{
      var town=nearestTownSafe(),goods=typeof GOODS!=="undefined"&&Array.isArray(GOODS)?GOODS:[],materials=typeof MATERIALS!=="undefined"&&Array.isArray(MATERIALS)?MATERIALS:[];
      if(!town)return result;
      if(typeof agents!=="undefined"&&Array.isArray(agents))result.town_population=agents.filter(function(agent){return agent&&(!agent.town||agent.town===town||agent.town&&town.name&&agent.town.name===town.name)}).length;
      if(!result.town_population&&Number.isFinite(Number(town.population)))result.town_population=Math.max(0,integer(town.population,0));
      if(Array.isArray(town.buildings))result.town_building_count=town.buildings.length;else if(town.buildings&&typeof town.buildings==="object")result.town_building_count=Object.keys(town.buildings).length;
      if(town.market){result.market_inventory=namedArray(town.market.inventory,goods,"good");result.market_prices=namedArray(town.market.prices,goods,"good")}
      result.material_stock=namedArray(town.materialStock,materials,"material");
      if(Array.isArray(town.materialPrices))result.material_prices=namedArray(town.materialPrices,materials,"material");
      else if(typeof materialPrice==="function")materials.forEach(function(name,index){try{result.material_prices[cleanKey(name,index,"material")]=Math.max(0,number(materialPrice(town,index),0))}catch(error){}});
    }catch(error){}
    return result
  }
  function capture(){
    var p=typeof player!=="undefined"&&player?player:{},raptors=raptorState(),counts=inventoryCounts(),economy=townEconomy();
    var keys=[];try{keys=Object.keys(p).slice(0,64)}catch(error){}
    return {
      protocol_version:PROTOCOL_VERSION,client_version:CLIENT_VERSION,session_id:sessionId,sequence:++sequence,captured_at_ms:Date.now(),
      game:{save_version:92,scene:typeof scene!=="undefined"?String(scene):"unknown",active_panel:typeof activePanel!=="undefined"&&activePanel?String(activePanel):"none",selected_class:typeof selectedClass!=="undefined"&&selectedClass?String(selectedClass):"unselected",town_name:townName(),agent_count:typeof agents!=="undefined"&&Array.isArray(agents)?agents.length:0,world_day:typeof dayNo!=="undefined"?number(dayNo,0):0,world_time:typeof dayClock!=="undefined"?number(dayClock,0):0,legacy_keys:keys},
      player:{name:String(p.name||"The Wanderer"),race:currentRace(),ancestry:String(p.ancestry||"unknown"),x:number(p.x,0),y:number(p.y,0),health:number(p.hp,0),max_health:number(p.maxHp,0),stamina:number(p.stamina,0),level:integer(p.level,0),xp:integer(p.xp,0),gold:integer(p.coins,0),mounted:raptors.mounted,inventory_slots_used:sumArray(p.cargo)+sumArray(p.materials)+(Array.isArray(p.gearInventory)?p.gearInventory.length:0),inventory_counts:counts},
      raptors:{count:raptors.count,tamed_count:raptors.tamed_count,mounted:raptors.mounted},economy:economy
    }
  }
  var demandRates={fish:.10,grain:.22,ore:.018,cloth:.008,log:.025,logs:.025,timber:.025,stone:.025,part:.006,parts:.006,bread:.48,meat:.10,flour:.18,tools:.003,hides:.006,iron_ore:.018};
  function localShadow(payload){
    var econ=payload.economy||{},stock=Object.assign({},econ.material_stock||{},econ.market_inventory||{}),prices=Object.assign({},econ.material_prices||{},econ.market_prices||{}),population=Math.max(1,integer(econ.town_population||payload.game.agent_count||1,1)),items={};
    Object.keys(Object.assign({},stock,prices)).sort().forEach(function(key){var s=Math.max(0,number(stock[key],0)),p=Math.max(0,number(prices[key],0)),daily=Math.max(.25,population*(demandRates[key]||.012)),target=Math.max(5,daily*10),coverage=s/daily,scarcity=Math.max(.2,Math.min(4,10/Math.max(.5,coverage))),anchor=p>0?p:1,mult=Math.max(.55,Math.min(2.5,.62+.58*scarcity)),recommended=Math.max(.01,anchor*(.75+.25*mult)),divergence=(recommended-anchor)/anchor*100,signal=divergence>4?"raise":divergence<-4?"lower":"hold";items[key]={item_id:key,observed_stock:s,observed_price:p,daily_demand:daily,target_stock:target,coverage_days:coverage,scarcity_index:scarcity,recommended_price:recommended,divergence_percent:divergence,signal:signal}});
    var values=Object.keys(items).map(function(key){return Math.abs(items[key].divergence_percent)});
    return {version:"0.27",mode:"standalone-shadow-preview",authoritative:false,town_name:payload.game.town_name,world_day:payload.game.world_day,resident_count:population,building_count:econ.town_building_count||0,packet_count:connection.packetsAccepted,mean_absolute_divergence_percent:values.length?values.reduce(function(a,b){return a+b},0)/values.length:0,shortage_count:Object.keys(items).filter(function(key){return items[key].coverage_days<4}).length,surplus_count:Object.keys(items).filter(function(key){return items[key].coverage_days>20}).length,stable_count:Object.keys(items).filter(function(key){return items[key].coverage_days>=4&&items[key].coverage_days<=20}).length,items:items,notes:["Standalone preview estimate; connect Python for persistent session deltas.","Read-only shadow mode does not alter gameplay."]}
  }
  function localAuthorityProposal(payload,report){
    var prices=(payload.economy&&payload.economy.market_prices)||{},items=(report&&report.items)||{},changes={};
    Object.keys(prices).sort().forEach(function(key){var observed=Math.max(.01,number(prices[key],0)),item=items[key];if(!item||observed<=0)return;var target=Math.max(.01,number(item.recommended_price,observed)),raw=(target-observed)/observed*100,step=Math.max(-5,Math.min(5,raw));if(Math.abs(step)<.25)return;changes[key]={item_id:key,observed_price:observed,shadow_target_price:target,proposed_price:Math.max(.01,observed*(1+step/100)),step_percent:step,signal:step>0?"raise":"lower"}});
    return {version:"0.27",mode:"manual-market-price-pilot",proposal_id:sessionId+":"+payload.sequence,session_id:sessionId,sequence:payload.sequence,town_name:payload.game.town_name,world_day:payload.game.world_day,max_step_percent:5,requires_manual_apply:true,save_persistent:false,changes:changes,notes:["Standalone proposal uses the same five-percent safety cap.","Only ordinary town market prices can change.","Changes are session-local and can be undone immediately."]}
  }
  function currentProposal(){var payload=capture(),shadow=connection.lastShadow||localShadow(payload);return connection.lastProposal||localAuthorityProposal(payload,shadow)}
  function updateBadge(){var text="Python: standalone",cls="offline";if(connection.mode==="connected"&&connection.connected){text="Python: authority ready";cls="connected"}else if(connection.mode==="probing"||connection.mode==="reconnecting"){text="Python: connecting";cls="connecting"}else if(connection.mode==="error"){text="Python: retrying";cls="error"}badge.textContent=text;badge.className=cls}
  function timeoutFetch(url,options,timeout){var controller=typeof AbortController!=="undefined"?new AbortController():null,timer=null;options=options||{};if(controller){options.signal=controller.signal;timer=setTimeout(function(){controller.abort()},timeout||1500)}return fetch(url,options).finally(function(){if(timer)clearTimeout(timer)})}
  async function probe(){
    if(!(location.protocol==="http:"||location.protocol==="https:")){connection.mode="standalone";connection.connected=false;updateBadge();return false}
    connection.mode=connection.connected?"connected":"probing";updateBadge();
    try{var response=await timeoutFetch("/health",{cache:"no-store"},1600);if(!response.ok)throw new Error("health "+response.status);var data=await response.json();if(data.project_version!=="0.27"||!data.live_bridge||!data.authoritative_town_prices)throw new Error("incompatible local server");connection.mode="connected";connection.status="connected";connection.connected=true;connection.lastError="";updateBadge();return true}catch(error){connection.connected=false;connection.mode="error";connection.status="offline";connection.lastError=String(error&&error.message||error);updateBadge();return false}
  }
  async function sendState(){
    var payload=capture();connection.lastSentAt=Date.now();connection.packetsSent++;if(!connection.connected){connection.lastShadow=localShadow(payload);connection.lastProposal=localAuthorityProposal(payload,connection.lastShadow);if(panelOpen)renderAll();return false}
    try{var response=await timeoutFetch("/api/v1/bridge/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store",keepalive:true},1800);if(!response.ok)throw new Error("bridge "+response.status);var data=await response.json();connection.lastAck=data.ack_sequence;connection.lastReceivedAt=Date.now();connection.packetsAccepted++;connection.lastShadow=data.shadow||localShadow(payload);connection.lastProposal=data.authority_proposal||localAuthorityProposal(payload,connection.lastShadow);connection.mode="connected";connection.status="connected";connection.connected=true;connection.lastError="";updateBadge();if(panelOpen)renderAll();return true}catch(error){connection.connected=false;connection.mode="reconnecting";connection.status="offline";connection.lastError=String(error&&error.message||error);connection.lastShadow=localShadow(payload);updateBadge();return false}
  }
  function refreshVisibleMarket(){try{if(typeof updateUI==="function")updateUI();if(typeof renderMarket==="function")renderMarket();if(typeof renderMarketTable==="function")renderMarketTable()}catch(error){}}
  async function reportAuthorityApplication(proposal,changes,undone,source){if(!connection.connected)return;try{await timeoutFetch("/api/v1/economy/authority/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({proposal_id:proposal.proposal_id,session_id:sessionId,town_name:proposal.town_name,source:source||"python",undone:!!undone,changes:changes}),cache:"no-store"},1800)}catch(error){connection.lastError=String(error&&error.message||error)}}
  function applyAuthorityProposal(){
    if(!authority.enabled){authority.lastMessage="Enable the pilot checkbox before applying a price step.";updateSettingsCard();if(panelOpen)renderAll();return {applied:false,reason:"disabled"}}
    var town=nearestTownSafe(),proposal=currentProposal();if(!town||!town.market||!Array.isArray(town.market.prices)){authority.lastMessage="No writable town market is currently available.";updateSettingsCard();return {applied:false,reason:"no_market"}}
    if(!proposal||proposal.town_name!==String(town.name||"unknown")){authority.lastMessage="The proposal does not match the current town. Sync again.";return {applied:false,reason:"town_mismatch"}}
    var goods=typeof GOODS!=="undefined"&&Array.isArray(GOODS)?GOODS:[],changes={},before=town.market.prices.slice(),applied=0;
    Object.keys(proposal.changes||{}).forEach(function(key){var idx=goods.findIndex(function(name,index){return cleanKey(name,index,"good")===key});if(idx<0||idx>=town.market.prices.length)return;var oldPrice=Math.max(.01,number(town.market.prices[idx],0)),requested=Math.max(.01,number(proposal.changes[key].proposed_price,oldPrice)),cap=Math.max(.01,oldPrice*(1+Math.max(-authority.maxStepPercent,Math.min(authority.maxStepPercent,(requested-oldPrice)/oldPrice*100))/100));town.market.prices[idx]=cap;changes[key]={before:oldPrice,after:cap};applied++});
    if(!applied){authority.lastMessage="The current proposal contains no eligible market-goods changes.";return {applied:false,reason:"empty"}}
    authority.lastApplied={proposal:proposal,town:town,before:before,changes:changes};authority.applyCount++;authority.lastMessage="Applied "+applied+" bounded market-price step"+(applied===1?"":"s")+". This session-local change can be undone.";refreshVisibleMarket();reportAuthorityApplication(proposal,changes,false,connection.connected?"python":"standalone");updateSettingsCard();if(panelOpen)renderAll();return {applied:true,count:applied,changes:changes}
  }
  function undoAuthorityProposal(){var last=authority.lastApplied;if(!last||!last.town||!last.town.market||!Array.isArray(last.town.market.prices)){authority.lastMessage="There is no pilot price step to undo.";updateSettingsCard();return {undone:false}};last.town.market.prices.splice(0,last.town.market.prices.length);last.before.forEach(function(value){last.town.market.prices.push(value)});authority.undoCount++;authority.lastMessage="Restored all market prices from before the last pilot step.";refreshVisibleMarket();reportAuthorityApplication(last.proposal,last.changes,true,connection.connected?"python":"standalone");authority.lastApplied=null;updateSettingsCard();if(panelOpen)renderAll();return {undone:true}}
  function setAuthorityEnabled(enabled){authority.enabled=!!enabled;authority.lastMessage=authority.enabled?"Pilot armed. Price changes still require the Apply button.":"Pilot disabled. No market prices will be changed.";updateSettingsCard();if(panelOpen)renderAll();return authority.enabled}
  function metric(label,value){return '<div class="p2metricV024"><span>'+safeText(label)+'</span><strong>'+safeText(value)+'</strong></div>'}
  function renderBridge(){var state=capture(),g=state.game,p=state.player,r=state.raptors;document.getElementById("bridgeBodyV024").innerHTML='<div class="metrics">'+metric("Mode",connection.connected?"Python shadow":"Standalone")+metric("Accepted",connection.packetsAccepted)+metric("Character",p.name)+metric("Race / class",p.race+" / "+g.selected_class)+metric("Day / time",g.world_day+" / "+number(g.world_time,0).toFixed(2))+metric("NPCs",g.agent_count)+metric("Raptors",r.tamed_count+" tamed / "+r.count)+metric("Gold",p.gold)+metric("HP",p.health+" / "+p.max_health)+metric("Position",number(p.x,0).toFixed(1)+", "+number(p.y,0).toFixed(1))+'</div><p class="'+(connection.connected?'phase2GoodV024':'phase2WarnV024')+'">'+safeText(connection.connected?'Python is receiving character and town-market observations every two seconds.':'The HTML is operating independently and calculates a nonpersistent shadow preview locally.')+'</p>'+(connection.lastError?'<p class="phase2BadV024">Last connection error: '+safeText(connection.lastError)+'</p>':'')+'<table><tr><th>Current field</th><th>Value</th></tr><tr><td>Scene</td><td>'+safeText(g.scene)+'</td></tr><tr><td>Town</td><td>'+safeText(g.town_name)+'</td></tr><tr><td>Panel</td><td>'+safeText(g.active_panel)+'</td></tr><tr><td>Mounted</td><td>'+safeText(p.mounted)+'</td></tr><tr><td>Inventory</td><td><code>'+safeText(JSON.stringify(p.inventory_counts))+'</code></td></tr><tr><td>Session</td><td><code>'+safeText(sessionId)+'</code></td></tr></table>'}
  function renderAuthority(){var proposal=currentProposal(),changes=proposal&&proposal.changes||{},rows=Object.keys(changes).map(function(key){var c=changes[key];return '<tr><td>'+safeText(key)+'</td><td>'+number(c.observed_price,0).toFixed(3)+'</td><td>'+number(c.shadow_target_price,0).toFixed(3)+'</td><td>'+number(c.proposed_price,0).toFixed(3)+'</td><td class="shadowSignalV024 '+safeText(c.signal||'hold')+'">'+(number(c.step_percent,0)>=0?'+':'')+number(c.step_percent,0).toFixed(2)+'%</td></tr>'}).join('');document.getElementById("authorityBodyV024").innerHTML='<div class="metrics">'+metric("Pilot",authority.enabled?"Armed":"Disabled")+metric("Scope","Market prices only")+metric("Safety cap",number(proposal&&proposal.max_step_percent,5).toFixed(1)+"%")+metric("Proposed items",Object.keys(changes).length)+metric("Applied",authority.applyCount)+metric("Undone",authority.undoCount)+'</div><p class="'+(authority.enabled?'phase2WarnV024':'phase2GoodV024')+'">'+safeText(authority.lastMessage)+'</p>'+(rows?'<table><tr><th>Good</th><th>Current</th><th>Shadow target</th><th>One-step price</th><th>Step</th></tr>'+rows+'</table>':'<p class="phase2WarnV024">No eligible market price changes are available in the current town observation.</p>')+'<p>Manual only · no inventory changes · no player-gold changes · no automatic save write · immediate undo available.</p>'}
  function renderShadow(){var report=connection.lastShadow||localShadow(capture()),items=report.items||{},rows=Object.keys(items).map(function(key){var item=items[key]||{},signal=String(item.signal||"hold");return '<tr><td>'+safeText(key)+'</td><td>'+number(item.observed_stock,0).toFixed(2)+'</td><td>'+number(item.coverage_days,0).toFixed(1)+' days</td><td>'+number(item.observed_price,0).toFixed(3)+'</td><td>'+number(item.recommended_price,0).toFixed(3)+'</td><td class="shadowSignalV024 '+safeText(signal)+'">'+safeText(signal)+'</td><td>'+number(item.divergence_percent,0).toFixed(1)+'%</td></tr>'}).join("");document.getElementById("shadowBodyV024").innerHTML='<div class="metrics">'+metric("Shadow authority","Read-only")+metric("Town",report.town_name||"unknown")+metric("Residents",report.resident_count||0)+metric("Buildings",report.building_count||0)+metric("Mean divergence",number(report.mean_absolute_divergence_percent,0).toFixed(1)+"%")+metric("Shortages",report.shortage_count||0)+metric("Surpluses",report.surplus_count||0)+'</div>'+(rows?'<table><tr><th>Item</th><th>Stock</th><th>Coverage</th><th>Game price</th><th>Python price</th><th>Signal</th><th>Difference</th></tr>'+rows+'</table>':'<p class="phase2WarnV024">No town market arrays were visible in the current scene.</p>')+'<p class="phase2WarnV024">The shadow model remains diagnostic. Only the separate manual pilot can apply a capped ordinary-market price step.</p>'}
  function money(value){return "$"+(number(value,0)/100).toFixed(2)}
  function renderEconomy(data){var config=data.config||{},prices=data.final_prices_cents||{},inventory=data.final_inventory||{};document.getElementById("economyBodyV024").innerHTML='<div class="metrics">'+metric("Population",config.population||0)+metric("Households",data.household_count||0)+metric("Employment",Math.round(number(data.employment_rate,0)*100)+"%")+metric("Happiness",number(data.average_happiness,0).toFixed(3))+metric("Matrix backend",data.matrix_backend||"unknown")+metric("Runtime",number(data.elapsed_seconds,0).toFixed(3)+" s")+'</div><table><tr><th>Item</th><th>Final stock</th><th>Price</th></tr>'+Object.keys(prices).map(function(key){return '<tr><td>'+safeText(key)+'</td><td>'+safeText(inventory[key]||0)+'</td><td>'+safeText(money(prices[key]))+'</td></tr>'}).join("")+'</table><p>Local dashboards: <code>/bridge</code> and <code>/economy</code>. Shadow API: <code>/api/v1/economy/shadow</code>.</p>'}
  async function refreshEconomy(){if(connection.connected){try{var response=await timeoutFetch("/api/v1/economy/snapshot",{cache:"no-store"},1800);if(response.ok)economyData=await response.json();var shadowResponse=await timeoutFetch("/api/v1/economy/shadow?session_id="+encodeURIComponent(sessionId),{cache:"no-store"},1800);if(shadowResponse.ok){var shadowData=await shadowResponse.json();if(shadowData.latest)connection.lastShadow=shadowData.latest}}catch(error){}}if(!connection.lastShadow)connection.lastShadow=localShadow(capture());renderEconomy(economyData);renderShadow()}
  function renderAll(){renderBridge();renderAuthority();renderShadow()}
  function setPanel(open){panelOpen=!!open;panel.classList.toggle("open",panelOpen);panel.setAttribute("aria-hidden",panelOpen?"false":"true");if(panelOpen){renderAll();refreshEconomy()}}
  function settingsStatusText(){return connection.connected?"Python authority pilot ready · "+connection.packetsAccepted+" observations accepted":"Standalone HTML mode · local capped proposals available"}
  function updateSettingsCard(){var status=document.getElementById("simulationStatusV024");if(status)status.textContent=settingsStatusText();var detail=document.getElementById("simulationDetailV024");if(detail)detail.textContent=connection.lastError?("Last connection issue: "+connection.lastError):(connection.connected?"Python provides persistent proposals and records explicit applications.":"Standalone mode can calculate and manually apply the same capped price step locally.");var shadow=document.getElementById("shadowStatusV024");if(shadow){var report=connection.lastShadow||localShadow(capture()),proposal=currentProposal();shadow.textContent="Shadow: "+Object.keys(report.items||{}).length+" items · "+number(report.mean_absolute_divergence_percent,0).toFixed(1)+"% mean difference · proposal: "+Object.keys(proposal.changes||{}).length+" eligible prices"}var pilot=document.getElementById("authorityStatusV024");if(pilot)pilot.textContent=authority.lastMessage;var toggle=document.getElementById("authorityToggleV024");if(toggle)toggle.checked=authority.enabled;var apply=document.getElementById("applyAuthorityV024");if(apply)apply.disabled=!authority.enabled;var undo=document.getElementById("undoAuthorityV024");if(undo)undo.disabled=!authority.lastApplied}
  function runCharacterCheck(){var checks=[];function check(label,ok){checks.push({label:label,ok:!!ok})}try{check("Player exists",typeof player!=="undefined"&&!!player);check("Class selected",typeof selectedClass!=="undefined");check("Movement system",typeof stepPlayer==="function");check("Attack system",typeof attack==="function");check("Jump system",typeof jump==="function");check("Dash system",typeof dash==="function");check("Interaction system",typeof interact==="function");check("Save snapshot",typeof snapshot==="function");check("Save loader",typeof applySave==="function");var api=window.__egglandsCharacterV91||window.__egglandsCharacterV84;check("Modular character API",!!api);if(api&&typeof api.renderSprite==="function"){["human","tiefling","khajit"].forEach(function(race){var app={race:race,body:"standard",skinIndex:0,hair:"short",hairColor:"brown",shirt:"tunic",shirtColor:"blue",pants:"trousers",pantsColor:"brown",boots:"leather",bootColor:"brown",cloak:"none",headwear:"none",accessory:"none",accentColor:"gold"};var sprite=api.renderSprite(app,{direction:"down",action:"walk",frame:1});check(race+" sprite",!!sprite&&sprite.width===32&&sprite.height===(race==="khajit"?32:64))})}var rapi=window.__egglandsRaptorsV36;check("Raptor API",!!rapi&&typeof rapi.list==="function");var observed=capture();check("Town economy capture",!!observed.economy&&typeof observed.economy.market_inventory==="object");var shadow=localShadow(observed);check("Shadow economy",!!shadow&&shadow.authoritative===false);var proposal=localAuthorityProposal(observed,shadow);check("Market authority proposal",!!proposal&&proposal.requires_manual_apply===true&&proposal.max_step_percent===5);check("Market authority controls",typeof applyAuthorityProposal==="function"&&typeof undoAuthorityProposal==="function")}catch(error){checks.push({label:"Runtime exception: "+String(error&&error.message||error),ok:false})}var passed=checks.filter(function(x){return x.ok}).length,result=document.getElementById("characterCheckResultV024");if(result)result.innerHTML='<span style="color:'+(passed===checks.length?'#79c56b':'#e2ad45')+'">'+passed+' / '+checks.length+' checks passed</span><br>'+checks.map(function(x){return (x.ok?'✓ ':'✗ ')+safeText(x.label)}).join(' · ');return {passed:passed,total:checks.length,checks:checks}}
  function installSettingsCard(){var wrap=document.getElementById("settingsContent");if(!wrap)return false;var card=document.getElementById("simulationDiagnosticsCardV024");if(!card){card=document.createElement("div");card.id="simulationDiagnosticsCardV024";card.className="menuCard";card.innerHTML='<h3>Simulation & Diagnostics <span class="hdArchitectureBadgeV34">v0.27</span></h3><div class="sub">Live Python bridge, shadow economy, and a manual five-percent market-price authority pilot. All controls work by mouse or touch.</div><div id="simulationStatusV024" style="margin-top:9px;color:#e2ad45"></div><div id="simulationDetailV024" class="sub" style="margin-top:5px"></div><div id="shadowStatusV024" class="sub" style="margin-top:5px"></div><div style="margin-top:10px;border:1px solid #66552f;padding:9px"><label style="display:flex;gap:8px;align-items:flex-start"><input id="authorityToggleV024" type="checkbox"><span><strong>Enable experimental manual market authority</strong><br><span class="sub">Allows only a button-triggered, capped price change. It cannot change inventory, production, gold, combat, movement, or intentionally write to saves.</span></span></label><div id="authorityStatusV024" class="sub" style="margin-top:6px"></div><div class="row" style="margin-top:8px;justify-content:flex-start"><button class="uibtn" id="applyAuthorityV024" type="button">Apply one Python price step</button><button class="uibtn" id="undoAuthorityV024" type="button">Undo last price step</button></div></div><div class="row" style="margin-top:10px;justify-content:flex-start"><button class="uibtn" id="openDiagnosticsV024" type="button">Open diagnostics</button><button class="uibtn" id="syncPythonV024" type="button">Sync now</button><button class="uibtn" id="reconnectPythonV024" type="button">Reconnect</button><button class="uibtn" id="characterCheckV024" type="button">Run character check</button></div><div id="characterCheckResultV024" class="sub" style="margin-top:7px"></div>';wrap.appendChild(card);card.querySelector("#authorityToggleV024").addEventListener("change",function(event){setAuthorityEnabled(!!event.target.checked)});card.querySelector("#applyAuthorityV024").addEventListener("click",applyAuthorityProposal);card.querySelector("#undoAuthorityV024").addEventListener("click",undoAuthorityProposal);card.querySelector("#openDiagnosticsV024").addEventListener("click",function(){setPanel(true)});card.querySelector("#syncPythonV024").addEventListener("click",async function(){if(!connection.connected)await probe();await sendState();updateSettingsCard()});card.querySelector("#reconnectPythonV024").addEventListener("click",async function(){connection.connected=false;connection.mode="probing";updateBadge();await probe();await sendState();updateSettingsCard()});card.querySelector("#characterCheckV024").addEventListener("click",runCharacterCheck)}updateSettingsCard();return true}
  if(typeof renderSettings==="function"&&!renderSettings.__simulationDiagnosticsV024){var previousRenderSettingsV024=renderSettings;renderSettings=function(){var result=previousRenderSettingsV024.apply(this,arguments);setTimeout(installSettingsCard,0);return result};renderSettings.__simulationDiagnosticsV024=true}
  document.getElementById("phase2CloseV024").addEventListener("click",function(){setPanel(false)});
  setTimeout(installSettingsCard,900);
  addEventListener("beforeunload",function(){if(connection.connected){try{navigator.sendBeacon("/api/v1/bridge/state",new Blob([JSON.stringify(capture())],{type:"application/json"}))}catch(error){}}});
  updateBadge();connection.lastShadow=localShadow(capture());connection.lastProposal=localAuthorityProposal(capture(),connection.lastShadow);
  setTimeout(async function(){await probe();await sendState()},900);
  sendTimer=setInterval(function(){sendState()},2000);
  probeTimer=setInterval(async function(){if(!connection.connected){var ok=await probe();if(ok)sendState()}},5000);
  setInterval(function(){if(panelOpen)renderAll();updateSettingsCard()},1000);
  window.__egglandsBridgeV024={version:CLIENT_VERSION,protocolVersion:PROTOCOL_VERSION,shadowMode:SHADOW_MODE,sessionId:sessionId,status:function(){return Object.assign({},connection)},capture:capture,sendNow:sendState,probe:probe,open:function(){setPanel(true)},close:function(){setPanel(false)},installSettings:installSettingsCard,runCharacterCheck:runCharacterCheck,shadow:function(){return connection.lastShadow||localShadow(capture())},proposal:currentProposal,setAuthorityEnabled:setAuthorityEnabled,applyAuthority:applyAuthorityProposal,undoAuthority:undoAuthorityProposal,authorityStatus:function(){return Object.assign({},authority)},benchmark:embedded};
  setTimeout(function(){document.title="The Egg Lands v0.27 — Living Economy Diagnostics"},1200);
})();
<\/script>
'''
    return patch.replace("__PAYLOAD__", compact)


def build_preview() -> Path:
    export_content()
    result = run_economy_scenario(EconomyConfig())
    payload = result.to_dict()
    BENCHMARK.parent.mkdir(parents=True, exist_ok=True)
    BENCHMARK.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    text = SOURCE.read_text(encoding="utf-8")
    patch = _patch(payload)
    audio_payload = build_audio_payload()
    audio_patch = render_audio_patch(audio_payload)
    economy_patch = render_economy_patch()
    ally_patch = render_ally_patch()
    marker = "  function transformLoader(source){"
    if marker not in text:
        raise RuntimeError("transform marker missing")
    text = text.replace(
        marker,
        "  const V024_PATCH=String.raw`\n" + patch + "\n`;\n\n"
        + "  const V025_PATCH=String.raw`\n" + audio_patch + "\n`;\n\n"
        + "  const V026_PATCH=String.raw`\n" + economy_patch + "\n`;\n\n"
        + "  const V027_PATCH=String.raw`\n" + ally_patch + "\n`;\n\n"
        + marker,
        1,
    )
    old = '"\\n"+V84_PATCH+"\\n"+V91_PATCH+"\\n"+source.slice(templateEnd);'
    new = '"\\n"+V84_PATCH+"\\n"+V91_PATCH+"\\n"+V024_PATCH+"\\n"+V025_PATCH+"\\n"+V026_PATCH+"\\n"+V027_PATCH+"\\n"+source.slice(templateEnd);'
    if old not in text:
        raise RuntimeError("compose marker missing")
    text = text.replace(old, new, 1)
    text = text.replace(
        "<title>The Egg Lands - Aligned Three-Race Sprites v92</title>",
        "<title>The Egg Lands v0.27 - Trade Ally Escort</title>",
        1,
    )
    text = text.replace(
        "THE EGG LANDS - ALIGNED THREE-RACE SPRITES v92",
        "THE EGG LANDS v0.27 - TRADE ALLY ESCORT",
        1,
    )
    text = text.replace(
        'source=source.replace("egglands_composed_v37_highlands_305c70f","egglands_composed_v92_aligned_races_305c70f");',
        'source=source.replace("egglands_composed_v37_highlands_305c70f","egglands_composed_v027_trade_ally_escort_305c70f");',
        1,
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(text, encoding="utf-8")
    REPORT.write_text(
        "\n".join(
            [
                "The Egg Lands v0.27 — Trade Ally Escort Build Report",
                "",
                f"legacy_source_sha256={sha256(SOURCE)}",
                f"compiled_sha256={sha256(OUTPUT)}",
                f"compiled_bytes={OUTPUT.stat().st_size}",
                "phase=3",
                "project_version=0.27",
                "legacy_gameplay_preserved=true",
                "python_economy=true",
                "live_bridge=true",
                "shadow_economy=true",
                "bridge_mode=python-authoritative-town-economy",
                "market_authority_pilot=false",
                "authority_scope=town_prices_inventory_production_employment_wages_consumption",
                "protocol_version=6",
                "standalone_html_mode=true",
                "settings_diagnostics=true",
                "function_key_required=false",
                "byte_backed_audio=true",
                f"embedded_audio_clips={audio_payload['clip_count']}",
                f"embedded_audio_bytes={audio_payload['total_audio_bytes']}",
                "raptor_bite_audio=wav-sampled-at-damage-frame",
                "raptor_mount_audio=wav-transition-detected",
                "authoritative_town_prices=true",
                "authoritative_town_inventory=true",
                "python_production_employment_wages_consumption=true",
                "input_constrained_supply_chains=true",
                "development_gated_markets=true",
                "villager_direct_trade=true",
                "trade_relationships=true",
                "trade_ally_escort=true",
                "trade_ally_combat=true",
                "escort_save_persistence=true",
                "max_active_escorts=2",
                "empire_internal_market_threshold=3",
                f"benchmark_elapsed_seconds={result.elapsed_seconds:.6f}",
                f"matrix_backend={result.matrix_backend}",
                "all_invariants=" + str(all(result.invariants.values())).lower(),
                "",
            ]
        ),
        encoding="utf-8",
    )
    return OUTPUT


def main() -> None:
    path = build_preview()
    print(f"Built: {path}")
    print(f"SHA-256: {sha256(path)}")


if __name__ == "__main__":
    main()
