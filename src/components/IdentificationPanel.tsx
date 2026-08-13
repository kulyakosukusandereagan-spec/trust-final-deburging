import React from 'react';
import { LandmarkData } from '../data/presetLandmarks';
import { ShieldCheck, Landmark as LandmarkIcon, Clock, Sparkles } from 'lucide-react';

interface IdentificationPanelProps {
  currentLandmark: LandmarkData;
  selectedTimelineIndex: number | null;
  onSelectTimelineItem: (index: number) => void;
  isAnalyzing: boolean;
}

export const IdentificationPanel: React.FC<IdentificationPanelProps> = ({
  currentLandmark,
  selectedTimelineIndex,
  onSelectTimelineItem,
  isAnalyzing,
}) => {
  return (
    <aside className="flex flex-col gap-5 h-full">
      {/* Primary Identification Box */}
      <div className="bg-[#14151B] border border-[#23252E] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        {/* Subtle accent corner glowing bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent opacity-80" />

        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <LandmarkIcon className="w-3.5 h-3.5" />
            <span>IDENTIFICATION DATA</span>
          </p>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
            {isAnalyzing ? 'ANALYZING...' : 'AI VERIFIED'}
          </span>
        </div>

        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">
          {currentLandmark.name}
        </h2>
        <p className="text-xs font-mono text-[#8E929E] mb-3 uppercase tracking-wider">
          {currentLandmark.city}, {currentLandmark.country}
        </p>

        <p className="text-xs text-[#8E929E] leading-relaxed mb-4 border-b border-[#23252E] pb-3">
          {currentLandmark.shortSummary}
        </p>

        {/* Structured Spec Grid */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center py-1.5 border-b border-[#23252E]">
            <span className="text-[10px] text-[#8E929E] uppercase tracking-wider">Confidence Match</span>
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              {currentLandmark.confidence}%
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-[#23252E]">
            <span className="text-[10px] text-[#8E929E] uppercase tracking-wider">Architectural Style</span>
            <span className="text-xs font-mono text-white uppercase text-right max-w-[140px] truncate">
              {currentLandmark.style}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-[#23252E]">
            <span className="text-[10px] text-[#8E929E] uppercase tracking-wider">Built Era</span>
            <span className="text-xs font-mono text-white">{currentLandmark.builtYear}</span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-[10px] text-[#8E929E] uppercase tracking-wider">State / Condition</span>
            <span className="text-xs font-mono text-[#10B981] font-bold px-2 py-0.5 rounded bg-[#10B981]/10">
              {currentLandmark.condition}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Archive Box */}
      <div className="bg-[#14151B] border border-[#23252E] rounded-2xl p-5 flex-1 shadow-lg flex flex-col min-h-[220px]">
        <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>TIMELINE ARCHIVE</span>
        </p>

        <div className="space-y-4 relative pl-3 border-l-2 border-[#23252E] my-1 flex-1">
          {currentLandmark.timeline.map((item, idx) => {
            const isSelected = selectedTimelineIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => onSelectTimelineItem(idx)}
                className={`relative pl-4 cursor-pointer transition-all group ${
                  isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {/* Node Bullet */}
                <div
                  className={`absolute -left-[19px] top-0.5 w-3 h-3 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'bg-[#3B82F6] border-white shadow-[0_0_10px_#3B82F6]'
                      : 'bg-[#14151B] border-[#23252E] group-hover:border-[#3B82F6]'
                  }`}
                />
                <p className="text-[10px] font-mono text-[#3B82F6] font-bold uppercase tracking-widest">
                  {item.year}
                </p>
                <p className="text-xs text-[#E0E2E6] leading-snug mt-0.5 font-sans">
                  {item.event}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architectural Highlights Box */}
      <div className="bg-[#14151B] border border-[#23252E] rounded-2xl p-5 shadow-lg">
        <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SPATIAL & DESIGN HIGHLIGHTS</span>
        </p>
        <ul className="space-y-2">
          {currentLandmark.architecturalHighlights.map((feat, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#8E929E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-1.5" />
              <span className="leading-relaxed">{feat}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
