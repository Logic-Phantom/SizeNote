# 사용자 제공 시안(docs/design/reference-2.webp) 왼쪽 위 앱 아이콘의 그림(집 + 줄자)을 그대로 떼어 아이콘 세트를 만든다(다시 그리지 않음).
# 내 차 어딨지 scripts/build-app-icons.py와 같은 방식. 시안 아이콘 바탕(둥근 사각)의 가장자리·그림자는 쓰지 않고
# 그림만 색 차이로 오려 새 크림색 바탕에 다시 놓는다(바탕 경계가 흐릿하게 남지 않도록).
# 사용: npm run icons   (Pillow 필요: python -m pip install Pillow)
# 산출:
#   assets/brand/icon-source.png        1024 정사각(크림 바탕 꽉 참)
#   assets/brand/console-icon-600.png   앱인토스 콘솔 앱 로고(600×600, 모서리 둥글리지 않음 — 플랫폼이 처리)
#   public/brand/logo.png               앱 안 로고(256, 둥근 사각 밖 투명)
#   public/favicon.png                  브라우저 탭(64)
#   public/brand/og-image.png           공유 미리보기(1200×630)
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs' / 'design' / 'reference-2.webp'
# 실측(1254×1254 시안): 채도 있는 픽셀(집·줄자) 범위 x 121~261, y 74~200. 안티앨리어싱 여유 6px
ART_BOX = (115, 68, 268, 207)
BG = (252, 248, 244)  # 새 바탕(디자인 토큰 --c-surface 계열 크림)
PAGE_BG = (247, 243, 237)  # --c-bg
ART_SCALE = 0.74  # 바탕 한 변 대비 그림 폭(시안 비율 141/188 ≈ 0.75)
RADIUS = 0.22


def cut_art() -> Image.Image:
    """채도로 알파를 만들어 그림만 투명 배경으로 오린다."""
    src = Image.open(SRC).convert('RGB').crop(ART_BOX)
    w, h = src.size
    out = Image.new('RGBA', (w, h))
    px = src.load()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # 그림(갈색·노랑)은 채도가 있고 바탕 가장자리·그림자는 회색조 → 채도로 오리면 그림자 잔상이 남지 않는다
            chroma = max(r, g, b) - min(r, g, b)
            a = max(0, min(255, int((chroma - 10) * 255 / 30)))
            op[x, y] = (r, g, b, a)
    return out


def compose(size: int, art: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), bg + (255,))
    tw = int(size * ART_SCALE)
    th = round(art.height * tw / art.width)
    big = art.resize((tw, th), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    canvas.alpha_composite(big, ((size - tw) // 2, (size - th) // 2))
    return canvas


def rounded(img: Image.Image) -> Image.Image:
    s = img.width
    mask = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=int(s * 4 * RADIUS), fill=255)
    out = img.copy()
    out.putalpha(mask.resize((s, s), Image.LANCZOS))
    return out


def main() -> None:
    art = cut_art()
    brand = ROOT / 'assets' / 'brand'
    brand.mkdir(parents=True, exist_ok=True)
    full = compose(1024, art, BG)
    full.convert('RGB').save(brand / 'icon-source.png', optimize=True)
    full.resize((600, 600), Image.LANCZOS).convert('RGB').save(brand / 'console-icon-600.png', optimize=True)

    pub = ROOT / 'public' / 'brand'
    pub.mkdir(parents=True, exist_ok=True)
    logo = rounded(full)
    logo.resize((256, 256), Image.LANCZOS).save(pub / 'logo.png', optimize=True)
    logo.resize((64, 64), Image.LANCZOS).save(ROOT / 'public' / 'favicon.png', optimize=True)

    og = Image.new('RGBA', (1200, 630), PAGE_BG + (255,))
    icon = logo.resize((400, 400), Image.LANCZOS)
    og.alpha_composite(icon, ((1200 - 400) // 2, (630 - 400) // 2))
    og.convert('RGB').save(pub / 'og-image.png', optimize=True)
    print('icons → assets/brand/console-icon-600.png, public/brand/logo.png, public/favicon.png, public/brand/og-image.png')


if __name__ == '__main__':
    main()
