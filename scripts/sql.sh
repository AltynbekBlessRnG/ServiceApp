#!/usr/bin/env bash
# Выполняет SQL в базе проекта через Management API. Токен и ref лежат в
# .supabase-env (под gitignore), поэтому секрет не попадает ни в историю
# команд, ни в репозиторий. Запрос читается со stdin.
set -euo pipefail
set -a; . "$(dirname "$0")/../.supabase-env"; set +a
query=$(cat)
python3 - "$query" <<'PY'
import json, os, sys, urllib.request
body = json.dumps({"query": sys.argv[1]}).encode()
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{os.environ['SUPABASE_PROJECT_REF']}/database/query",
    data=body,
    headers={"Authorization": f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}", "Content-Type": "application/json"},
)
try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode()[:400]); sys.exit(1)
PY
