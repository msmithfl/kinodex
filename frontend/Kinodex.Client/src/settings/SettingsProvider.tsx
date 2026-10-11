import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  DEFAULT_SETTINGS,
  SettingsContext,
  type UserSettings,
} from "./settingsContext";

// Loads the signed-in user's settings once and shares them with the whole app.
// Settings live on the account (the API), so they follow the user across devices.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5156"}/api/settings`;

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setSettings({ ...DEFAULT_SETTINGS, ...(await response.json()) });
        }
      } catch (error) {
        // Keep the defaults; the app works the same as before settings existed
        console.error("Error loading settings:", error);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const updateSettings = async (changes: Partial<UserSettings>) => {
    const previous = settings;
    const next = { ...settings, ...changes };
    setSettings(next);

    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error(`Saving settings failed (${response.status})`);
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      setSettings(previous);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
