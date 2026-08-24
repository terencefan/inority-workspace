#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


def load_layout(path: Path) -> dict:
    document = json.loads(path.read_text(encoding="utf-8"))
    value = document.get("position_json", document)
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, dict):
        raise ValueError("layout must be an object or a position_json object/string")
    return value


def validate(layout: dict) -> dict:
    errors = []
    root = layout.get("ROOT_ID")
    grid = layout.get("GRID_ID")
    if not isinstance(root, dict) or root.get("type") != "ROOT":
        errors.append("ROOT_ID must be a ROOT component")
    if not isinstance(grid, dict) or grid.get("type") != "GRID":
        errors.append("GRID_ID must be a GRID component")
    if isinstance(root, dict) and "GRID_ID" not in (root.get("children") or []):
        errors.append("ROOT_ID must own GRID_ID")

    reachable = set()
    pending = ["ROOT_ID"]
    while pending:
        component_id = pending.pop()
        if component_id in reachable:
            continue
        component = layout.get(component_id)
        if not isinstance(component, dict):
            errors.append(f"reachable component is missing: {component_id}")
            continue
        reachable.add(component_id)
        pending.extend(component.get("children") or [])

    rows = []
    charts = []
    for component_id, component in layout.items():
        if component_id == "DASHBOARD_VERSION_KEY" or not isinstance(component, dict):
            continue
        if component_id not in reachable:
            errors.append(f"orphan component: {component_id}")
        if component.get("type") == "ROW":
            rows.append(component_id)
            if (component.get("meta") or {}).get("background") not in {
                "BACKGROUND_TRANSPARENT",
                "BACKGROUND_WHITE",
            }:
                errors.append(f"ROW meta.background is missing or invalid: {component_id}")
        if component.get("type") == "CHART":
            charts.append(component_id)
            meta = component.get("meta") or {}
            for field in ("chartId", "sliceName", "uuid", "height", "width"):
                if meta.get(field) in (None, ""):
                    errors.append(f"CHART meta.{field} is missing: {component_id}")

    return {
        "valid": not errors,
        "row_count": len(rows),
        "chart_count": len(charts),
        "errors": errors,
    }


def self_test() -> None:
    valid = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {"id": "GRID_ID", "type": "GRID", "children": ["ROW-1"]},
        "ROW-1": {"id": "ROW-1", "type": "ROW", "children": ["CHART-1"], "meta": {"background": "BACKGROUND_TRANSPARENT"}},
        "CHART-1": {"id": "CHART-1", "type": "CHART", "children": [], "meta": {"chartId": 1, "sliceName": "Example", "uuid": "00000000-0000-0000-0000-000000000000", "height": 50, "width": 12}},
    }
    assert validate(valid)["valid"]
    invalid = json.loads(json.dumps(valid))
    invalid["ROW-1"].pop("meta")
    result = validate(invalid)
    assert not result["valid"]
    assert result["errors"] == ["ROW meta.background is missing or invalid: ROW-1"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Superset v2 dashboard layout invariants")
    parser.add_argument("layout", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print(json.dumps({"valid": True, "self_test": True}))
        return 0
    if args.layout is None:
        parser.error("layout is required unless --self-test is used")
    result = validate(load_layout(args.layout))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
