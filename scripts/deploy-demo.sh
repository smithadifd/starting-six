#!/usr/bin/env bash
set -euo pipefail

# Deploy to the demo host. Side effects: may update the SSH security group,
# fetch main, clone/reset the remote checkout, stop running demo stacks, build
# and replace this app's container, then restart the recorded demo stacks.
# --dry-run prints the plan without network, Git, Docker, or host changes.
REMOTE="demo"
REMOTE_PATH="/opt/demos/starting-six"
REPO_URL="https://github.com/smithadifd/starting-six.git"
APP_PORT=3012
INFRA_DIR="${DEMO_INFRA_DIR:-$HOME/demo-infra}"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

ensure_ssh_access() {
    if [ ! -f "$INFRA_DIR/terraform.tfvars" ]; then
        warn "demo-infra not found at $INFRA_DIR — skipping IP check"
        return 0
    fi
    local current_ip tfvars_ip
    current_ip=$(curl -s --max-time 5 ifconfig.me)
    tfvars_ip=$(grep 'admin_ip' "$INFRA_DIR/terraform.tfvars" | sed 's/.*"\(.*\)".*/\1/')
    if [[ "$current_ip" != "$tfvars_ip" ]]; then
        warn "Admin IP changed ($tfvars_ip -> $current_ip). Updating security group..."
        (cd "$INFRA_DIR" && ./update-ip.sh)
        info "Security group updated."
    else
        info "Admin IP unchanged ($current_ip)."
    fi
}

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

main() {
    if [[ "${1:-}" == "--dry-run" && $# -eq 1 ]]; then
        info "Dry run: check SSH access and main, then deploy $REPO_URL to $REMOTE:$REMOTE_PATH."
        info "Record and stop only running demo stacks; build and start Starting Six; restart the recorded stacks."
        info "Check http://localhost:$APP_PORT/api/health with backoff; restore the previous image or print a manual rollback command on failure."
        return 0
    fi
    if (( $# != 0 )); then
        error "Usage: $0 [--dry-run]"
        return 2
    fi
    ensure_ssh_access
    preflight
    ssh "$REMOTE" bash -s -- "$REMOTE_PATH" "$REPO_URL" "$APP_PORT" < "$SCRIPT_DIR/deploy-demo-remote.sh"
    info "Deployment successful! App available at: https://starting-six.smithadifd.com"
}

main "$@"
