#!/usr/bin/env python3
# Build brand SVGs (icon + 2-line wordmark) from the Fraunces serif font,
# converting text to vector outlines via fontTools (font-independent output).
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

GREEN = "#2f7d5a"
CREAM = "#faf7f2"
FONT = "/tmp/fraunces-bold.ttf"

font = TTFont(FONT)
upm = font["head"].unitsPerEm
glyphSet = font.getGlyphSet()
cmap = font.getBestCmap()

def line_path(text, pen_x, baseline, fs):
    """Outline path 'd' for a text line; returns (d, end_x)."""
    scale = fs / upm
    d = ""
    x = pen_x
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += fs * 0.3
            continue
        glyph = glyphSet[gname]
        pen = SVGPathPen(glyphSet)
        # y is negated: font outlines are y-up, SVG is y-down.
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x, baseline))
        glyph.draw(tpen)
        d += pen.getCommands()
        x += glyph.width * scale
    return d, x

def line_width(text, fs):
    scale = fs / upm
    w = 0
    for ch in text:
        gname = cmap.get(ord(ch))
        w += (glyphSet[gname].width * scale) if gname else fs * 0.3
    return w

def leaf(cx, cy, s, rot, rib=CREAM):
    body = "M2 26 C 18 2, 64 2, 94 22 C 64 50, 18 50, 2 26 Z"
    rib_p = "M10 27 C 40 22, 66 22, 90 22"
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s/100})">'
            f'<path d="{body}" fill="{GREEN}"/>'
            f'<path d="{rib_p}" fill="none" stroke="{rib}" stroke-width="5" stroke-linecap="round"/></g>')

def icon_svg(size=512, maskable=False):
    radius = 116
    pad = 78
    box = size - pad * 2
    inner = box * 0.84 if maskable else box
    lines = ["What's", "in my", "Fridge"]
    widest = max(line_width(t, 100) for t in lines)
    fs = inner / widest * 100
    lh = fs * 0.92
    x0 = (size - max(line_width(t, fs) for t in lines)) / 2  # center block
    y_top = size * (0.2 if maskable else 0.16)
    d = ""
    for i, t in enumerate(lines):
        # center each line individually
        lx = (size - line_width(t, fs)) / 2
        by = y_top + fs * 0.74 + i * lh
        dd, _ = line_path(t, lx, by, fs)
        d += dd
    last = lines[-1]
    last_lx = (size - line_width(last, fs)) / 2
    last_end = last_lx + line_width(last, fs)
    last_base = y_top + fs * 0.74 + (len(lines) - 1) * lh
    lf = leaf(last_end + fs * 0.12, last_base - fs * 0.14, fs * 0.4, -18)
    if maskable:
        bg = f'<rect width="{size}" height="{size}" fill="{CREAM}"/>'
    else:
        bg = f'<rect width="{size}" height="{size}" rx="{radius}" fill="{CREAM}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 {size} {size}">{bg}<path d="{d}" fill="{GREEN}"/>{lf}</svg>')

def wordmark_svg():
    lines = ["What's in", "my Fridge"]
    fs = 200
    pad = 20
    lh = fs * 0.96
    leaf_w = fs * 0.4
    d = ""
    for i, t in enumerate(lines):
        by = pad + fs * 0.74 + i * lh
        dd, _ = line_path(t, pad, by, fs)
        d += dd
    last_base = pad + fs * 0.74 + (len(lines) - 1) * lh
    last_end = pad + line_width(lines[-1], fs)
    lf = leaf(last_end + fs * 0.16, last_base - fs * 0.18, leaf_w, -18, rib="#cfe0d6")
    W = int(max(max(line_width(t, fs) for t in lines) + pad, last_end + leaf_w) + pad)
    H = int(last_base + fs * 0.28 + pad)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
            f'viewBox="0 0 {W} {H}"><path d="{d}" fill="{GREEN}"/>{lf}</svg>')

std = icon_svg()
mask = icon_svg(maskable=True)
wm = wordmark_svg()
for path, content in [
    ("public/icon.svg", std),
    ("public/favicon.svg", std),
    ("public/icon-maskable.svg", mask),
    ("public/logo.svg", wm),
    ("site/logo.svg", wm),
]:
    open(path, "w").write(content)
print("svgs written")
