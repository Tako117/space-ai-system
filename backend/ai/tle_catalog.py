# backend/ai/tle_catalog.py
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass(frozen=True)
class TLEEntry:
    name: str
    line1: str
    line2: str


def load_tle_file(path: str) -> List[TLEEntry]:
    """
    Loads a standard 3-line TLE file:
      NAME
      1 ......
      2 ......
    Returns list[TLEEntry].
    """
    p = Path(path)
    if not p.exists():
        return []

    raw = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    lines = [ln.strip() for ln in raw if ln.strip()]

    out: List[TLEEntry] = []
    i = 0
    while i + 2 < len(lines):
        name = lines[i]
        l1 = lines[i + 1]
        l2 = lines[i + 2]

        # Very light validation: TLE line1 starts with "1", line2 starts with "2"
        if not (l1.startswith("1 ") and l2.startswith("2 ")):
            # If file is weird, try to resync by skipping one line
            i += 1
            continue

        out.append(TLEEntry(name=name, line1=l1, line2=l2))
        i += 3

    return out


def tle_names(path: str) -> List[str]:
    return [e.name for e in load_tle_file(path)]
