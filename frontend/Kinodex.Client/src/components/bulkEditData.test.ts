import { describe, expect, it } from "vitest";
import { EMPTY_BULK_EDIT, editCollections } from "./bulkEditData";

describe("bulk editing collections", () => {
  it("adds and removes collections, keeping the rest", () => {
    const edit = { ...EMPTY_BULK_EDIT, addCollections: ["Christmas", "Action"], removeCollections: ["Favourites"] };
    expect(editCollections(["Action", "Favourites", "1980s"], edit)).toEqual(["Action", "1980s", "Christmas"]);
  });

  it("leaves them alone when nothing is picked", () => {
    expect(editCollections(["Action"], EMPTY_BULK_EDIT)).toEqual(["Action"]);
  });
});
