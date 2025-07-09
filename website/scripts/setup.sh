#!/bin/bash

# LinguaLink Platform Setup Script
# This script sets up the development environment for the LinguaLink platform

set -e

echo "🌐 LinguaLink Platform Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need Docker for containerized development."
    else
        print_success "Docker found: $(docker --version)"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. You'll need it for local development."
    else
        print_success "Docker Compose found: $(docker-compose --version)"
    fi
    
    print_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Install root dependencies
    print_info "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        print_info "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        print_info "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Install shared dependencies
    if [ -d "shared" ]; then
        print_info "Installing shared dependencies..."
        cd shared && npm install && cd ..
    fi
    
    print_success "All dependencies installed"
}

# Setup environment files
setup_environment() {
    print_info "Setting up environment files..."
    
    # Backend environment
    if [ -f "backend/env.template" ] && [ ! -f "backend/.env.development" ]; then
        cp backend/env.template backend/.env.development
        print_success "Created backend/.env.development"
        print_warning "Please update backend/.env.development with your actual API keys"
    fi
    
    # Frontend environment
    if [ -f "frontend/env.template" ] && [ ! -f "frontend/.env.development" ]; then
        cp frontend/env.template frontend/.env.development
        print_success "Created frontend/.env.development"
        print_warning "Please update frontend/.env.development with your actual API keys"
    fi
    
    # Production environment templates
    if [ -f "backend/env.template" ] && [ ! -f "backend/.env.production" ]; then
        cp backend/env.template backend/.env.production
        print_success "Created backend/.env.production template"
    fi
    
    if [ -f "frontend/env.template" ] && [ ! -f "frontend/.env.production" ]; then
        cp frontend/env.template frontend/.env.production
        print_success "Created frontend/.env.production template"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_info "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        npx husky install
        print_success "Git hooks configured"
    else
        print_warning "Not a Git repository. Skipping Git hooks setup."
    fi
}

# Verify setup
verify_setup() {
    print_info "Verifying setup..."
    
    # Check if package.json files exist
    if [ -f "package.json" ]; then
        print_success "Root package.json found"
    fi
    
    if [ -f "backend/package.json" ]; then
        print_success "Backend package.json found"
    fi
    
    if [ -f "frontend/package.json" ]; then
        print_success "Frontend package.json found"
    fi
    
    if [ -f "shared/package.json" ]; then
        print_success "Shared package.json found"
    fi
    
    # Check if environment files exist
    if [ -f "backend/.env.development" ]; then
        print_success "Backend environment file created"
    fi
    
    if [ -f "frontend/.env.development" ]; then
        print_success "Frontend environment file created"
    fi
    
    print_success "Setup verification completed"
}

# Print next steps
print_next_steps() {
    echo ""
    print_info "Setup completed! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Update environment files with your API keys:"
    echo "   - backend/.env.development"
    echo "   - frontend/.env.development"
    echo ""
    echo "2. Start the development environment:"
    echo "   npm run docker:dev    # Start with Docker"
    echo "   # OR"
    echo "   npm run dev          # Start locally"
    echo ""
    echo "3. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:3001"
    echo "   - API Docs: http://localhost:3001/api/docs"
    echo "   - Database Admin: http://localhost:8080"
    echo ""
    echo "For more information, see README.md"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    verify_setup
    print_next_steps
}

# Run main function
main 