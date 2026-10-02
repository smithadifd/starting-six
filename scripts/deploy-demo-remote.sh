#!/usr/bin/env bash
set -euo pipefail

remote_path=$1
repo_url=$2
app_port=$3
compose_file=docker-compose.demo.yml
health_url="http://localhost:${app_port}/api/health"
previous_commit=
previous_image=
previous_image_name=

if [[ -d "$remote_path/.git" ]]; then
    cd "$remote_path"
    previous_commit=$(git rev-parse HEAD)
    previous_container=$(docker compose -f "$compose_file" --env-file .env.demo ps -q app || true)
    if [[ -n "$previous_container" ]]; then
        previous_image=$(docker inspect --format '{{.Image}}' "$previous_container" || true)
        previous_image_name=$(docker inspect --format '{{.Config.Image}}' "$previous_container" || true)
    fi
    git fetch origin main
    git reset --hard origin/main
else
    sudo mkdir -p "$remote_path"
    sudo chown ubuntu:ubuntu "$remote_path"
    git clone "$repo_url" "$remote_path"
fi
cd "$remote_path"
if [[ ! -f .env.demo ]]; then
    echo "ERROR: .env.demo not found at $remote_path/.env.demo" >&2
    echo "Create it with: BETTER_AUTH_SECRET=<secret>" >&2
    exit 1
fi

declare -a running_demos=()
if ! running_projects=$(docker ps --format '{{.Label "com.docker.compose.project.working_dir"}}'); then
    echo "ERROR: Failed to list running Docker containers" >&2
    exit 1
fi
while IFS= read -r dir; do
    [[ "$dir" == "$(dirname "$remote_path")/"* ]] || continue
    [[ -f "$dir/$compose_file" && -f "$dir/.env.demo" ]] || continue
    [[ "${dir#"$(dirname "$remote_path")/"}" != */* ]] || continue
    if [[ ! " ${running_demos[*]} " == *" $dir "* ]]; then
        running_demos+=("$dir")
    fi
done <<< "$running_projects"

restart_running_demos() {
    local dir failed=0
    for dir in "${running_demos[@]}"; do
        echo "Restarting $dir"
        if ! (cd "$dir" && docker compose -f "$compose_file" --env-file .env.demo up -d); then
            echo "ERROR: Failed to restart $dir" >&2
            failed=1
        fi
    done
    return "$failed"
}

restart_other_demos() {
    local dir failed=0
    for dir in "${running_demos[@]}"; do
        [[ "$dir" == "$remote_path" ]] && continue
        echo "Restarting $dir"
        if ! (cd "$dir" && docker compose -f "$compose_file" --env-file .env.demo up -d); then
            echo "ERROR: Failed to restart $dir" >&2
            failed=1
        fi
    done
    return "$failed"
}

restore_on_failure() {
    local status=$?
    trap - EXIT
    if (( status != 0 )); then
        restart_running_demos || true
    fi
    exit "$status"
}
trap restore_on_failure EXIT
for dir in "${running_demos[@]}"; do
    echo "Stopping $dir"
    (cd "$dir" && docker compose -f "$compose_file" --env-file .env.demo stop)
done

docker compose -f "$compose_file" --env-file .env.demo build
docker compose -f "$compose_file" --env-file .env.demo up -d
restart_other_demos
trap - EXIT

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

attempt=1
delay=1
while (( attempt <= 10 )); do
    if curl -sf --max-time 5 "$health_url" >/dev/null; then
        echo "Health check passed: $health_url"
        exit 0
    fi
    echo "Health check failed for $health_url (attempt $attempt/10)" >&2
    if (( attempt < 10 )); then
        sleep "$delay"
        (( delay = delay < 16 ? delay * 2 : 16 ))
    fi
    (( attempt += 1 ))
done

echo "ERROR: Health check failed: $health_url" >&2
echo "Logs: cd $remote_path && docker compose -f $compose_file --env-file .env.demo logs --tail=50 app" >&2
docker compose -f "$compose_file" --env-file .env.demo logs --tail=50 app >&2 || true
current_container=$(docker compose -f "$compose_file" --env-file .env.demo ps -q app || true)
current_image_name=
if [[ -n "$current_container" ]]; then
    current_image_name=$(docker inspect --format '{{.Config.Image}}' "$current_container" || true)
fi
if [[ -n "$previous_image" && -n "$previous_image_name" && "$previous_image_name" == "$current_image_name" ]]; then
    echo "Restoring previous image $previous_image" >&2
    docker tag "$previous_image" "$previous_image_name"
    docker compose -f "$compose_file" --env-file .env.demo up -d --no-build --force-recreate
elif [[ -n "$previous_commit" ]]; then
    echo "Manual rollback: cd $remote_path && git reset --hard $previous_commit && docker compose -f $compose_file --env-file .env.demo up -d --build" >&2
else
    echo "Manual rollback: cd $remote_path && docker compose -f $compose_file --env-file .env.demo down" >&2
fi
exit 1
