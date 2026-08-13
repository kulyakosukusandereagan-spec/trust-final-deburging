import React, { useState, useEffect, useRef } from 'react';
import { LandmarkData } from '../data/presetLandmarks';
import { Play, Pause, Volume2, Sparkles, ExternalLink, RefreshCw, Compass, FileText, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface NarratedMediaPanelProps {
  currentLandmark: LandmarkData;
  audioUrl: string | null;
  isGeneratingTts: boolean;
  isSearching: boolean;
  selectedVoice: string;
  onGenerateTts: () => void;
  onFetchSearchGrounding: () => void;
}

export const NarratedMediaPanel: React.FC<NarratedMediaPanelProps> = ({
  currentLandmark,
  audioUrl,
  isGeneratingTts,
  isSearching,
  selectedVoice,
  onGenerateTts,
  onFetchSearchGrounding,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize or update audio element when audioUrl changes
  useEffect(() => {
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      // Auto-play when generated
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) {
      onGenerateTts();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="flex flex-col gap-5 h-full">
      {/* Narrated Clip Audio Player Box */}
      <div className="bg-[#14151B] border border-[#23252E] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            <span>NARRATED CLIP (TTS)</span>
          </p>
          <span className="text-[10px] font-mono text-[#8E929E] uppercase">
            VOICE: <span className="text-white font-bold">{selectedVoice}</span>
          </span>
        </div>

        {/* Media Waveform Box */}
        <div className="aspect-[16/9] bg-[#1A1C24] rounded-xl mb-4 relative flex flex-col items-center justify-center p-4 border border-[#2D303E] overflow-hidden group">
          {/* Animated Background Audio Bars */}
          <div className="flex items-end justify-center gap-1.5 h-16 w-full opacity-40 mb-3">
            {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85, 65, 40, 90, 30].map((h, i) => (
              <div
                key={i}
                style={{
                  height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.1))) % 100}%` : '20%',
                }}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying ? 'bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]' : 'bg-[#23252E]'
                }`}
              />
            ))}
          </div>

          {/* Central Play/Pause Trigger */}
          <button
            onClick={togglePlayPause}
            disabled={isGeneratingTts}
            className="w-12 h-12 rounded-full bg-white text-[#0A0B0E] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all z-10 cursor-pointer disabled:opacity-50"
            title={isPlaying ? 'Pause Narration' : 'Play Narration'}
          >
            {isGeneratingTts ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#3B82F6]" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Audio Progress Slider */}
          <div className="w-full mt-3 px-2 z-10">
            <input
              type="range"
              min={0}
              max={duration || 30}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-[#23252E] accent-[#3B82F6] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8E929E] mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 30)}</span>
            </div>
          </div>
        </div>

        {/* Narrator Info */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Spatial History Guide</h3>
            <p className="text-xs text-[#8E929E]">
              Generated using <span className="text-[#3B82F6] font-mono">gemini-3.1-flash-tts</span>
            </p>
          </div>
          <button
            onClick={onGenerateTts}
            disabled={isGeneratingTts}
            className="p-2 bg-[#23252E] hover:bg-[#3B82F6]/20 hover:text-[#3B82F6] text-[#8E929E] rounded-lg text-xs flex items-center gap-1 transition-all"
            title="Generate fresh audio with selected voice"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingTts ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-mono uppercase hidden sm:inline">Re-Voice</span>
          </button>
        </div>

        {/* Script Expandable Transcript */}
        <div className="border-t border-[#23252E] pt-3">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between text-xs text-[#8E929E] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase">
              <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
              Audio Transcript
            </span>
            {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTranscript && (
            <div className="mt-2.5 p-3 bg-[#0A0B0E] border border-[#23252E] rounded-xl text-xs text-[#E0E2E6] leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
              "{currentLandmark.narrationScript}"
            </div>
          )}
        </div>
      </div>

      {/* Smart Search Insights Box (Google Search Grounded) */}
      <div className="bg-gradient-to-br from-[#3B82F6]/10 via-[#14151B] to-[#14151B] border border-[#3B82F6]/30 rounded-2xl p-5 shadow-lg flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>SEARCH GROUNDED DATA</span>
            </p>
            <button
              onClick={onFetchSearchGrounding}
              disabled={isSearching}
              className="text-[10px] font-mono text-[#3B82F6] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
              <span>Refetch Search</span>
            </button>
          </div>

          {currentLandmark.groundedHistory && (
            <p className="text-xs text-[#E0E2E6] leading-relaxed mb-4 font-sans bg-[#0A0B0E]/60 p-3 rounded-xl border border-[#23252E]">
              {currentLandmark.groundedHistory}
            </p>
          )}

          {/* Visitor Tips */}
          {currentLandmark.visitorTips && currentLandmark.visitorTips.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono uppercase text-[#8E929E] font-bold mb-2">
                Actionable Visitor Tips
              </p>
              <ul className="space-y-2">
                {currentLandmark.visitorTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#E0E2E6]">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Secret Fun Fact */}
          {currentLandmark.funFact && (
            <div className="p-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl mb-4">
              <p className="text-[10px] font-mono font-bold text-[#3B82F6] uppercase mb-1">
                Fascinating Secret Fact
              </p>
              <p className="text-xs text-[#E0E2E6] italic">"{currentLandmark.funFact}"</p>
            </div>
          )}

          {/* Grounding Web Citations / Sources */}
          {currentLandmark.sources && currentLandmark.sources.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase text-[#8E929E] font-bold mb-2">
                Google Search Sources
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentLandmark.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0A0B0E] hover:bg-[#23252E] border border-[#23252E] hover:border-[#3B82F6]/50 rounded-lg text-[10px] text-[#3B82F6] transition-colors truncate max-w-[200px]"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="mt-5 pt-3 border-t border-[#23252E]">
          <button
            onClick={onGenerateTts}
            disabled={isGeneratingTts}
            className="w-full py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] active:scale-[0.98] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#3B82F6]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingTts ? 'Synthesizing Narration...' : 'Play AR Spatial Audio'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
