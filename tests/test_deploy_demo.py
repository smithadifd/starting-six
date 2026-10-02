"""Host-side deploy behavior with command stubs; no Docker or SSH required."""
import os
from pathlib import Path
import subprocess


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "deploy-demo-remote.sh"
LOCAL = SCRIPT.with_name("deploy-demo.sh")


def make_stub(path, body):
    path.write_text("#!/usr/bin/env bash\nset -euo pipefail\n" + body)
    path.chmod(0o755)


def run_deploy(tmp_path, failed_health=False, previous_image=True):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    demos = tmp_path / "demos"
    target = demos / "starting-six"
    other = demos / "other"
    dormant = demos / "dormant"
    unrelated = tmp_path / "unrelated"
    for directory in (target, other, dormant, unrelated):
        (directory / ".git").mkdir(parents=True)
        (directory / "docker-compose.demo.yml").touch()
        (directory / ".env.demo").touch()
    log = tmp_path / "commands"
    make_stub(bin_dir / "docker", '''
    printf 'docker %s\\n' "$*" >> "$COMMAND_LOG"
    case " $* " in
      *' ps -q app '*) echo prior-container ;;
      *' inspect '*) if [[ "$HAS_IMAGE" == 1 ]]; then echo sha256:previous; fi ;;
      *' config --images '*) echo starting-six-app ;;
      *' ps --format '*) printf '%s\\n' "$TARGET" "$OTHER" "$OTHER" "$UNRELATED" ;;
    esac
    ''')
    make_stub(bin_dir / "git", '''
    printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
    if [[ "$*" == 'rev-parse HEAD' ]]; then echo previous-commit; fi
    ''')
    make_stub(bin_dir / "curl", '''
    printf 'curl %s\\n' "$*" >> "$COMMAND_LOG"
    [[ "$FAIL_HEALTH" != 1 ]]
    ''')
    make_stub(bin_dir / "sleep", '''printf 'sleep %s\\n' "$*" >> "$COMMAND_LOG"''')
    env = os.environ | {
        "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"],
        "COMMAND_LOG": str(log),
        "TARGET": str(target),
        "OTHER": str(other),
        "UNRELATED": str(unrelated),
        "FAIL_HEALTH": "1" if failed_health else "0",
        "HAS_IMAGE": "1" if previous_image else "0",
    }
    script = Path(os.environ.get("DEPLOY_REMOTE_SCRIPT", SCRIPT))
    result = subprocess.run(
        ["bash", str(script), str(target), "https://example.invalid/repo.git", "3012"],
        env=env, text=True, capture_output=True, check=False,
    )
    return result, log.read_text(), target, other, dormant, unrelated


def test_only_running_demo_stacks_stop_and_restart(tmp_path):
    result, log, target, other, dormant, unrelated = run_deploy(tmp_path)
    assert result.returncode == 0, result.stderr
    assert log.count("docker compose -f docker-compose.demo.yml --env-file .env.demo stop") == 2, log
    assert f"Stopping {target}" in result.stdout
    assert f"Stopping {other}" in result.stdout
    assert f"Stopping {dormant}" not in result.stdout
    assert f"Stopping {unrelated}" not in result.stdout
    assert result.stdout.count(f"Restarting {other}") == 1
    assert "Restarting " + str(dormant) not in result.stdout


def test_failed_health_reports_url_logs_backoff_and_rolls_back(tmp_path):
    result, log, *_ = run_deploy(tmp_path, failed_health=True)
    url = "http://localhost:3012/api/health"
    assert result.returncode != 0
    assert f"Health check failed: {url}" in result.stderr
    assert "logs --tail=50 app" in result.stderr
    assert "docker tag sha256:previous starting-six-app" in log
    assert "up -d --no-build --force-recreate" in log
    assert [line for line in log.splitlines() if line.startswith("sleep ")] == [
        "sleep 1", "sleep 2", "sleep 4", "sleep 8", "sleep 16",
        "sleep 16", "sleep 16", "sleep 16", "sleep 16",
    ]


def test_dry_run_has_no_side_effects(tmp_path):
    local = Path(os.environ.get("DEPLOY_LOCAL_SCRIPT", LOCAL))
    result = subprocess.run(["bash", str(local), "--dry-run"], cwd=tmp_path,
                            text=True, capture_output=True, check=False)
    assert result.returncode == 0, result.stderr
    assert "Dry run:" in result.stdout
    assert "http://localhost:3012/api/health" in result.stdout


def test_failed_health_prints_manual_rollback_without_image(tmp_path):
    result, log, target, *_ = run_deploy(tmp_path, failed_health=True, previous_image=False)
    assert result.returncode != 0
    assert f"Manual rollback: cd {target} && git reset --hard previous-commit && docker compose" in result.stderr
    assert "docker tag" not in log
