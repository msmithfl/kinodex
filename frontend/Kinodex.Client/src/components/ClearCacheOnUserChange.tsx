import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";

// Empties the shared data cache whenever the signed-in user changes (sign out, or another account
// signing in), so nobody briefly sees the previous user's data
function ClearCacheOnUserChange() {
  const { userId, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previous.current !== undefined && previous.current !== userId) queryClient.clear();
    previous.current = userId;
  }, [userId, isLoaded, queryClient]);

  return null;
}

export default ClearCacheOnUserChange;
