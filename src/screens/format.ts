// 화면 표시용 날짜 포맷(기기 시간대 기준).
export function formatDay(isoOrDay: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay) ? new Date(`${isoOrDay}T00:00:00`) : new Date(isoOrDay);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.getMonth() + 1}. ${d.getDate()}`;
}

export function formatDate(isoOrDay: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay) ? new Date(`${isoOrDay}T00:00:00`) : new Date(isoOrDay);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
