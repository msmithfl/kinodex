import { createContext } from "react";

// Mirrors the API's UserSettings (one row per user). Add a setting here, in DEFAULT_SETTINGS,
// and on the backend model.
export interface UserSettings {
  showCollectionCompletion: boolean;
}

// Used until the user's settings load, and for anyone who has never saved any
export const DEFAULT_SETTINGS: UserSettings = {
  showCollectionCompletion: true,
};

export interface SettingsContextValue {
  settings: UserSettings;
  loaded: boolean;
  // Applies the change straight away and saves it; resolves false (and undoes it) if saving fails
  updateSettings: (changes: Partial<UserSettings>) => Promise<boolean>;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  updateSettings: async () => false,
});
