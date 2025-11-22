#!/bin/bash

set -e

cd "$(dirname "$0")"

show_help() {
    echo "Usage: ./run.sh [option]"
    echo ""
    echo "Options:"
    echo "  desktop   Run desktop app (default)"
    echo "  web       Run web dev server"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh          # Runs desktop app"
    echo "  ./run.sh desktop  # Runs desktop app"
    echo "  ./run.sh web      # Runs web dev server at http://localhost:5173"
}

check_node() {
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is not installed"
        exit 1
    fi
}

check_cargo() {
    if ! command -v cargo &> /dev/null; then
        echo "Error: Rust/Cargo is not installed"
        echo "Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
}

install_deps() {
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
}

kill_vite_on_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        # Check if the process is vite/node running from specflux
        local cmd=$(ps -p $pid -o args= 2>/dev/null || true)
        if echo "$cmd" | grep -qE "(vite|node.*specflux)"; then
            echo "Killing existing Vite process on port $port..."
            kill -9 $pid 2>/dev/null || true
        else
            echo "Port $port is in use by another application. Please free it manually."
            exit 1
        fi
    fi
}

run_desktop() {
    check_node
    check_cargo
    install_deps
    kill_vite_on_port 5173
    kill_vite_on_port 1420
    echo "Starting desktop app..."
    npm run tauri dev
}

run_web() {
    check_node
    install_deps
    kill_vite_on_port 5173
    echo "Starting web dev server at http://localhost:5173"
    npm run dev
}

case "${1:-desktop}" in
    desktop)
        run_desktop
        ;;
    web)
        run_web
        ;;
    --help|-h)
        show_help
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
