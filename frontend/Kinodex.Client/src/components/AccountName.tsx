import { useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { useSettings } from "../settings/useSettings";
import { collectingSinceYear } from "../settings/settings";

// The signed-in user's name with "Collecting since" a year under it: the year chosen in Settings,
// or else the year they signed up. Beside the account badge in the phone top bar on the dashboard,
// and on the dashboard itself from tablet up.
function AccountName({ className }: { className?: string }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { settings, loaded: settingsLoaded } = useSettings();
  // Only once both have loaded, so it doesn't show the sign-up year and then change
  const year = userLoaded && settingsLoaded ? collectingSinceYear(settings, user?.createdAt) : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-lg leading-tight font-semibold tracking-tight">
        {user?.username || user?.firstName || "Welcome"}
      </p>
      {/* Its line is kept (invisible) until it's known, so nothing moves when it appears */}
      <p className={cn("truncate text-xs text-muted-foreground md:text-sm", !year && "invisible")}>
        Collecting since {year ?? new Date().getFullYear()}
      </p>
    </div>
  );
}

export default AccountName;
