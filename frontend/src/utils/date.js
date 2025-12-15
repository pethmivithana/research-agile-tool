// Simple date formatting helpers

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(); // ✅ full method
}

export function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString();
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
