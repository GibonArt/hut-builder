#!/usr/bin/env python3
"""
Odstraní světlé pozadí spojené s okraji obrázku (flood fill od rámu). Výstup: PNG s alfou.

Uzavřená bílá uvnitř tvarů (např. díry v písmenech) tímto nedosáhne — k tomu by bylo potřeba
jiné zpracování zdroje.
"""
from __future__ import annotations

import argparse
from collections import deque

from PIL import Image


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("vstup")
    p.add_argument("vystup")
    p.add_argument("--tolerance", type=int, default=40, help="šíře „bílé“ (0–255, výchozí 40)")
    p.add_argument(
        "--orez-obsah",
        action="store_true",
        help="oříznout na neprůhledný bounding box",
    )
    args = p.parse_args()
    tol = max(0, min(255, args.tolerance))
    threshold = 255 - tol

    raw = Image.open(args.vstup)
    if getattr(raw, "n_frames", 1) > 1:
        raw.seek(0)
    img = raw.convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        return r >= threshold and g >= threshold and b >= threshold

    seen: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and is_bg(x, y):
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        if h > 1:
            try_seed(x, h - 1)
    for y in range(1, h - 1):
        try_seed(0, y)
        if w > 1:
            try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        if (x, y) in seen:
            continue
        if not is_bg(x, y):
            continue
        seen.add((x, y))
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in seen and 0 <= nx < w and 0 <= ny < h and is_bg(nx, ny):
                q.append((nx, ny))

    if args.orez_obsah:
        bbox = img.split()[3].getbbox()
        if bbox:
            img = img.crop(bbox)

    img.save(args.vystup, "PNG", optimize=True)


if __name__ == "__main__":
    main()
