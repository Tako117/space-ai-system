#backend/ai/tle_loader.py
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class TLE:
    name: str
    line1: str
    line2: str
    norad_id: Optional[int] = None


def _try_parse_norad_id(line1: str) -> Optional[int]:
    # NORAD catalog number is chars 3..7 in line1 (1-indexed positions 3-7)
    # Example: "1 25544U 98067A ..."
    try:
        if not line1.startswith("1 "):
            return None
        raw = line1[2:7].strip()
        return int(raw) if raw else None
    except Exception:
        return None


def load_tles(path: str) -> List[TLE]:
    """
    Supports both:
    - 3-line format: NAME, line1, line2 repeated
    - 2-line format: line1, line2 repeated (we will auto-name them)
    """
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = [ln.strip() for ln in f.read().splitlines() if ln.strip()]

    out: List[TLE] = []
    i = 0
    auto_idx = 1

    while i < len(lines):
        ln = lines[i]

        # 2-line format
        if ln.startswith("1 ") and (i + 1) < len(lines) and lines[i + 1].startswith("2 "):
            line1 = ln
            line2 = lines[i + 1]
            norad = _try_parse_norad_id(line1)
            name = f"OBJECT-{norad or auto_idx}"
            out.append(TLE(name=name, line1=line1, line2=line2, norad_id=norad))
            auto_idx += 1
            i += 2
            continue

        # 3-line format: name + line1 + line2
        if (i + 2) < len(lines) and lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 "):
            name = ln
            line1 = lines[i + 1]
            line2 = lines[i + 2]
            norad = _try_parse_norad_id(line1)
            out.append(TLE(name=name, line1=line1, line2=line2, norad_id=norad))
            i += 3
            continue

        # If malformed, skip line
        i += 1

    return out
