import json
import re
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"
FILENAME = re.compile(
    r"eval_(basic|trajectory|helpfulness)_(.+)_(\d{4}-\d{2}-\d{2})\.json$"
)


def _model_id(part: str) -> str:
    base, ver = part.rsplit("_", 1)
    return f"{base}:{ver}" if ver.isdigit() else part


def _load_run(path: Path) -> dict | None:
    match = FILENAME.match(path.name)
    if not match:
        return None

    eval_type, model_part, run_date = match.groups()
    data = json.loads(path.read_text(encoding="utf-8"))
    scores = data.get("scores") or []
    passes = data.get("test_passes") or []

    cases = []
    for i, case in enumerate(data.get("cases") or []):
        cases.append(
            {
                "name": case.get("name"),
                "input": case.get("input"),
                "score": scores[i] if i < len(scores) else None,
                "passed": passes[i] if i < len(passes) else None,
            }
        )

    return {
        "eval_type": eval_type,
        "model_id": _model_id(model_part),
        "run_date": run_date,
        "overall_score": data.get("overall_score"),
        "cases": cases,
    }


def _comparison(runs: list[dict]) -> dict:
    case_by_model = {
        run["model_id"]: {c["name"]: c for c in run["cases"] if c.get("name")}
        for run in runs
    }

    case_names: list[str] = []
    seen: set[str] = set()
    for run in runs:
        for name in case_by_model[run["model_id"]]:
            if name not in seen:
                seen.add(name)
                case_names.append(name)

    rows = []
    for name in case_names:
        by_model = {}
        input_text = None
        for model_id, cases in case_by_model.items():
            case = cases.get(name)
            if not case:
                continue
            input_text = input_text or case.get("input")
            by_model[model_id] = {
                "score": case.get("score"),
                "passed": case.get("passed"),
            }
        rows.append({"case_name": name, "input": input_text, "by_model": by_model})

    summaries = {}
    for run in runs:
        passed = [c["passed"] for c in run["cases"] if c.get("passed") is not None]
        summaries[run["model_id"]] = {
            "overall_score": run.get("overall_score"),
            "pass_rate": sum(passed) / len(passed) if passed else None,
            "run_date": run["run_date"],
        }

    return {
        "eval_type": runs[0]["eval_type"],
        "models": sorted(case_by_model),
        "rows": rows,
        "model_summaries": summaries,
    }


def load_eval_results() -> dict:
    if not RESULTS_DIR.exists():
        return {"comparisons": []}

    latest: dict[tuple[str, str], dict] = {}
    for path in sorted(RESULTS_DIR.glob("eval_*.json")):
        run = _load_run(path)
        if not run:
            continue
        key = (run["eval_type"], run["model_id"])
        if key not in latest or run["run_date"] > latest[key]["run_date"]:
            latest[key] = run

    by_type: dict[str, list[dict]] = {}
    for run in latest.values():
        by_type.setdefault(run["eval_type"], []).append(run)

    comparisons = [_comparison(runs) for _, runs in sorted(by_type.items())]
    return {"comparisons": comparisons}
