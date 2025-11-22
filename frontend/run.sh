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

install_rust() {
    echo "Installing Rust/Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
}

install_xcode_cli() {
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install
    echo ""
    echo "Please complete the Xcode CLI installation in the popup window,"
    echo "then run this script again."
    exit 0
}

check_desktop_deps() {
    local missing=()

    # Check Rust/Cargo
    if ! command -v cargo &> /dev/null; then
        missing+=("rust")
    fi

    # Check Xcode Command Line Tools (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! xcode-select -p &> /dev/null; then
            missing+=("xcode-cli")
        fi
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo "Missing dependencies for desktop app:"
        echo ""
        for dep in "${missing[@]}"; do
            case $dep in
                rust)
                    echo "  - Rust/Cargo"
                    ;;
                xcode-cli)
                    echo "  - Xcode Command Line Tools"
                    ;;
            esac
        done
        echo ""
        read -p "Install missing dependencies? [y/N] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for dep in "${missing[@]}"; do
                case $dep in
                    xcode-cli)
                        install_xcode_cli
                        ;;
                    rust)
                        install_rust
                        ;;
                esac
            done
        else
            echo "Please install dependencies manually:"
            for dep in "${missing[@]}"; do
                case $dep in
                    rust)
                        echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
                        ;;
                    xcode-cli)
                        echo "  xcode-select --install"
                        ;;
                esac
            done
            exit 1
        fi
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
    check_desktop_deps
    install_deps
    kill_vite_on_port 5173
    kill_vite_on_port 1420
    echo "Starting desktop app..."
    npm run tauri:dev
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
