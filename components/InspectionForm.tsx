
import React, { useState, useEffect, useRef } from 'react';
import { Extinguisher, getStandardChecklist } from '../types';
import { Button } from './Button';
import { analyzeInspectionNotes, analyzeExtinguisherImage } from '../services/geminiService';
import { VoiceInput } from './VoiceInput';
import { ArrowLeft, BrainCircuit, Check, ClipboardCheck, AlertOctagon, Plus, Trash2, X, WifiOff, Camera, Loader2, Sparkles, RefreshCcw, FilePlus } from 'lucide-react';

interface InspectionFormProps {
  extinguisher: Extinguisher;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  availableCustomChecks?: string[];
  onAddCustomCheckToLibrary?: (item: string) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  isCustom?: boolean;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({ 
    extinguisher, 
    onSubmit, 
    onCancel,
    availableCustomChecks = [],
    onAddCustomCheckToLibrary
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(() => {
    return getStandardChecklist(extinguisher.type);
  });

  const [checks, setChecks] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState<'Replace' | 'New' | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [aiResult, setAiResult] = useState<{ analysis: string; severity: string; actionItems: string[] } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customCheckName, setCustomCheckName] = useState('');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    setChecks(prev => {
      const newChecks = { ...prev };
      checklistItems.forEach(item => {
        if (newChecks[item.id] === undefined) {
          newChecks[item.id] = null;
        }
      });
      return newChecks;
    });
  }, [checklistItems]);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    stopCamera();
    setIsVisionScanning(true);

    const visionResult = await analyzeExtinguisherImage(base64Data);
    
    if (visionResult) {
      // Map vision results to checklist
      const newChecks = { ...checks };
      checklistItems.forEach(item => {
        if (item.id === 'pressureGauge') newChecks[item.id] = visionResult.pressureOk;
        if (item.id === 'safetyPin') newChecks[item.id] = visionResult.pinPresent;
        if (item.id === 'cylinderCondition') newChecks[item.id] = visionResult.noDamage;
      });
      setChecks(newChecks);
      setNotes(prev => `${prev}${prev ? '\n' : ''}AI Vision Scan: ${visionResult.summary}`);
    } else {
      alert("AI Scan could not process the image. Please perform manual check.");
    }
    
    setIsVisionScanning(false);
  };

  const handleCheck = (id: string) => {
    setChecks(prev => {
      const current = prev[id];
      let next: boolean | null = null;
      if (current === null) next = true;
      else if (current === true) next = false;
      else next = null;
      return { ...prev, [id]: next };
    });
  };

  const handleAddCustomCheck = () => {
    if (!customCheckName.trim()) return;
    const id = `custom_${Date.now()}`;
    setChecklistItems(prev => [...prev, { id, label: customCheckName, isCustom: true }]);
    if (onAddCustomCheckToLibrary) onAddCustomCheckToLibrary(customCheckName.trim());
    setCustomCheckName('');
    setIsAddingCustom(false);
  };

  const handleRemoveCustomCheck = (id: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
    setChecks(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!isOnline) return;
    const passedCount = Object.values(checks).filter(v => v === true).length;
    const totalCount = checklistItems.length;
    if (!notes && passedCount === totalCount) return; 
    setIsAnalyzing(true);
    const result = await analyzeInspectionNotes(notes, checks);
    setAiResult(result);
    setIsAnalyzing(false);
  };

  const handleVoiceInput = (text: string) => {
    setNotes(prev => {
      const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + text;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      extinguisherId: extinguisher.id,
      checks,
      notes,
      aiAnalysis: aiResult?.analysis,
      severityRating: aiResult?.severity,
      disposition: failedCount > 0 ? disposition : undefined
    });
  };

  const passedCount = Object.values(checks).filter(v => v === true).length;
  const failedCount = Object.values(checks).filter(v => v === false).length;
  const isComplete = checklistItems.every(item => checks[item.id] !== null && checks[item.id] !== undefined);
  const allPassed = passedCount === checklistItems.length;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <canvas ref={canvasRef} className="hidden" />
      
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
            <div className="w-full h-full border-2 border-dashed border-white/50 rounded-2xl flex items-center justify-center">
              <div className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full uppercase tracking-widest">Center Gauge & Pin</div>
            </div>
          </div>
          <div className="absolute bottom-10 flex gap-6">
            <button onClick={stopCamera} className="p-4 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-all">
              <X className="w-8 h-8" />
            </button>
            <button onClick={captureAndAnalyze} className="p-6 bg-safety-600 hover:bg-safety-700 rounded-full text-white shadow-xl shadow-safety-900/50 scale-125 transition-all">
              <Camera className="w-10 h-10" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onCancel} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Inspection</h2>
            <div className="flex items-center text-sm text-gray-500 mt-1">
               <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-medium mr-2">{extinguisher.type}</span>
               <span className="dark:text-gray-400">{extinguisher.location}</span>
            </div>
          </div>
        </div>

        <Button 
          variant="primary" 
          onClick={startCamera} 
          disabled={!isOnline || isVisionScanning}
          className="shadow-lg shadow-safety-200 dark:shadow-none animate-pulse-subtle"
          icon={isVisionScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        >
          {isVisionScanning ? 'Scanning...' : 'Visual AI Scan'}
        </Button>
      </div>

      {isVisionScanning && (
        <div className="mb-6 bg-safety-50 dark:bg-safety-900/20 border-2 border-safety-200 dark:border-safety-800 p-4 rounded-xl flex items-center gap-4 animate-fadeIn">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-safety-100 dark:bg-safety-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-safety-600 animate-bounce" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-safety-900 dark:text-safety-300">Vision Analysis in Progress</h4>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="bg-safety-600 h-full animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ClipboardCheck className="w-5 h-5 mr-2 text-safety-600" />
              Checklist
            </h3>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {passedCount} Passed · {failedCount} Failed
            </span>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {checklistItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center flex-1">
                  <div 
                    onClick={() => handleCheck(item.id)}
                    className={`flex-shrink-0 w-8 h-8 rounded border cursor-pointer flex items-center justify-center transition-all duration-200 ${
                      checks[item.id] === true
                        ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                        : checks[item.id] === false
                          ? 'bg-red-500 border-red-500 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {checks[item.id] === true && <Check className="w-5 h-5" strokeWidth={3} />}
                    {checks[item.id] === false && <X className="w-5 h-5" strokeWidth={3} />}
                  </div>
                  <label 
                    onClick={() => handleCheck(item.id)}
                    className="ml-3 text-gray-700 dark:text-gray-200 font-medium cursor-pointer select-none flex-1"
                  >
                    {item.label}
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                    checks[item.id] === true ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 
                    checks[item.id] === false ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-gray-400'
                  }`}>
                    {checks[item.id] === true ? 'Pass' : 
                     checks[item.id] === false ? 'Fail' : 'Pending'}
                  </span>
                  {item.isCustom && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCustomCheck(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
            {isAddingCustom ? (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  list="custom-checks-list"
                  autoFocus
                  value={customCheckName}
                  onChange={(e) => setCustomCheckName(e.target.value)}
                  placeholder="Enter check description..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCheck())}
                />
                <datalist id="custom-checks-list">
                    {availableCustomChecks.map((check, idx) => (
                        <option key={idx} value={check} />
                    ))}
                </datalist>
                <Button type="button" size="sm" onClick={handleAddCustomCheck} disabled={!customCheckName.trim()}>Add</Button>
                <button type="button" onClick={() => setIsAddingCustom(false)} className="p-2 text-gray-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setIsAddingCustom(true)}
                className="flex items-center text-sm font-medium text-safety-600 hover:text-safety-700 px-2 py-1 rounded-md hover:bg-safety-50 dark:hover:bg-safety-900/30 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Check Item
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Observations & Notes</h3>
            <div className="flex gap-2">
                <VoiceInput onTranscript={handleVoiceInput} />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleAnalyze} 
                  disabled={!isOnline || isAnalyzing || (!notes && allPassed)}
                  className={`text-sm ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                  icon={isOnline ? <BrainCircuit className="w-4 h-4 text-purple-600" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
                >
                {isAnalyzing ? 'Analyzing...' : 'AI Assistant'}
                </Button>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-transparent outline-none resize-none transition-shadow dark:bg-gray-700 dark:text-white"
            placeholder="Describe any defects, visible damage, or observations..."
          ></textarea>

          {aiResult && (
            <div className={`mt-4 p-4 rounded-lg border animate-fadeIn ${
              aiResult.severity === 'High' ? 'bg-red-50 border-red-200 dark:bg-red-900/20' :
              aiResult.severity === 'Medium' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20' :
              'bg-green-50 border-green-200 dark:bg-green-900/20'
            }`}>
              <div className="flex items-start">
                <AlertOctagon className={`w-5 h-5 mr-3 mt-0.5 ${
                  aiResult.severity === 'High' ? 'text-red-600' :
                  aiResult.severity === 'Medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">AI Assessment: {aiResult.severity} Severity</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{aiResult.analysis}</p>
                  {aiResult.actionItems.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {aiResult.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm font-medium flex items-center text-gray-800 dark:text-gray-200">
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                             aiResult.severity === 'High' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* New Disposition Section */}
          {failedCount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                Required Disposition
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDisposition('Replace')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group ${
                    disposition === 'Replace' 
                      ? 'bg-red-50 border-red-600 dark:bg-red-900/20' 
                      : 'bg-white border-gray-100 hover:border-red-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <RefreshCcw className={`w-6 h-6 mb-2 ${disposition === 'Replace' ? 'text-red-600' : 'text-gray-400 group-hover:text-red-400'}`} />
                  <span className={`font-black text-xs uppercase tracking-tighter ${disposition === 'Replace' ? 'text-red-900 dark:text-red-200' : 'text-gray-500'}`}>Replace Unit</span>
                  <p className="text-[10px] text-gray-400 mt-1">Existing slot, swap required</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDisposition('New')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group ${
                    disposition === 'New' 
                      ? 'bg-blue-50 border-blue-600 dark:bg-blue-900/20' 
                      : 'bg-white border-gray-100 hover:border-blue-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <FilePlus className={`w-6 h-6 mb-2 ${disposition === 'New' ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-400'}`} />
                  <span className={`font-black text-xs uppercase tracking-tighter ${disposition === 'New' ? 'text-blue-900 dark:text-blue-200' : 'text-gray-500'}`}>New Replacement</span>
                  <p className="text-[10px] text-gray-400 mt-1">New addition to site map</p>
                </button>
              </div>
              {failedCount > 0 && !disposition && (
                <p className="text-[10px] text-red-500 font-bold mt-3 italic">* Please select a disposition to finalize report</p>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
                    !isComplete ? 'bg-gray-300' : 
                    failedCount > 0 && !disposition ? 'bg-yellow-500 animate-pulse' :
                    failedCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {!isComplete 
                        ? 'Complete all checks' 
                        : (failedCount > 0 && !disposition)
                            ? 'Select disposition'
                            : failedCount > 0 
                                ? `${failedCount} defects found`
                                : 'Inspection passed'}
                </span>
            </div>
            <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button 
                    type="submit" 
                    disabled={!isComplete || (failedCount > 0 && !disposition)} 
                    icon={<Check className="w-4 h-4"/>}
                    variant={failedCount > 0 ? 'primary' : 'success'}
                >
                    Submit Report
                </Button>
            </div>
        </div>
      </form>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s infinite ease-in-out;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};
