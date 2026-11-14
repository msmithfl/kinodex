import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// How long the "what's missing" tooltip stays up after a press
const HINT_MS = 1500;

interface PickerButtonProps {
  // What the picker needs and doesn't have yet (e.g. "Requires TMDB ID"), or null when it's ready
  missing: string | null;
  onClick: () => void;
  busy: boolean; // Loading: disabled for real
  expanded: boolean; // Its grid is open
  children: React.ReactNode;
}

// The Images tab's picker buttons ("Choose a different poster", "Find product images"). Always
// there; without what it needs it looks disabled, and pressing it says what's missing in a
// tooltip for a moment. (A truly disabled button can't be pressed, so it couldn't say why.)
export function PickerButton({ missing, onClick, busy, expanded, children }: PickerButtonProps) {
  const [showHint, setShowHint] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleClick = () => {
    if (!missing) {
      onClick();
      return;
    }
    setShowHint(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShowHint(false), HINT_MS);
  };

  return (
    // Only shown by a press, not on hover
    <Tooltip open={showHint && !!missing}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={busy}
          aria-disabled={missing ? true : undefined}
          aria-expanded={expanded}
          className={cn(missing && "cursor-not-allowed opacity-50 hover:bg-card")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{missing}</TooltipContent>
    </Tooltip>
  );
}
