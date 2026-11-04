#!/usr/bin/env python3
"""Generate AppIcon.icns from a simple drawn PNG icon (pencil-on-paper glyph)."""
import os, struct, subprocess, sys, tempfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build", "AppIcon.icns")

def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.06
    # paper
    rounded(d, [pad, pad*0.7, size-pad, size-pad*0.7], size*0.10, (250, 250, 248), (210, 210, 205), max(1, size//256))
    # lines of text
    ly = size * 0.26
    for i, w in enumerate([0.62, 0.62, 0.45, 0.62, 0.30]):
        y = ly + i * size * 0.115
        d.rounded_rectangle([size*0.18, y, size*0.18 + size*w, y + size*0.045], size*0.02, (190, 190, 185))
    # pencil diagonal
    px0, py0 = int(size*0.60), int(size*0.62)
    px1, py1 = int(size*0.86), int(size*0.36)
    d.line([px0, py0, px1, py1], fill=(255, 170, 40), width=max(1, int(size*0.09)))
    d.polygon([(px0 - int(size*0.045), py0 + int(size*0.045)), (px0 + int(size*0.045), py0 - int(size*0.045)), (px0 - int(size*0.02), py0 + int(size*0.10))], fill=(60, 60, 60))
    return img

sizes = {16: "ic07", 32: "ic08", 64: "ic09", 128: "ic10", 256: "ic11", 512: "ic12", 1024: "ic13"}
# OSType mapping: 16->icp4? use standard: ic07=16, ic08=32, ic09=64, ic10=128, ic11=256, ic12=512, ic13=1024
pngs = []
tmp = tempfile.mkdtemp()
for px, typ in sizes.items():
    img = draw_icon(px)
    p = os.path.join(tmp, f"{px}.png")
    img.save(p)
    pngs.append((typ, p))

with open(OUT, "wb") as f:
    f.write(b"icns")
    total = 8 + sum(8 + os.path.getsize(p) for _, p in pngs)
    f.write(struct.pack(">I", total))
    for typ, p in pngs:
        data = open(p, "rb").read()
        f.write(typ.encode())
        f.write(struct.pack(">I", 8 + len(data)))
        f.write(data)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
