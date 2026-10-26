import { useState } from "react";
import { useSettings } from "../settings/useSettings";
import type { UserSettings } from "../settings/settings";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

// A setting with an on/off switch
function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-indigo-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Settings() {
  const { settings, loaded, updateSettings } = useSettings();
  const [saveError, setSaveError] = useState("");

  const update = async (changes: Partial<UserSettings>) => {
    setSaveError("");
    const saved = await updateSettings(changes);
    if (!saved) {
      setSaveError("Couldn't save that change. Check your connection and try again.");
    }
  };

  return (
    <div className="px-4 md:px-20 pt-4 md:pt-6 pb-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-6">
        Saved to your account, so they apply on every device you sign in on.
      </p>

      {saveError && (
        <p className="mb-4 bg-red-600/20 border border-red-600 text-red-300 text-sm rounded-md px-4 py-2">
          {saveError}
        </p>
      )}

      <section className="bg-gray-800 rounded-lg px-5 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-3 pb-1">
          Collections
        </h2>
        <ToggleRow
          label="Show completion on collection posters"
          description="The progress ring on the Collections page for collections with a checklist."
          checked={settings.showCollectionCompletion}
          disabled={!loaded}
          onChange={(checked) => update({ showCollectionCompletion: checked })}
        />
      </section>
    </div>
  );
}

export default Settings;
