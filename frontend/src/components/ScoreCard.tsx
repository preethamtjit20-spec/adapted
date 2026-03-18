import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScoreCardProps {
  score: number;
  label?: string;
  size?: 'sm' | 'lg';
  delay?: number;
}

function getScoreColor(score: number) {
  if (score <= 30) return { ring: '#ef4444', text: 'text-red-400', bg: 'from-red-500/10 to-red-500/5', label: 'Critical' };
  if (score <= 60) return { ring: '#f97316', text: 'text-orange-400', bg: 'from-orange-500/10 to-orange-500/5', label: 'Needs Work' };
  if (score <= 80) return { ring: '#eab308', text: 'text-yellow-400', bg: 'from-yellow-500/10 to-yellow-500/5', label: 'Fair' };
  return { ring: '#22c55e', text: 'text-green-400', bg: 'from-green-500/10 to-green-500/5', label: 'Good' };
}

export default function ScoreCard({ score, label, size = 'lg', delay = 0 }: ScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const colors = getScoreColor(score);
  const isLarge = size === 'lg';
  const radius = isLarge ? 45 : 35;
  const circumference = 2 * Math.PI * radius;
  const svgSize = isLarge ? 140 : 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      let frame = 0;
      const totalFrames = 60;
      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * score));
        if (frame >= totalFrames) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [score, delay]);

  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 200, damping: 20 }}
      className={`flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-gradient-to-b ${colors.bg} p-6`}
    >
      {label && (
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      )}

      <div className="relative">
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={isLarge ? 8 : 6}
          />
          {/* Score ring */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={isLarge ? 8 : 6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono ${isLarge ? 'text-3xl' : 'text-2xl'} font-bold ${colors.text}`}>
            {displayScore}
          </span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>
      </div>

      <span className={`text-xs font-medium ${colors.text}`}>
        {colors.label}
      </span>
    </motion.div>
  );
}
