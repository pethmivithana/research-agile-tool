// Date helpers for backend

export function addWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function formatISO(date) {
  return new Date(date).toISOString();
}
