
import React, { useState, useEffect, useMemo } from 'react';
import { VoiplyMessage, Customer, ViewState } from '../types';
import { linkMessagesToCustomers } from '../services/voiplyService';
import { Button } from './Button';
import { 
  MessageSquare, 
  Mic, 
  Clock, 
  User, 
  Building2, 
  ArrowRight, 
  RefreshCw, 
  Search, 
  MailOpen, 
  Mail,
  Filter,
  Phone,
  ArrowLeft,
  AlertTriangle,
  Trash2
} from 'lucide-react';

interface MessagesViewProps {
  customers: Customer[];
  messages: VoiplyMessage[];
  onSetMessages: (msgs: VoiplyMessage[]) => void;
  onRefresh: () => void;
  onNavigateToCustomer: (id: string) => void;
  onNavigateToSettings: () => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ 
  customers, 
  messages, 
  onSetMessages,
  onRefresh,
  onNavigateToCustomer,
  onNavigateToSettings 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'voicemail'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const linkedMessages = useMemo(() => {
    return linkMessagesToCustomers(messages, customers);
  }, [messages, customers]);

  const filteredMessages = useMemo(() => {
    return linkedMessages.filter(m => {
      const matchesSearch = 
        m.from.includes(searchTerm) || 
        m.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || m.type === filterType;
      
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [linkedMessages, searchTerm, filterType]);

  const selectedMessage = linkedMessages.find(m => m.id === selectedMsgId);

  // Mark as read when message is clicked
  useEffect(() => {
    if (selectedMsgId) {
      const msg = messages.find(m => m.id === selectedMsgId);
      if (msg && !msg.read) {
        onSetMessages(messages.map(m => m.id === selectedMsgId ? { ...m, read: true } : m));
      }
    }
  }, [selectedMsgId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleDeleteMessage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Permanent Archive: Remove this message from the technician dashboard?")) {
        onSetMessages(messages.filter(m => m.id !== id));
        if (selectedMsgId === id) setSelectedMsgId(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fadeIn">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
            <MessageSquare className="w-7 h-7 text-safety-600" />
            Voiply Communications
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage site messages and voicemail transcriptions</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleRefresh} 
            isLoading={isRefreshing}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {/* Inbox Sidebar */}
        <div className="w-full md:w-80 border-r border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inbox..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-safety-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-1 mt-3">
              {(['all', 'sms', 'voicemail'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterType === t 
                      ? 'bg-safety-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredMessages.map(msg => (
              <button
                key={msg.id}
                onClick={() => setSelectedMsgId(msg.id)}
                className={`w-full text-left p-4 border-b border-gray-50 dark:border-gray-700/50 transition-colors flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 relative group ${
                  selectedMsgId === msg.id ? 'bg-safety-50/50 dark:bg-safety-900/10 border-l-4 border-l-safety-600' : ''
                }`}
              >
                {!msg.read && (
                    <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-400"></div>
                )}
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.type === 'voicemail' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                }`}>
                  {msg.type === 'voicemail' ? <Mic className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`text-sm truncate ${msg.read ? 'text-gray-500 font-medium' : 'text-gray-900 dark:text-white font-black'}`}>
                      {msg.customer?.name || msg.from}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 shrink-0">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {msg.body}
                  </p>
                </div>
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => handleDeleteMessage(e, msg.id)}
                        className="p-2 text-gray-400 hover:text-red-600 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </button>
            ))}
            {filteredMessages.length === 0 && (
              <div className="p-10 text-center">
                <MailOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Inbox Clean</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Content Area */}
        <div className={`flex-1 flex flex-col bg-gray-50/30 dark:bg-gray-900/20 ${!selectedMsgId && 'hidden md:flex'}`}>
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Message Header */}
              <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        {selectedMessage.customer?.name || 'Unrecognized Caller'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-bold">
                          <Phone className="w-3 h-3" /> {selectedMessage.from}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" /> {new Date(selectedMessage.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={(e) => handleDeleteMessage(e as any, selectedMessage.id)}
                        className="!bg-red-50 hover:!bg-red-100 !text-red-600 border-red-200"
                        icon={<Trash2 className="w-4 h-4" />}
                    >
                        Delete
                    </Button>
                    {selectedMessage.customer && (
                        <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => onNavigateToCustomer(selectedMessage.customer!.id)}
                        className="!bg-blue-600 hover:!bg-blue-700"
                        icon={<Building2 className="w-4 h-4" />}
                        >
                        Open Site Sheet
                        </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className={`p-6 rounded-2xl shadow-sm border ${
                    selectedMessage.type === 'voicemail' 
                      ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800' 
                      : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        selectedMessage.type === 'voicemail' ? 'bg-blue-600 text-white' : 'bg-safety-600 text-white'
                      }`}>
                        {selectedMessage.type}
                      </span>
                    </div>
                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                      {selectedMessage.body}
                    </p>
                  </div>

                  {selectedMessage.type === 'voicemail' && selectedMessage.transcription && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <RefreshCw className="w-3 h-3" /> AI Transcription Service
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-loose bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                        "{selectedMessage.transcription}"
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-gray-400">{selectedMessage.duration}s Audio Duration</span>
                         <Button variant="ghost" size="sm" className="text-blue-600 font-bold">Listen to Audio</Button>
                      </div>
                    </div>
                  )}

                  {/* Context Linking */}
                  {!selectedMessage.customer && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-4 rounded-2xl flex items-center gap-4">
                       <AlertTriangle className="w-6 h-6 text-orange-600" />
                       <div>
                          <p className="text-sm font-bold text-orange-900 dark:text-orange-200">Unrecognized Site</p>
                          <p className="text-xs text-orange-700 dark:text-orange-400">This number isn't linked to any customer records. Site details won't be available until linked.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Draft SMS reply..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-safety-500"
                />
                <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>Send Reply</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h4 className="font-black uppercase tracking-widest text-sm">Select a conversation</h4>
              <p className="text-xs mt-2">Communication history with site contacts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
