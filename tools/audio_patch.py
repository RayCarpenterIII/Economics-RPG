"""Build the v0.25 byte-backed raptor audio patch."""
from __future__ import annotations

import base64
import json
from pathlib import Path

from egglands.audio import load_raptor_audio_library


def build_audio_payload() -> dict:
    library = load_raptor_audio_library()
    clips: dict[str, dict] = {}
    for clip in library.clips:
        encoded = base64.b64encode(clip.path.read_bytes()).decode("ascii")
        clips[clip.key] = {
            "key": clip.key,
            "category": clip.category,
            "bytes": clip.byte_length,
            "duration_seconds": clip.duration_seconds,
            "sha256": clip.sha256,
            "data": "data:audio/wav;base64," + encoded,
        }
    return {
        "version": library.version,
        "clip_count": len(library.clips),
        "total_audio_bytes": library.total_audio_bytes,
        "clips": clips,
    }


def render_audio_patch(payload: dict) -> str:
    compact = json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
    patch = r'''
<style id="raptor-byte-audio-v025-style">
#raptorAudioCardV025 .raptorAudioStatsV025{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.raptorAudioChipV025{border:1px solid var(--line);padding:4px 7px;color:var(--dim);font-size:9px}.raptorAudioChipV025 strong{color:var(--gold);font-weight:normal}.raptorAudioRangeV025{display:grid;grid-template-columns:minmax(100px,1fr) 42px;gap:8px;align-items:center;margin-top:8px}.raptorAudioRangeV025 input{width:100%}.raptorAudioButtonsV025{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.raptorAudioStateV025{margin-top:7px;font-size:9px;line-height:1.45;color:var(--dim)}
</style>
<script id="raptor-byte-audio-v025-script">
(function(){
  "use strict";
  var VERSION="0.25",PACK=__AUDIO_PAYLOAD__,storageKey="egglands_raptor_audio_v025";
  var state={enabled:true,volume:.78,playCount:0,lastClip:"",lastError:"",biteHitIndex:0,biteMissIndex:0,mounted:null,hooked:false};
  var baseElements={},activeElements=[];
  function loadPrefs(){try{var saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved&&typeof saved==="object"){if(typeof saved.enabled==="boolean")state.enabled=saved.enabled;if(Number.isFinite(Number(saved.volume)))state.volume=Math.max(0,Math.min(1,Number(saved.volume)))}}catch(error){}}
  function savePrefs(){try{localStorage.setItem(storageKey,JSON.stringify({enabled:state.enabled,volume:state.volume}))}catch(error){}}
  function globalSfxEnabled(){return typeof audioConfig==="undefined"||audioConfig.sfx!==false}
  function categoryKeys(category){return Object.keys(PACK.clips).filter(function(key){return PACK.clips[key].category===category})}
  function elementFor(key){var clip=PACK.clips[key];if(!clip)return null;if(!baseElements[key]){var audio=new Audio();audio.preload="auto";audio.src=clip.data;audio.load();baseElements[key]=audio}return baseElements[key]}
  function cleanupAudio(audio){var index=activeElements.indexOf(audio);if(index>=0)activeElements.splice(index,1)}
  function playClip(key,options){options=options||{};var clip=PACK.clips[key];if(!clip||!state.enabled||!globalSfxEnabled())return false;try{var base=elementFor(key),audio=base.cloneNode(true);audio.volume=Math.max(0,Math.min(1,state.volume*Number(options.gain||1)));audio.playbackRate=Math.max(.72,Math.min(1.35,Number(options.rate||1)));activeElements.push(audio);audio.addEventListener("ended",function(){cleanupAudio(audio)},{once:true});audio.addEventListener("error",function(){cleanupAudio(audio)},{once:true});var promise=audio.play();if(promise&&typeof promise.catch==="function")promise.catch(function(error){state.lastError=String(error&&error.message||error);cleanupAudio(audio);updateCard()});state.playCount++;state.lastClip=key;state.lastError="";updateCard();return true}catch(error){state.lastError=String(error&&error.message||error);updateCard();return false}}
  function rotate(category,indexName,gain){var keys=categoryKeys(category);if(!keys.length)return false;var index=state[indexName]%keys.length;state[indexName]=(index+1)%keys.length;return playClip(keys[index],{gain:gain||1,rate:.97+Math.random()*.06})}
  function playBite(hit){return rotate(hit?"bite_hit":"bite_miss",hit?"biteHitIndex":"biteMissIndex",hit?1:.88)}
  function playMount(){var keys=categoryKeys("mount");return keys.length?playClip(keys[0],{gain:.82}):false}
  function playDismount(){var keys=categoryKeys("dismount");return keys.length?playClip(keys[0],{gain:.74}):false}
  function playIdle(){var keys=categoryKeys("idle");return keys.length?playClip(keys[0],{gain:.66}):false}
  function playStep(){var keys=categoryKeys("run_step");return keys.length?playClip(keys[0],{gain:.42,rate:.94+Math.random()*.12}):false}
  function prime(){Object.keys(PACK.clips).forEach(elementFor)}
  function installBiteHook(){var api=window.__egglandsV77;if(!api||typeof api.onBite!=="function")return false;if(api.onBite.__v025Sampled){state.hooked=true;return true}var previous=api.onBite;var wrapped=function(){if(!state.enabled||!globalSfxEnabled())return previous.apply(this,arguments);var hadConfig=typeof audioConfig!=="undefined",prior=hadConfig?audioConfig.sfx:true,result;if(hadConfig)audioConfig.sfx=false;try{result=previous.apply(this,arguments)}finally{if(hadConfig)audioConfig.sfx=prior;playBite(!!arguments[5])}return result};wrapped.__v025Sampled=true;wrapped.__v83Wrapped=true;wrapped.__previousRaptorBite=previous;api.onBite=wrapped;api.crunch=playBite;if(window.__egglandsV83)window.__egglandsV83.crunch=playBite;state.hooked=true;updateCard();return true}
  function pollMount(){try{var api=window.__egglandsRaptorsV36,current=!!(api&&typeof api.riding==="function"&&api.riding());if(state.mounted===null){state.mounted=current;return}if(current!==state.mounted){state.mounted=current;if(current)playMount();else playDismount()}}catch(error){}}
  function prettyBytes(value){value=Number(value)||0;return value>=1048576?(value/1048576).toFixed(2)+" MB":value>=1024?(value/1024).toFixed(1)+" KB":value+" B"}
  function updateCard(){var card=document.getElementById("raptorAudioCardV025");if(!card)return;var enabled=card.querySelector("#raptorAudioEnabledV025"),range=card.querySelector("#raptorAudioVolumeV025"),value=card.querySelector("#raptorAudioVolumeValueV025"),status=card.querySelector("#raptorAudioStateV025");if(enabled)enabled.checked=state.enabled;if(range)range.value=Math.round(state.volume*100);if(value)value.textContent=Math.round(state.volume*100)+"%";if(status)status.innerHTML=(state.hooked?'<span style="color:#79c56b">Bite event connected.</span>':'<span style="color:#e2ad45">Waiting for raptor system.</span>')+' Played '+state.playCount+' clip'+(state.playCount===1?'':'s')+'.'+(state.lastClip?' Last: <code>'+state.lastClip+'</code>.':'')+(state.lastError?' <span style="color:#df6c5d">'+String(state.lastError).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})+'</span>':'')}
  function installSettings(){var wrap=document.getElementById("settingsContent");if(!wrap)return false;var card=document.getElementById("raptorAudioCardV025");if(!card){card=document.createElement("div");card.id="raptorAudioCardV025";card.className="menuCard";card.innerHTML='<h3>Raptor Sound Effects <span class="hdArchitectureBadgeV34">v0.25</span></h3><div class="sub">Actual PCM WAV bytes are embedded in the compiled HTML. Mounted bite sounds trigger at the existing damage frame instead of relying only on generated oscillators.</div><div class="raptorAudioStatsV025"><span class="raptorAudioChipV025"><strong>'+PACK.clip_count+'</strong> clips</span><span class="raptorAudioChipV025"><strong>'+prettyBytes(PACK.total_audio_bytes)+'</strong> WAV data</span><span class="raptorAudioChipV025"><strong>4</strong> bite-hit variants</span><span class="raptorAudioChipV025"><strong>2</strong> bite-miss variants</span></div><label style="display:flex;gap:8px;align-items:center"><input id="raptorAudioEnabledV025" type="checkbox">Use byte-backed raptor sounds</label><label class="raptorAudioRangeV025"><span>Raptor SFX volume</span><input id="raptorAudioVolumeV025" type="range" min="0" max="100" step="1" value="78"><span id="raptorAudioVolumeValueV025">78%</span></label><div class="raptorAudioButtonsV025"><button class="uibtn" id="testBiteHitV025" type="button">Test bite hit</button><button class="uibtn" id="testBiteMissV025" type="button">Test bite miss</button><button class="uibtn" id="testMountV025" type="button">Test mount chirp</button><button class="uibtn" id="testIdleV025" type="button">Test idle trill</button></div><div id="raptorAudioStateV025" class="raptorAudioStateV025"></div>';wrap.appendChild(card);card.querySelector("#raptorAudioEnabledV025").addEventListener("change",function(event){state.enabled=!!event.target.checked;savePrefs();updateCard()});card.querySelector("#raptorAudioVolumeV025").addEventListener("input",function(event){state.volume=Math.max(0,Math.min(1,Number(event.target.value)/100));savePrefs();updateCard()});card.querySelector("#testBiteHitV025").addEventListener("click",function(){prime();playBite(true)});card.querySelector("#testBiteMissV025").addEventListener("click",function(){prime();playBite(false)});card.querySelector("#testMountV025").addEventListener("click",function(){prime();playMount()});card.querySelector("#testIdleV025").addEventListener("click",function(){prime();playIdle()})}updateCard();return true}
  loadPrefs();
  if(typeof renderSettings==="function"&&!renderSettings.__raptorAudioV025){var previousRenderSettingsV025=renderSettings;renderSettings=function(){var result=previousRenderSettingsV025.apply(this,arguments);setTimeout(installSettings,0);return result};renderSettings.__raptorAudioV025=true}
  addEventListener("pointerdown",prime,{once:true,capture:true});addEventListener("keydown",prime,{once:true,capture:true});
  setTimeout(function(){installBiteHook();installSettings()},800);setInterval(function(){installBiteHook();pollMount()},250);
  window.__egglandsAudioV025={version:VERSION,pack:PACK,clipCount:PACK.clip_count,totalBytes:PACK.total_audio_bytes,playClip:playClip,playBite:playBite,playMount:playMount,playDismount:playDismount,playIdle:playIdle,playStep:playStep,prime:prime,installBiteHook:installBiteHook,installSettings:installSettings,status:function(){return {enabled:state.enabled,volume:state.volume,playCount:state.playCount,lastClip:state.lastClip,lastError:state.lastError,hooked:state.hooked,mounted:state.mounted,totalBytes:PACK.total_audio_bytes,clipCount:PACK.clip_count}}};
  setTimeout(function(){document.title="The Egg Lands v0.25 — Byte-Backed Raptor Audio"},1350);
})();
<\/script>
'''
    return patch.replace("__AUDIO_PAYLOAD__", compact)
