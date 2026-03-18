import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center px-6 pt-16 pb-8 text-center"
    >
      {/* Badge */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/8 px-4 py-1.5 text-sm text-teal-300"
      >
        <Sparkles className="h-4 w-4" />
        AI-Powered Accessibility Analysis
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-4 text-6xl font-extrabold tracking-tight md:text-7xl"
      >
        <span className="text-teal-400">
          AdaptEd
        </span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8 max-w-lg text-xl text-slate-400"
      >
        Making Education Accessible for{' '}
        <span className="text-white font-medium">Everyone</span>
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex flex-wrap items-center justify-center gap-3 text-sm"
      >
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2">
          <span className="font-mono font-bold text-sky-400">800M+</span>
          <span className="ml-1.5 text-slate-400">people with disabilities</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2">
          <span className="font-mono font-bold text-amber-400">90%</span>
          <span className="ml-1.5 text-slate-400">of videos lack accessibility</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2">
          <span className="font-mono font-bold text-emerald-400">We fix that.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
