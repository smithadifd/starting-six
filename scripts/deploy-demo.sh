#!/usr/bin/env bash
set -euo pipefail

REMOTE="demo"
REMOTE_PATH="/opt/demos/starting-six"
REPO_URL="https://github.com/smithadifd/starting-six.git"
COMPOSE_FILE="docker-compose.demo.yml"
APP_PORT=3012

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

preflight() {
    info "Running pre-flight checks..."
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$branch" != "main" ]]; then
        error "Not on main branch (currently on: $branch)"; exit 1
    fi
    if ! git diff --quiet HEAD 2>/dev/null; then
        error "Uncommitted changes detected. Commit or stash first."; exit 1
    fi
    git fetch origin main --quiet
    local local_hash remote_hash
    local_hash=$(git rev-parse HEAD)
    remote_hash=$(git rev-parse origin/main)
    if [[ "$local_hash" != "$remote_hash" ]]; then
        warn "Local main differs from origin/main."
        read -rp "Continue anyway? [y/N] " confirm
        [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
    fi
    info "Pre-flight checks passed. Deploying commit: ${local_hash:0:8}"
}

deploy() {
    info "Connecting to EC2 demo server..."
    ssh "$REMOTE" bash -s <<REMOTE_SCRIPT
set -euo pipefail

if [ ! -d "$REMOTE_PATH/.git" ]; then
    echo "Cloning repository..."
    sudo mkdir -p "$REMOTE_PATH"
    sudo chown ubuntu:ubuntu "$REMOTE_PATH"
    git clone "$REPO_URL" "$REMOTE_PATH"
else
    echo "Pulling latest changes..."
    cd "$REMOTE_PATH"
    git fetch origin main
    git reset --hard origin/main
fi

cd "$REMOTE_PATH"
echo "Now at commit: \$(git rev-parse --short HEAD)"

if [ ! -f ".env.demo" ]; then
    echo "ERROR: .env.demo not found at $REMOTE_PATH/.env.demo"
    echo "Create it with: BETTER_AUTH_SECRET=<secret>"
    exit 1
fi

echo "--- Building Docker image ---"
docker compose -f "$COMPOSE_FILE" --env-file .env.demo build

echo "--- Starting containers ---"
docker compose -f "$COMPOSE_FILE" --env-file .env.demo up -d

echo "--- Container status ---"
docker compose -f "$COMPOSE_FILE" ps
REMOTE_SCRIPT

    info "Deploy complete."
}

healthcheck() {
    info "Running health check..."
    local max_attempts=10 attempt=1

    while [ $attempt -le $max_attempts ]; do
        if ssh "$REMOTE" "curl -sf --max-time 5 http://localhost:${APP_PORT}/api/health" > /dev/null 2>&1; then
            info "Health check passed"
            return 0
        fi
        warn "Attempt $attempt/$max_attempts - waiting..."
        sleep 3
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts."
    return 1
}

main() {
    echo ""
    echo "========================================="
    echo "  Starting Six - Deploy to Demo Server"
    echo "========================================="
    echo ""
    preflight
    deploy
    healthcheck
    echo ""
    info "Deployment successful! App available at: https://starting-six.smithadifd.com"
    echo ""
}

main "$@"
