# backend/ai/tle_propagation.py
from __future__ import annotations

import os
import time
from typing import List, Dict, Any, Tuple

from sgp4.api import Satrec, jday


def _read_lines(path: str) -> List[str]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"TLE file not found: {path}")
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = [ln.strip() for ln in f.readlines()]
    # remove empty lines
    return [ln for ln in lines if ln]


def load_tle_file(path: str) -> List[Dict[str, str]]:
    """
    Supports TLEs stored as triples:
      NAME
      1 .....
      2 .....
    """
    lines = _read_lines(path)

    out: List[Dict[str, str]] = []
    i = 0

    while i < len(lines):
        # Try parse triple (name + line1 + line2)
        if i + 2 < len(lines) and lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 "):
            name = lines[i]
            line1 = lines[i + 1]
            line2 = lines[i + 2]
            out.append({"name": name, "line1": line1, "line2": line2})
            i += 3
            continue

        # Sometimes files can be line1/line2 without name; handle that too
        if i + 1 < len(lines) and lines[i].startswith("1 ") and lines[i + 1].startswith("2 "):
            line1 = lines[i]
            line2 = lines[i + 1]
            name = f"SAT-{len(out)+1}"
            out.append({"name": name, "line1": line1, "line2": line2})
            i += 2
            continue

        # Skip garbage line
        i += 1

    return out


def _now_jday() -> Tuple[float, float]:
    # UTC now
    t = time.gmtime()
    jd, fr = jday(t.tm_year, t.tm_mon, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec)
    return jd, fr


def propagate_one(tle: Dict[str, str]) -> Dict[str, Any]:
    """
    Returns position/velocity in TEME km and km/s.
    """
    sat = Satrec.twoline2rv(tle["line1"], tle["line2"])
    jd, fr = _now_jday()
    e, r, v = sat.sgp4(jd, fr)
    if e != 0:
        raise RuntimeError(f"SGP4 error code {e} for {tle.get('name','?')}")
    return {
        "name": tle.get("name", "UNKNOWN"),
        "position_km": {"x": r[0], "y": r[1], "z": r[2]},
        "velocity_kms": {"x": v[0], "y": v[1], "z": v[2]},
    }


def propagate_many(
    satellites: List[Dict[str, str]],
    debris: List[Dict[str, str]],
    max_sats: int = 20,
    max_deb: int = 50,
) -> Dict[str, Any]:
    """
    Propagate up to max_sats + max_deb objects (for performance).
    """
    sats_out = []
    deb_out = []

    for tle in satellites[:max_sats]:
        try:
            sats_out.append(propagate_one(tle))
        except Exception as e:
            sats_out.append({"name": tle.get("name", "UNKNOWN"), "error": str(e)})

    for tle in debris[:max_deb]:
        try:
            deb_out.append(propagate_one(tle))
        except Exception as e:
            deb_out.append({"name": tle.get("name", "UNKNOWN"), "error": str(e)})

    return {"satellites": sats_out, "debris": deb_out}
