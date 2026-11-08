import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { setThemeChoice, useThemeChoice, type ThemeChoice } from "../utils/theme";
import { useSettings } from "../settings/useSettings";
import type { UserSettings } from "../settings/settings";
import MoviePresetSettings from "../features/movies/MoviePresetSettings";
import { Alert } from "@/components/ui/alert";
import PageHeader from "../components/PageHeader";
import PageShell from "../components/PageShell";

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
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function Settings() {
  const { settings, loaded, updateSettings } = useSettings();
  const [saveError, setSaveError] = useState("");
  const themeChoice = useThemeChoice();

  const update = async (changes: Partial<UserSettings>) => {
    setSaveError("");
    const saved = await updateSettings(changes);
    if (!saved) {
      setSaveError("Couldn't save that change. Check your connection and try again.");
    }
  };

  return (
    <PageShell layout="scroll">
      <div className="max-w-3xl px-4 pt-4 pb-8 md:px-20 md:pt-7">
        <PageHeader
          title="Settings"
          subtitle="Saved to your account, so they apply on every device you sign in on (except the theme)."
          className="mb-6"
        />

        {saveError && (
          <Alert variant="destructive" className="mb-4">
            {saveError}
          </Alert>
        )}

        <section className="rounded-xl border border-border bg-card px-5 py-2">
          <h2 className="pt-3 pb-1 text-base font-semibold">Appearance</h2>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                System follows your device's light or dark setting. Remembered on this device.
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={themeChoice}
              onValueChange={(next) => next && setThemeChoice(next as ThemeChoice)}
              aria-label="Theme"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value} className="px-3">
                  <Icon />
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card px-5 py-2">
          <h2 className="pt-3 pb-1 text-base font-semibold">Collections</h2>
          <ToggleRow
            label="Show completion on collection posters"
            description="The progress ring on the Collections page for collections with a checklist."
            checked={settings.showCollectionCompletion}
            disabled={!loaded}
            onChange={(checked) => update({ showCollectionCompletion: checked })}
          />
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card px-5 py-2">
          <h2 className="pt-3 pb-1 text-base font-semibold">Add movie presets</h2>
          <MoviePresetSettings onError={setSaveError} />
        </section>
      </div>
    </PageShell>
  );
}

export default Settings;
