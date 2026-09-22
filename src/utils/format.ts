// 分 -> 元 字符串
export function centsToYuan(cents: string | number): string {
  const n = Number(cents);
  return (n / 100).toFixed(2);
}

// 元字符串 -> 分 (bigint 字符串)
export function yuanToCentsStr(yuan: string | number): string {
  const n = Math.round(Number(yuan) * 100);
  return String(n);
}

export function formatTime(t?: string): string {
  if (!t) return '-';
  const s = t.replace('T', ' ').slice(0, 19);
  // 来源时间缺少秒时补 ":00"，保证精确到秒
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
}