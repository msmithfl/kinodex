// A Clerk picture (the user's avatar) at the size it's drawn, from Clerk's image server (its
// width, height and fit options), as Clerk's own components do. The full-size picture shrunk by
// the browser to a few dozen pixels turns fine detail into noise. Any other address is left as
// it is. pixelRatio: the screen's (window.devicePixelRatio), for a sharp picture on high-density
// screens; capped at 3.
export function sizedImageUrl(src: string, size: number, pixelRatio = 1) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "img.clerk.com") return src;
  const pixels = String(Math.round(size * Math.min(Math.max(pixelRatio || 1, 1), 3)));
  url.searchParams.set("width", pixels);
  url.searchParams.set("height", pixels);
  url.searchParams.set("fit", "crop");
  return url.toString();
}
