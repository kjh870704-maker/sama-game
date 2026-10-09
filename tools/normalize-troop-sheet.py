"""Normalize an AI-generated 4x4 transparent troop sheet to the game atlas grid."""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


COLS = 4


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


def normalize(source: Path, destination: Path, rows: int = 4, cell_w: int = 280, cell_h: int = 224) -> None:
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
    y_edges = [round(index * image.height / rows) for index in range(rows + 1)]
    sprites: list[list[Image.Image]] = []
    for row in range(rows):
        current: list[Image.Image] = []
        for col in range(COLS):
            current.append(main_component(image.crop((x_edges[col], y_edges[row], x_edges[col + 1], y_edges[row + 1]))))
        sprites.append(current)

    margin_x, margin_y = round(cell_w * 0.08), round(cell_h * 0.08)
    atlas = Image.new("RGBA", (cell_w * COLS, cell_h * rows))
    for row, current in enumerate(sprites):
        scale = min(
            (cell_w - margin_x * 2) / max(sprite.width for sprite in current),
            (cell_h - margin_y * 2) / max(sprite.height for sprite in current),
        )
        baseline = (row + 1) * cell_h - margin_y
        for col, sprite in enumerate(current):
            size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
            sprite = sprite.resize(size, Image.Resampling.LANCZOS)
            x = col * cell_w + (cell_w - sprite.width) // 2
            y = baseline - sprite.height
            atlas.alpha_composite(sprite, (x, y))
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Lossy WebP with alpha uses the VP8X container expected by the asset
    # validators, while quality 96 keeps sprite edges visually lossless.
    atlas.save(destination, "WEBP", quality=96, method=6, exact=True)


if __name__ == "__main__":
    if len(sys.argv) not in (3, 6):
        raise SystemExit("usage: normalize-troop-sheet.py SOURCE DESTINATION [ROWS CELL_WIDTH CELL_HEIGHT]")
    options = tuple(map(int, sys.argv[3:])) if len(sys.argv) == 6 else (4, 280, 224)
    normalize(Path(sys.argv[1]), Path(sys.argv[2]), *options)
