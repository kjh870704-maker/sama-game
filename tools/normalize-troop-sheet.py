"""Normalize an AI-generated 4x4 transparent troop sheet to the game atlas grid."""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


COLS = ROWS = 4
CELL_W, CELL_H = 280, 224
MARGIN_X, MARGIN_Y = 28, 22


def main_component(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    width, height = cell.size
    mask = alpha.point(lambda value: 255 if value >= 24 else 0)
    seen = bytearray(width * height)
    best: list[tuple[int, int]] = []
    pixels = mask.load()
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or not pixels[x, y]:
                continue
            seen[index] = 1
            queue = deque([(x, y)])
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for ny in range(max(0, py - 1), min(height, py + 2)):
                    for nx in range(max(0, px - 1), min(width, px + 2)):
                        ni = ny * width + nx
                        if not seen[ni] and pixels[nx, ny]:
                            seen[ni] = 1
                            queue.append((nx, ny))
            if len(component) > len(best):
                best = component
    if not best:
        raise ValueError("empty sprite cell")
    xs = [point[0] for point in best]
    ys = [point[1] for point in best]
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    sprite = cell.crop(box)
    kept = Image.new("L", sprite.size)
    kept_pixels = kept.load()
    for x, y in best:
        kept_pixels[x - box[0], y - box[1]] = alpha.getpixel((x, y))
    sprite.putalpha(kept)
    return sprite


def normalize(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    # Image generation is most reliable on a flat chroma backdrop. When the
    # four corners are magenta, convert that backdrop (including antialiasing)
    # into alpha before separating the cells.
    corners = [image.getpixel(point)[:3] for point in ((0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1))]
    key = tuple(round(sum(pixel[channel] for pixel in corners) / len(corners)) for channel in range(3))
    if key[0] > 200 and key[2] > 180 and key[1] < 100:
        cleaned = Image.new("RGBA", image.size)
        source_pixels, target_pixels = image.load(), cleaned.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, alpha = source_pixels[x, y]
                is_magenta = min(r, b) - g > 24 and abs(r - b) < 86
                target_pixels[x, y] = (r, g, b, 0 if is_magenta else alpha)
        image = cleaned
    x_edges = [round(index * image.width / COLS) for index in range(COLS + 1)]
    y_edges = [round(index * image.height / ROWS) for index in range(ROWS + 1)]
    sprites: list[list[Image.Image]] = []
    for row in range(ROWS):
        current: list[Image.Image] = []
        for col in range(COLS):
            current.append(main_component(image.crop((x_edges[col], y_edges[row], x_edges[col + 1], y_edges[row + 1]))))
        sprites.append(current)

    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS))
    for row, current in enumerate(sprites):
        scale = min(
            (CELL_W - MARGIN_X * 2) / max(sprite.width for sprite in current),
            (CELL_H - MARGIN_Y * 2) / max(sprite.height for sprite in current),
        )
        baseline = (row + 1) * CELL_H - MARGIN_Y
        for col, sprite in enumerate(current):
            size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
            sprite = sprite.resize(size, Image.Resampling.LANCZOS)
            x = col * CELL_W + (CELL_W - sprite.width) // 2
            y = baseline - sprite.height
            atlas.alpha_composite(sprite, (x, y))
    destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(destination, "WEBP", lossless=True, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: normalize-troop-sheet.py SOURCE DESTINATION")
    normalize(Path(sys.argv[1]), Path(sys.argv[2]))
