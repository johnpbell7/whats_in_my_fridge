#!/usr/bin/env python3
# Build brand SVGs from the Fraunces serif font, text -> vector outlines.
#  - App icon / favicon: stacked wordmark in cream on a GREEN rounded square,
#    light-green leaf, with a soft premium shine overlay.
#  - Logo: "What's in my" (secondary, grey, lighter weight) above "Fridge"
#    (green, bold) + a lighter-green leaf.
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

GREEN = "#2f7d5a"
CREAM = "#faf7f2"
ONACCENT = "#fdfdfb"      # text on green
GREY = "#5d5648"          # secondary "What's in my"
LEAF = "#7bb497"          # leaf on light backgrounds (the logo)
LEAF_ON_GREEN = "#a7d8bf" # leaf on the green icon

def load(path):
    f = TTFont(path)
    return (f["head"].unitsPerEm, f.getGlyphSet(), f.getBestCmap())

BOLD = load("/tmp/fraunces-bold.ttf")
REG = load("/tmp/fraunces-reg.ttf")

def line_path(fnt, text, x, baseline, fs):
    upm, gs, cmap = fnt
    scale = fs / upm
    d, px = "", x
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            px += fs * 0.3
            continue
        gl = gs[g]
        pen = SVGPathPen(gs)
        gl.draw(TransformPen(pen, (scale, 0, 0, -scale, px, baseline)))
        d += pen.getCommands()
        px += gl.width * scale
    return d, px

def width(fnt, text, fs):
    upm, gs, cmap = fnt
    s = fs / upm
    w = 0
    for ch in text:
        g = cmap.get(ord(ch))
        w += (gs[g].width * s) if g else fs * 0.3
    return w

def leaf(cx, cy, s, rot, body_col, rib_col):
    body = "M2 26 C 18 2, 64 2, 94 22 C 64 50, 18 50, 2 26 Z"
    rib = "M10 27 C 40 22, 66 22, 90 22"
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s/100})">'
            f'<path d="{body}" fill="{body_col}"/>'
            f'<path d="{rib}" fill="none" stroke="{rib_col}" stroke-width="5" stroke-linecap="round"/></g>')

def icon_svg(size=512, maskable=False):
    radius = 116
    pad = 78
    box = size - pad * 2
    inner = box * 0.84 if maskable else box
    lines = ["What's", "in my", "Fridge"]
    widest = max(width(BOLD, t, 100) for t in lines)
    fs = inner / widest * 100
    lh = fs * 0.92
    y_top = size * (0.2 if maskable else 0.16)
    d = ""
    for i, t in enumerate(lines):
        lx = (size - width(BOLD, t, fs)) / 2
        by = y_top + fs * 0.74 + i * lh
        dd, _ = line_path(BOLD, t, lx, by, fs)
        d += dd
    last_end = (size + width(BOLD, lines[-1], fs)) / 2
    last_base = y_top + fs * 0.74 + (len(lines) - 1) * lh
    lf = leaf(last_end + fs * 0.12, last_base - fs * 0.14, fs * 0.4, -18, LEAF_ON_GREEN, GREEN)
    r = 0 if maskable else radius
    defs = (
        '<defs>'
        f'<linearGradient id="shine" x1="0" y1="0" x2="0.35" y2="1">'
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>'
        '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05"/>'
        '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>'
        '</linearGradient></defs>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
        f'{defs}'
        f'<rect width="{size}" height="{size}" rx="{r}" fill="{GREEN}"/>'
        f'<path d="{d}" fill="{ONACCENT}"/>'
        f'{lf}'
        f'<rect width="{size}" height="{size}" rx="{r}" fill="url(#shine)"/>'
        f'</svg>'
    )

def wordmark_svg():
    pad = 24
    fs_b = 200          # "Fridge"
    fs_s = 86           # "What's in my"
    y1 = pad + fs_s * 0.74
    y2 = y1 + fs_s * 0.34 + fs_b * 0.74
    d_small, _ = line_path(REG, "What's in my", pad, y1, fs_s)
    d_big, _ = line_path(BOLD, "Fridge", pad, y2, fs_b)
    fridge_end = pad + width(BOLD, "Fridge", fs_b)
    leaf_w = fs_b * 0.4
    lf = leaf(fridge_end + fs_b * 0.16, y2 - fs_b * 0.18, leaf_w, -18, LEAF, CREAM)
    W = int(max(pad + width(REG, "What's in my", fs_s), fridge_end + leaf_w) + pad)
    H = int(y2 + fs_b * 0.26 + pad)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<path d="{d_small}" fill="{GREY}"/>'
        f'<path d="{d_big}" fill="{GREEN}"/>'
        f'{lf}</svg>'
    )

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
