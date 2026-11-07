import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

// Underlined tabs, as in the redesign's Add Movie modal
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("inline-flex w-full items-center gap-5 border-b border-border text-muted-foreground", className)}
      {...props}
    />
  );
}

// Radix focuses a tab from code when it's pressed, which browsers then treat as keyboard focus, so
// the ring would show after every click or tap. A pressed tab is marked until it loses focus, and
// only unmarked (keyboard-focused) tabs show the ring.
function TabsTrigger({ className, onPointerDown, onBlur, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      onPointerDown={(e) => {
        e.currentTarget.dataset.pointerFocus = "";
        onPointerDown?.(e);
      }}
      onBlur={(e) => {
        delete e.currentTarget.dataset.pointerFocus;
        onBlur?.(e);
      }}
      className={cn(
        "-mb-px inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 border-b-2 border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:not-data-[pointer-focus]:ring-[3px] focus-visible:not-data-[pointer-focus]:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
