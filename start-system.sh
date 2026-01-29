#!/bin/bash

# ============================================================================
# Billing System - Quick Start Script
# ============================================================================
# This script provides multiple ways to run the billing system:
# 1. Docker Compose (Recommended - All dependencies included)
# 2. Local Development (Requires Node.js, MySQL, Redis)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
NODE_VERSION_MIN="18.0.0"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         ISP & HOTSPOT BILLING SYSTEM - QUICK START         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_docker() {
    print_step "Checking Docker availability..."
    if command -v docker &> /dev/null; then
        if command -v docker-compose &> /dev/null; then
            print_success "Docker and Docker Compose are available"
            return 0
        elif docker compose version &> /dev/null; then
            print_success "Docker Compose (v2) is available"
            return 0
        else
            print_error "Docker Compose not found. Please install Docker Compose."
            return 1
        fi
    else
        print_error "Docker not found. Please install Docker Desktop."
        return 1
    fi
}

check_node() {
    print_step "Checking Node.js availability..."
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version | sed 's/v//')
        if [ "$(printf '%s\n' "$NODE_VERSION_MIN" "$NODE_VER" | sort -V | head -n1)" = "$NODE_VERSION_MIN" ]; then
            print_success "Node.js $NODE_VER is available"
            return 0
        else
            print_error "Node.js version $NODE_VER is too old. Minimum required: $NODE_VERSION_MIN"
            return 1
        fi
    else
        print_error "Node.js not found"
        return 1
    fi
}

check_mysql() {
    print_step "Checking MySQL availability..."
    if command -v mysql &> /dev/null; then
        print_success "MySQL client is available"
        return 0
    else
        print_info "MySQL client not found locally (Docker will be used if available)"
        return 1
    fi
}

check_env() {
    print_step "Checking environment configuration..."
    if [ -f "$ENV_FILE" ]; then
        print_success "Environment file found: $ENV_FILE"
        return 0
    else
        print_error "Environment file not found: $ENV_FILE"
        return 1
    fi
}

start_docker() {
    print_header
    print_step "Starting Billing System with Docker Compose..."

    # Check Docker first
    if ! check_docker; then
        print_error "Docker is required for this method"
        exit 1
    fi

    # Check environment
    if ! check_env; then
        print_error "Please create .env file from .env.example"
        exit 1
    fi

    # Pull latest images
    print_step "Pulling Docker images (this may take a few minutes)..."
    if docker compose pull 2>/dev/null || docker-compose pull 2>/dev/null; then
        print_success "Images pulled successfully"
    fi

    # Start services
    print_step "Starting services..."
    if docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null; then
        print_success "Services started successfully"

        # Wait for services to be healthy
        print_step "Waiting for services to be healthy..."
        sleep 10

        # Show status
        print_step "Service Status:"
        docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null

        print_success "=========================================="
        print_success "System is starting up!"
        print_success "=========================================="
        print_info "Frontend:    http://localhost:5173"
        print_info "Backend API: http://localhost:3000"
        print_info "Admin Panel: http://localhost:8080"
        print_info "MySQL:       localhost:3306"
        print_info "Redis:       localhost:6379"
        print_success "=========================================="
    else
        print_error "Failed to start services"
        exit 1
    fi
}

start_local() {
    print_header
    print_step "Starting Billing System in Local Development Mode..."

    # Check prerequisites
    if ! check_node; then
        print_error "Node.js is required for local development"
        exit 1
    fi

    # Check environment
    if ! check_env; then
        print_error "Please create .env file from .env.example"
        exit 1
    fi

    # Install backend dependencies
    print_step "Installing backend dependencies..."
    if [ -f "package.json" ]; then
        npm install
        print_success "Backend dependencies installed"
    else
        print_error "package.json not found in current directory"
        exit 1
    fi

    # Install frontend dependencies
    print_step "Installing frontend dependencies..."
    if [ -f "frontend/package.json" ]; then
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_error "frontend/package.json not found"
        exit 1
    fi

    # Check MySQL
    print_step "Checking database connection..."
    check_mysql || true

    # Build TypeScript
    print_step "Building backend..."
    npm run build
    print_success "Backend built successfully"

    # Build frontend
    print_step "Building frontend..."
    cd frontend
    npm run build
    cd ..
    print_success "Frontend built successfully"

    # Start backend
    print_step "Starting backend server..."
    npm start &
    BACKEND_PID=$!
    print_success "Backend started (PID: $BACKEND_PID)"

    # Start frontend dev server
    print_step "Starting frontend dev server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    print_success "Frontend started (PID: $FRONTEND_PID)"

    print_success "=========================================="
    print_success "Development servers started!"
    print_success "=========================================="
    print_info "Frontend:    http://localhost:5173"
    print_info "Backend API: http://localhost:3000"
    print_success "=========================================="

    # Handle shutdown
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

    wait
}

stop_services() {
    print_step "Stopping all services..."
    if docker compose down 2>/dev/null || docker-compose down 2>/dev/null; then
        print_success "Docker services stopped"
    else
        print_info "No Docker services running or Docker not available"
    fi
    pkill -f "node.*server" 2>/dev/null || true
    print_success "All services stopped"
}

show_logs() {
    print_step "Showing service logs..."
    if docker compose logs -f 2>/dev/null || docker-compose logs -f 2>/dev/null; then
        :
    else
        print_error "Docker not available for logs"
    fi
}

show_help() {
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the billing system"
    echo "  start:docker  Start with Docker Compose (recommended)"
    echo "  start:local   Start in local development mode"
    echo "  stop         Stop all services"
    echo "  logs         Show service logs"
    echo "  restart      Restart all services"
    echo "  status       Show service status"
    echo "  help         Show this help message"
    echo ""
    echo "Quick Start:"
    echo "  1. Edit .env with your configuration"
    echo "  2. Run: $0 start:docker"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    case "${1:-start}" in
        start)
            start_docker
            ;;
        start:docker)
            start_docker
            ;;
        start:local)
            start_local
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_docker
            ;;
        logs)
            show_logs
            ;;
        status)
            if docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null; then
                :
            else
                print_info "Docker not available - checking local processes..."
                ps aux | grep -E "node|npm" | grep -v grep || echo "No local processes found"
            fi
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
