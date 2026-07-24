"""Controlled character and economy integration test for The Egg Lands v0.27."""
from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-trade-ally-escort-preview.html"
REPORT = ROOT / "artifacts" / "v0.27-character-playtest.json"


def extract_inner_patch(text: str) -> str:
    bridge = re.search(r"const V024_PATCH=String\.raw`(.*?)`;\n\n  const V025_PATCH", text, re.S)
    audio = re.search(r"const V025_PATCH=String\.raw`(.*?)`;\n\n  const V026_PATCH", text, re.S)
    economy = re.search(r"const V026_PATCH=String\.raw`(.*?)`;\n\n  const V027_PATCH", text, re.S)
    allies = re.search(r"const V027_PATCH=String\.raw`(.*?)`;\n\n  function transformLoader", text, re.S)
    if not bridge or not audio or not economy or not allies:
        raise RuntimeError("v0.24/v0.25/v0.26/v0.27 patch extraction failed")
    return (bridge.group(1) + "\n" + audio.group(1) + "\n" + economy.group(1) + "\n" + allies.group(1)).replace("<\\/script>", "</script>")


def run() -> dict:
    text = HTML.read_text(encoding="utf-8")
    patch = extract_inner_patch(text)
    shell = r"""<!doctype html><html><head><style>
    :root{--line:#354052;--gold:#e2ad45;--panel:#1a202a;--bg:#0f1218;--ink:#eadfc7;--dim:#a69c87;--good:#79c56b;--bad:#df6c5d}
    body{background:#0f1218;color:#eadfc7;font-family:monospace}.menuCard{border:1px solid #354052;padding:10px;margin:8px}.uibtn{padding:6px}.godOnly{display:block}.overlay{display:none}.overlay.open{display:block}
    </style></head><body>
    <div id='settingsContent'></div><div id='helpTab'><div class='helpGrid'></div></div>
    <div id='marketPanel'><div id='marketHost'><table id='marketTable'><tbody></tbody></table></div></div>
    <div id='dialogue'><div id='dialogueText'></div><input id='dialogueInput'></div>
    <div id='stage'></div>
    <script>
    var scene='world',activePanel=null,selectedClass='warrior',dayNo=1,dayClock=.25,godMode=true;
    function makeTown(name,pop,buildings){var t={name:name,population:pop,buildings:Array.from({length:buildings},function(){return {}}),market:{inventory:[6,120,4,80],prices:[1.5,.8,2.2,1.7]},materialStock:[8,60,14,3],materialPrices:[1.2,.9,1.1,2.4],marketPoint:{x:100,y:100},x:100,y:100};t.agents=Array.from({length:pop},function(_,i){return {id:name+'-'+i,name:(i===0?'Mira':i===1?'Orin':'Villager '+i),town:t,currentActivity:i===0?'fishing at the shore':i===1?'working at the quarry':'village work',wealth:80,mindV30:{opinions:{player:{trust:0,affection:0,respect:0,fear:0,gratitude:0,resentment:0}}}}});return t}
    var smallTown=makeTown('SMALLFORD',18,0),largeTown=makeTown('EGG LANDS',90,5),northTown=makeTown('NORTHMARCH',20,0),eastTown=makeTown('EASTMERE',20,0),southTown=makeTown('SOUTHWATCH',20,0);
    var towns=[smallTown,largeTown,northTown,eastTown,southTown],currentTown=smallTown,agents=towns.flatMap(function(t){return t.agents});
    var actionLog=[],toastLog=[],openMarketCalls=0,renderMarketCalls=0,saveCalls=0;
    var player={name:'Test Wanderer',ancestry:'human',appearanceV84:{race:'human'},x:20,y:30,face:{x:0,y:1},hp:10,maxHp:10,stamina:100,level:2,xp:4,coins:400,cargo:[100,100,100,100],materials:[100,100,100,100],gearInventory:[],jumpZ:0,dashTime:0,swing:0};
    var GOODS=['fish','grain','ore','cloth'],MATERIALS=['fish','log','stone','part'];
    var worldEnemies=[],dungeonEnemies=[],particles=[];
    var camera={x:0,y:0};var ctx={save:function(){},restore:function(){},fillRect:function(){},fillText:function(){},beginPath:function(){},arc:function(){},stroke:function(){},set fillStyle(v){},set font(v){},set textAlign(v){}};
    function nearestTown(){return currentTown}
    function materialPrice(t,index){return t.materialPrices[index]}
    function stepPlayer(dt){player.x+=dt*10;player.y+=dt*4;actionLog.push('move')}
    function stepAgents(dt){actionLog.push('agents')}
    function attack(){player.swing=.3;actionLog.push('attack')}
    function jump(){player.jumpZ=8;actionLog.push('jump')}
    function dash(){player.dashTime=.2;actionLog.push('dash')}
    function interact(){actionLog.push('interact');player.coins+=1}
    function snapshot(){return {version:1,player:JSON.parse(JSON.stringify(player)),selectedClass:selectedClass,dayNo:dayNo}}
    function applySave(data){Object.assign(player,data.player||{});selectedClass=data.selectedClass||selectedClass;dayNo=data.dayNo||dayNo;actionLog.push('load')}
    function saveGame(){saveCalls++}
    function updateUI(){}
    function renderSettings(){}
    function renderMarket(){renderMarketCalls++}
    function renderMarketTable(){renderMarketCalls++}
    function openMarket(t){openMarketCalls++;return true}
    function openDialogue(agent){window.currentDialogueAgent=agent;document.getElementById('dialogueText').textContent='Talking to '+agent.name;return true}
    function drawCombatEffects(){}
    function defeatEnemy(enemy,source){enemy.dead=true;enemy.defeatedBy=source}
    function playSfx(name){actionLog.push('sfx:'+name)}
    function toast(message){toastLog.push(String(message))}
    var audioConfig={sfx:true,music:true};
    window.__biteBaseCalls=0;
    window.__egglandsV77={onBite:function(){window.__biteBaseCalls++;return 'base-bite'},crunch:function(){}};
    window.__egglandsV83={version:83,crunch:function(){}};
    window.__egglandsRaptorsV36={list:function(){return [{tamed:true},{tamed:false}]},riding:function(){return window.__mounted?{tamed:true}:null}};
    window.__egglandsCharacterV91={renderSprite:function(app){var c=document.createElement('canvas');c.width=32;c.height=app.race==='khajit'?32:64;return c}};
    </script>""" + patch + "</body></html>"

    results: dict = {"project_version": "0.27", "status": "failed", "checks": [], "errors": [], "session_actions": []}

    def add(name: str, passed: bool, detail=None) -> None:
        item = {"name": name, "passed": bool(passed)}
        if detail is not None:
            item["detail"] = detail
        results["checks"].append(item)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1100, "height": 800})
        page.on("pageerror", lambda error: results["errors"].append(str(error)))
        page.set_content(shell)
        page.wait_for_timeout(900)

        page.evaluate("window.__egglandsBridgeV024.installSettings()")
        page.evaluate("window.__egglandsAudioV025.installSettings()")
        page.evaluate("window.__egglandsEconomyV026.install()")
        page.evaluate("window.__egglandsAlliesV027.install()")
        add("settings_cards", page.locator("#simulationDiagnosticsCardV024").count() == 1 and page.locator("#raptorAudioCardV025").count() == 1 and page.locator("#economyCardV026").count() == 1 and page.locator("#allyCardV027").count() == 1)
        add("no_function_key_dependency", "F10 opens" not in page.content() and "Press F10" not in page.content())

        audio_status = page.evaluate("window.__egglandsAudioV025.status()")
        add("byte_backed_audio_regression", audio_status["clipCount"] >= 10 and audio_status["totalBytes"] > 100000, audio_status)
        bite = page.evaluate("""()=>{var before=window.__egglandsAudioV025.status().playCount;window.__egglandsV77.onBite({},0,0,1,0,true);var after=window.__egglandsAudioV025.status();return {before:before,after:after}}""")
        add("raptor_bite_audio", bite["after"]["playCount"] == bite["before"] + 1 and bite["after"]["lastClip"].startswith("bite_hit_"), bite)

        for race, klass in [("human", "warrior"), ("tiefling", "mage"), ("khajit", "noble")]:
            session = page.evaluate(
                """([race,klass])=>{player.appearanceV84.race=race;player.ancestry=race==='khajit'?'cat':race==='tiefling'?'fey':'human';selectedClass=klass;var before={x:player.x,coins:player.coins};stepPlayer(.5);attack();jump();dash();interact();window.__mounted=race==='khajit';var captured=window.__egglandsBridgeV024.capture();var sprite=window.__egglandsCharacterV91.renderSprite({race:race},{});return {before:before,after:{x:player.x,coins:player.coins},captured:captured,sprite:{w:sprite.width,h:sprite.height}}}""",
                [race, klass],
            )
            add(f"play_{race}_{klass}", session["after"]["x"] > session["before"]["x"] and session["after"]["coins"] == session["before"]["coins"] + 1 and session["captured"]["player"]["race"] == race and session["captured"]["game"]["selected_class"] == klass and session["sprite"]["h"] == (32 if race == "khajit" else 64), session)
        results["session_actions"] = page.evaluate("actionLog.slice()")
        add("all_core_actions_executed", all(action in results["session_actions"] for action in ["move", "attack", "jump", "dash", "interact"]))

        page.evaluate("currentTown=smallTown; dayNo=1")
        small = page.evaluate("async()=>{await window.__egglandsEconomyV026.sync();return window.__egglandsEconomyV026.townState(smallTown)}")
        add("small_town_has_no_formal_market", small["trade_mode"] == "villagers" and small["market_available"] is False, small)
        gate = page.evaluate("()=>{var before=openMarketCalls;var result=openMarket(smallTown);return {before:before,after:openMarketCalls,result:result,lastToast:toastLog[toastLog.length-1]}}")
        add("market_gate_redirects_to_villagers", gate["after"] == gate["before"] and gate["result"] is False and "Trade directly" in gate["lastToast"], gate)

        page.evaluate("currentTown=largeTown; dayNo=1")
        developed = page.evaluate("async()=>{await window.__egglandsEconomyV026.sync();return window.__egglandsEconomyV026.townState(largeTown)}")
        add("developed_town_opens_market", developed["trade_mode"] == "town_market" and developed["market_available"] is True, developed)
        open_result = page.evaluate("()=>{var before=openMarketCalls;var result=openMarket(largeTown);return {before:before,after:openMarketCalls,result:result}}")
        add("formal_market_still_usable", open_result["after"] == open_result["before"] + 1 and open_result["result"] is True, open_result)

        economy_move = page.evaluate("""async()=>{currentTown=largeTown;dayNo=1;await window.__egglandsEconomyV026.sync();var before=JSON.parse(JSON.stringify(window.__egglandsEconomyV026.townState(largeTown)));dayNo=5;await window.__egglandsEconomyV026.sync();var after=JSON.parse(JSON.stringify(window.__egglandsEconomyV026.townState(largeTown)));return {before:before,after:after}}""")
        fish_before = economy_move["before"]["item_flows"]["fish"]
        fish_after = economy_move["after"]["item_flows"]["fish"]
        add("demand_moves_inventory_and_prices", fish_after["inventory"] != fish_before["inventory"] and fish_after["price"] != fish_before["price"], {"before": fish_before, "after": fish_after})
        add("production_consumption_employment_wages", fish_after["produced_last_step"] > 0 and fish_after["consumed_last_step"] > 0 and economy_move["after"]["employed_population"] > 0 and economy_move["after"]["average_daily_wage"] > 0 and economy_move["after"]["payroll_last_step"] > 0, economy_move["after"])

        page.evaluate("currentTown=smallTown; openDialogue(smallTown.agents[0])")
        page.wait_for_timeout(150)
        add("villager_trade_panel", page.locator("#villagerTradeV026").count() == 1 and "Current demand" in page.locator("#villagerTradeV026").inner_text())
        demand_detail = page.locator("#villagerTradeV026").inner_text()
        add("villager_demand_and_offers_visible", "They are selling" in demand_detail and "They want to buy" in demand_detail, demand_detail)
        trade_before = page.evaluate("({gold:player.coins,cargo:player.cargo.slice(),materials:player.materials.slice()})")
        first_buy = page.locator("#villagerTradeV026 button[data-side='buy']").first
        add("buy_button_available", first_buy.count() == 1)
        first_buy.click()
        page.wait_for_timeout(180)
        trade_after = page.evaluate("({gold:player.coins,cargo:player.cargo.slice(),materials:player.materials.slice(),relation:smallTown.agents[0].tradeRelationV026})")
        add("direct_trade_changes_real_player_ledger", trade_after["gold"] < trade_before["gold"] and trade_after["relation"]["trade_count"] == 1, {"before": trade_before, "after": trade_after})

        ally = page.evaluate("""async()=>{currentTown=smallTown;var a=smallTown.agents[0];await window.__egglandsEconomyV026.profile(a);var button=document.querySelector('#villagerTradeV026 button[data-side="sell"]');var item=button&&button.dataset.item;if(!item)return {error:'no sell item'};for(var k=0;k<24;k++){player.cargo=[500,500,500,500];player.materials=[500,500,500,500];await window.__egglandsEconomyV026.trade('sell',item)}return {item:item,relation:a.tradeRelationV026,ally:a.tradeAllyV026,activity:a.currentActivity,profile:await window.__egglandsEconomyV026.profile(a)}}""")
        add("trade_relationship_accumulates", ally.get("relation", {}).get("trade_count", 0) >= 20 and ally.get("relation", {}).get("trust", 0) > 0, ally)
        add("profitable_trade_creates_protection_pledge", ally.get("ally") is True and ally.get("profile", {}).get("willing_to_defend") is True and "protecting" in ally.get("activity", ""), ally)

        page.evaluate("openDialogue(smallTown.agents[0])")
        page.wait_for_timeout(180)
        add("escort_invite_control_visible", page.locator("#allyDialogueV027 button").count() >= 1 and "Invite to escort" in page.locator("#allyDialogueV027").inner_text())
        page.locator("#allyDialogueV027 button").filter(has_text="Invite to escort").click()
        page.wait_for_timeout(100)
        invited = page.evaluate("({active:smallTown.agents[0].escortActiveV027,status:window.__egglandsAlliesV027.status()})")
        add("trade_ally_can_join_escort", invited["active"] is True and invited["status"]["active"] == 1, invited)

        follow = page.evaluate("""()=>{var a=smallTown.agents[0];player.x=220;player.y=180;player.face={x:1,y:0};a.x=30;a.y=20;var before=Math.hypot(a.x-player.x,a.y-player.y);for(var k=0;k<24;k++)stepAgents(.1);var after=Math.hypot(a.x-player.x,a.y-player.y);return {before:before,after:after,x:a.x,y:a.y,activity:a.currentActivity}}""")
        add("escort_follows_character", follow["after"] < follow["before"] and follow["after"] < 70 and "escort" in follow["activity"], follow)

        combat = page.evaluate("""()=>{var a=smallTown.agents[0];worldEnemies=[{x:a.x+9,y:a.y,hp:3,type:'road raider',dead:false}];for(var k=0;k<40;k++)stepAgents(.1);return {enemy:worldEnemies[0],allyHp:a.escortHpV027,allyDown:a.escortDownTimerV027,status:window.__egglandsAlliesV027.status(),activity:a.currentActivity}}""")
        add("escort_autonomously_attacks_enemy", (combat["enemy"]["dead"] is True or combat["enemy"]["hp"] <= 0) and combat["status"]["attacks"] >= 3, combat)
        add("escort_combat_tracks_health", combat["allyHp"] < 8 and combat["allyHp"] >= 0, combat)

        escort_saved = page.evaluate("snapshot()")
        page.evaluate("smallTown.agents[0].escortActiveV027=false;smallTown.agents[0].escortHpV027=1")
        page.evaluate("data=>applySave(data)", escort_saved)
        page.wait_for_timeout(220)
        escort_restored = page.evaluate("({active:smallTown.agents[0].escortActiveV027,hp:smallTown.agents[0].escortHpV027,saved:smallTown.agents[0].tradeAllyV026})")
        add("escort_state_save_reload", escort_restored["active"] is True and escort_restored["hp"] > 1 and escort_restored["saved"] is True, escort_restored)
        page.evaluate("window.__egglandsAlliesV027.dismiss(smallTown.agents[0],true)")
        add("escort_can_be_dismissed", page.evaluate("smallTown.agents[0].escortActiveV027") is False)
        add("touch_escort_settings_controls", all(page.locator(selector).count() == 1 for selector in ["#recallAlliesV027", "#dismissAlliesV027"]))

        saved = page.evaluate("snapshot()")
        page.evaluate("smallTown.agents[0].tradeRelationV026=null;smallTown.agents[0].tradeAllyV026=false;player.coins=0")
        page.evaluate("data=>applySave(data)", saved)
        page.wait_for_timeout(180)
        restored = page.evaluate("({coins:player.coins,relation:smallTown.agents[0].tradeRelationV026,ally:smallTown.agents[0].tradeAllyV026})")
        add("economy_relationship_save_reload", restored["coins"] == saved["player"]["coins"] and restored["relation"] is not None and restored["ally"] is True, restored)

        empire = page.evaluate("""async()=>{for(const t of [northTown,eastTown,southTown]){currentTown=t;await window.__egglandsEconomyV026.setControl('conquered')}await window.__egglandsEconomyV026.sync();return {state:window.__egglandsEconomyV026.state().lastEconomy,towns:[northTown,eastTown,southTown].map(t=>({name:t.name,control:t.controlV026,mode:t.tradeModeV026,market:t.marketV026Available}))}}""")
        add("empire_market_unlocks_at_three_territories", empire["state"]["empire_trade_unlocked"] is True and empire["state"]["empire_territory_count"] == 3, empire)
        add("conquered_towns_gain_internal_market", all(t["mode"] == "empire_market" and t["market"] for t in empire["towns"]), empire["towns"])

        add("touch_settings_controls", all(page.locator(selector).count() == 1 for selector in ["#syncEconomyV026", "#independentV026", "#friendlyV026", "#conqueredV026"]))
        add("mounted_khajit_capture", page.evaluate("window.__mounted=true;player.appearanceV84.race='khajit';window.__egglandsBridgeV024.capture().player.mounted") is True)
        browser.close()

    results["passed"] = sum(1 for check in results["checks"] if check["passed"])
    results["total"] = len(results["checks"])
    results["status"] = "passed" if results["passed"] == results["total"] and not results["errors"] else "failed"
    REPORT.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    return results


if __name__ == "__main__":
    report = run()
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["status"] == "passed" else 1)
