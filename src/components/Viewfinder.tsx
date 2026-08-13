import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Eye, Sparkles, Video, AlertCircle, Scan, Maximize2 } from 'lucide-react';
import { LandmarkData } from '../data/presetLandmarks';

interface ViewfinderProps {
  currentLandmark: LandmarkData;
  userImage: string | null;
  isAnalyzing: boolean;
  onUploadImage: (file: File) => void;
  onTriggerAnalysis: () => void;
  onResetToPreset: () => void;
  activeMode: 'preset' | 'upload' | 'camera';
  setActiveMode: (mode: 'preset' | 'upload' | 'camera') => void;
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  currentLandmark,
  userImage,
  isAnalyzing,
  onUploadImage,
  onTriggerAnalysis,
  onResetToPreset,
  activeMode,
  setActiveMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Handle live camera stream activation
  useEffect(() => {
    if (activeMode === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          setCameraStream(stream);
          setCameraError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setCameraError('Camera access unavailable in frame preview. Please upload a photo or select a landmark preset.');
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeMode]);

  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
          onUploadImage(file);
        }
      }, 'image/jpeg');
    }
  };

  const displayImage = userImage || currentLandmark.imageUrl;

  return (
    <section className="flex flex-col h-full">
      {/* Viewfinder Main Frame */}
      <div className="relative flex-1 bg-[#1A1C24] rounded-3xl border-2 border-[#2D303E] overflow-hidden min-h-[380px] md:min-h-[460px] flex items-center justify-center group shadow-2xl">
        
        {/* Background Image / Camera Feed */}
        {activeMode === 'camera' && !cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover absolute inset-0"
          />
        ) : (
          <img
            src={displayImage}
            alt={currentLandmark.name}
            className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          />
        )}

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0E] via-transparent to-black/40 pointer-events-none" />

        {/* Laser Scanning Bar Animation */}
        {isAnalyzing && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent shadow-[0_0_15px_#3B82F6] z-30 animate-[bounce_2s_infinite]" />
        )}

        {/* Viewfinder Reticle & Concentric Target Circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-56 h-56 md:w-64 md:h-64 border border-white/20 rounded-full flex items-center justify-center animate-[spin_30s_linear_infinite]">
            <div className="w-32 h-32 border border-white/40 rounded-full border-dashed flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]" />
            </div>
          </div>
          {/* Crosshairs */}
          <div className="absolute w-8 h-[1px] bg-white/50" />
          <div className="absolute h-8 w-[1px] bg-white/50" />
        </div>

        {/* Geometric Corner Brackets */}
        <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-white/70 z-20 pointer-events-none" />
        <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-white/70 z-20 pointer-events-none" />
        <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-white/70 z-20 pointer-events-none" />
        <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-white/70 z-20 pointer-events-none" />

        {/* Floating Spatial HUD Tag over Landmark */}
        <div className="absolute top-10 left-10 z-20 bg-[#14151B]/90 backdrop-blur-md border border-[#3B82F6]/50 rounded-xl p-3 shadow-xl hidden sm:block max-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <Scan className="w-3.5 h-3.5 text-[#3B82F6] animate-pulse" />
            <span className="text-[10px] font-mono uppercase text-[#3B82F6] font-bold">
              {isAnalyzing ? 'SCANNING MESH...' : 'SPATIAL TARGET'}
            </span>
          </div>
          <p className="text-xs font-bold text-white truncate">{currentLandmark.name}</p>
          <div className="flex justify-between items-center text-[10px] text-[#8E929E] font-mono mt-1">
            <span>MATCH:</span>
            <span className="text-[#10B981] font-bold">{currentLandmark.confidence}%</span>
          </div>
        </div>

        {/* Bottom Overlay Info Banner */}
        <div className="absolute bottom-6 inset-x-6 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-bold tracking-widest text-white uppercase font-mono">
                {isAnalyzing ? 'AI RECOGNITION IN PROGRESS' : 'AR LIVE VIEW'}
              </span>
            </div>
            <span className="text-white/70 text-xs font-mono hidden md:inline">
              {currentLandmark.coordinates}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-1.5 bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/50 rounded-lg text-xs font-bold text-[#3B82F6] flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-Analyze AI'}</span>
            </button>
          </div>
        </div>

        {/* Camera Error Alert inside frame if camera access blocked */}
        {activeMode === 'camera' && cameraError && (
          <div className="absolute inset-0 bg-[#0A0B0E]/90 backdrop-blur-sm z-30 p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-sm text-white font-bold mb-1">Camera Stream Unavailable</p>
            <p className="text-xs text-[#8E929E] max-w-xs mb-4">{cameraError}</p>
            <button
              onClick={() => {
                setActiveMode('preset');
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="px-4 py-2 bg-[#3B82F6] text-white text-xs font-bold rounded-xl shadow-lg"
            >
              Upload Photo Instead
            </button>
          </div>
        )}
      </div>

      {/* Viewfinder Controls Bar below frame */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#14151B] border border-[#23252E] rounded-2xl p-4">
        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0A0B0E] border border-[#23252E] rounded-xl w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveMode('preset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMode === 'preset'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'text-[#8E929E] hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preset AR</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('upload');
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMode === 'upload'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'text-[#8E929E] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <button
            onClick={() => setActiveMode('camera')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMode === 'camera'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'text-[#8E929E] hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Cam</span>
          </button>
        </div>

        {/* Shutter Button Center */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadImage(file);
                setActiveMode('upload');
              }
            }}
            accept="image/*"
            className="hidden"
          />

          {activeMode === 'camera' ? (
            <button
              onClick={handleCaptureFromCamera}
              className="w-14 h-14 rounded-full border-4 border-[#3B82F6] flex items-center justify-center bg-white shadow-lg shadow-[#3B82F6]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Capture Photo from Camera"
            >
              <div className="w-8 h-8 rounded-full bg-[#3B82F6]" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="w-14 h-14 rounded-full border-4 border-[#3B82F6] flex items-center justify-center bg-white shadow-lg shadow-[#3B82F6]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              title="Snap Photo / Choose File for AI Analysis"
            >
              <Camera className="w-6 h-6 text-[#0A0B0E] group-hover:scale-110 transition-transform" />
            </button>
          )}

          <div className="text-left hidden lg:block">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {activeMode === 'camera' ? 'Capture Frame' : 'Snap Landmark'}
            </p>
            <p className="text-[10px] text-[#8E929E]">
              {activeMode === 'camera' ? 'Analyze live video' : 'Upload photo or scan'}
            </p>
          </div>
        </div>

        {/* Reset / Actions */}
        {userImage && (
          <button
            onClick={onResetToPreset}
            className="px-3 py-1.5 bg-[#23252E] hover:bg-[#2D303E] text-xs font-mono text-[#8E929E] hover:text-white rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Sample</span>
          </button>
        )}
      </div>
    </section>
  );
};
