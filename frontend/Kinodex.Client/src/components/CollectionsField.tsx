import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipSelect } from "./ChipSelect";
import { FormField } from "./FormFields";
import { useCollections, useCreateCollection } from "../features/collections/api";

interface CollectionsFieldProps {
  // The collections the movie or show is in, by name
  values: string[];
  onChange: (collections: string[]) => void;
  // Bulk edit's "Add to collections" names it differently
  label?: string;
  className?: string;
}

// The movie and TV forms' Collections: pick existing ones, or add a new one with + (which also puts
// the title in it). Bulk edit uses it for the collections to add the chosen movies to.
function CollectionsField({ values, onChange, label = "Collections", className }: CollectionsFieldProps) {
  const { data: collections = [] } = useCollections();
  const createCollection = useCreateCollection();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const names = collections.map((c) => c.name).sort((a, b) => a.localeCompare(b));

  const addCollection = async () => {
    const name = newName.trim();
    if (!name || names.includes(name)) return;
    try {
      await createCollection.mutateAsync({ name, isDirectorCollection: false, imageUrl: null, backdropUrl: null });
      onChange([...values, name]);
      setNewName("");
      setAdding(false);
    } catch (error) {
      console.error("Error adding collection:", error);
    }
  };

  return (
    <FormField label={label} className={className}>
      <div className="flex flex-wrap gap-2">
        <ChipSelect
          placeholder="Add to a collection"
          values={values}
          options={names.map((value) => ({ value }))}
          onChange={onChange}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setAdding(!adding)}
          aria-label={adding ? "Cancel new collection" : "New collection"}
        >
          {adding ? <Minus /> : <Plus />}
        </Button>
        {adding && (
          <div className="flex basis-full gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New collection name"
              aria-label="New collection name"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addCollection}>
              Add
            </Button>
          </div>
        )}
      </div>
    </FormField>
  );
}

export default CollectionsField;
