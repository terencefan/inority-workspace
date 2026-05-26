import subprocess
import sys

cmd = [
    "/usr/bin/node",
    "/home/fantengyuan/workspace/inority-workspace/skills/runbook/scripts/runctl.mjs",
    "validate",
    "/home/fantengyuan/workspace/k8s/canary/runbook/2026-05-26/remove-canary2-scheduling-constraints-runbook.md",
]

proc = subprocess.run(cmd, capture_output=True, text=True)
sys.stdout.write(proc.stdout)
sys.stderr.write(proc.stderr)
raise SystemExit(proc.returncode)
