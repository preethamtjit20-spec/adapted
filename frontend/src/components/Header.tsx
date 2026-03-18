import { motion } from 'framer-motion';
import { Upload, Search, Wrench, FileText, CheckCircle } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
}

const steps = [
  { label: 'Upload', icon: Upload },
  { label: 'Analyze', icon: Search },
  { label: 'Fix', icon: Wrench },
  { label: 'Report', icon: FileText },
];

export default function Header({ currentStep }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-slate-800/50 bg-gray-950/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
            <span className="text-sm font-bold text-white">AE</span>
          </div>
          <span className="text-xl font-bold text-teal-400">
            AdaptEd
          </span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            return (
              <div key={step.label} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25'
                      : isCompleted
                      ? 'text-green-400'
                      : 'text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-px w-6 transition-colors duration-300 ${
                      isCompleted ? 'bg-green-400/50' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Badge */}
        <div className="hidden items-center gap-1.5 rounded-full bg-slate-800/50 px-3 py-1.5 text-[10px] text-slate-400 ring-1 ring-slate-700/50 md:flex">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          Powered by DigitalOcean Gradient
        </div>
      </div>
    </motion.header>
  );
}
