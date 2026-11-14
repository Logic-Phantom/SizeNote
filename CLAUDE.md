# 사이즈 어때? 작업 규칙 (요약)

원본 기획: `docs/SUPER_PROMPT.md`(사이즈노트 → 이름 변경). 디자인 기준: `docs/design/reference-1.webp`, `reference-2.webp`. 결정: `docs/DECISIONS.md`. 구조: `docs/ARCHITECTURE.md`.

- 모든 답변·문서·커밋 메시지는 한국어.
- 앱 이름은 **사이즈 어때?**, appName `sizenote`(콘솔 등록 전 가안. 바꾸면 `apps-in-toss.config.ts`와 `src/platform/toss.ts` APP_NAME 같이).
- 앱인토스 API는 추측하지 않는다: `node_modules/@apps-in-toss/web-framework/dist/index.d.ts`와 공식 문서로 확인하고 DECISIONS에 근거를 남긴다.
- SDK 호출은 `src/platform/toss.ts`·`src/storage/kv.ts`에서만. `src/domain/`은 순수 TS(DOM·SDK 의존 금지).
- 길이는 저장 시 항상 정수 mm. 변환은 `src/domain/units.ts`만. 모르는 값은 null(0으로 채우지 않음).
- 판정 문구: '입력값 기준 규격 충족' / '규격 초과' / '추가 확인 필요'. '설치 가능', '100%', 'AI 측정' 같은 표현 금지.
- 사진 보조 측정값은 항상 '사진 참고값'으로 표시하고 줄자 재확인 안내. 원근 보정·AR 측정은 미구현.
- 카메라·앨범은 사용자가 버튼을 누를 때만 1회. 진입 즉시 권한·바텀시트 금지. 서버 전송 금지.
- 색·간격은 `src/styles/design-tokens.css`만.
- 상태는 `구현` / `자동 테스트 통과` / `브라우저 확인` / `샌드박스 확인` / `토스앱 확인`으로 구분해 README에 기록. 확인 안 한 것을 완료로 보고하지 않는다.
- 검사: `npm test`, `npm run typecheck`, `npm run build`, 업로드 번들 `npm run build:ait`.
- README 맨 아래 Work Log는 작업 마지막에 갱신.
