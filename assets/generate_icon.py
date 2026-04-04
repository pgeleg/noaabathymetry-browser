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
    ty = size * 0.78

    padding_x = size * 0.06
    padding_y = size * 0.03
    bbox = draw.textbbox((0, 0), text, font=font)
    th = bbox[3] - bbox[1]
    draw.rounded_rectangle(
        [tx - padding_x, ty - padding_y,
         tx + tw + padding_x, ty + th + padding_y],
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
    logo = Image.open("assets/NOAA-2.png").convert("RGBA")
    fmt = sys.argv[1] if len(sys.argv) > 1 else "ico"

    if fmt == "ico":
        sizes = [16, 32, 48, 64, 128, 256]
        frames = [make_icon_frame(logo, s).convert("RGBA") for s in sizes]
        # Pillow ICO: pass the largest frame and specify all sizes
        frames[-1].save("assets/NOAA.ico", format="ICO",
                        sizes=[(s, s) for s in sizes])
        print("Generated assets/NOAA.ico")

    elif fmt == "iconset":
        import os
        os.makedirs("assets/NOAA.iconset", exist_ok=True)
        for size in [16, 32, 64, 128, 256, 512]:
            frame = make_icon_frame(logo, size)
            frame.save(f"assets/NOAA.iconset/icon_{size}x{size}.png")
        print("Generated assets/NOAA.iconset/")


if __name__ == "__main__":
    main()
