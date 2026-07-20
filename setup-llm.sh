#!/usr/bin/env sh
# One-command local LLM setup for The Egg Lands (macOS / Linux).
# Installs Ollama if needed and pulls the villagers' model.
# Usage: ./setup-llm.sh [model]   (default: qwen3:8b; try qwen3:4b or llama3.2:3b on smaller GPUs)
set -e
MODEL="${1:-qwen3:8b}"

if ! command -v ollama >/dev/null 2>&1; then
  case "$(uname -s)" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        echo "Installing Ollama with Homebrew ..."
        brew install ollama
      else
        echo "Please install Ollama from https://ollama.com/download and re-run this script."
        exit 1
      fi
      ;;
    Linux)
      echo "Installing Ollama with the official install script (may ask for sudo) ..."
      curl -fsSL https://ollama.com/install.sh | sh
      ;;
    *)
      echo "Unsupported platform. Install Ollama manually: https://ollama.com/download"
      exit 1
      ;;
  esac
fi

# Make sure the server is up (the installer usually starts it; this is a fallback).
if ! curl -fsS http://localhost:11434/api/version >/dev/null 2>&1; then
  echo "Starting the Ollama server in the background ..."
  nohup ollama serve >/dev/null 2>&1 &
  sleep 3
fi

echo "Pulling $MODEL (a few GB on first run; Ollama uses your GPU automatically) ..."
ollama pull "$MODEL"

cat <<EOF

Done. To give your villagers this mind:
  1. Start the game (node serve.js) and pick a class.
  2. Menu > Help > tick "God mode", then open the God mode tab.
  3. Backend "Local server", URL http://localhost:11434/v1, model $MODEL.
  4. Press "Initialize local LLM".
EOF
