#!/bin/bash
# Start both backend and frontend for development

echo "Starting SpecFlux development servers..."

# Kill any existing processes on the ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start backend
echo "Starting backend on http://localhost:3000..."
cd orchestrator && npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend running at http://localhost:3000"
echo "✓ Frontend running at http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
