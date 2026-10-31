"""Gera ícones quadrados do PWA a partir da logo oficial `logo pdq.png`."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "logo pdq.png"
ICONS = ROOT / "assets" / "icons"


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def make_background(size: int, rounded: bool = False) -> Image.Image:
    scale = 2
    s = size * scale
    base = Image.new("RGB", (s, s), "#15281c")
    draw = ImageDraw.Draw(base)

    # Gradiente aproximado de feltro verde profundo.
    for y in range(s):
        t = y / max(1, s - 1)
        r = int(26 + (18 - 26) * t)
        g = int(50 + (38 - 50) * t)
        b = int(34 + (26 - 34) * t)
        draw.line((0, y, s, y), fill=(r, g, b))

    # Brilho dourado suave no alto.
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        (s * 0.08, -s * 0.24, s * 0.92, s * 0.58),
        fill=(224, 177, 58, 48),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.08))
    base = Image.alpha_composite(base.convert("RGBA"), glow)

    # Aro dourado discreto.
    overlay = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    margin = int(s * 0.055)
    width = max(2, int(s * 0.006))
    od.ellipse(
        (margin, margin, s - margin, s - margin),
        outline=(224, 177, 58, 85),
        width=width,
    )
    base = Image.alpha_composite(base, overlay)

    if rounded:
        base.putalpha(rounded_mask(s, int(s * 0.20)))
    else:
        base = base.convert("RGB")
    return base.resize((size, size), Image.Resampling.LANCZOS)


def make_icon(logo: Image.Image, size: int, logo_ratio: float, rounded: bool = False) -> Image.Image:
    canvas = make_background(size, rounded=rounded).convert("RGBA")
    target_w = max(1, int(size * logo_ratio))
    aspect = logo.width / logo.height
    target_h = int(target_w / aspect)
    if target_h > int(size * logo_ratio):
        target_h = int(size * logo_ratio)
        target_w = int(target_h * aspect)

    mark = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Sombra suave para separar a logo do fundo.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sx = (size - mark.width) // 2
    sy = (size - mark.height) // 2
    shadow_alpha = (
        mark.getchannel("A")
        .filter(ImageFilter.GaussianBlur(max(2, size // 45)))
        .point(lambda value: int(value * 0.48))
    )
    soft_shadow = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    soft_shadow.putalpha(shadow_alpha)
    shadow.alpha_composite(soft_shadow, (sx + int(size * 0.012), sy + int(size * 0.018)))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.alpha_composite(mark, (sx, sy))

    if rounded:
        canvas.putalpha(rounded_mask(size, int(size * 0.20)))
    return canvas


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SOURCE).convert("RGBA")

    sizes = {
        "icon-512.png": (512, 0.82, False),
        "icon-192.png": (192, 0.82, False),
        "maskable-512.png": (512, 0.66, False),
        "apple-touch-icon.png": (180, 0.82, False),
        "favicon-32.png": (32, 0.88, False),
        "favicon-16.png": (16, 0.90, False),
    }

    for name, (size, ratio, rounded) in sizes.items():
        image = make_icon(logo, size, ratio, rounded=rounded)
        image.save(ICONS / name, optimize=True)
        print("gerado", name, image.size)

    favicon = Image.open(ICONS / "favicon-32.png").convert("RGBA")
    favicon.save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Ícone extra de alta resolução da marca, usado na documentação.
    make_icon(logo, 512, 0.88).save(ICONS / "logo-pdq-512.png", optimize=True)
    print("ícones atualizados a partir de", SOURCE)


if __name__ == "__main__":
    main()
