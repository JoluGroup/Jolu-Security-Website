#!/usr/bin/env python3 -I
"""Derives every file in public/brand/ from the approved logo (public/lovable-uploads/jolu-logo.png).

The logo is never redrawn or recoloured: it is only resized and placed on the brand charcoal (#0a0a0b).
The social preview adds typography (Geist, Geist Mono, Instrument Serif) and the site's line-art grid/rings.

Usage (needs Pillow and Playwright with a Chrome binary; FONT_DIR holds the three woff2 files):
  FONT_DIR=/path/to/fonts python3 -I scripts/brand/build-brand-assets.py
"""
import os, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOGO = ROOT / "public/lovable-uploads/jolu-logo.png"
OUT = ROOT / "public/brand"
BG = (10, 10, 11, 255)
OUT.mkdir(parents=True, exist_ok=True)
logo = Image.open(LOGO).convert("RGBA")

def on_canvas(size, fill, background):
    canvas = Image.new("RGBA", (size, size), background)
    inner = round(size * fill)
    mark = logo.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.alpha_composite(mark, (off, off))
    return canvas

T = (0, 0, 0, 0)
on_canvas(512, 0.94, T).save(OUT / "icon-512.png", optimize=True)
on_canvas(192, 0.94, T).save(OUT / "icon-192.png", optimize=True)
on_canvas(32, 1.0, T).save(OUT / "icon-32.png", optimize=True)
on_canvas(512, 0.62, BG).save(OUT / "icon-maskable-512.png", optimize=True)   # shield inside the 80% safe zone
on_canvas(180, 0.80, BG).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)

font_dir = os.environ.get("FONT_DIR")
if not font_dir:
    sys.exit("FONT_DIR is required to render the social preview")
from playwright.sync_api import sync_playwright
html = (ROOT / "scripts/brand/preview-template.html").read_text()
html = html.replace("__FONT_DIR__", pathlib.Path(font_dir).resolve().as_uri()).replace("__LOGO__", LOGO.resolve().as_uri())
tmp = pathlib.Path("/tmp/jolu-preview.html"); tmp.write_text(html)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto(tmp.as_uri()); pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / "jolu-preview.png"))
    b.close()
Image.open(OUT / "jolu-preview.png").convert("RGB").save(OUT / "jolu-preview.png", optimize=True)
print("ok")
