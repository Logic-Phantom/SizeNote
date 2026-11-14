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
```

## 프로젝트 구조

```
apps-in-toss.config.ts   appName·권한(camera, photos)·내비게이션 바
src/
  domain/      순수 TS — types, units, comparison(판정), passage(반입 경로), photo-measure(사진 보정), records(상태 변경), catalog(라벨·체크리스트)
  storage/     kv.ts(토스 Storage | localStorage), repository.ts(스키마 v1·방어적 파싱·사진 키)
  platform/    toss.ts(카메라·앨범 SDK 래퍼), image.ts(사진 축소)
  state/       store.tsx(불러오기·저장·실패 시 되돌림)
  components/  ui.tsx, overlay.tsx(토스트·확인창), Icon.tsx
  screens/     Home, SpaceEditor, History, Settings
  styles/      design-tokens.css(웜 우드 톤), app.css
tests/         units, comparison, passage, photo-measure, repository
docs/          SUPER_PROMPT, DECISIONS, ARCHITECTURE, design/
```

## 기능 상태

`구현` → `자동 테스트 통과` → `브라우저 확인` → `샌드박스 확인` → `토스앱 확인` 순서. 확인하지 않은 단계는 비워 둡니다.

| 기능 | 상태 | 비고 |
|---|---|---|
| 프로젝트 골격·앱인토스 설정(3.10.0) | 구현 · 빌드 성공 | 샌드박스 미확인 |
| 단위 변환(mm 저장·cm 표시) | 자동 테스트 통과 | |
| 비교 엔진 FIT/OVER/REVIEW | 자동 테스트 통과 | 화면 미구현 |
| 반입 경로 단순 선별 | 자동 테스트 통과 | 화면 미구현 |
| 사진 보조 측정 계산(기준선 1개) | 자동 테스트 통과 | 화면 미구현, 실기기 오차 미측정 |
| 저장소(스키마 v1·손상 복구·이 앱 키만 삭제) | 자동 테스트 통과 | 토스 Storage 실기기 미확인 |
| 비교 기록 스냅샷 불변·최대 20개 | 자동 테스트 통과 | |
| 홈(빈 상태·공간 목록·최근 비교) | 브라우저 확인 | |
| 공간 추가·수정·삭제 | 브라우저 확인(추가) | 수정·삭제는 브라우저 미확인 |
| 비교 기록 목록·삭제, 설정(단위·전체 삭제) | 구현 | |
| 카메라·앨범(`Device.openCamera`/`getPhotos`) | 구현(래퍼만) | 화면 연결 전, 실기기 POC 필요 |

## 다음 할 일

1. **측정 항목 화면**: 공간 상세 → 측정 대상 추가(시안 2 '측정 대상 추가' 그리드) / 가로·깊이·높이·앞쪽 공간 입력(cm/mm), 출처 배지, 측정일, 체크리스트, 복제
2. **제품 화면**: 제품 등록(본체·포장 치수, 설치 여유 '확인 안 함 / 0 / 값' 3상태 입력, 문 개방 거리, 출처)
3. **비교 흐름**: 제품 × 측정 항목 선택 → 결과(축별 대조·미확인 목록·주의) → 기록 저장 / 후보 최대 3개 나란히 비교
4. **사진 보조 측정 화면**: 촬영·앨범 → 기준선 두 점 + 실제 길이 → 측정 두 점 → 참고값 확인·수정 → 저장(확대 버튼으로 정밀 선택)
5. **반입 경로 화면**: 구간 등록 + 결과를 설치 판정과 분리해 표시
6. **브랜드 아이콘**: 시안에서 잘라 600×600 콘솔 아이콘·파비콘 생성(`scripts/build-app-icons.py` 방식)
7. **실기기 POC**: 샌드박스/QR로 iOS·Android에서 Storage 유지, 카메라·앨범 권한, 사진 저장 용량·재진입 표시, 사진 측정 오차(줄자 대비) 기록
8. 출시 체크리스트(`docs/RELEASE_CHECKLIST.md`)·개인정보 안내·오픈소스 라이선스 화면

## Work Log

### 2026-11-14 — 프로젝트 구조·아키텍처 설정
- 기획서(사이즈노트 슈퍼프롬프트)를 검토해 바꾼 점을 `docs/DECISIONS.md`에 정리: 이름 '사이즈 어때?', House 엔티티 제거, 치수 값 단위 출처(`MeasuredValue`), 정규화 사진 좌표, 시안 탭바 사용, '설치 가능해요' 문구 교체, 설치 여유 null/0 구분, 문 개방 공간 축 추가, 평평한 폴더 구조(이전 토스 인앱 프로젝트와 동일)
- 내 차 어딨지(WhereIsCar) 구조를 바탕으로 앱인토스 3.10.0 프로젝트 골격 생성: `apps-in-toss.config.ts`(camera·photos 권한), Vite·TS 설정, 오픈소스 라이선스 생성 스크립트, `.npmrc`
- 도메인 로직(단위·비교 엔진·반입 경로·사진 보정 계산·상태 변경)과 저장소(스키마 v1·방어적 파싱·손상 백업·사진 분리 저장) 구현, 테스트 41개 통과
- 웜 우드 톤 디자인 토큰, 공통 UI, 홈·공간 편집·비교 기록·설정 화면과 해시 라우팅 구성
- 검증: `npm test` 41/41 통과, `npm run typecheck` 통과, `npm run build` 성공, 브라우저 미리보기(375×812)에서 빈 홈 → 공간 추가 → 홈 목록 표시 확인. 토스 샌드박스·실기기는 미확인
