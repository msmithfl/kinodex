import { describe, expect, it } from "vitest";
import { sizedImageUrl } from "./clerkImage";

describe("sizedImageUrl", () => {
  const avatar = "https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ";

  it("asks Clerk for the picture at the size it's drawn, times the screen's pixel ratio", () => {
    const url = new URL(sizedImageUrl(avatar, 56, 2));
    expect(url.searchParams.get("width")).toBe("112");
    expect(url.searchParams.get("height")).toBe("112");
    expect(url.searchParams.get("fit")).toBe("crop");
  });

  it("keeps the pixel ratio between 1 and 3", () => {
    expect(new URL(sizedImageUrl(avatar, 40, 0.5)).searchParams.get("width")).toBe("40");
    expect(new URL(sizedImageUrl(avatar, 40, 4)).searchParams.get("width")).toBe("120");
  });

  it("leaves other addresses alone", () => {
    const other = "https://example.com/me.png?sig=abc";
    expect(sizedImageUrl(other, 56, 2)).toBe(other);
    expect(sizedImageUrl("not a url", 56)).toBe("not a url");
  });
});
