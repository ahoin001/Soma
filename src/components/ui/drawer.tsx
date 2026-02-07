import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

const Drawer = ({
  shouldScaleBackground = false,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const prevOpenRef = React.useRef<boolean>(Boolean(open));

  React.useEffect(() => {
    if (open === undefined) return;
    if (open && !prevOpenRef.current) {
      lockScroll();
    } else if (!open && prevOpenRef.current) {
      unlockScroll();
    }
    prevOpenRef.current = Boolean(open);
    return () => {
      if (prevOpenRef.current) {
        unlockScroll();
        prevOpenRef.current = false;
      }
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    onOpenChange?.(nextOpen);
    if (nextOpen && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - scrollY) > 2) {
          window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
        }
      });
    }
  };

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      shouldScaleBackground={shouldScaleBackground}
      noBodyStyles
      {...props}
    />
  );
};
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = ({
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) => (
  <DrawerPrimitive.Portal
    {...props}
    container={typeof document !== "undefined" ? document.body : undefined}
  >
    {children}
  </DrawerPrimitive.Portal>
);

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in",
        className,
      )}
      {...props}
    />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref],
  );

  React.useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    const enabled = window.localStorage.getItem("aurafit-sheet-debug") === "true";
    if (!enabled) return;
    const log = (label: string) => {
      const rect = contentRef.current?.getBoundingClientRect();
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);
      console.info("[AuraFit][Sheet][Drawer]", {
        label,
        scrollY: window.scrollY,
        scrollingElementTop: document.scrollingElement?.scrollTop ?? null,
        innerHeight: window.innerHeight,
        visualViewport: window.visualViewport?.height,
        rectTop: rect?.top ?? null,
        rectBottom: rect?.bottom ?? null,
        rectHeight: rect?.height ?? null,
        bodyPosition: bodyStyle.position,
        bodyTop: bodyStyle.top,
        bodyTransform: bodyStyle.transform,
        htmlTransform: htmlStyle.transform,
        parentTag: contentRef.current?.parentElement?.tagName ?? null,
        inBody: Boolean(contentRef.current?.closest("body")),
      });
    };
    log("mount");
    const onScroll = () => log("scroll");
    const onResize = () => log("resize");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      log("unmount");
    };
  }, []);

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={setRefs}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[60] flex max-h-[100svh] flex-col rounded-t-[10px] border bg-background transition-[transform,opacity] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in touch-pan-y overscroll-contain",
          className,
        )}
        style={{ position: "fixed", left: 0, right: 0, bottom: 0 }}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
