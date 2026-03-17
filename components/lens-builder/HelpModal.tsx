"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return latex;
  }
}

function renderInlineLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
  } catch {
    return latex;
  }
}

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface StepContent {
  title: string;
  description: string;
  equations?: string[]; // display-mode LaTeX
  detail: string;
}

const steps: StepContent[] = [
  {
    title: "1. Add a Lens",
    description:
      'Click one of the lens type buttons below the canvas (e.g. "Biconvex") to place a lens on the optical axis. The lens appears as a proper optical symbol at the center of the canvas.',
    detail:
      "Biconvex and plano-convex lenses are converging (positive focal length). Biconcave and plano-concave are diverging (negative focal length).",
  },
  {
    title: "2. Add an Object",
    description:
      'Click "Add Object" to place a coloured arrow on the axis. This represents the object whose image you want to find.',
    detail:
      "Place the object to the left of the lens. Each object gets a unique colour so you can track its rays.",
  },
  {
    title: "3. Observe the Rays",
    description:
      "Three principal rays are automatically traced from the object tip through the lens:",
    detail:
      "Ray 1: Parallel to axis \u2192 refracts through far focal point.\nRay 2: Through optical centre \u2192 passes straight.\nRay 3: Through near focal point \u2192 exits parallel.\n\nWhere these rays converge is the image position.",
    equations: [
      "\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}",
    ],
  },
  {
    title: "4. Drag to Explore",
    description:
      "Click and drag objects or lenses along the axis to see how the image changes in real time. The image properties panel shows magnification and type.",
    equations: [
      "m = \\frac{v}{u}",
    ],
    detail:
      "Move the object closer to the focal point to see the image grow larger. Place it between the focal point and lens to see a virtual image (shown with dashed rays).",
  },
  {
    title: "5. Advanced: Thick Lens Mode",
    description:
      'Select a lens, check "Allow different curvature" to set R\u2081 and R\u2082 independently. Then enable "Thick lens mode" to account for lens thickness using the lensmaker\'s equation.',
    equations: [
      "\\frac{1}{f} = (n-1)\\left[\\frac{1}{R_1} - \\frac{1}{R_2} + \\frac{(n-1)d}{n \\cdot R_1 \\cdot R_2}\\right]",
    ],
    detail:
      "Adjust the refractive index (n) and thickness (d) to see how they affect the focal length.",
  },
];

export default function HelpModal({ open, onClose }: HelpModalProps) {
  const [step, setStep] = useState(0);

  const goNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const current = steps[step];

  return (
    <Modal open={open} onClose={onClose}>
      <div className="min-h-[320px]">
        <h2 className="mb-6 text-lg font-semibold text-foreground">
          How to Build a Ray Diagram
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="mb-2 text-sm font-semibold text-accent">
              {current.title}
            </h3>
            <p className="mb-3 text-sm text-foreground/90">
              {current.description}
            </p>

            {current.equations && current.equations.length > 0 && (
              <div className="mb-3 space-y-2">
                {current.equations.map((eq, i) => (
                  <div
                    key={i}
                    className="overflow-x-auto rounded-md bg-background px-4 py-3 text-center"
                    dangerouslySetInnerHTML={{ __html: renderLatex(eq) }}
                  />
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap rounded-md bg-background p-3 text-xs text-text-muted">
              {current.detail}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step indicators */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-border hover:bg-border-hover"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={goPrev}
              variant="ghost"
              size="sm"
              disabled={step === 0}
            >
              Previous
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={goNext} variant="primary" size="sm">
                Next
              </Button>
            ) : (
              <Button onClick={onClose} variant="primary" size="sm">
                Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
