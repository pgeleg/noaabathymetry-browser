"""Generate app icons with NOAA logo + NBS badge."""

import sys
from PIL import Image, ImageDraw, ImageFont


def make_icon_frame(logo, size):
    frame = logo.resize((size, size), Image.LANCZOS)
    if size < 48:
        return frame

    draw = ImageDraw.Draw(frame)
    text = "NBS"

    font_size = max(int(size * 0.28), 12)
    spacing = size * 0.04

    for name in ["arialbd.ttf", "arial.ttf",
                  "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            font = ImageFont.truetype(name, font_size)
            break
        except (IOError, OSError):
            continue
    else:
        font = ImageFont.load_default()

    tw = sum(draw.textbbox((0, 0), c, font=font)[2] + spacing
             for c in text) - spacing
    tx = (size - tw) / 2
    ty = size * 0.68

    padding_x = size * 0.06
    padding_y = max(size * 0.03, 5)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_top = ty + bbox[1]
    text_bottom = ty + bbox[3]
    draw.rounded_rectangle(
        [tx - padding_x, text_top - padding_y,
         tx + tw + padding_x, text_bottom + padding_y],
        radius=int(size * 0.04),
        fill=(18, 40, 70, 220),
    )

    cx = tx
    for c in text:
        for ox in [-0.5, 0, 0.5]:
            for oy in [-0.5, 0, 0.5]:
                draw.text((cx + ox, ty + oy), c,
                          fill=(255, 255, 255, 240), font=font)
        cx += draw.textbbox((0, 0), c, font=font)[2] + spacing

    return frame


def main():
    logo = Image.open("assets/NOAA-1.png").convert("RGBA")
    fmt = sys.argv[1] if len(sys.argv) > 1 else "ico"

    if fmt == "ico":
        sizes = [16, 32, 48, 64, 128, 256]
        frame = make_icon_frame(logo, sizes[-1]).convert("RGBA")
        frame.save("assets/NOAA.ico", format="ICO",
                   sizes=[(s, s) for s in sizes])
        print("Generated assets/NOAA.ico")

    elif fmt == "iconset":
        import os
        import subprocess
        os.makedirs("assets/NOAA.iconset", exist_ok=True)
        # macOS requires @2x variants for Retina displays
        specs = [
            (16, "icon_16x16.png"),
            (32, "icon_16x16@2x.png"),
            (32, "icon_32x32.png"),
            (64, "icon_32x32@2x.png"),
            (128, "icon_128x128.png"),
            (256, "icon_128x128@2x.png"),
            (256, "icon_256x256.png"),
            (512, "icon_256x256@2x.png"),
            (512, "icon_512x512.png"),
            (1024, "icon_512x512@2x.png"),
        ]
        for size, name in specs:
            frame = make_icon_frame(logo, size)
            frame.save(f"assets/NOAA.iconset/{name}")
        subprocess.run(["iconutil", "-c", "icns", "assets/NOAA.iconset",
                         "-o", "assets/NOAA.icns"], check=True)
        print("Generated assets/NOAA.icns")


if __name__ == "__main__":
    main()
