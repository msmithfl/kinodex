// A title's page in the server's Jellyfin web app (its Play button is there; Jellyfin has no link
// that starts playing straight away)
export const jellyfinItemUrl = (serverUrl: string, itemId: string) =>
  `${serverUrl}/web/#/details?id=${encodeURIComponent(itemId)}`;
