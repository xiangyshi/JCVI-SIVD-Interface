#!/bin/bash

# Unified Protein Tools Server Startup Script

echo "🚀 Starting Unified Protein Tools Server..."

# Navigate to server directory
cd "$(dirname "$0")"

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed successfully."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ../containers/proteinmpnn/input
mkdir -p ../containers/proteinmpnn/output
mkdir -p ../containers/colabfold/input
mkdir -p ../containers/colabfold/output
mkdir -p ../containers/foldseek/input
mkdir -p ../containers/foldseek/output
mkdir -p ../containers/haddock/input
mkdir -p ../containers/haddock/output

echo "✅ Directories created."

# Clean up logs on restart
echo "🧹 Cleaning logs..."
mkdir -p ../logs
# Remove project log files if present
rm -f ../logs/*.log 2>/dev/null || true
echo "   Project logs cleared in ../logs"

# Function to safely kill Node.js processes
kill_node_processes() {
    local port=$1
    
    # Method 1: Find by port and process name
    local pids_by_port=$(lsof -Pi :$port -sTCP:LISTEN | grep -E "(node|npm)" | awk '{print $2}' | sort -u)
    
    # Method 2: Find by process name and grep for our app
    local pids_by_name=$(pgrep -f "node.*app\.js" 2>/dev/null)
    
    # Combine and deduplicate PIDs
    local all_pids=$(echo "$pids_by_port $pids_by_name" | tr ' ' '\n' | sort -u | tr '\n' ' ')
    
    if [ -n "$all_pids" ]; then
        echo "Found Node.js processes: $all_pids"
        for pid in $all_pids; do
            if kill -0 $pid 2>/dev/null; then
                echo "Terminating process $pid gracefully..."
                kill -TERM $pid 2>/dev/null
                sleep 2
                if kill -0 $pid 2>/dev/null; then
                    echo "Force killing process $pid..."
                    kill -KILL $pid 2>/dev/null
                fi
            fi
        done
        return 0
    else
        return 1
    fi
}

# Check if port 3002 is available
PORT=${PORT:-3002}  
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use."
    
    # Get detailed process information
    PROCESS_INFO=$(lsof -Pi :$PORT -sTCP:LISTEN)
    echo "Process details:"
    echo "$PROCESS_INFO"
    
    # Try to find Node.js processes specifically
    NODE_PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN | grep -E "(node|npm)" | awk '{print $2}' | sort -u)
    
    if [ -n "$NODE_PIDS" ]; then
        echo ""
        echo "Found Node.js process(es) on port $PORT:"
        for pid in $NODE_PIDS; do
            ps -p $pid -o pid,ppid,cmd 2>/dev/null || echo "PID $pid not found"
        done
        echo ""
        read -p "Kill Node.js process(es) and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_node_processes $PORT
            echo "✅ Node.js processes terminated."
            sleep 1
        else
            echo "❌ Cannot start server on port $PORT"
            exit 1
        fi
    else
        echo ""
        echo "⚠️  Port $PORT is occupied by a non-Node.js process."
        echo "   Please manually resolve this conflict."
        echo "   Process details shown above."
        exit 1
    fi
fi

echo ""
echo "🌐 Server Information:"
echo "   Port: $PORT"
echo "   Health Check: http://localhost:$PORT/api/health"
echo "   File Upload: http://localhost:$PORT/api/upload"
echo "   Job Execution: http://localhost:$PORT/api/run-tool"
echo "   Job Status: http://localhost:$PORT/api/jobs"
echo ""
echo "🔧 Available Tools:"
echo "   - ProteinMPNN (protein sequence design)"
echo "   - ColabFold (protein structure prediction)"
echo "   - Foldseek (protein structure search)"
echo "   - HADDOCK (protein-protein docking)"
echo ""
echo "📊 Management Commands:"
echo "   - pm2 status (if using PM2)"
echo "   - curl http://localhost:$PORT/api/health (test server)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================="

# Start the server
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 found, starting with process manager..."
    # Flush PM2-managed logs (including previous out/err logs in ~/.pm2/logs)
    pm2 flush 2>/dev/null || true
    pm2 delete protein-tools-server 2>/dev/null || true
    pm2 start app.js --name "protein-tools-server"
    pm2 logs protein-tools-server
else
    echo "ℹ️  Starting server directly (will stop when terminal closes)"
    echo "💡 Install PM2 for persistent background operation: npm install -g pm2"
    npm start
fi
