export function getRelativeTimeString(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const absDiffInSeconds = Math.abs(Math.floor(diffInMs / 1000));
  const absDiffInMinutes = Math.floor(absDiffInSeconds / 60);
  const absDiffInHours = Math.floor(absDiffInMinutes / 60);
  const absDiffInDays = Math.floor(absDiffInHours / 24);
  const absDiffInWeeks = Math.floor(absDiffInDays / 7);
  const absDiffInMonths = Math.floor(absDiffInDays / 30);
  const absDiffInYears = Math.floor(absDiffInDays / 365);
  
  const isFuture = diffInMs < 0;
  const suffix = isFuture ? '' : ' ago';
  const prefix = isFuture ? 'in ' : '';

  if (absDiffInSeconds < 60) {
    return 'Just now';
  } else if (absDiffInMinutes < 60) {
    return `${prefix}${absDiffInMinutes} minute${absDiffInMinutes === 1 ? '' : 's'}${suffix}`;
  } else if (absDiffInHours < 24) {
    return `${prefix}${absDiffInHours} hour${absDiffInHours === 1 ? '' : 's'}${suffix}`;
  } else if (absDiffInDays < 7) {
    return `${prefix}${absDiffInDays} day${absDiffInDays === 1 ? '' : 's'}${suffix}`;
  } else if (absDiffInWeeks < 4) {
    return `${prefix}${absDiffInWeeks} week${absDiffInWeeks === 1 ? '' : 's'}${suffix}`;
  } else if (absDiffInMonths < 12) {
    return `${prefix}${absDiffInMonths} month${absDiffInMonths === 1 ? '' : 's'}${suffix}`;
  } else {
    return `${prefix}${absDiffInYears} year${absDiffInYears === 1 ? '' : 's'}${suffix}`;
  }
}

// Purchase dates (movies and TV purchases) are plain YYYY-MM-DD calendar dates with no time
// zone. These helpers build and show them from the date's own parts so no time zone can shift them.

const pad = (n: number) => String(n).padStart(2, "0");

// Today's calendar date as YYYY-MM-DD in the viewer's own day (not UTC)
export const todayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// "2026-06-08" -> "Jun 8, 2026"
export const formatPurchaseDate = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
