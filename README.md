# 사이즈 어때?

> 사기 전에, 우리 집에 맞는지.

우리 집 공간 치수를 저장해 두고, 사려는 가구·가전이 설치 자리와 반입 경로에 맞는지 비교하는 **앱인토스 비게임 미니앱**입니다.
로그인·서버 없이 기기 안(토스 Storage)에만 저장합니다.

- 표시 이름: **사이즈 어때?** (기획서 이름 '사이즈노트'에서 변경)
- appName: `sizenote` (콘솔 등록 전 가안)
- 스택: React 19 · TypeScript strict · Vite 8 · `@apps-in-toss/web-framework` 3.10.0 · react-router(해시) · Vitest
- 문서: [기획 원본](docs/SUPER_PROMPT.md) · [결정 기록](docs/DECISIONS.md) · [아키텍처](docs/ARCHITECTURE.md) · 시안 [1](docs/design/reference-1.webp) [2](docs/design/reference-2.webp)

## 실행

```bash
npm install
npm run dev        # 브라우저 미리보기 (토스 SDK 대신 localStorage·파일 선택으로 대체)
npm test           # 단위 테스트
npm run build      # 라이선스 목록 + 타입체크 + 빌드
npm run build:ait  # 콘솔 업로드용 sizenote.ait
npm run icons      # 시안에서 아이콘 세트 다시 생성(Python + Pillow)
```

## 프로젝트 구조

```
apps-in-toss.config.ts   appName·권한(camera, photos)·내비게이션 바
src/
  domain/      순수 TS — types, units, comparison(판정), passage(반입 경로), photo-measure(사진 보정), records(상태 변경), catalog(라벨·체크리스트)
  storage/     kv.ts(토스 Storage | localStorage), repository.ts(스키마 v1·방어적 파싱·사진 키)
  platform/    toss.ts(카메라·앨범 SDK 래퍼), image.ts(사진 축소)
  state/       store.tsx(불러오기·저장·실패 시 되돌림)
  components/  ui.tsx, forms.tsx(길이·설치 여유 입력), ResultView.tsx(판정 표시), PhotoMeasure.tsx(사진 보조 측정), overlay.tsx, Icon.tsx
  screens/     Home, SpaceEditor, SpaceDetail, MeasurementEditor, Products, Compare, History, HistoryDetail, Passages, Settings
  styles/      design-tokens.css(웜 우드 톤), app.css
assets/brand/  콘솔 업로드용 아이콘(console-icon-600.png)
public/        favicon.png, brand/logo.png, brand/og-image.png
scripts/       generate-oss-licenses.mjs, build-app-icons.py
tests/         units, comparison, passage, photo-measure, repository
docs/          SUPER_PROMPT, DECISIONS, ARCHITECTURE, design/
```

## 기능 상태

`구현` → `자동 테스트 통과` → `브라우저 확인` → `샌드박스 확인` → `토스앱 확인` 순서. 확인하지 않은 단계는 비워 둡니다.

| 기능 | 상태 | 비고 |
|---|---|---|
| 프로젝트 골격·앱인토스 설정(3.10.0) | 구현 · 빌드 성공 | 샌드박스 미확인 |
| 단위 변환(mm 저장·cm/mm 표시) | 자동 테스트 통과 · 브라우저 확인 | |
| 비교 엔진 FIT/OVER/REVIEW | 자동 테스트 통과 · 브라우저 확인 | 설치 여유 미확인 → 추가 확인 필요 확인 |
| 저장소(스키마 v1·손상 복구·이 앱 키만 삭제) | 자동 테스트 통과 · 브라우저 확인 | 토스 Storage 실기기 미확인 |
| 홈(빈 상태·공간 목록·비교 버튼·최근 비교) | 브라우저 확인 | |
| 공간 추가·수정·삭제, 공간 상세(측정 대상 목록) | 브라우저 확인 | 삭제 시 소속 측정 항목·사진 함께 삭제 확인 |
| 측정 대상 추가·수정·복사·삭제(값별 출처, 측정일, 체크리스트) | 브라우저 확인 | 복사는 사진 제외, 삭제 시 사진 키 삭제 확인 |
| 사진 첨부(최대 3장, 촬영·앨범) | 구현 | 브라우저는 파일 선택 대체(자동화로 파일 창을 열 수 없어 첨부·'저장 안 하고 나가면 새 사진 삭제'는 미확인). **토스 카메라·앨범 실기기 미확인** |
| 사진 보조 측정(기준선 → 기준 길이 → 측정선 → 사진 참고값 → 치수 적용, 1~3x 확대) | 자동 테스트 통과 · 브라우저 확인 | 합성 이미지로 확인. 실사진 오차 미측정 |
| 제품 등록·수정·삭제(본체·포장 치수, 설치 여유 3상태, 문 여는 공간, 출처) | 브라우저 확인 | 입력 오류 안내(빈 여유값·숫자 아님) 확인 |
| 제품 비교(후보 최대 3개, 반입 경로 선택, 기록 저장) | 브라우저 확인 | 후보 3개(4번째 선택 차단), 본체/포장·정면/옆면 경로 판정, 중복 저장 방지 확인 |
| 비교 기록 목록·상세(스냅샷)·다시 비교·삭제 | 자동 테스트 통과 · 브라우저 확인 | 측정값을 고친 뒤에도 과거 결과 유지, 경로 결과 포함 확인 |
| 반입 경로 구간 추가·수정·삭제, 단순 선별 | 자동 테스트 통과 · 브라우저 확인 | |
| 설정(표시 단위, 전체 삭제) | 브라우저 확인 | mm 전환 시 목록·입력·저장 확인. 전체 삭제는 이 앱 키만, 표시 단위는 유지 |
| 브랜드 아이콘(콘솔 600px·앱 안 로고·파비콘·OG) | 구현 · 브라우저 확인(홈 로고·파비콘) | 시안 그림을 떼어 사용, 600px 확대라 약간 부드러움. 콘솔 업로드 전 |

## 다음 할 일

1. **샌드박스·실기기 확인**: iOS·Android에서 Storage 유지(앱 종료 후 재진입), 카메라·앨범 권한 흐름(거부 포함), 사진 저장 용량·재진입 표시, 키보드·Safe Area
2. **사진 측정 오차 측정**: 줄자 대비 오차를 실사진으로 기록해 안내 문구 근거 마련(검증 전에는 오차 수치 표시 금지)
3. 사진 첨부는 브라우저 자동화로 확인 못 함 → 샌드박스에서 촬영·앨범 첨부, 저장 안 하고 나갈 때 새 사진 삭제 확인
4. 비교 화면 진입 시 측정 대상 고르기를 카드형으로 개선(현재 기본 select), 사진 여러 장일 때 사진 측정에서 사진 고르기
5. 출시 문서: `docs/RELEASE_CHECKLIST.md`, 개인정보·저장 안내, 오픈소스 라이선스 화면, 콘솔 appName 확정 후 `assets/brand/console-icon-600.png` 업로드
6. (선택) 고해상도 아이콘 원본을 받으면 `scripts/build-app-icons.py`의 소스·`ART_BOX`만 바꿔 `npm run icons`로 다시 생성

## Work Log

### 2026-11-14 — 프로젝트 구조·아키텍처 설정
- 기획서(사이즈노트 슈퍼프롬프트)를 검토해 바꾼 점을 `docs/DECISIONS.md`에 정리: 이름 '사이즈 어때?', House 엔티티 제거, 치수 값 단위 출처(`MeasuredValue`), 정규화 사진 좌표, 시안 탭바 사용, '설치 가능해요' 문구 교체, 설치 여유 null/0 구분, 문 개방 공간 축 추가, 평평한 폴더 구조(이전 토스 인앱 프로젝트와 동일)
- 내 차 어딨지(WhereIsCar) 구조를 바탕으로 앱인토스 3.10.0 프로젝트 골격 생성: `apps-in-toss.config.ts`(camera·photos 권한), Vite·TS 설정, 오픈소스 라이선스 생성 스크립트, `.npmrc`
- 도메인 로직(단위·비교 엔진·반입 경로·사진 보정 계산·상태 변경)과 저장소(스키마 v1·방어적 파싱·손상 백업·사진 분리 저장) 구현, 테스트 41개 통과
- 웜 우드 톤 디자인 토큰, 공통 UI, 홈·공간 편집·비교 기록·설정 화면과 해시 라우팅 구성
- 검증: `npm test` 41/41 통과, `npm run typecheck` 통과, `npm run build` 성공, 브라우저 미리보기(375×812)에서 빈 홈 → 공간 추가 → 홈 목록 표시 확인. 토스 샌드박스·실기기는 미확인

### 2026-11-14 — MVP 화면 구현
- 공간 상세, 측정 대상 추가·수정(가로·깊이·높이·문 여는 공간을 값마다 출처와 함께, 측정일, 대상별 체크리스트, 복사·삭제)
- 사진 첨부(최대 3장, `Device.openCamera`/`getPhotos`, 저장 전 축소, 저장 안 하고 나가면 새 사진 삭제)와 사진 보조 측정 화면(기준선·기준 길이(줄자/A4)·측정선, 1~3x 확대, 계산 근거·경고, 사진 참고값 표시, 손으로 고치면 '직접 측정'으로 바꾸고 계산 기록 보존)
- 제품 목록·등록(본체·포장 치수, 설치 여유 '확인 안 함/필요 없음/입력', 문 여는 공간, 출처·참고 주소)
- 비교 화면(측정 대상 1개 × 후보 최대 3개, 반입 경로 본체/포장·통과 방향), 결과 표시(축별 공간·필요 치수·남는 공간·미확인 사유·주의), 비교 기록 저장
- 비교 탭(비교 시작·제품·반입 경로 바로가기·기록 목록), 기록 상세(스냅샷·다시 비교·삭제), 반입 경로 구간 목록·편집
- 검증: `npm test` 42/42, `npm run typecheck` 통과, `npm run build` 성공. 브라우저 미리보기(375×812)에서 공간 → 측정 → 제품 → 비교 → 저장 → 기록 상세, 사진 보조 측정(합성 이미지) → 치수 적용 → 저장, 경로 구간 추가 확인. 토스 샌드박스·실기기는 미확인

### 2026-11-14 — 브랜드 아이콘
- 사용자 시안(`docs/design/reference-2.webp`) 왼쪽 위 아이콘의 집 + 줄자 그림을 그대로 떼어(채도로 오려 그림자·바탕 경계 제거) 크림 바탕에 다시 배치하는 `scripts/build-app-icons.py` 추가(`npm run icons`)
- 산출: `assets/brand/console-icon-600.png`(콘솔용 600×600, 모서리 직각), `icon-source.png`(1024), `public/brand/logo.png`(앱 안 로고), `public/favicon.png`, `public/brand/og-image.png`
- 홈 상단 브랜드에 로고 이미지 적용, `index.html`에 파비콘·OG 메타 추가, 결정 D-022 기록
- 검증: 빌드 성공(dist에 아이콘 포함), 브라우저 미리보기에서 홈 로고·파비콘 로드 확인. 콘솔 업로드는 하지 않음

### 2026-11-14 — 남은 브라우저 확인
- 브라우저 미리보기에서 확인: 공간 수정·삭제(소속 측정 항목 정리), 측정 대상 수정(출처 변경)·복사(사진 제외)·삭제(사진 키 삭제), 제품 수정(입력 오류 안내)·삭제, 후보 3개 비교(4번째 차단)·본체/포장·정면/옆면 반입 경로 판정·기록 저장(중복 방지)·기록 상세·삭제, 경로 구간 수정·삭제, 표시 단위 mm 전환, 전체 삭제(다른 키 보존)
- 수정: 문 여는 공간 축의 사유 문구를 '제품의 문·서랍 여는 거리를 확인하지 않았어요' / '자리 앞쪽 빈 공간을 재지 않았어요'로 바꿈(이전엔 '제품 치수가 없어요'로 부정확), 전체 삭제 시 표시 단위 설정은 유지
- 알려진 제한: 편집 중 앱이 강제 종료되면 저장 안 된 새 사진 키가 남을 수 있음(SDK Storage에 키 목록 API가 없어 전체 삭제로도 찾지 못함). 사진 첨부 자체는 파일 선택 창 때문에 자동화 확인 불가 → 샌드박스에서 확인
- 검증: `npm test` 42/42, `npm run typecheck` 통과
