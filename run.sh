#!/bin/bash
# Start both backend and frontend for development

set -e

cd "$(dirname "$0")"

show_help() {
    echo "Usage: ./run.sh [option]"
    echo ""
    echo "Options:"
    echo "  app       Run desktop app (default)"
    echo "  web       Run web dev server only"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh          # Runs desktop app"
    echo "  ./run.sh app      # Runs desktop app"
    echo "  ./run.sh web      # Runs web dev server"
    echo ""
    echo "URLs:"
    echo "  Backend (Spring Boot): http://localhost:8090 (start separately)"
    echo "  Frontend: http://localhost:5173 (web mode)"
    echo ""
    echo "Note: Spring Boot backend should be started separately if needed."
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
    local dir=$1
    if [ ! -d "$dir/node_modules" ]; then
        echo "Installing $dir dependencies..."
        (cd "$dir" && npm install)
    fi
}

generate_api_client() {
    # Only regenerate if generated folder doesn't exist or openapi spec is newer
    if [ ! -d "src/api/generated" ] || [ "openapi/api.yaml" -nt "src/api/generated/index.ts" ]; then
        echo "Generating API client..."
        npm run generate:client
    fi
}

kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing existing process on port $port..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    # Kill any remaining processes on our ports
    kill_port 5173
    exit 0
}

trap cleanup SIGINT SIGTERM

run_app() {
    check_node
    check_desktop_deps

    echo "Starting SpecFlux desktop app..."
    echo ""

    install_deps "."
    generate_api_client
    kill_port 5173
    kill_port 1420
    npm run tauri:dev &
    FRONTEND_PID=$!

    echo ""
    echo "Desktop app starting..."
    echo "Note: Start Spring Boot backend separately on port 8090 if needed."
    echo ""
    echo "Press Ctrl+C to stop"

    wait
}

run_web() {
    check_node

    echo "Starting SpecFlux web development server..."
    echo ""

    install_deps "."
    generate_api_client
    kill_port 5173
    npm run dev &
    FRONTEND_PID=$!

    echo ""
    echo "Frontend running at http://localhost:5173"
    echo "Note: Start Spring Boot backend separately on port 8090 if needed."
    echo ""
    echo "Press Ctrl+C to stop"

    wait
}

case "${1:-app}" in
    app|desktop)
        run_app
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
