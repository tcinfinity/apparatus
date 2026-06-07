"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  durationMs: number;
  running: boolean;
  onExpire: () => void;
  resetKey: string | number;
}

export default function TimerBar({ durationMs, running, onExpire, resetKey }: Props) {
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
  }, [resetKey]);

  function handleComplete() {
    if (!expiredRef.current && running) {
      expiredRef.current = true;
      onExpire();
    }
  }

  return (
    <div className="fixed left-0 top-12 z-50 h-1 w-full bg-border">
      <motion.div
        key={resetKey}
        className="h-full origin-left bg-accent"
        initial={{ scaleX: 1 }}
        animate={running ? { scaleX: 0 } : { scaleX: 1 }}
        transition={running ? { duration: durationMs / 1000, ease: "linear" } : { duration: 0 }}
        onAnimationComplete={handleComplete}
      />
    </div>
  );
}
