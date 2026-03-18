import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Subtitles,
  Eye,
  Volume2,
  Palette,
  AlertTriangle,
  Zap,
  LayoutList,
  ChevronDown,
  Filter,
} from 'lucide-react';

interface Finding {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  type: string;
  description: string;
  wcag_criterion: string;
  timestamp_range?: string;
  recommendation: string;
}

interface FindingsPanelProps {
  findings: Finding[];
}

const typeIcons: Record<string, React.ElementType> = {
  captions: Subtitles,
  audio_description: Eye,
  contrast: Palette,
  audio: Volume2,
  visual: Zap,
  structure: LayoutList,
};

const severityConfig = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
    order: 0,
  },
  major: {
    label: 'Major',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    order: 1,
  },
  minor: {
    label: 'Minor',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-500',
    order: 2,
  },
};

type SeverityFilter = 'all' | 'critical' | 'major' | 'minor';

export default function FindingsPanel({ findings }: FindingsPanelProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    major: findings.filter((f) => f.severity === 'major').length,
    minor: findings.filter((f) => f.severity === 'minor').length,
  };

  const filtered = findings
    .filter((f) => filter === 'all' || f.severity === filter)
    .sort((a, b) => severityConfig[a.severity].order - severityConfig[b.severity].order);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/60"
    >
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h3 className="font-semibold text-white">Accessibility Findings</h3>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {findings.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-slate-400" />
          </div>
        </div>

        {/* Summary badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'critical', 'major', 'minor'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filter === severity
                  ? severity === 'all'
                    ? 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/25'
                    : `${severityConfig[severity].bg} ${severityConfig[severity].text} ring-1 ${severityConfig[severity].border}`
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {severity === 'all' ? `All (${findings.length})` : `${severityConfig[severity].label} (${counts[severity]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Findings list */}
      <div className="max-h-[480px] overflow-y-auto">
        <AnimatePresence>
          {filtered.map((finding, i) => {
            const Icon = typeIcons[finding.type] || AlertTriangle;
            const config = severityConfig[finding.severity];
            const isExpanded = expandedId === finding.id;

            return (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-slate-800/50 last:border-0"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-800/30"
                >
                  <div className={`mt-0.5 rounded-lg p-2 ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${config.bg} ${config.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {finding.wcag_criterion}
                      </span>
                      {finding.timestamp_range && (
                        <span className="text-[10px] text-slate-400">
                          {finding.timestamp_range}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200">{finding.description}</p>
                  </div>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-5 mb-4 rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Recommendation
                        </p>
                        <p className="mt-1 text-sm text-gray-300">
                          {finding.recommendation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
