import { describe, expect, it } from "vitest";
import { collectionCover, titlesIn } from "./collectionCover";
import { makeMovie, makeShow } from "../test/factories";

describe("collection covers", () => {
  const jaws = makeMovie({ title: "Jaws", year: 1975, posterPath: "/jaws.jpg", collections: ["Spielberg"] });
  const et = makeMovie({ title: "E.T.", year: 1982, posterPath: "/et.jpg", collections: ["Spielberg"] });
  const show = makeShow({ title: "Amazing Stories", year: 1985, posterPath: "/amazing.jpg", collections: ["Spielberg", "Anthology"] });

  it("uses the chosen cover, or the earliest movie's poster, or a show's", () => {
    expect(collectionCover({ name: "Spielberg", imageUrl: "/chosen.jpg" }, [et, jaws], [show])).toBe("/chosen.jpg");
    expect(collectionCover({ name: "Spielberg", imageUrl: null }, [et, jaws], [show])).toBe("/jaws.jpg");
    expect(collectionCover({ name: "Anthology" }, [et, jaws], [show])).toBe("/amazing.jpg");
    expect(collectionCover({ name: "Empty" }, [et, jaws], [show])).toBeUndefined();
  });

  it("finds the titles in a collection", () => {
    expect(titlesIn("Spielberg", [jaws, et, show])).toHaveLength(3);
  });
});
