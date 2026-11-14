// 토스 앱 안(WebView)인지 판별하고 SDK 호출을 감싼다(내 차 어딨지 platform/toss.ts와 같은 방식).
// SDK는 토스 밖에서 호출하면 throw하므로 window.ReactNativeWebView 유무로 판별해 브라우저 대체 동작을 쓴다.
// 카메라·앨범은 사용자가 버튼을 눌렀을 때만 한 번 호출한다(진입 즉시 권한 요청 금지).
// API 근거: @apps-in-toss/web-framework 3.10.0 dist/index.d.ts — Device.openCamera / Device.getPhotos, 결과 { id, dataUri }.

export const APP_NAME = 'sizenote'; // apps-in-toss.config.ts appName과 같게

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
  }
}

export function isInToss(): boolean {
  return typeof window !== 'undefined' && window.ReactNativeWebView != null;
}

async function sdk() {
  return import('@apps-in-toss/web-framework');
}

export type PhotoResult = { ok: true; dataUri: string } | { ok: false; reason: 'denied' | 'cancelled' | 'unavailable' };

/** 측정 정확도를 위해 SDK 기본(1024)보다 크게 받는다. 저장 전 image.ts에서 다시 줄인다 */
const CAPTURE_MAX_WIDTH = 1600;

function toDataUri(raw: string): string {
  return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
}

/** 카메라 촬영. 토스: Device.openCamera({ base64: true }). 브라우저 미리보기: 파일 선택(capture) */
export async function takePhoto(): Promise<PhotoResult> {
  if (!isInToss()) return pickFileAsDataUri(true);
  try {
    const { Device, PermissionError } = await sdk();
    try {
      const img = await Device.openCamera({ base64: true, maxWidth: CAPTURE_MAX_WIDTH });
      if (!img?.dataUri) return { ok: false, reason: 'cancelled' };
      return { ok: true, dataUri: toDataUri(img.dataUri) };
    } catch (e) {
      return { ok: false, reason: e instanceof PermissionError ? 'denied' : 'cancelled' };
    }
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** 앨범에서 1장. 토스: Device.getPhotos({ base64: true, maxCount: 1 }). 브라우저 미리보기: 파일 선택 */
export async function pickAlbumPhoto(): Promise<PhotoResult> {
  if (!isInToss()) return pickFileAsDataUri(false);
  try {
    const { Device, PermissionError } = await sdk();
    try {
      const list = await Device.getPhotos({ base64: true, maxCount: 1, maxWidth: CAPTURE_MAX_WIDTH });
      const first = list?.[0];
      if (!first?.dataUri) return { ok: false, reason: 'cancelled' };
      return { ok: true, dataUri: toDataUri(first.dataUri) };
    } catch (e) {
      return { ok: false, reason: e instanceof PermissionError ? 'denied' : 'cancelled' };
    }
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** 브라우저 미리보기 전용 대체(토스 안에서는 쓰지 않는다 — SDK 권한 흐름 우회 금지) */
function pickFileAsDataUri(capture: boolean): Promise<PhotoResult> {
  return new Promise((done) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return done({ ok: false, reason: 'cancelled' });
      const reader = new FileReader();
      reader.onload = () => done({ ok: true, dataUri: String(reader.result) });
      reader.onerror = () => done({ ok: false, reason: 'unavailable' });
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
