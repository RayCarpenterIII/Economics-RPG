# Running the villagers' minds on your own GPU/CPU

The game talks to any **OpenAI-compatible** local inference server. That means the underlying model is completely swappable: pull a different open-weights model, restart nothing, re-initialize in-game, done. No API keys, no cloud, no cost per token.

In-game configuration lives in **Menu → Help → God mode checkbox → God mode tab → Bounded planner** card:

1. **Backend**: "Local server" (recommended) or "In-browser (WebGPU)".
2. **Server URL**: where your inference server listens (defaults to Ollama's `http://localhost:11434/v1`).
3. **Model id**: leave blank to use the first model the server reports, or name one explicitly.
4. Press **Initialize local LLM**. The status line reports success or the exact failure.

Decisions made by the model are validated against the simulation's legal candidate list; anything invalid is rejected and the deterministic planner's choice stands.

## Option A — Ollama (easiest)

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

## Option B — LM Studio

1. Install from <https://lmstudio.ai>, download any open model in the app (GGUF; it uses GPU offload automatically).
2. Open the **Developer / Local Server** tab, enable **CORS**, and start the server (default `http://localhost:1234/v1`).
3. In-game, set the server URL to `http://localhost:1234/v1` and initialize.

## Option C — llama.cpp

```
llama-server -m your-model.gguf --port 8080 -ngl 99
```

`-ngl 99` offloads all layers to the GPU; omit it for CPU-only. In-game URL: `http://localhost:8080/v1`. CORS is enabled by default.

## Option D — vLLM (serious GPUs)

```
vllm serve Qwen/Qwen2.5-3B-Instruct
```

In-game URL: `http://localhost:8000/v1`.

## Option E — In-browser (WebLLM / WebGPU)

No install at all: choose the **In-browser** backend and initialize. The browser downloads a small quantized model (hundreds of MB, cached afterwards) and runs it on WebGPU. Requires a WebGPU-capable browser (recent Chrome/Edge; on Android, Chrome with WebGPU enabled). Best for demos; the server backends are faster and more flexible.

## Choosing models

The planner sends compact JSON decision prompts (~300–600 tokens) and expects a JSON object back. Practical guidance:

- **1–4 B instruct models** (Qwen 2.5 3B, Llama 3.2 3B, Gemma 2 2B, Phi-3.5-mini) are the sweet spot: fast enough to keep up with daily council/household decisions even on CPU.
- **7–8 B models** give noticeably better rationales if you have ≥6 GB VRAM.
- Anything that reliably emits JSON works — the game validates every choice, so a weak model degrades gracefully to the deterministic planner rather than breaking the world.

## Troubleshooting

- **"Could not reach …"** — the server isn't running, or the port is wrong.
- **"Server lists no models"** — pull/load a model first (`ollama pull …`, or load one in LM Studio).
- **CORS errors in the browser console** — enable CORS on the server (LM Studio toggle, `OLLAMA_ORIGINS`, etc.). Serving the game from `localhost` with Ollama needs nothing.
- **Decisions "rejected"** — the model returned malformed JSON or an illegal choice; try a stronger model or lower temperature. The game keeps running either way.
