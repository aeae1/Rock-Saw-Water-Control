"""Compose the selected banner from the original artwork and approved design.

Requires Pillow and Nimbus Sans. BANNER_SUBTITLE_FONT can override the font path.
Only the stripe, title lettering and accent are reused from the concept banner.
The source machine artwork is pasted at native resolution with unchanged pixels.
"""
from pathlib import Path
import os
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/assets/artwork'
source = Image.open(ART / 'original.jpeg').convert('RGB')
concept = Image.open(ART / 'red-editorial.png').convert('RGB')
assert source.size == (1122, 1402)
assert concept.size == (2172, 724)
canvas = Image.new('RGB', (3505, 1402), '#FFFFFF')
scale = 1402 / 724

def paste_design_region(box):
    x0, y0, x1, y1 = box
    region = concept.crop(box).resize((round((x1-x0)*scale), round((y1-y0)*scale)), Image.Resampling.LANCZOS)
    canvas.paste(region, (round(x0*scale), round(y0*scale)))

# Reuse the approved watercolor stripe and typography, excluding its machine.
paste_design_region((0, 0, 185, 724))
paste_design_region((185, 110, 1145, 490))
paste_design_region((185, 500, 540, 538))
font = ImageFont.truetype(os.environ.get('BANNER_SUBTITLE_FONT', '/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'), 100)
ImageDraw.Draw(canvas).text((365, 1080), 'TAKEUCHI TL12R2 / HDRS24', fill='#303438', font=font)
canvas.paste(source, (2383, 0))
assert ImageChops.difference(source, canvas.crop((2383, 0, 3505, 1402))).getbbox() is None
canvas.save(ART / 'red-stripe-original.png')
print('Watercolor stripe restored; original machine pixels preserved exactly.')
