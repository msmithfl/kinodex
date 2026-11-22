// Mirrors the API's UserSettings (one row per user). Add a setting here, in DEFAULT_SETTINGS,
// and on the backend model.
export interface UserSettings {
  showCollectionCompletion: boolean;
  // The year under the user's name on the dashboard; null until chosen (the sign-up year shows)
  collectingSince: number | null;
}

// Used until the user's settings load, and for anyone who has never saved any
export const DEFAULT_SETTINGS: UserSettings = {
  showCollectionCompletion: true,
  collectingSince: null,
};

// The earliest year Collecting since can be set to (the API's UserSettings.EarliestCollectingSince)
export const EARLIEST_COLLECTING_SINCE = 1950;

// "Collecting since" on the dashboard: the year chosen in Settings, or else the year they signed up
export const collectingSinceYear = (settings: UserSettings, signedUpAt?: Date | null) =>
  settings.collectingSince ?? signedUpAt?.getFullYear();
