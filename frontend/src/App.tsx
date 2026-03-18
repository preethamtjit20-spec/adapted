import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Hero from './components/Hero';
import UploadZone from './components/UploadZone';
import AnalysisLoader from './components/AnalysisLoader';
import ScoreCard from './components/ScoreCard';
import FindingsPanel from './components/FindingsPanel';
import VideoPlayer from './components/VideoPlayer';
import RemediationPanel from './components/RemediationPanel';
import ReportSection from './components/ReportSection';

type Step = 'upload' | 'analyze' | 'results' | 'remediate' | 'report';

interface Finding {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  type: string;
  description: string;
  wcag_criterion: string;
  timestamp_range?: string;
  recommendation: string;
}

function App() {
  const [step, setStep] = useState<Step>('upload');
  const [videoId, setVideoId] = useState('');
  const [_filename, setFilename] = useState('');
  const [score, setScore] = useState(0);
  const [scoreAfter, setScoreAfter] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState('');
  const [actionsApplied, setActionsApplied] = useState<string[]>([]);

  const stepIndex = ['upload', 'analyze', 'results', 'remediate', 'report'].indexOf(step);

  const handleUploadComplete = useCallback((id: string, fname: string) => {
    setVideoId(id);
    setFilename(fname);
    setStep('analyze');
  }, []);

  const handleAnalysisComplete = useCallback(
    (data: { score: number; findings: Finding[]; summary: string }) => {
      setScore(data.score);
      setFindings(data.findings);
      setSummary(data.summary);
      setStep('results');
    },
    []
  );

  const handleRemediationComplete = useCallback(
    (data: { score_after: number; actions_applied: string[] }) => {
      setScoreAfter(data.score_after);
      setActionsApplied(data.actions_applied);
      setStep('report');
    },
    []
  );

  const handleReset = useCallback(() => {
    setStep('upload');
    setVideoId('');
    setFilename('');
    setScore(0);
    setScoreAfter(0);
    setFindings([]);
    setSummary('');
    setActionsApplied([]);
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Background gradient effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-teal-500/4 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-40 w-80 rounded-full bg-teal-500/3 blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10">
        <Header currentStep={stepIndex >= 0 ? stepIndex : 0} />

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Hero />
              <UploadZone onUploadComplete={handleUploadComplete} />
            </motion.div>
          )}

          {/* STEP 2: Analysis */}
          {step === 'analyze' && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnalysisLoader
                videoId={videoId}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </motion.div>
          )}

          {/* STEP 3: Results */}
          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-6xl px-6 py-8"
            >
              {/* Summary header */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 text-center"
              >
                <h2 className="mb-2 text-2xl font-bold text-white">
                  Analysis Complete
                </h2>
                <p className="text-slate-400">{summary}</p>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left column: Score + Video */}
                <div className="space-y-6 lg:col-span-5">
                  <ScoreCard score={score} label="Accessibility Score" size="lg" delay={200} />
                  <VideoPlayer videoId={videoId} hasRemediated={false} />
                </div>

                {/* Right column: Findings */}
                <div className="lg:col-span-7">
                  <FindingsPanel findings={findings} />
                </div>
              </div>

              {/* Proceed button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
              >
                <button
                  onClick={() => setStep('remediate')}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-500 hover:shadow-teal-600/30"
                >
                  Fix These Issues with AI
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: Remediation */}
          {step === 'remediate' && (
            <motion.div
              key="remediate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-6xl px-6 py-8"
            >
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 text-center"
              >
                <h2 className="mb-2 text-2xl font-bold text-white">
                  AI-Powered Remediation
                </h2>
                <p className="text-slate-400">
                  Select the accessibility fixes you want to apply
                </p>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left: Video + Current Score */}
                <div className="space-y-6 lg:col-span-5">
                  <ScoreCard score={score} label="Current Score" size="lg" delay={100} />
                  <VideoPlayer videoId={videoId} hasRemediated={false} />
                </div>

                {/* Right: Remediation options */}
                <div className="lg:col-span-7">
                  <RemediationPanel
                    videoId={videoId}
                    currentScore={score}
                    onRemediationComplete={handleRemediationComplete}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Report */}
          {step === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ReportSection
                videoId={videoId}
                scoreBefore={score}
                scoreAfter={scoreAfter}
                actionsApplied={actionsApplied}
                findings={findings}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
