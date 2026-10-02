#!/usr/bin/env bash
set -euo pipefail

remote_path=$1
repo_url=$2
app_port=$3
compose_file=docker-compose.demo.yml
health_url="http://localhost:${app_port}/api/health"
previous_commit=
previous_image=
compose_image=

if [[ -d "$remote_path/.git" ]]; then
    cd "$remote_path"
    previous_commit=$(git rev-parse HEAD)
    previous_container=$(docker compose -f "$compose_file" --env-file .env.demo ps -q app || true)
    if [[ -n "$previous_container" ]]; then
        previous_image=$(docker inspect --format '{{.Image}}' "$previous_container" || true)
        compose_image=$(docker compose -f "$compose_file" --env-file .env.demo config --images | head -n 1 || true)
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
    exit 1
fi

declare -a running_demos=()
while IFS= read -r dir; do
    [[ "$dir" == "$(dirname "$remote_path")/"* ]] || continue
    [[ -f "$dir/$compose_file" && -f "$dir/.env.demo" ]] || continue
    [[ "${dir#"$(dirname "$remote_path")/"}" != */* ]] || continue
    if [[ ! " ${running_demos[*]} " == *" $dir "* ]]; then
        running_demos+=("$dir")
    fi
done < <(docker ps --format '{{.Label "com.docker.compose.project.working_dir"}}')

restart_other_demos() {
    local dir
    for dir in "${running_demos[@]}"; do
        [[ "$dir" == "$remote_path" ]] && continue
        echo "Restarting $dir"
        (cd "$dir" && docker compose -f "$compose_file" --env-file .env.demo up -d)
    done
}

for dir in "${running_demos[@]}"; do
    echo "Stopping $dir"
    (cd "$dir" && docker compose -f "$compose_file" --env-file .env.demo stop)
done
trap 'restart_other_demos' EXIT

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
if [[ -n "$previous_image" && -n "$compose_image" ]]; then
    echo "Restoring previous image $previous_image" >&2
    docker tag "$previous_image" "$compose_image"
    docker compose -f "$compose_file" --env-file .env.demo up -d --no-build --force-recreate
elif [[ -n "$previous_commit" ]]; then
    echo "Manual rollback: cd $remote_path && git reset --hard $previous_commit && docker compose -f $compose_file --env-file .env.demo up -d --build" >&2
else
    echo "Manual rollback: cd $remote_path && docker compose -f $compose_file --env-file .env.demo down" >&2
fi
exit 1
