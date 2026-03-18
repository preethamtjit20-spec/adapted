import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  CheckCircle,
  ArrowRight,
  Shield,
  Loader2,
  RotateCcw,
  Play,
  Pause,
  Film,
} from 'lucide-react';
import ScoreCard from './ScoreCard';

interface ReportSectionProps {
  videoId: string;
  scoreBefore: number;
  scoreAfter: number;
  actionsApplied: string[];
  findings: Array<{
    id: string;
    severity: string;
    type: string;
    description: string;
    wcag_criterion: string;
  }>;
  onReset: () => void;
}

const wcagChecklist = [
  { criterion: '1.2.2', label: 'Captions (Prerecorded)', key: 'add_captions' },
  { criterion: '1.2.3', label: 'Audio Description', key: 'add_alt_descriptions' },
  { criterion: '1.4.3', label: 'Contrast (Minimum)', key: 'enhance_contrast' },
  { criterion: '1.4.7', label: 'Low or No Background Audio', key: 'normalize_audio' },
  { criterion: '2.3.1', label: 'Three Flashes', key: 'add_pause_points' },
  { criterion: '2.4.1', label: 'Bypass Blocks', key: 'structure' },
];

const actionLabels: Record<string, string> = {
  add_captions: 'AI-Generated Captions + Braille',
  enhance_contrast: 'Visual Contrast Enhancement',
  normalize_audio: 'Audio Normalization',
  add_alt_descriptions: 'Content Descriptions',
  add_pause_points: 'Pause Points',
};

export default function ReportSection({
  videoId,
  scoreBefore,
  scoreAfter,
  actionsApplied,
  findings,
  onReset,
}: ReportSectionProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [activeVideo, setActiveVideo] = useState<'original' | 'remediated'>('remediated');
  const [isPlaying, setIsPlaying] = useState(false);
  const originalRef = useRef<HTMLVideoElement>(null);
  const remediatedRef = useRef<HTMLVideoElement>(null);

  const activeRef = activeVideo === 'remediated' ? remediatedRef : originalRef;

  const togglePlay = () => {
    const video = activeRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/report/${videoId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adapted-report-${videoId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Download failed');
      }
    } catch {
      try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(24);
        doc.setTextColor(13, 148, 136);
        doc.text('AdaptEd Accessibility Report', 20, 30);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 42);
        doc.text(`Video ID: ${videoId}`, 20, 50);
        doc.setDrawColor(200);
        doc.line(20, 56, 190, 56);
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Score Summary', 20, 68);
        doc.setFontSize(12);
        doc.setTextColor(80);
        doc.text(`Before: ${scoreBefore}/100`, 30, 78);
        doc.text(`After: ${scoreAfter}/100`, 30, 86);
        doc.text(`Improvement: +${scoreAfter - scoreBefore} points`, 30, 94);
        let y = 110;
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Findings', 20, y);
        y += 10;
        findings.forEach((f, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.setTextColor(80);
          doc.text(`${i + 1}. [${f.severity.toUpperCase()}] ${f.description}`, 25, y);
          y += 6;
          doc.setTextColor(120);
          doc.text(`   ${f.wcag_criterion}`, 25, y);
          y += 10;
        });
        doc.save(`adapted-report-${videoId}.pdf`);
      } catch {
        alert('Could not generate report.');
      }
    }
    setDownloading(false);
  };

  const handleDownloadVideo = async () => {
    setDownloadingVideo(true);
    try {
      const res = await fetch(`/api/video/${videoId}/remediated`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adapted-${videoId}-accessible.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
    setDownloadingVideo(false);
  };

  const improvementPct = scoreBefore > 0
    ? Math.round(((scoreAfter - scoreBefore) / scoreBefore) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-5xl px-6 py-10"
    >
      {/* Success banner */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-center"
      >
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">Remediation Complete</h2>
        <p className="mt-1 text-slate-400">
          Your video accessibility improved by{' '}
          <span className="font-mono font-bold text-emerald-400">+{scoreAfter - scoreBefore} points</span>
          {' '}({improvementPct}% improvement)
        </p>
      </motion.div>

      {/* Before/After Score Comparison */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ScoreCard score={scoreBefore} label="Before" size="lg" delay={200} />
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="flex flex-col items-center gap-2"
          >
            <div className="rounded-full bg-teal-600 p-3">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
            <span className="font-mono text-2xl font-bold text-emerald-400">
              +{scoreAfter - scoreBefore}
            </span>
            <span className="text-xs text-slate-400">points gained</span>
          </motion.div>
        </div>
        <ScoreCard score={scoreAfter} label="After" size="lg" delay={400} />
      </div>

      {/* Video Comparison — THE MONEY SHOT */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-teal-400" />
            <h3 className="font-semibold text-white">Video Comparison</h3>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-800/80 p-0.5">
            <button
              onClick={() => { setActiveVideo('original'); setIsPlaying(false); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeVideo === 'original'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => { setActiveVideo('remediated'); setIsPlaying(false); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeVideo === 'remediated'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Accessible Version
            </button>
          </div>
        </div>

        <div className="relative aspect-video bg-black">
          <video
            ref={originalRef}
            src={`/api/video/${videoId}/original`}
            className={`h-full w-full ${activeVideo !== 'original' ? 'hidden' : ''}`}
            playsInline
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          <video
            ref={remediatedRef}
            src={`/api/video/${videoId}/remediated`}
            className={`h-full w-full ${activeVideo !== 'remediated' ? 'hidden' : ''}`}
            playsInline
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />

          {/* Play overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-7 w-7 text-white ml-1" />
              </div>
            </button>
          )}

          {/* Click to pause */}
          {isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0"
            />
          )}

          {/* Badge */}
          <div className="absolute top-3 left-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
              activeVideo === 'remediated'
                ? 'bg-teal-600/80 text-white'
                : 'bg-slate-800/80 text-slate-300'
            }`}>
              {activeVideo === 'remediated' ? 'Accessible Version (Captions + Braille)' : 'Original'}
            </span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-800">
          <button
            onClick={togglePlay}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-xs text-slate-400">
            {activeVideo === 'remediated'
              ? 'Playing accessible version with burned captions and Braille side panel'
              : 'Playing original video without accessibility features'}
          </span>
        </div>
      </motion.div>

      {/* What was fixed */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <h3 className="mb-3 font-semibold text-white">What AdaptEd Fixed</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actionsApplied.map((action) => (
            <div
              key={action}
              className="flex items-center gap-3 rounded-lg bg-teal-500/5 px-4 py-2.5"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-teal-400" />
              <span className="text-sm text-slate-200">
                {actionLabels[action] || action}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* WCAG Checklist */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-400" />
          <h3 className="font-semibold text-white">WCAG 2.1 Compliance</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {wcagChecklist.map((item) => {
            const isFixed = actionsApplied.includes(item.key);
            return (
              <div
                key={item.criterion}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                  isFixed ? 'bg-emerald-500/5' : 'bg-slate-800/30'
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    isFixed ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  {isFixed && <CheckCircle className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <span className={`text-sm font-medium ${isFixed ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-slate-400">
                    {item.criterion}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {/* Download Video — PRIMARY action */}
        <button
          onClick={handleDownloadVideo}
          disabled={downloadingVideo}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-medium text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-500 hover:shadow-teal-600/30 disabled:opacity-50"
        >
          {downloadingVideo ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Accessible Video
            </>
          )}
        </button>

        {/* Download Report */}
        <button
          onClick={handleDownloadReport}
          disabled={downloading}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Download Report (PDF)
            </>
          )}
        </button>

        {/* Share */}
        <button
          onClick={() => {
            const text = `I just improved my video's accessibility score from ${scoreBefore} to ${scoreAfter} using AdaptEd! Making education accessible for everyone. #Accessibility #AdaptEd`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
          }}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          Share Results
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Analyze Another Video
        </button>
      </motion.div>
    </motion.div>
  );
}
