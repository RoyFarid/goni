"""
drafting_engine.py
──────────────────
Evaluates the drafting_logic table formulas using a body-measurements context.

Each row in drafting_logic has:
  variable_name  – e.g. 'ARMHOLE_DEPTH', 'P1_X', 'P1_Y'
  formula        – Python-safe math expression, e.g. '(bust_circ / 4) + 2'
  calculation_order – lower = evaluated first
  object_type    – 'TECHNICAL' | 'NODE_X' | 'NODE_Y'

The engine:
  1. Builds a mutable namespace from body measurements (key → value_cm).
  2. Sorts rows by calculation_order.
  3. Evaluates each formula; the result is added to the namespace so later
     formulas can reference earlier computed variables.
  4. Extracts NODE_X / NODE_Y pairs into {name: "P1", x: ..., y: ...} dicts.
"""

import math
import re
from typing import Any


# Safe math context – only pure functions, no builtins like __import__
_SAFE_GLOBALS: dict[str, Any] = {
    "__builtins__": {},
    "sqrt": math.sqrt,
    "ceil": math.ceil,
    "floor": math.floor,
    "round": round,
    "abs": abs,
    "min": min,
    "max": max,
    "pi": math.pi,
}


def _safe_eval(formula: str, namespace: dict) -> float:
    """Evaluate a formula string in a restricted namespace."""
    try:
        result = eval(formula, _SAFE_GLOBALS, namespace)  # noqa: S307
        return float(result)
    except Exception as exc:
        raise ValueError(f"Error evaluating '{formula}': {exc}") from exc


def evaluate_drafting_logic(
    logic_rows: list[dict],
    body_measurements: dict[str, float],
) -> dict[str, float]:
    """
    Args:
        logic_rows: rows from drafting_logic table, each a dict with keys
                    (variable_name, formula, calculation_order, object_type)
        body_measurements: {measurement_key: value_cm} from body_measurements table

    Returns:
        Full namespace dict (measurements + all computed variables).
    """
    namespace: dict[str, float] = dict(body_measurements)

    sorted_rows = sorted(logic_rows, key=lambda r: r["calculation_order"])

    for row in sorted_rows:
        var = row["variable_name"]
        formula = row["formula"]
        namespace[var] = _safe_eval(formula, namespace)

    return namespace


def extract_points(namespace: dict[str, float]) -> list[dict]:
    """
    From the full namespace, find pairs like P1_X / P1_Y and return
    [{"name": "P1", "x": ..., "y": ...}, ...] sorted by name.
    """
    # Collect all point names (from _X or _Y suffix)
    pattern = re.compile(r"^(.+)_([XY])$")
    point_names: set[str] = set()
    for key in namespace:
        m = pattern.match(key)
        if m:
            point_names.add(m.group(1))

    points = []
    for name in sorted(point_names):
        x_key = f"{name}_X"
        y_key = f"{name}_Y"
        if x_key in namespace and y_key in namespace:
            points.append({"name": name, "x": namespace[x_key], "y": namespace[y_key]})

    return points


def extract_technicals(namespace: dict, logic_rows: list[dict]) -> dict:
    """Returns only TECHNICAL variables for the debug/live-specs panel."""
    technical_keys = {
        row["variable_name"]
        for row in logic_rows
        if row["object_type"] == "TECHNICAL"
    }
    return {k: namespace[k] for k in technical_keys if k in namespace}
