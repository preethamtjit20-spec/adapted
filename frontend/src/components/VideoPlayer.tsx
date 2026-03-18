import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Maximize, ToggleLeft, ToggleRight } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  hasRemediated: boolean;
}

export default function VideoPlayer({ videoId, hasRemediated }: VideoPlayerProps) {
  const [showRemediated, setShowRemediated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const originalRef = useRef<HTMLVideoElement>(null);
  const remediatedRef = useRef<HTMLVideoElement>(null);

  const activeRef = showRemediated ? remediatedRef : originalRef;

  useEffect(() => {
    const video = activeRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [showRemediated]);

  const togglePlay = () => {
    const video = activeRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = activeRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
    >
      {/* Toggle bar */}
      {hasRemediated && (
        <div className="flex items-center justify-center gap-3 border-b border-slate-800 py-2 px-4">
          <span className={`text-xs font-medium ${!showRemediated ? 'text-white' : 'text-slate-400'}`}>
            Original
          </span>
          <button
            onClick={() => setShowRemediated(!showRemediated)}
            className="text-teal-400 hover:text-teal-300 transition-colors"
          >
            {showRemediated ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6" />
            )}
          </button>
          <span className={`text-xs font-medium ${showRemediated ? 'text-white' : 'text-slate-400'}`}>
            Enhanced
          </span>
        </div>
      )}

      {/* Video area */}
      <div className="relative aspect-video bg-black">
        <video
          ref={originalRef}
          src={`/api/video/${videoId}/original`}
          className={`h-full w-full ${showRemediated ? 'hidden' : ''}`}
          playsInline
        />
        {hasRemediated && (
          <video
            ref={remediatedRef}
            src={`/api/video/${videoId}/remediated`}
            className={`h-full w-full ${!showRemediated ? 'hidden' : ''}`}
            playsInline
          />
        )}

        {/* Play overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="h-7 w-7 text-white ml-1" />
            </div>
          </button>
        )}

        {/* Label badge */}
        <div className="absolute top-3 left-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
            showRemediated
              ? 'bg-green-500/20 text-green-300'
              : 'bg-slate-800/80 text-slate-300'
          }`}>
            {showRemediated ? 'Enhanced' : 'Original'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3">
        {/* Seek bar */}
        <div
          className="group mb-2 h-1 cursor-pointer rounded-full bg-slate-800"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-teal-500 transition-all group-hover:h-1.5"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <Volume2 className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-xs text-slate-400">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>
          </div>
          <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
