const SRI_LANKA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sriLankaToday(now = Date.now()) {
  return new Date(now + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);
}

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validatePastOrTodayCalendarDate(value) {
  if (!isValidCalendarDate(value)) throw new Error('Date must use YYYY-MM-DD');
  if (value > sriLankaToday()) throw new Error('Date cannot be in the future');
  return true;
}

function calendarDateToUtc(value) {
  if (!isValidCalendarDate(value)) throw new Error('Invalid calendar date');
  // Noon UTC stays on the same calendar day in Sri Lanka and avoids the
  // midnight UTC shift that rejected/displayed "today" incorrectly.
  return new Date(`${value}T12:00:00.000Z`);
}

module.exports = {
  calendarDateToUtc,
  isValidCalendarDate,
  sriLankaToday,
  validatePastOrTodayCalendarDate,
};
