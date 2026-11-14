// 사진을 저장 전에 줄인다(긴 변 1280px, JPEG). Storage 키당 한도가 공식 문서에 없어 문자열 크기를 제한한다.
// 측정점은 정규화 좌표(0~1)로 저장하므로 축소해도 기준·측정 비율은 그대로다.
export const PHOTO_MAX_EDGE = 1280;
export const PHOTO_MAX_CHARS = 450_000; // ≈ 330KB JPEG. 실기기 POC 후 조정(docs/DECISIONS.md D-016)

export interface StoredPhoto {
  dataUri: string;
  width: number;
  height: number;
}

export async function compressPhoto(dataUri: string): Promise<StoredPhoto | null> {
  try {
    const img = await load(dataUri);
    for (const edge of [PHOTO_MAX_EDGE, 1024, 800]) {
      const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      for (const q of [0.8, 0.65, 0.5]) {
        const out = canvas.toDataURL('image/jpeg', q);
        if (out.length <= PHOTO_MAX_CHARS) return { dataUri: out, width: w, height: h };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
