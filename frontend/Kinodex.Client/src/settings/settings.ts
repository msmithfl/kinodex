// Mirrors the API's UserSettings (one row per user). Add a setting here, in DEFAULT_SETTINGS,
// and on the backend model.
export interface UserSettings {
  showCollectionCompletion: boolean;
}

// Used until the user's settings load, and for anyone who has never saved any
export const DEFAULT_SETTINGS: UserSettings = {
  showCollectionCompletion: true,
};
