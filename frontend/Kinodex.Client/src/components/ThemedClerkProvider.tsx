import { useMemo, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { clerkAppearance } from "../utils/clerkAppearance";
import { useTheme } from "../utils/theme";

// Clerk, with its colours re-read from the tokens whenever the theme changes
function ThemedClerkProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  const theme = useTheme();
  const appearance = useMemo(() => clerkAppearance(theme), [theme]);
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={appearance}
      afterSignOutUrl="/"
      signUpForceRedirectUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}

export default ThemedClerkProvider;
