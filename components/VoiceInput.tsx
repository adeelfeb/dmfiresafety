import React, { useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, className = '' }) => {
  const { isListening, isSupported, toggleListening, error } = useSpeechRecognition({
    onResult: (text) => {
      // Add a space before appending if needed, though usually handled by parent
      onTranscript(text);
    }
  });

  // Log error if it occurs for debugging, but UI shows visual cue
  useEffect(() => {
    if (error) {
      console.warn("Voice Input Error:", error);
      alert(error); // Simple feedback for the user
    }
  }, [error]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? "Stop Recording" : error ? error : "Start Voice Entry"}
      className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center ${
        error 
          ? 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
          : isListening 
            ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200'
      } ${className}`}
    >
      {error ? (
        <AlertCircle className="w-5 h-5" />
      ) : isListening ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
};