import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onUploadComplete: (id: string, filename: string) => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];

  const handleFile = useCallback(async (f: File) => {
    if (!acceptedTypes.includes(f.type)) {
      setError('Please upload a video file (MP4, MOV, or WebM)');
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('File size must be under 500MB');
      return;
    }

    setFile(f);
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', f);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setUploading(false);
          setProgress(100);
          setTimeout(() => onUploadComplete(data.id, data.filename), 600);
        } else {
          setError('Upload failed. Please try again.');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('Network error. Please check your connection.');
        setUploading(false);
      };

      xhr.send(formData);
    } catch {
      setError('Upload failed. Please try again.');
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mx-auto w-full max-w-xl px-6 pb-16"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          isDragging
            ? 'border-teal-400 bg-teal-500/8 scale-[1.02]'
            : file && !error
            ? 'border-green-500/30 bg-green-500/5'
            : error
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.webm"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                  isDragging ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Upload className="h-7 w-7" />
              </div>
              <p className="mb-1 text-lg font-medium text-gray-200">
                {isDragging ? 'Drop your video here' : 'Upload your video'}
              </p>
              <p className="text-sm text-slate-400">
                Drag & drop or click to browse. MP4, MOV, WebM up to 500MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                  <Film className="h-5 w-5 text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-200">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
                {!uploading && progress === 100 && (
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-400" />
                )}
                {!uploading && !error && progress < 100 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setProgress(0);
                    }}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {(uploading || progress > 0) && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {progress < 100 ? 'Uploading...' : 'Upload complete'}
                    </span>
                    <span className="font-mono text-gray-300">{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${
                        progress === 100
                          ? 'bg-green-500'
                          : 'bg-teal-500'
                      }`}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
