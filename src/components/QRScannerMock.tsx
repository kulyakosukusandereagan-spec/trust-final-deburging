import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Camera, ScanLine, Laptop, Check, AlertCircle, 
  Volume2, VolumeX, RefreshCw, Search, Database, Sparkles, 
  ChevronRight, Info, ShieldCheck, HelpCircle, Package, ArrowRight
} from 'lucide-react';

interface QRScannerMockProps {
  onScan: (scannedText: string) => void;
  placeholder?: string;
  className?: string;
  activeContext?: 'receiving' | 'pos' | 'transfer' | 'audit';
}

export default function QRScannerMock({
  onScan,
  placeholder = "Simulate scanning or plug in USB scanner...",
  className = "",
  activeContext = "pos"
}: QRScannerMockProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [useUSBMode, setUseUSBMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [autoDecodeTimer, setAutoDecodeTimer] = useState<number | null>(null);

  const usbInputRef = useRef<HTMLInputElement>(null);

  // Full product database for interactive lookup cards
  const mockScanTargets = [
    { label: "Amoxicillin 500mg (Batch BCH-AMX-001)", value: "AMX-500-CP|BCH-AMX-001", generic: "Amoxicillin", category: "Antibiotics", stock: 120, price: "SSP 18,500.00", location: "Aisle A-2, Shelf 3", status: "In Stock" },
    { label: "Lisinopril 10mg (Batch BCH-LIS-101)", value: "LIS-10-TB|BCH-LIS-101", generic: "Lisinopril", category: "Cardiovascular", stock: 240, price: "SSP 24,000.00", location: "Aisle B-1, Shelf 2", status: "In Stock" },
    { label: "Ibuprofen 400mg (Batch BCH-IBU-102)", value: "IBU-400-TB|BCH-IBU-102", generic: "Ibuprofen", category: "Analgesics", stock: 15, price: "SSP 8,990.00", location: "Aisle C-3, Shelf 1", status: "Critical Stock" },
    { label: "Vitamin D3 5000 IU (Batch BCH-VIT-D3-01)", value: "VIT-D3-DT|BCH-VIT-D3-01", generic: "Cholecalciferol", category: "Vitamins", stock: 90, price: "SSP 12,500.00", location: "Aisle E-1, Shelf 4", status: "In Stock" },
    { label: "Metformin 850mg (Batch BCH-MET-881)", value: "MET-850-TB|BCH-MET-881", generic: "Metformin Hydrochloride", category: "Diabetic", stock: 350, price: "SSP 19,990.00", location: "Aisle D-2, Shelf 2", status: "In Stock" },
    { label: "Atorvastatin 20mg (Batch BCH-ATO-202)", value: "ATO-20-TB|BCH-ATO-202", generic: "Atorvastatin", category: "Cardiovascular", stock: 220, price: "SSP 32,500.00", location: "Aisle B-1, Shelf 5", status: "In Stock" }
  ];

  // Active looked-up item metadata
  const [scannedProductInfo, setScannedProductInfo] = useState<any | null>(null);

  // Play synthesized laser beep sound using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1350, audioCtx.currentTime); // Crisp scan chirp
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime); // Low non-annoying volume
      gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {
      console.log("Web Audio beep unsupported or blocked", e);
    }
  };

  const handleTriggerSimulatedScan = (val: string) => {
    if (!val) return;
    setScanStatus('scanning');
    
    setTimeout(() => {
      setScanStatus('success');
      setLastScanned(val);
      playBeep();
      onScan(val);

      // Find looked-up item
      const sku = val.split('|')[0];
      const match = mockScanTargets.find(t => t.value.startsWith(sku));
      if (match) {
        setScannedProductInfo(match);
      } else {
        setScannedProductInfo({
          label: `Scanned Lot ID [${sku}]`,
          value: val,
          generic: "Scanned Identifier",
          category: "General Registry",
          stock: 100,
          price: "SSP 15,000.00",
          location: "Receiving Area",
          status: "Custom Scan"
        });
      }
      
      // Reset status after a visual confirmation
      setTimeout(() => {
        setScanStatus('idle');
      }, 1500);
    }, 600);
  };

  // Live Camera streaming logic
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError('');
      // Stop existing tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream;

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("First camera stream attempt failed, applying generic fallback...", firstErr);
        // Fallback to simpler constraints if 'environment' facing mode or exact deviceId is not supported
        const fallbackConstraints: MediaStreamConstraints = {
          video: true
        };
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Attempt play
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log("Auto-playback deferred until interaction", playErr);
        }
      }

      // Enumerate other cameras
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId && !deviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (enumErr) {
        console.warn("Could not enumerate devices:", enumErr);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      // Fallback message with context-appropriate troubleshooting
      setCameraError(
        err.name === 'NotAllowedError' 
          ? "Camera permission denied by the browser sandbox. Please adjust your browser settings or click 'Simulate Decode'."
          : "No device camera identified or access is locked. Using fallback virtual emulator mode."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (autoDecodeTimer) {
      clearInterval(autoDecodeTimer);
      setAutoDecodeTimer(null);
    }
  };

  // Toggle modes
  useEffect(() => {
    if (isCameraActive) {
      startCamera(selectedDeviceId || undefined);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  // Live video frame detector loop
  useEffect(() => {
    let animationFrameId: number;
    let isDetecting = false;

    const scanVideoFrame = async () => {
      if (!isCameraActive || !videoRef.current || scanStatus === 'scanning' || scanStatus === 'success') {
        animationFrameId = requestAnimationFrame(() => {
          setTimeout(scanVideoFrame, 300);
        });
        return;
      }

      if ('BarcodeDetector' in window && !isDetecting && videoRef.current.readyState >= 2) {
        try {
          isDetecting = true;
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'data_matrix']
          });
          const detected = await barcodeDetector.detect(videoRef.current);
          if (detected && detected.length > 0) {
            const rawVal = detected[0].rawValue;
            if (rawVal && rawVal !== lastScanned) {
              handleTriggerSimulatedScan(rawVal);
            }
          }
        } catch (err) {
          // Ignore frame decode error
        } finally {
          isDetecting = false;
        }
      }

      animationFrameId = requestAnimationFrame(() => {
        setTimeout(scanVideoFrame, 350);
      });
    };

    if (isCameraActive) {
      scanVideoFrame();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, scanStatus, lastScanned]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      startCamera(deviceId);
    }
  };

  // Listen to manual USB Scanner inputs (Keyboard wedge emulator)
  const handleUSBKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualCode.trim()) {
      e.preventDefault();
      handleTriggerSimulatedScan(manualCode.trim());
      setManualCode('');
      
      setTimeout(() => {
        // Keep focus on input for sequential fast hands-free scanning
        usbInputRef.current?.focus();
      }, 1500);
    }
  };

  // Keep focus on USB keyboard wedge input if active
  useEffect(() => {
    if (useUSBMode && usbInputRef.current) {
      usbInputRef.current.focus();
    }
  }, [useUSBMode]);

  return (
    <div id="camera-qr-scanner-terminal" className={`bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-4 ${className}`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <QrCode className="h-4.5 w-4.5 text-sky-400" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 block">Enterprise Camera &amp; Wedge Terminal</span>
            <span className="text-[9px] text-slate-500 font-medium">Juba Drug &amp; Food Control Authority Compliant</span>
          </div>
        </div>

        {/* Audio beep & mode selectors */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Beep toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
            title={soundEnabled ? "Mute Scan Sound" : "Unmute Scan Sound"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-sky-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>

          {/* Wedge Mode Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
            <button
              onClick={() => {
                setUseUSBMode(true);
                setIsCameraActive(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded cursor-pointer transition-all ${
                useUSBMode ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3 w-3" />
              <span>USB Wedge</span>
            </button>
            <button
              onClick={() => {
                setUseUSBMode(false);
                setIsCameraActive(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded cursor-pointer transition-all ${
                isCameraActive ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="h-3 w-3" />
              <span>Camera Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEWPORT AREA */}
      {isCameraActive ? (
        <div className="space-y-3">
          
          {/* CAMERA CONFIGURATION AND SELECTION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-850 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wide">Live Device Stream:</span>
            </div>
            
            {devices.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">Source:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="bg-slate-900 text-[10px] border border-slate-800 text-sky-400 px-2 py-1 rounded focus:outline-none font-medium cursor-pointer"
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      📹 {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">Scanning system camera handles...</span>
            )}
          </div>

          {/* VIDEO FEED ELEMENT CONTAINER */}
          <div className="relative aspect-video w-full bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center items-center overflow-hidden">
            
            {/* Live Camera Feed */}
            {!cameraError && (
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover rounded-xl"
              />
            )}

            {/* Glowing Targeting Bounding Box */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative w-48 h-28 sm:w-64 sm:h-36 border border-sky-400/30 rounded-lg flex items-center justify-center">
                {/* Glowing target corners */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-sky-400 -mt-0.5 -ml-0.5 rounded-tl-md"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-sky-400 -mt-0.5 -mr-0.5 rounded-tr-md"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-sky-400 -mb-0.5 -ml-0.5 rounded-bl-md"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-sky-400 -mb-0.5 -mr-0.5 rounded-br-md"></span>
                
                {/* Pulse visual info */}
                <span className="text-[9px] font-mono text-sky-300 font-semibold uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-sky-400/20 shadow-lg">
                  ALIGN BARCODE / QR
                </span>
              </div>
            </div>

            {/* Simulated green laser line sweeping back & forth */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 opacity-80 shadow-[0_0_10px_#10b981] animate-[bounce_3s_infinite] z-20 pointer-events-none"></div>

            {/* Camera error/not-granted overlay display */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-30 space-y-3">
                <AlertCircle className="h-8 w-8 text-amber-500 animate-pulse" />
                <div className="space-y-1 max-w-sm">
                  <p className="text-xs font-bold text-slate-200">Device Video Locked</p>
                  <p className="text-[10px] text-slate-400 leading-normal">{cameraError}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                  <Info className="h-3 w-3 text-sky-400" />
                  <span>Interactive Emulator Override Active</span>
                </div>
              </div>
            )}

            {/* Quick Simulation Overlay - Allows instant trigger even with real camera feed to ensure perfect operation */}
            <div className="absolute bottom-3 right-3 z-30">
              <button
                onClick={() => {
                  // Choose a random item from our mock target array
                  const randomItem = mockScanTargets[Math.floor(Math.random() * mockScanTargets.length)];
                  handleTriggerSimulatedScan(randomItem.value);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-bold shadow-lg transition-all border border-sky-400 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 animate-spin" />
                <span>Simulate Decode Scan</span>
              </button>
            </div>
          </div>

          {/* Quick Select Buttons beneath Camera Stream */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Or force a manual barcode lookup trigger:</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {mockScanTargets.map((tgt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriggerSimulatedScan(tgt.value)}
                  className="text-left bg-slate-900 hover:bg-slate-850 border border-slate-800/80 px-2 py-1.5 rounded text-[9px] font-semibold text-slate-300 transition-all truncate hover:text-sky-400 hover:border-sky-500/40 cursor-pointer"
                  title={tgt.label}
                >
                  🏷️ {tgt.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <div className="p-1 bg-sky-500/10 rounded border border-sky-500/20 text-sky-400">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-200 block text-[10px]">USB KEYBOARD WEDGE MODE</span>
              <p className="text-[9px] mt-0.5 text-slate-500 leading-normal">
                Connecting physical desktop hardware scanners (such as Zebra/Honeywell handheld laser guns).
                The scanner wedge automatically formats data and appends an action trigger below.
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              ref={usbInputRef}
              placeholder={placeholder}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={handleUSBKeyPress}
              className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 pr-12 text-emerald-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <div className="absolute right-3.5 top-2 flex items-center text-slate-500 text-[8px] font-bold font-mono uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Wedge Input
            </div>
          </div>

          {/* Quick Simulate click trigger */}
          <div className="space-y-2 pt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Select item to fast-simulate laser scan:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {mockScanTargets.map((tgt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriggerSimulatedScan(tgt.value)}
                  className="text-left bg-slate-900 hover:bg-slate-850 border border-slate-800/80 px-2 py-1.5 rounded text-[9px] font-semibold text-slate-300 transition-all truncate hover:text-sky-400 hover:border-sky-500/40 cursor-pointer"
                  title={tgt.label}
                >
                  ⚡ {tgt.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC SCANNER FEEDBACK */}
      <div className="mt-3.5 flex items-center justify-between bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[10px]">
        <div className="flex items-center gap-2">
          {scanStatus === 'scanning' && (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </div>
          )}
          {scanStatus === 'success' && (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          )}
          {scanStatus === 'idle' && (
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600 block"></span>
          )}
          <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wide">
            {scanStatus === 'scanning' ? "Demultiplexing Signal..." : 
             scanStatus === 'success' ? "Laser Scan Success!" : "Scan Engine Idle"}
          </span>
        </div>
        {lastScanned && (
          <div className="text-right">
            <span className="text-slate-500 font-mono text-[9px]">Captured Signature:</span>
            <code className="bg-slate-900 text-sky-400 px-2 py-0.5 rounded font-mono ml-1 text-[9px] border border-slate-800">
              {lastScanned}
            </code>
          </div>
        )}
      </div>

      {/* EXTENSIVE DYNAMIC LOOKUP RESULT DRAWER */}
      {scannedProductInfo && (
        <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-sky-950/60 shadow-lg space-y-3 animate-[fadeIn_0.3s_ease]">
          <div className="flex items-start justify-between border-b border-slate-850 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-sky-500/10 rounded text-sky-400 border border-sky-400/20">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-200">{scannedProductInfo.label.split(' (')[0]}</h4>
                <p className="text-[9px] text-slate-500 font-medium italic">{scannedProductInfo.generic}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
              scannedProductInfo.status === 'Critical Stock' 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {scannedProductInfo.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[10px] leading-normal font-medium">
            <div className="space-y-1">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Category</span>
              <span className="text-slate-300">{scannedProductInfo.category}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Current Stock Level</span>
              <span className={`text-slate-300 font-mono font-bold ${scannedProductInfo.stock < 25 ? 'text-rose-400' : ''}`}>
                {scannedProductInfo.stock} units
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Target Location</span>
              <span className="text-slate-300">{scannedProductInfo.location}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Retail Price</span>
              <span className="text-emerald-400 font-mono font-bold">{scannedProductInfo.price}</span>
            </div>
          </div>

          {/* Quick-Action Panel */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[9px] text-slate-500">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Catalog match validated</span>
            </div>
            <button
              onClick={() => {
                setScannedProductInfo(null);
              }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 cursor-pointer hover:text-white"
            >
              Clear Lookup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
