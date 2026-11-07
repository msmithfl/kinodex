import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border px-4 py-2 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-foreground",
      destructive: "border-destructive/40 bg-destructive/15 text-red-300",
      success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

// A message banner (an error, a success). Errors are announced to screen readers straight away.
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };
