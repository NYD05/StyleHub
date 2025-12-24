#!/bin/bash

# StyleHub - Fashion Sketch Sharing Platform
# Startup Script

echo "Starting StyleHub Application..."

# Create a screen session for backend
echo "Starting backend server..."
cd backend
screen -dmS stylehub-backend bash -c "python3 app.py; exec bash"

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "Starting frontend development server..."
cd ../react-frontend
npm run dev

echo "StyleHub is now running!"
echo "Backend API: http://localhost:5000"
echo "Frontend: http://localhost:3000"

# Instructions for user
echo ""
echo "To stop the application:"
echo "1. Press Ctrl+C to stop the frontend server"
echo "2. Run 'screen -S stylehub-backend -X quit' to stop the backend server"