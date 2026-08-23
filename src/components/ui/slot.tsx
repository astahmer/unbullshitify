import * as React from "react";

/**
 * Minimal Radix-free Slot: merges className onto the single child element.
 * Enough for shadcn's asChild pattern without pulling in a dependency.
 */
export const Slot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }
>(({ children, className, ...props }, ref) => {
  if (!React.isValidElement(children)) return null;
  const child = children as React.ReactElement<Record<string, unknown>>;
  return React.cloneElement(child, {
    ...props,
    ...child.props,
    className: [className, child.props.className].filter(Boolean).join(" "),
    ref,
  } as never);
});
Slot.displayName = "Slot";
