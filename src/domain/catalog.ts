// 화면 라벨과 측정 체크리스트(안내용 — 자동 판정을 대신하지 않는다).
import type { PassageKind, ProductCategory, SpaceCategory, SpecSource, TargetKind, ValueOrigin } from './types';

export const SPACE_LABEL: Record<SpaceCategory, string> = {
  LIVING: '거실',
  KITCHEN: '주방',
  BEDROOM: '침실',
  LAUNDRY: '세탁실',
  BATHROOM: '욕실',
  ENTRANCE: '현관',
  BALCONY: '베란다',
  OTHER: '기타',
};

export const TARGET_LABEL: Record<TargetKind, string> = {
  FRIDGE_SPOT: '냉장고 자리',
  WASHER_SPOT: '세탁기 자리',
  DRYER_SPOT: '건조기 자리',
  DISHWASHER_SPOT: '식기세척기 자리',
  TV_SPOT: 'TV 자리',
  SOFA_SPOT: '소파 자리',
  BED_SPOT: '침대 자리',
  DESK_SPOT: '책상 자리',
  WARDROBE_SPOT: '옷장 자리',
  WINDOW: '창문',
  OTHER: '기타',
};

export const PRODUCT_LABEL: Record<ProductCategory, string> = {
  FRIDGE: '냉장고',
  WASHER: '세탁기',
  DRYER: '건조기',
  DISHWASHER: '식기세척기',
  TV: 'TV',
  BED: '침대',
  SOFA: '소파',
  DESK: '책상',
  WARDROBE: '옷장',
  CURTAIN: '커튼',
  OTHER: '기타',
};

export const PASSAGE_LABEL: Record<PassageKind, string> = {
  BUILDING_ENTRANCE: '공동현관',
  ELEVATOR: '엘리베이터',
  HALLWAY: '복도',
  FRONT_DOOR: '현관문',
  ROOM_DOOR: '방문',
  STAIRS: '계단',
  OTHER: '기타',
};

/** 값 출처 배지(색만으로 구분하지 않도록 글자로 표시) */
export const ORIGIN_LABEL: Record<ValueOrigin, string> = {
  DIRECT: '직접 측정',
  PHOTO: '사진 참고값',
  DOCUMENT: '문서 참고',
  UNKNOWN: '출처 미확인',
};

export const SPEC_SOURCE_LABEL: Record<SpecSource, string> = {
  MANUAL_DOC: '제품 설명서',
  MAKER_SITE: '제조사 공식 페이지',
  SELLER_PAGE: '판매 페이지',
  DIRECT: '직접 측정',
  OTHER: '기타',
};

/** 측정 대상별로 재면 좋은 항목(안내용). 키는 화면 체크리스트 문구 */
export const TARGET_CHECKLIST: Partial<Record<TargetKind, string[]>> = {
  FRIDGE_SPOT: ['가로(벽~벽, 걸레받이 제외)', '깊이(벽~앞선)', '높이(바닥~상부장)', '앞쪽 문 열 공간'],
  WASHER_SPOT: ['가로', '깊이(수도꼭지·배수구 포함)', '높이(선반 아래까지)', '앞쪽 문 열 공간'],
  DRYER_SPOT: ['가로', '깊이', '높이(직렬 설치면 세탁기 위 공간)', '앞쪽 문 열 공간'],
  DISHWASHER_SPOT: ['가로', '깊이', '높이(상판 아래까지)', '앞쪽 문 열 공간'],
  TV_SPOT: ['가로(벽 또는 거실장 폭)', '높이(거실장 위~천장)', '거실장 깊이'],
  SOFA_SPOT: ['가로', '깊이(벽~통로)', '현관문·복도 폭(반입 경로)'],
  BED_SPOT: ['가로', '깊이(머리맡~발끝 벽)', '방문 폭·높이(반입 경로)'],
  DESK_SPOT: ['가로', '깊이', '창문 아래면 창틀 높이'],
  WARDROBE_SPOT: ['가로', '깊이', '높이(천장·몰딩까지)', '앞쪽 문 열 공간'],
  WINDOW: ['가로(창틀 안쪽)', '높이(창틀 안쪽)'],
};

/** 측정 대상과 어울리는 제품 분류(비교 화면 기본 추천용) */
export const TARGET_TO_PRODUCT: Partial<Record<TargetKind, ProductCategory>> = {
  FRIDGE_SPOT: 'FRIDGE',
  WASHER_SPOT: 'WASHER',
  DRYER_SPOT: 'DRYER',
  DISHWASHER_SPOT: 'DISHWASHER',
  TV_SPOT: 'TV',
  SOFA_SPOT: 'SOFA',
  BED_SPOT: 'BED',
  DESK_SPOT: 'DESK',
  WARDROBE_SPOT: 'WARDROBE',
  WINDOW: 'CURTAIN',
};
