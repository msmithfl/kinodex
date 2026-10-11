import { useContext } from "react";
import { SettingsContext } from "./settingsContext";

// The signed-in user's settings, plus updateSettings to change them
export const useSettings = () => useContext(SettingsContext);
