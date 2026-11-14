import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔 등록 appName과 정확히 같아야 업로드된다(콘솔 등록 전 가안). 바꾸면 src/platform/toss.ts APP_NAME도 같이 바꾼다.
  appName: 'sizenote',
  // 실제로 쓰는 권한만 선언한다. 둘 다 사용자가 버튼을 누른 순간에만 1회 호출한다(진입 즉시 요청 금지).
  // camera: '사진 찍기' → Device.openCamera
  // photos: '앨범에서 고르기' → Device.getPhotos
  permissions: [
    { name: 'camera', access: 'access' },
    { name: 'photos', access: 'read' },
  ],
  // 토스 내비게이션 바의 뒤로가기를 쓰고, 토스 안에서는 화면 안 뒤로가기를 그리지 않는다(중복 노출 금지)
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
  },
  webBundleDir: 'dist',
});
