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
  return t.replace('T', ' ').slice(0, 16);
}