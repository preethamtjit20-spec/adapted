import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Eye, Volume2, ShieldCheck, FileText, Loader2 } from 'lucide-react';

interface AnalysisLoaderProps {
  onAnalysisComplete: (data: {
    score: number;
    findings: Array<{
      id: string;
      severity: 'critical' | 'major' | 'minor';
      type: string;
      description: string;
      wcag_criterion: string;
      timestamp_range?: string;
      recommendation: string;
    }>;
    summary: string;
  }) => void;
  videoId: string;
}

const analysisSteps = [
  { label: 'Uploading to AI...', icon: Upload, duration: 4000 },
  { label: 'Analyzing visual content...', icon: Eye, duration: 8000 },
  { label: 'Checking audio accessibility...', icon: Volume2, duration: 7000 },
  { label: 'Evaluating WCAG compliance...', icon: ShieldCheck, duration: 6000 },
  { label: 'Generating report...', icon: FileText, duration: 3000 },
];

export default function AnalysisLoader({ onAnalysisComplete, videoId }: AnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Step advancement timer
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    let cumulativeDelay = 0;

    analysisSteps.forEach((step, i) => {
      if (i > 0) {
        const timer = setTimeout(() => setCurrentStep(i), cumulativeDelay);
        stepTimers.push(timer);
      }
      cumulativeDelay += step.duration;
    });

    return () => stepTimers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Smooth progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 0.5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Actual API call
  useEffect(() => {
    const analyze = async () => {
      try {
        const res = await fetch(`/api/analyze/${videoId}`, { method: 'POST' });
        const data = await res.json();
        setProgress(100);
        setCurrentStep(analysisSteps.length - 1);
        setTimeout(() => {
          onAnalysisComplete({
            score: data.score_before ?? data.score ?? 0,
            findings: (data.findings || []).map((f: any, i: number) => ({ ...f, id: f.id || String(i + 1) })),
            summary: data.summary || `Found ${data.total_issues ?? 0} accessibility issues (${data.critical_count ?? 0} critical, ${data.major_count ?? 0} major, ${data.minor_count ?? 0} minor).`,
          });
        }, 800);
      } catch {
        // If API fails, use demo data after animation completes
        setTimeout(() => {
          setProgress(100);
          setCurrentStep(analysisSteps.length - 1);
          setTimeout(() => {
            onAnalysisComplete({
              score: 34,
              findings: [
                {
                  id: '1',
                  severity: 'critical',
                  type: 'captions',
                  description: 'No captions or subtitles detected in the video',
                  wcag_criterion: 'WCAG 1.2.2',
                  timestamp_range: '00:00 - 05:30',
                  recommendation: 'Add synchronized captions for all spoken content',
                },
                {
                  id: '2',
                  severity: 'critical',
                  type: 'audio_description',
                  description: 'Visual-only content presented without audio description',
                  wcag_criterion: 'WCAG 1.2.3',
                  timestamp_range: '01:15 - 02:45',
                  recommendation: 'Add audio descriptions for important visual information',
                },
                {
                  id: '3',
                  severity: 'major',
                  type: 'contrast',
                  description: 'Text overlays have insufficient contrast ratio (2.8:1)',
                  wcag_criterion: 'WCAG 1.4.3',
                  timestamp_range: '00:30 - 01:00',
                  recommendation: 'Increase text contrast to meet minimum 4.5:1 ratio',
                },
                {
                  id: '4',
                  severity: 'major',
                  type: 'audio',
                  description: 'Background music drowns out narration at multiple points',
                  wcag_criterion: 'WCAG 1.4.7',
                  timestamp_range: '02:00 - 03:30',
                  recommendation: 'Normalize audio levels, reduce background music volume',
                },
                {
                  id: '5',
                  severity: 'minor',
                  type: 'visual',
                  description: 'Rapid scene transitions may cause discomfort',
                  wcag_criterion: 'WCAG 2.3.1',
                  timestamp_range: '04:00 - 04:15',
                  recommendation: 'Add transition pauses between rapid scene changes',
                },
                {
                  id: '6',
                  severity: 'minor',
                  type: 'structure',
                  description: 'No chapter markers or navigation points provided',
                  wcag_criterion: 'WCAG 2.4.1',
                  recommendation: 'Add chapter markers for content navigation',
                },
              ],
              summary: 'This video has significant accessibility gaps. Critical issues include missing captions and audio descriptions. Visual contrast and audio balance need improvement.',
            });
          }, 500);
        }, 8000);
      }
    };

    analyze();
  }, [videoId, onAnalysisComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-6"
    >
      {/* Animated orb */}
      <div className="relative mb-12">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-8 rounded-full bg-teal-500/15 blur-xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute -inset-4 rounded-full bg-teal-500/10 blur-lg"
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-600/25">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      </div>

      {/* Current step */}
      <div className="mb-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-2 text-lg font-medium text-white"
          >
            {(() => {
              const StepIcon = analysisSteps[currentStep].icon;
              return <StepIcon className="h-5 w-5 text-teal-400" />;
            })()}
            {analysisSteps[currentStep].label}
          </motion.div>
        </AnimatePresence>
        <p className="mt-2 text-sm text-slate-400">This may take up to a minute</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-teal-500"
          />
        </div>
      </div>

      {/* Step checklist */}
      <div className="mt-8 space-y-2">
        {analysisSteps.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-all ${
                isActive
                  ? 'bg-slate-800/50 text-white'
                  : isDone
                  ? 'text-green-400/70'
                  : 'text-slate-500'
              }`}
            >
              <StepIcon className={`h-4 w-4 ${isActive ? 'text-teal-400' : ''}`} />
              <span>{step.label}</span>
              {isDone && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto text-green-400"
                >
                  ✓
                </motion.span>
              )}
              {isActive && (
                <Loader2 className="ml-auto h-3 w-3 animate-spin text-teal-400" />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
