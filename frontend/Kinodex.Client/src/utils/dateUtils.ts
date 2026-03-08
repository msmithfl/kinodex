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
