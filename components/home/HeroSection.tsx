"use client";

import { motion } from "framer-motion";
import Logo from "@/components/layout/Logo";

export default function HeroSection() {
  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <Logo size="lg" />
        <p className="max-w-md text-center text-sm text-text-muted">
          Interactive scientific simulations for physics, chemistry, and quantum
          mechanics
        </p>
      </motion.div>
    </div>
  );
}
