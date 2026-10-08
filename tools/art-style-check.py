#!/usr/bin/env python3
"""전투 스프라이트 화풍 측정 — 장수 시트가 병종 시트와 같은 화풍인지 수치로 본다.

docs/art/장수-전투모델-재모델링-기준.md 5장의 기준값을 이 스크립트로 쟀다.

  python3 tools/art-style-check.py baseline                 # 병종 4단 시트 전체의 분포
  python3 tools/art-style-check.py sheet <file.webp> [rows] # 시트 한 장을 줄마다 재고 기준과 비교

시트는 가로 4칸(대기·준비·공격·피격) × 세로 rows줄로 나뉜다고 본다.
"""
import glob, os, sys
import numpy as np
from PIL import Image

PUBLIC = os.path.join(os.path.dirname(__file__), '..', 'packages', 'web', 'public')
# 병종 4단 시트 800칸의 5~95백분위(2026-10-08 측정). 벗어난 줄은 참고로만 표시한다(병종 시트도 1단 줄은 작게 그려 자주 벗어난다).
LIMITS = {'body': (0.15, 0.43), 'sat': (0.35, 0.84), 'fill': (0.70, 1.0), 'feet': (0.88, 1.0)}
# 합격·불합격은 시트 전체의 외곽선 명도 중앙값 하나로 가른다. 기본 병종 시트는 0.02~0.04이고, 반실사·세밀화풍은 0.05를 넘는다.
EDGE_MAX = 0.05


def erode(a, n):
    for _ in range(n):
        b = a.copy(); b[1:] &= a[:-1]; b[:-1] &= a[1:]; b[:, 1:] &= a[:, :-1]; b[:, :-1] &= a[:, 1:]; a = b
    return a


def cells(path, rows):
    im = np.asarray(Image.open(path).convert('RGBA')).astype(float) / 255
    h, w = im.shape[0] // rows, im.shape[1] // 4
    for r in range(rows):
        for c in range(4):
            yield r, c, im[r * h:(r + 1) * h, c * w:(c + 1) * w]


def stats(cell):
    """한 칸의 수치: 외곽선 명도, 몸 명도·채도, 칸 높이 대비 크기·발 위치, 진영색(파랑) 비율."""
    a = cell[..., 3] > .5
    if a.sum() < 200:
        return None
    rgb = cell[..., :3]; lum = rgb @ [.2126, .7152, .0722]
    inner = erode(a, 2); edge = a & ~inner
    mx, mn = rgb.max(-1), rgb.min(-1); d = np.maximum(mx - mn, 1e-6)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    blue = inner & (hue >= 200) & (hue <= 235) & (sat > .25) & (mx > .15)
    ys = np.where(a.any(1))[0]; H = a.shape[0]
    return dict(edge=float(np.median(lum[edge])), body=float(np.median(lum[inner])), sat=float(np.median(sat[inner])),
                fill=(ys[-1] - ys[0] + 1) / H, feet=(ys[-1] + 1) / H, blue=float(blue.sum() / max(1, inner.sum())))


def median(rows, k):
    return float(np.median([x[k] for x in rows]))


def baseline():
    found = [s for f in sorted(glob.glob(os.path.join(PUBLIC, 'troops-four-stage-*.webp'))) for _, _, c in cells(f, 4) for s in [stats(c)] if s]
    print(f'병종 4단 시트 {len(found)}칸')
    for k in ['edge', 'body', 'sat', 'fill', 'feet', 'blue']:
        v = np.array([x[k] for x in found])
        print(f"  {k:5s} " + ' '.join(f'p{p}={np.percentile(v, p):.3f}' for p in (10, 25, 50, 75, 90)))


def sheet(path, rows):
    by = {}
    for r, _, c in cells(path, rows):
        s = stats(c)
        if s:
            by.setdefault(r, []).append(s)
    every = [s for v in by.values() for s in v]
    for r, ls in by.items():
        out = [k for k, (lo, hi) in LIMITS.items() if not lo <= median(ls, k) <= hi]
        print(f"줄 {r}: " + ' '.join(f'{k}={median(ls, k):.3f}' for k in ['edge', 'body', 'sat', 'fill', 'feet', 'blue']) + (f'  (참고: {",".join(out)} 범위 밖)' if out else ''))
    edge, sat, blue = median(every, 'edge'), median(every, 'sat'), median(every, 'blue')
    ok = edge <= EDGE_MAX
    print(f"시트 전체: 외곽선 {edge:.3f} {'✓' if ok else '✗ (0.05 초과: 선이 옅거나 가늘다)'} · 채도 {sat:.3f} · 진영색 비율 {blue:.3f}{' (진영색 없음 — 염색되지 않는다)' if blue < .03 else ''}")
    return ok


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'baseline':
        baseline()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'sheet':
        sys.exit(0 if sheet(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4) else 1)
    else:
        print(__doc__)
