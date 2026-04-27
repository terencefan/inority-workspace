from __future__ import annotations

import json
import subprocess
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

import yaml

ERROR_CODE_CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "references" / "validator-error-codes.yaml"
VALIDATOR_CORE_PATH = Path(__file__).with_name("validate.mjs")


@dataclass
class ValidationError:
    code: str
    message: str
    line: int | None = None
    content: str | None = None


@lru_cache(maxsize=1)
def load_error_catalog() -> dict[str, dict[str, str]]:
    payload = yaml.safe_load(ERROR_CODE_CATALOG_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"invalid error catalog format: {ERROR_CODE_CATALOG_PATH}")
    return payload


def error_message(code: str, **params: object) -> str:
    catalog = load_error_catalog()
    entry = catalog.get(code)
    if not isinstance(entry, dict) or "message" not in entry:
        raise KeyError(f"missing error catalog entry for {code}")
    return entry["message"].format(**params)


def invoke_validator_core(text: str, *, path: Path | None = None) -> list[ValidationError]:
    payload = {
        "text": text,
        "path": None if path is None else str(path),
    }
    result = subprocess.run(
        ["node", str(VALIDATOR_CORE_PATH), "--stdin-json"],
        input=json.dumps(payload, ensure_ascii=False),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or f"node exited with {result.returncode}"
        raise RuntimeError(f"validator core failed: {detail}")

    try:
        decoded = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"validator core returned invalid JSON: {exc}") from exc

    raw_errors = decoded.get("errors", [])
    if not isinstance(raw_errors, list):
        raise RuntimeError("validator core returned malformed `errors` payload")

    errors: list[ValidationError] = []
    for item in raw_errors:
        if not isinstance(item, dict):
            raise RuntimeError("validator core returned non-object error entry")
        errors.append(
            ValidationError(
                code=str(item.get("code", "")),
                message=str(item.get("message", "")),
                line=item.get("line") if isinstance(item.get("line"), int) else None,
                content=str(item["content"]) if isinstance(item.get("content"), str) else None,
            )
        )
    return errors


def collect_errors(text: str, *, path: Path | None = None) -> list[ValidationError]:
    return invoke_validator_core(text, path=path)


def print_pass(path: Path, json_mode: bool) -> None:
    if json_mode:
        print(json.dumps({"status": "pass", "path": str(path), "errors": []}, ensure_ascii=False, indent=2))
    else:
        print(f"[spec-validator] PASS {path}")


def build_natural_language_summary(errors: list[ValidationError]) -> list[str]:
    summary = [f"本次扫描共发现 {len(errors)} 个问题，当前 spec 还没有收敛到可评审结构"]
    for index, item in enumerate(errors, start=1):
        location = f"第 {item.line} 行" if item.line is not None else "某处"
        detail = f"{location}需要修正：{item.message}"
        if item.content:
            detail += f" 当前命中的内容是：{item.content}"
        summary.append(f"{index}. {detail}")
    summary.append("请先按以上问题修正文档，再重新运行 specctl validate")
    return summary


def print_fail(path: Path, errors: list[ValidationError], json_mode: bool) -> None:
    summary = build_natural_language_summary(errors)
    if json_mode:
        print(
            json.dumps(
                {
                    "status": "fail",
                    "path": str(path),
                    "errors": [asdict(e) for e in errors],
                    "natural_language_summary": "\n".join(summary),
                    "natural_language_items": summary,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    print(f"[spec-validator] FAIL {path}")
    for item in errors:
        location = f" line {item.line}" if item.line is not None else ""
        print(f"- {item.code}{location}: {item.message}")
        if item.content:
            print(f"  content: {item.content}")
    print("\n[spec-validator] 自然语言总结")
    for line in summary:
        print(f"- {line}")
