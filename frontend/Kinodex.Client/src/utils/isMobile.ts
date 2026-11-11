// Whether this is a phone or tablet: a device with a camera to scan barcodes with, so the camera scan
// buttons show only here. It goes by the device, never the window's width, so a narrow desktop
// window doesn't count. Tablets and phones set to "desktop site" don't say so in their user agent
// (an iPad says it's a Mac), so a touch screen as the main pointer counts too, as does a "Mac" with
// a touch screen.
export const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.matchMedia("(pointer: coarse)").matches ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// The phone layout: narrower than Tailwind's md breakpoint (48rem), with the top and bottom bars
// and no sidebar. This is about the window, on any device.
export const PHONE_WIDTH_QUERY = "(max-width: 47.99rem)";
export const isPhoneWidth = () => window.matchMedia(PHONE_WIDTH_QUERY).matches;
