# 아키텍처 (사이즈 어때?)

## 계층

```
screens/ ──► state/store.tsx ──► storage/repository.ts ──► storage/kv.ts ──► 토스 Storage | localStorage(미리보기)
   │               │
   │               └──► domain/records.ts (상태 변경 순수 함수)
   ├──► domain/comparison.ts · passage.ts · photo-measure.ts · units.ts (순수 계산)
   └──► platform/toss.ts (카메라·앨범) · platform/image.ts (사진 축소)
```

| 폴더 | 역할 | 규칙 |
|---|---|---|
| `src/domain/` | 타입, 단위 변환, 비교 엔진, 반입 경로 선별, 사진 보정 계산, 상태 변경 | **순수 TS**. DOM·SDK·React import 금지. 모든 계산은 여기서 테스트 |
| `src/storage/` | 키-값 어댑터(`kv.ts`), 상태·사진 직렬화와 방어적 파싱(`repository.ts`) | 이 앱 키(`sizenote.*`)만 사용. 스키마 바꾸면 `migrate()` 추가 |
| `src/platform/` | 토스 SDK 호출(`toss.ts`), 사진 축소(`image.ts`) | **SDK 호출은 여기와 `storage/kv.ts`에서만**. 토스 밖이면 브라우저 대체 |
| `src/state/` | 앱 상태 컨텍스트. `commit(fn)` = 변경 → 저장 → 실패 시 되돌림 | 사진 삭제는 상태 저장 성공 후 |
| `src/components/` | 공통 UI(화면 틀·탭바·버튼·배지·토스트·확인창), 아이콘 | 색·간격은 `styles/design-tokens.css` 변수만 |
| `src/screens/` | 화면 | 계산 로직을 직접 쓰지 않고 domain 함수 호출 |

## 데이터 모델 요약 (`src/domain/types.ts`)

- `Space` 공간(주방·거실…) → `Measurement` 측정 대상(냉장고 자리…): 가로·깊이·높이·앞쪽 공간 각각 `MeasuredValue{ mm, origin, photo? }`
- `Product` 제품: 본체·포장 치수, 설치 여유(좌·우·후면·상단, null=미확인), 문 개방 거리
- `PassageSegment` 반입 경로 구간(현관문·엘리베이터…)
- `ComparisonRecord` 비교 당시 측정 항목·제품 사본 + 결과(불변)
- 사진은 상태 JSON 밖 별도 키, 측정 항목에는 `photoIds`만

## 판정 흐름 (`domain/comparison.ts`)

1. 축별(가로·깊이·높이·앞쪽 공간) 필요 치수 = 제품 + 확인된 설치 여유
2. 필요 > 공간 → 해당 축 `OVER`(모르는 여유가 있어도 확정)
3. 공간·제품 치수 누락 또는 설치 여유 미확인 → `REVIEW`
4. 전체: OVER가 하나라도 있으면 OVER, 아니면 REVIEW가 있으면 REVIEW, 아니면 FIT('입력값 기준 규격 충족')
5. 사진 참고값·출처 미확인·오래된 측정은 판정과 별개로 `cautions`

## 사진 보조 측정 (`domain/photo-measure.ts`)

기준선 양 끝(정규화 좌표) + 실제 길이(mm) → `mm/px` → 측정선 길이. 원근 보정 없음. 기준선 40px 미만·측정선 8px 미만이면 숫자를 내지 않음. 기준의 4배 넘게 외삽하거나 기준선이 사진 긴 변의 10% 미만이면 경고.

## 검사 명령

- `npm test` — domain·storage 단위 테스트(Vitest)
- `npm run typecheck`
- `npm run build` — 라이선스 목록 생성 + 타입체크 + Vite 빌드
- `npm run build:ait` — 콘솔 업로드 번들(`sizenote.ait`)
