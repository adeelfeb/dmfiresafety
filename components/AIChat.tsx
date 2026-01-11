
import React, { useState, useRef, useEffect } from 'react';
import { chatWithSafetyExpert } from '../services/geminiService';
import { Button } from './Button';
import { Send, Bot, User, BookOpen, Search, WifiOff } from 'lucide-react';
import { VoiceInput } from './VoiceInput';

interface AIChatProps {
  mode?: 'consultant' | 'nfpa';
}

export const AIChat: React.FC<AIChatProps> = ({ mode = 'consultant' }) => {
  const isNFPA = mode === 'nfpa';
  
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { 
      role: 'model', 
      text: isNFPA 
        ? 'I am your NFPA Code Assistant. Describe a code requirement or situation, and I will find the relevant NFPA standards (NFPA 10, 13, 72, 101, etc.)' 
        : 'Hello! I am your Fire Safety Expert. Ask me about NFPA codes, extinguisher types, or inspection procedures.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !isOnline) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Format history for API
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const systemInstruction = isNFPA 
      ? "You are an expert on National Fire Protection Association (NFPA) standards. Your goal is to find and cite specific code sections relevant to the user's query across any NFPA standard (e.g., NFPA 10 for extinguishers, NFPA 13 for sprinklers, NFPA 72 for alarms, NFPA 101 for life safety). Be precise, cite specific standard names and section numbers where possible, and explain the requirement clearly. If multiple standards apply, summarize the key points from each."
      : "You are a helpful, professional Fire Safety Expert. Answer questions about fire extinguisher codes (NFPA 10), safety procedures, and maintenance concisely.";

    const response = await chatWithSafetyExpert(history, userMsg, systemInstruction);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  const handleVoiceInput = (text: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + text);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-140px)] flex flex-col transition-colors">
      <div className={`p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between rounded-t-xl ${isNFPA ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
        <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isNFPA ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-safety-100 dark:bg-safety-900/50'}`}>
                {isNFPA ? <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Bot className="w-6 h-6 text-safety-600 dark:text-safety-400" />}
            </div>
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{isNFPA ? 'NFPA AI Code Finder' : 'Safety Consultant AI'}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{isNFPA ? 'Comprehensive Standards Search' : 'Powered by Gemini 2.5 Flash'}</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-600 ml-2' : isNFPA ? 'bg-blue-100 dark:bg-blue-900/50 mr-2' : 'bg-safety-100 dark:bg-safety-900/50 mr-2'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : isNFPA ? <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Bot className="w-5 h-5 text-safety-600 dark:text-safety-400" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-gray-700 dark:bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-600'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none ml-10 border border-gray-100 dark:border-gray-600">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
        <div className="flex gap-2 items-center">
          <VoiceInput onTranscript={handleVoiceInput} className="flex-shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={!isOnline ? "Chat unavailable offline" : isNFPA ? "Search standard or requirement..." : "Ask about codes or procedures..."}
            className={`flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${isNFPA ? 'focus:ring-blue-500' : 'focus:ring-safety-500'} ${!isOnline ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
            disabled={loading || !isOnline}
          />
          <Button 
            type="submit" 
            disabled={loading || !input.trim() || !isOnline} 
            icon={!isOnline ? <WifiOff className="w-4 h-4"/> : (isNFPA ? <Search className="w-4 h-4"/> : <Send className="w-4 h-4" />)}
            className={isNFPA ? '!bg-blue-600 hover:!bg-blue-700' : ''}
          >
            {isNFPA ? 'Find Code' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
};
