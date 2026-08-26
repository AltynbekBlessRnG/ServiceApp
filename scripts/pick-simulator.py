#!/usr/bin/env python3
"""Выбирает симулятор iPhone на macOS-раннере GitHub Actions.

Состав образов раннера меняется, поэтому модель нельзя зашивать намертво:
берём запрошенную, иначе самый большой доступный iPhone — снимки с него
подходят под первый обязательный комплект скриншотов App Store.
"""

import json
import subprocess
import sys


def available_iphones():
    raw = subprocess.run(
        ["xcrun", "simctl", "list", "devices", "available", "--json"],
        capture_output=True, text=True, check=True,
    ).stdout
    runtimes = json.loads(raw)["devices"]
    devices = [d for group in runtimes.values() for d in group if d.get("isAvailable")]
    return [d for d in devices if d["name"].startswith("iPhone")]


def main() -> int:
    wanted = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    iphones = available_iphones()

    if not iphones:
        print("На раннере нет доступных симуляторов iPhone", file=sys.stderr)
        return 1

    exact = [d for d in iphones if d["name"] == wanted]
    pro_max = sorted((d for d in iphones if "Pro Max" in d["name"]),
                     key=lambda d: d["name"], reverse=True)
    chosen = (exact or pro_max or iphones)[0]

    if wanted and not exact:
        print(f"Модель {wanted!r} недоступна, беру {chosen['name']!r}", file=sys.stderr)

    # Две строки, а не разделитель: так значение не сломается ни в YAML, ни в bash.
    print(chosen["udid"])
    print(chosen["name"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
