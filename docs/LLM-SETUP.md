# Running the villagers' minds

The zero-setup default is **HuggingFaceTB/SmolLM2-135M-Instruct** in 4-bit form. Transformers.js runs it on CPU/WASM in the browser, without WebGPU. It downloads on the first conversation and is then kept in the browser cache. The tiny model handles speech only; deterministic rules continue to make dependable household and council decisions.

The game can also talk to any **OpenAI-compatible** local inference server. This lets you swap in a stronger open-weights model for higher-quality conversation and bounded planning. No API keys or per-token cloud cost are required.

In-game configuration lives in **Menu → Settings → Villager LLM**:

1. **Backend**: keep "Lightweight browser CPU" for the smooth default, choose "Local server" for Ollama/LM Studio, or try experimental WebGPU on compatible hardware.
2. **Server URL**: where your inference server listens (defaults to Ollama's `http://localhost:11434/v1`).
3. **Model id**: leave blank to use the first model the server reports, or name one explicitly.
4. Press **Load / connect**. The status line reports success or the exact failure.

Decisions made by larger models are validated against the simulation's legal candidate list; anything invalid is rejected and the deterministic planner's choice stands. Conversations are grounded in each villager's current family, traits, work, memories, and town state. Recent turns and important facts the traveler shares are saved per villager; routine questions are not treated as permanent memories.

## Option A — Lightweight browser CPU (default)

No setup is needed. Talk to a villager and send the first line; the game downloads the tiny 4-bit model and displays progress in Settings. Later visits use the browser cache. This backend is the best starting point on Android or machines where WebGPU is unavailable.

## Option B — Ollama (easiest stronger model)

1. Install from <https://ollama.com/download> (Windows/macOS/Linux). Ollama automatically uses your NVIDIA/AMD GPU if present, otherwise the CPU.
2. Pull a small instruct model — the planner's prompts are short, so 1–4 B models respond quickly:
   ```
   ollama pull qwen2.5:3b
   ```
   Other good picks: `llama3.2:3b`, `phi3.5`, `gemma2:2b`. Bigger machines can try `qwen2.5:7b` or `llama3.1:8b`.
3. Make sure Ollama is running (it starts a server on port 11434 automatically; otherwise run `ollama serve`).
4. In-game, keep the default URL `http://localhost:11434/v1` and initialize.

Ollama accepts browser requests from `localhost` pages out of the box. If you serve the game to your **phone** with `node serve.js --lan`, the page's origin is your PC's IP, so you must (a) set the in-game server URL to `http://<your-pc-ip>:11434/v1` and (b) allow that origin before starting Ollama:

```
setx OLLAMA_HOST 0.0.0.0
setx OLLAMA_ORIGINS *
```

(then restart Ollama; on macOS/Linux export the same variables).

## Option C — LM Studio

1. Install from <https://lmstudio.ai>, download any open model in the app (GGUF; it uses GPU offload automatically).
2. Open the **Developer / Local Server** tab, enable **CORS**, and start the server (default `http://localhost:1234/v1`).
3. In-game, set the server URL to `http://localhost:1234/v1` and initialize.

## Option D — llama.cpp

```
llama-server -m your-model.gguf --port 8080 -ngl 99
```

`-ngl 99` offloads all layers to the GPU; omit it for CPU-only. In-game URL: `http://localhost:8080/v1`. CORS is enabled by default.

## Option E — vLLM (serious GPUs)

```
vllm serve Qwen/Qwen2.5-3B-Instruct
```

In-game URL: `http://localhost:8000/v1`.

## Option F — In-browser (WebLLM / WebGPU, experimental)

Choose the **WebGPU** backend and initialize. The browser downloads a larger quantized model (hundreds of MB, cached afterwards) and runs it on WebGPU. It requires a WebGPU-capable browser and is deliberately not the default on mobile.

## Choosing models

Planning sends compact JSON decision prompts (~300–600 tokens), while conversations include a small state snapshot and recent dialogue history. Practical guidance:

- **SmolLM2 135M Instruct (default)** is the smallest, smoothest browser option. It is suited to short in-character speech; deterministic code handles planning.
- **SmolLM2 360M Instruct** is the next model worth testing through a compatible local server if 135M is not coherent enough; it costs more memory and responds more slowly.
- **1–4 B instruct models** (Qwen 2.5 3B, Llama 3.2 3B, Gemma 2 2B, Phi-3.5-mini) are responsive enough for daily planning and basic conversation even on CPU.
- **7–8 B models** give noticeably more coherent multi-turn dialogue and better rationales if you have ≥6 GB VRAM.
- Anything that reliably emits JSON works — the game validates every choice, so a weak model degrades gracefully to the deterministic planner rather than breaking the world.

## Troubleshooting

- **"Could not reach …"** — the server isn't running, or the port is wrong.
- **"Server lists no models"** — pull/load a model first (`ollama pull …`, or load one in LM Studio).
- **CORS errors in the browser console** — enable CORS on the server (LM Studio toggle, `OLLAMA_ORIGINS`, etc.). Serving the game from `localhost` with Ollama needs nothing.
- **Decisions "rejected"** — the model returned malformed JSON or an illegal choice; try a stronger model or lower temperature. The game keeps running either way.
