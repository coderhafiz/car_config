"use client";

import { motion } from "framer-motion";

export default function Loader({ progress = 0 }: { progress?: number }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-dark transition-colors duration-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex flex-col items-center"
      >
        <div className="relative w-24 h-24">
          {/* Animated rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-4 border-brand-secondary/20 border-t-brand-secondary rounded-full"
          />
          {/* Center logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-brand-primary font-black text-lg">K</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <h2 className="text-sm font-bold tracking-[0.25em] text-text-main uppercase">
            Khaz Customs
          </h2>
          <div className="mt-4 w-48 h-1 bg-(--glass-border) rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-linear-to-r from-brand-primary to-brand-secondary"
            />
          </div>
          <p className="mt-2 text-xs text-text-muted font-medium uppercase tracking-[0.2em]">
            {Math.round(progress)}% Complete
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
