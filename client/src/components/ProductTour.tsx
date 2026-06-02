import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
}

interface HlRect { top: number; left: number; width: number; height: number; }
interface TipPos { top: number; left: number; }

interface ProductTourProps {
  open: boolean;
  onClose: () => void;
  steps: TourStep[];
}

const TIP_W = 320;
const MARGIN = 14;

export function ProductTour({ open, onClose, steps }: ProductTourProps) {
  const [step, setStep] = useState(0);
  const [hlRect, setHlRect] = useState<HlRect | null>(null);
  const [tipPos, setTipPos] = useState<TipPos>({ top: -9999, left: -9999 });
  const [tipSide, setTipSide] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const [visible, setVisible] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  const current = steps[step];

  const positionTip = useCallback(() => {
    const el = document.querySelector(current?.target ?? "");
    if (!el) {
      setHlRect(null);
      setTipPos({ top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - TIP_W / 2 });
      setTipSide("bottom");
      setVisible(true);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    timerRef.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      setHlRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });

      const tipH = tipRef.current?.offsetHeight ?? 180;
      const preferred = current.side;
      const auto = (() => {
        if (r.bottom + tipH + MARGIN < window.innerHeight) return "bottom";
        if (r.top - tipH - MARGIN > 0) return "top";
        if (r.right + TIP_W + MARGIN < window.innerWidth) return "right";
        return "left";
      })();
      const side = preferred ?? auto;

      let top = 0, left = 0;
      if (side === "bottom")      { top = r.bottom + MARGIN; left = r.left + r.width / 2 - TIP_W / 2; }
      else if (side === "top")    { top = r.top - tipH - MARGIN; left = r.left + r.width / 2 - TIP_W / 2; }
      else if (side === "right")  { top = r.top + r.height / 2 - tipH / 2; left = r.right + MARGIN; }
      else                        { top = r.top + r.height / 2 - tipH / 2; left = r.left - TIP_W - MARGIN; }

      left = Math.max(12, Math.min(left, window.innerWidth - TIP_W - 12));
      top  = Math.max(12, Math.min(top, window.innerHeight - tipH - 12));

      setTipSide(side);
      setTipPos({ top, left });
      setVisible(true);
    }, 150);
  }, [current]);

  useEffect(() => {
    if (!open) { setStep(0); setVisible(false); return; }
    setVisible(false);
    positionTip();
    return () => clearTimeout(timerRef.current);
  }, [open, step, positionTip]);

  function next() {
    if (step < steps.length - 1) { setVisible(false); setStep(s => s + 1); }
    else onClose();
  }

  if (!open) return null;

  const arrowBase = "absolute w-3 h-3 bg-card rotate-45 border-border";
  const arrowPos = {
    bottom: "top-[-7px] left-1/2 -translate-x-1/2 border-l border-t",
    top:    "bottom-[-7px] left-1/2 -translate-x-1/2 border-r border-b",
    right:  "left-[-7px] top-1/2 -translate-y-1/2 border-l border-b",
    left:   "right-[-7px] top-1/2 -translate-y-1/2 border-r border-t",
  }[tipSide];

  return (
    <>
      {/* Backdrop with spotlight cut-out */}
      <div className="fixed inset-0 z-[9990] cursor-pointer" onClick={onClose}>
        {hlRect ? (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={hlRect.left} y={hlRect.top} width={hlRect.width} height={hlRect.height} rx="8" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#tour-mask)" />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-black/45" />
        )}
      </div>

      {/* Highlight ring around target */}
      {hlRect && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{ top: hlRect.top, left: hlRect.left, width: hlRect.width, height: hlRect.height }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tipRef}
        className={cn(
          "fixed z-[9995] bg-card border border-border rounded-xl shadow-2xl transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ width: TIP_W, top: tipPos.top, left: tipPos.left }}
        onClick={e => e.stopPropagation()}
      >
        {/* Arrow */}
        <div className={cn(arrowBase, arrowPos)} />

        <div className="p-4">
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                Step {step + 1} of {steps.length}
              </span>
              <p className="font-heading font-semibold text-[15px] text-foreground mt-0.5 leading-snug">
                {current.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-2 mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            {current.content}
          </p>

          <div className="flex items-center justify-between">
            {/* Step progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === step ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {step < steps.length - 1 ? "Next" : "Done"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
