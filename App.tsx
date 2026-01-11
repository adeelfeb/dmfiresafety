import React, { useState, useEffect, useRef, useMemo } from 'react';
// Added SupabaseSettings to imports
import { Extinguisher, ViewState, InspectionRecord, Customer, getStandardChecklist, User, ServiceCompletion, Todo, RegisteredUser, DropboxSettings, QuickLink, AuditEntry, VoiplySettings, VoiplyMessage, DeviceMagicSettings, SupabaseSettings } from './types';
import { Dashboard } from './components/Dashboard'; 
import { AssetList } from './components/AssetList'; 
import { InspectionForm } from './components/InspectionForm';
import { AIChat } from './components/AIChat';
import { HistoryLog } from './components/HistoryLog';
import { ReportsView, ReportType } from './components/ReportsView';
import { SyncManager } from './components/SyncManager';
import { ExtinguisherModal } from './components/ExtinguisherModal';
import { CustomerModal } from './components/CustomerModal';
import { CustomerManager } from './components/CustomerManager';
import { RunSheetManager } from './components/RunSheetManager';
import { ServiceManager } from './components/ServiceManager';
import { CalendarView } from './components/CalendarView';
import { QuickLinksManager } from './components/QuickLinksManager';
import { LoginScreen } from './components/LoginScreen';
import { MessagesView } from './components/MessagesView';
import { FormsView } from './components/FormsView';
import { loadState, saveState, AppData, loadUser, saveUser, clearUser } from './services/storageService';
import { fetchVoiplyMessages } from './services/voiplyService';
import { 
  LayoutDashboard, 
  History, 
  MessageSquareText, 
  LogOut, 
  FileBarChart, 
  Flame, 
  Menu, 
  X, 
  Settings, 
  Zap, 
  CalendarClock, 
  BookOpen, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  BarChart3, 
  WifiOff, 
  Cloud, 
  RefreshCw, 
  CloudOff, 
  PackageMinus, 
  Cylinder, 
  Clipboard, 
  Layers, 
  Search, 
  Calendar, 
  Filter, 
  Briefcase, 
  Share2, 
  Trash2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Shield, 
  RefreshCcw, 
  FilePlus,
  MessageSquare,
  Smartphone
} from 'lucide-react';

const SyncStatusBadge: React.FC<{ status: 'synced' | 'syncing' | 'offline' }> = ({ status }) => {
  if (status === 'offline') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 animate-pulse">
        <CloudOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }
  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-xs font-medium dark:bg-green-900/30 dark:border-blue-800 dark:text-blue-300">
      <Cloud className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Synced</span>
    </div>
  );
};

const NAV_STATE_KEY_PREFIX = 'fire_safety_nav_state_';

const App: React.FC = () => {
  // Auth State
  const initialUser = loadUser();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);

  // Navigation State
  const getInitialNavState = (user: User | null) => {
      if (!user) return null;
      try {
          const saved = localStorage.getItem(`${NAV_STATE_KEY_PREFIX}${user.technicianId}`);
          return saved ? JSON.parse(saved) : null;
      } catch (e) { return null; }
  };
  const initialNavState = getInitialNavState(initialUser);

  const [view, setView] = useState<ViewState>(initialNavState?.view || 'dashboard');
  const [runSheetCustomerId, setRunSheetCustomerId] = useState<string | null>(initialNavState?.runSheetCustomerId || null);
  const [serviceTrackerTech, setServiceTrackerTech] = useState<string | null>(initialNavState?.serviceTrackerTech || null);
  const [serviceTrackerSearchTerm, setServiceTrackerSearchTerm] = useState<string>(initialNavState?.serviceTrackerSearchTerm || '');
  const [reportTypeOverride, setReportTypeOverride] = useState<ReportType | undefined>(initialNavState?.reportTypeOverride);
  
  const [reportCustomerId, setReportCustomerId] = useState<string | undefined>(initialNavState?.reportCustomerId);
  const [reportMonth, setReportMonth] = useState<string | undefined>(initialNavState?.reportMonth || new Date().toISOString().slice(0, 7));
  const [reportTech, setReportTech] = useState<string | undefined>(initialNavState?.reportTech);

  const [selectedId, setSelectedId] = useState<string | null>(initialNavState?.selectedId || null);

  // Data State
  const loadedData = loadState();
  const [customers, setCustomers] = useState<Customer[]>(() => loadedData ? loadedData.customers : []);
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>(() => loadedData ? loadedData.extinguishers : []);
  const [records, setRecords] = useState<InspectionRecord[]>(() => loadedData ? loadedData.records : []);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => loadedData?.auditLogs || []);
  const [todos, setTodos] = useState<Todo[]>(() => loadedData ? loadedData.todos : []);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => {
    try {
      const saved = localStorage.getItem('fire_safety_quick_links');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [technicians, setTechnicians] = useState<string[]>(() => loadedData?.technicians || ['Tobey', 'Travis', 'Michael']);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => loadedData?.registeredUsers || []);
  const [customChecklistItems, setCustomChecklistItems] = useState<string[]>(() => loadedData?.customChecklistItems || []);
  const [customBatteryTypes, setCustomBatteryTypes] = useState<string[]>(() => loadedData?.customBatteryTypes || []);
  const [assetTypes, setAssetTypes] = useState<string[]>(() => loadedData?.assetTypes || []);
  const [extinguisherBrands, setExtinguisherBrands] = useState<string[]>(() => loadedData?.extinguisherBrands || []);
  const [systemBrands, setSystemBrands] = useState<string[]>(() => loadedData?.systemBrands || []);
  const [systemAgents, setSystemAgents] = useState<string[]>(() => loadedData?.systemAgents || []);
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>(() => loadedData?.archivedCustomers || []);
  const [archivedExtinguishers, setArchivedExtinguishers] = useState<Extinguisher[]>(() => loadedData?.archivedExtinguishers || []);
  const [disabledBulkFields, setDisabledBulkFields] = useState<string[]>(() => loadedData?.disabledBulkFields || []);

  const [dropboxSettings, setDropboxSettings] = useState<DropboxSettings>(() => loadedData?.dropboxSettings || { accessToken: '', frequency: 'manual', format: 'json', lastBackup: null });
  const [supabaseSettings, setSupabaseSettings] = useState<SupabaseSettings>(() => loadedData?.supabaseSettings || { url: '', apiKey: '', tablePrefix: 'dm_fire_', frequency: 'manual', lastSync: null });
  const [voiplySettings, setVoiplySettings] = useState<VoiplySettings>(() => loadedData?.voiplySettings || { apiKey: '', enabled: true });
  const [deviceMagicSettings, setDeviceMagicSettings] = useState<DeviceMagicSettings>(() => loadedData?.deviceMagicSettings || { apiKey: '', orgId: '', defaultFormId: '', enabled: false });

  const [messages, setMessages] = useState<VoiplyMessage[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('fire_safety_theme') === 'dark');

  // Persistence
  useEffect(() => {
    saveState({ 
      customers, extinguishers, records, auditLogs, todos, technicians, registeredUsers, 
      customChecklistItems, customBatteryTypes, assetTypes, extinguisherBrands, systemBrands, 
      systemAgents, archivedCustomers, archivedExtinguishers, disabledBulkFields, 
      dropboxSettings, supabaseSettings, voiplySettings, deviceMagicSettings
    });
  }, [customers, extinguishers, records, auditLogs, todos, technicians, registeredUsers, customChecklistItems, customBatteryTypes, assetTypes, extinguisherBrands, systemBrands, systemAgents, archivedCustomers, archivedExtinguishers, disabledBulkFields, dropboxSettings, supabaseSettings, voiplySettings, deviceMagicSettings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${NAV_STATE_KEY_PREFIX}${currentUser.technicianId}`, JSON.stringify({
        view, runSheetCustomerId, serviceTrackerTech, serviceTrackerSearchTerm, reportTypeOverride, reportCustomerId, reportMonth, reportTech, selectedId
      }));
    }
  }, [view, runSheetCustomerId, serviceTrackerTech, serviceTrackerSearchTerm, reportTypeOverride, reportCustomerId, reportMonth, reportTech, selectedId, currentUser]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('fire_safety_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Messages Fetching
  const loadMessages = async () => {
    if (!voiplySettings.enabled || !voiplySettings.apiKey) return;
    try {
      const msgs = await fetchVoiplyMessages(voiplySettings);
      setMessages(msgs);
    } catch (e) { console.error("Voiply load failed", e); }
  };

  useEffect(() => { loadMessages(); }, [voiplySettings]);

  const addAuditLog = (action: AuditEntry['action'], type: AuditEntry['entityType'], name: string, details?: string) => {
    const entry: AuditEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      userId: currentUser?.technicianId || 'Unknown',
      userName: currentUser?.name || 'System',
      action, entityType: type, entityName: name, details
    };
    setAuditLogs(prev => [entry, ...prev].slice(0, 1000));
  };

  const handleMarkServiceComplete = (customerId: string, type: 'Extinguisher' | 'System', year: number, month: number, customDate?: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;
      const alreadyDone = c.completedServices?.some(s => s.type === type && s.year === year && s.month === month);
      if (alreadyDone) return c;

      const completion: ServiceCompletion = {
        type, year, month,
        completedDate: customDate || new Date().toISOString(),
        completedBy: currentUser?.name || 'Unknown',
        notesSnapshot: c.notes,
        extinguishersOutSnapshot: type === 'Extinguisher' ? JSON.parse(JSON.stringify(c.extinguishersOut || [])) : undefined,
        systemTanksSnapshot: type === 'System' ? JSON.parse(JSON.stringify(c.systemTanks || [])) : undefined
      };
      
      return { ...c, completedServices: [...(c.completedServices || []), completion] };
    }));
    addAuditLog('Cleared', 'Customer', customers.find(c => c.id === customerId)?.name || 'Unknown', `${type} service cycle for ${month}/${year}`);
  };

  const handleUndoServiceComplete = (customerId: string, type: 'Extinguisher' | 'System', year: number, month: number) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;
      return { ...c, completedServices: (c.completedServices || []).filter(s => !(s.type === type && s.year === year && s.month === month)) };
    }));
  };

  const handleUpdateCustomerScheduleDate = (customerId: string, date: { month: number; day: number } | undefined) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, scheduledServiceDate: date, scheduledBy: date ? (currentUser?.name || 'Unknown') : undefined } : c));
  };

  const handleUpdateCustomerScheduleTime = (customerId: string, time: string | undefined) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, scheduledServiceTime: time } : c));
  };

  const handleAddTodo = (text: string, customerId?: string, dueDate?: string, addedBy?: string) => {
    const newTodo: Todo = { id: Date.now().toString(), text, completed: false, createdAt: new Date().toISOString(), customerId, dueDate, addedBy };
    setTodos(prev => [newTodo, ...prev]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTodo = (id: string, text: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  const handleAssignTodo = (id: string, technicianName: string | undefined) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ownedBy: technicianName } : t));
  };

  const handleClearCompletedTodos = () => {
    setTodos(prev => prev.filter(t => !t.completed));
  };

  const handleLogout = () => {
    if (confirm("Sign Out: Confirm you wish to end your session?")) {
      clearUser();
      setCurrentUser(null);
      setView('dashboard');
    }
  };

  const handleEditCustomer = (id: string) => {
      setSelectedId(id);
      setIsCustomerModalOpen(true);
  };

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  // Moved states from bottom of file inside the App component
  const [isExtinguisherModalOpen, setIsExtinguisherModalOpen] = useState(false);
  const [selectedCustomerIdForExt, setSelectedCustomerIdForExt] = useState<string | null>(null);

  const handleViewReportFromTracker = (type: ReportType, filters: { customerId: string, month: number, year: number, tech: string }) => {
    setReportTypeOverride(type);
    setReportCustomerId(filters.customerId);
    setReportMonth(`${filters.year}-${String(filters.month).padStart(2, '0')}`);
    setReportTech(filters.tech);
    setView('reports');
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} registeredUsers={registeredUsers} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden font-sans">
      {/* Sidebar - Remains original */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-gray-900 text-white border-r border-gray-800 transition-all">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/20">
            <Flame className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter leading-none">SafetyFirst</h1>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Inspection Suite</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-2 mb-1">Operations</div>
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'dashboard' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => setView('service-tracker')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'service-tracker' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <CalendarClock className="w-4 h-4" /> Service Tracker
          </button>
          <button onClick={() => setView('run-sheets')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'run-sheets' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <ClipboardList className="w-4 h-4" /> Run Sheets
          </button>
          <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'calendar' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Calendar className="w-4 h-4" /> Calendar
          </button>

          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-2 mt-4 mb-1">Data & Analysis</div>
          <button onClick={() => { setReportTypeOverride(undefined); setView('reports'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'reports' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <FileBarChart className="w-4 h-4" /> Reports Center
          </button>
          <button onClick={() => setView('customer-manager')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'customer-manager' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Users className="w-4 h-4" /> Site Portfolio
          </button>
          <button onClick={() => setView('asset-list')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'asset-list' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Layers className="w-4 h-4" /> Master Registry
          </button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'history' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <History className="w-4 h-4" /> Audit History
          </button>

          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-2 mt-4 mb-1">Tools</div>
          {voiplySettings.enabled && (
            <button onClick={() => setView('messages')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'messages' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <MessageSquare className="w-4 h-4" /> Messages
            </button>
          )}
          {deviceMagicSettings.enabled && (
            <button onClick={() => setView('forms')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'forms' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <Smartphone className="w-4 h-4" /> System Forms
            </button>
          )}
          <button onClick={() => setView('ai-chat')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'ai-chat' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <MessageSquareText className="w-4 h-4" /> AI Consultant
          </button>
          <button onClick={() => setView('nfpa-finder')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'nfpa-finder' ? 'bg-safety-600 text-white shadow-lg shadow-safety-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Shield className="w-4 h-4" /> NFPA Finder
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-1">
          <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-sm ${view === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <Settings className="w-4 h-4" /> Cloud/Settings
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-900/20 transition-all font-bold text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="no-print h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-8 z-20 transition-colors">
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 -ml-2 text-gray-500"><Menu className="w-6 h-6" /></button>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shadow-inner">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none">Field Access</h2>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mt-1">{currentUser.name}</p>
                  </div>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <SyncStatusBadge status={navigator.onLine ? 'synced' : 'offline'} />
                {currentUser.role === 'admin' && (
                    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300">
                      <Shield className="w-3 h-3" /> Admin Auth
                    </div>
                )}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {view === 'dashboard' && (
            <Dashboard 
              customers={customers} 
              onTechClick={(tech) => { setServiceTrackerTech(tech); setView('service-tracker'); }} 
              onAddCustomer={() => { setSelectedId(null); setIsCustomerModalOpen(true); }}
              todos={todos}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
              onAssignTodo={handleAssignTodo}
              onClearCompletedTodos={handleClearCompletedTodos}
              onCustomerClick={(id) => { setSelectedId(id); setIsCustomerModalOpen(true); }}
              currentUser={currentUser}
              quickLinks={quickLinks}
              onNavigate={setView}
            />
          )}

          {view === 'service-tracker' && (
            <ServiceManager 
              customers={customers}
              extinguishers={extinguishers}
              onMarkComplete={handleMarkServiceComplete}
              onUndoComplete={handleUndoServiceComplete}
              onEditCustomer={handleEditCustomer}
              onOpenRunSheet={(id) => { setRunSheetCustomerId(id); setView('run-sheets'); }}
              onViewReport={handleViewReportFromTracker}
              onScheduleDateChange={handleUpdateCustomerScheduleDate}
              onScheduleTimeChange={handleUpdateCustomerScheduleTime}
              initialTech={serviceTrackerTech}
              technicians={technicians}
              initialSearchTerm={serviceTrackerSearchTerm}
              currentUser={currentUser}
              deviceMagicSettings={deviceMagicSettings}
              onNavigate={setView}
            />
          )}

          {view === 'run-sheets' && (
            <RunSheetManager 
              customers={customers}
              extinguishers={extinguishers}
              records={records}
              onInspect={(id) => { setSelectedId(id); setView('inspect'); }}
              onSelect={(id) => { setSelectedId(id); }}
              onAddExtinguisher={(cid) => { setSelectedId(null); setSelectedCustomerIdForExt(cid); setIsExtinguisherModalOpen(true); }}
              onEditExtinguisher={(id) => { setSelectedId(id); setIsExtinguisherModalOpen(true); }}
              onDeleteExtinguisher={(id) => { setExtinguishers(prev => prev.filter(e => e.id !== id)); }}
              onAddCustomer={() => { setSelectedId(null); setIsCustomerModalOpen(true); }}
              onEditCustomer={handleEditCustomer}
              onReorder={(updated) => setExtinguishers(updated)}
              onQuickInspect={(id) => {
                  const now = new Date().toISOString();
                  const rec: InspectionRecord = { id: Date.now().toString(), extinguisherId: id, date: now, inspectorName: currentUser.name, checks: {}, notes: "Routine monthly inspection. Passed via QuickCheck." };
                  setRecords(prev => [rec, ...prev]);
                  setExtinguishers(prev => prev.map(e => e.id === id ? { ...e, lastInspectionDate: now, status: 'Operational' } : e));
                  addAuditLog('Cleared', 'Asset', extinguishers.find(e => e.id === id)?.location || 'Unknown Unit', 'Quick Inspection Cleared');
              }}
              activeCustomerId={runSheetCustomerId}
              onCustomerSelect={setRunSheetCustomerId}
              technicians={technicians}
            />
          )}

          {view === 'asset-list' && (
            <AssetList 
              extinguishers={extinguishers} 
              customers={customers} 
              records={records}
              onInspect={(id) => { setSelectedId(id); setView('inspect'); }}
              onSelect={(id) => { setSelectedId(id); }}
              onAddExtinguisher={(cid) => { setSelectedId(null); setSelectedCustomerIdForExt(cid); setIsExtinguisherModalOpen(true); }}
              onEditExtinguisher={(id) => { setSelectedId(id); setIsExtinguisherModalOpen(true); }}
              onDeleteExtinguisher={(id) => { setExtinguishers(prev => prev.filter(e => e.id !== id)); }}
              onAddCustomer={() => { setSelectedId(null); setIsCustomerModalOpen(true); }}
              onEditCustomer={handleEditCustomer}
              onQuickInspect={(id) => {
                  const now = new Date().toISOString();
                  const rec: InspectionRecord = { id: Date.now().toString(), extinguisherId: id, date: now, inspectorName: currentUser.name, checks: {}, notes: "Routine monthly inspection. Passed via QuickCheck." };
                  setRecords(prev => [rec, ...prev]);
                  setExtinguishers(prev => prev.map(e => e.id === id ? { ...e, lastInspectionDate: now, status: 'Operational' } : e));
                  addAuditLog('Cleared', 'Asset', extinguishers.find(e => e.id === id)?.location || 'Unknown Unit', 'Quick Inspection Cleared');
              }}
              onReorder={(updated) => setExtinguishers(updated)}
              deviceMagicSettings={deviceMagicSettings}
            />
          )}

          {view === 'inspect' && selectedId && (
            <InspectionForm 
              extinguisher={extinguishers.find(e => e.id === selectedId)!}
              onSubmit={(data) => {
                const now = new Date().toISOString();
                const newRecord: InspectionRecord = { ...data, id: Date.now().toString(), date: now, inspectorName: currentUser.name };
                setRecords(prev => [newRecord, ...prev]);
                setExtinguishers(prev => prev.map(e => e.id === selectedId ? { ...e, lastInspectionDate: now, status: Object.values(data.checks).every(v => v !== false) ? 'Operational' : 'Needs Attention' } : e));
                addAuditLog('Cleared', 'Asset', extinguishers.find(e => e.id === selectedId)?.location || 'Unknown', 'Manual Full Inspection Form Submitted');
                setView('run-sheets');
              }}
              onCancel={() => setView('run-sheets')}
              availableCustomChecks={customChecklistItems}
              onAddCustomCheckToLibrary={(item) => !customChecklistItems.includes(item) && setCustomChecklistItems(prev => [...prev, item])}
            />
          )}

          {view === 'history' && (
            <HistoryLog 
                records={records} 
                extinguishers={extinguishers} 
                customers={customers} 
                technicians={technicians}
                currentUser={currentUser}
                onDeleteRecords={(ids) => setRecords(prev => prev.filter(r => !ids.includes(r.id)))}
            />
          )}

          {view === 'reports' && (
            <ReportsView 
              extinguishers={extinguishers} 
              customers={customers} 
              records={records} 
              technicians={technicians}
              initialReportType={reportTypeOverride}
              initialCustomerId={reportCustomerId}
              initialMonth={reportMonth}
              initialTech={reportTech}
              currentUser={currentUser}
              onBack={() => setView('dashboard')}
            />
          )}

          {view === 'ai-chat' && <AIChat mode="consultant" />}
          {view === 'nfpa-finder' && <AIChat mode="nfpa" />}

          {view === 'settings' && (
            <SyncManager 
              customers={customers} setCustomers={setCustomers}
              extinguishers={extinguishers} setExtinguishers={setExtinguishers}
              records={records} setRecords={setRecords}
              auditLogs={auditLogs} onDeleteAuditLogs={(ids) => setAuditLogs(prev => prev.filter(l => !ids.includes(l.id)))}
              todos={todos} setTodos={setTodos}
              onImport={(data) => { setCustomers(data.customers); setExtinguishers(data.extinguishers); setRecords(data.records); setTodos(data.todos); if(data.technicians) setTechnicians(data.technicians); if(data.registeredUsers) setRegisteredUsers(data.registeredUsers); if(data.customChecklistItems) setCustomChecklistItems(data.customChecklistItems); if(data.customBatteryTypes) setCustomBatteryTypes(data.customBatteryTypes); if(data.assetTypes) setAssetTypes(data.assetTypes); if(data.extinguisherBrands) setExtinguisherBrands(data.extinguisherBrands); if(data.systemBrands) setSystemBrands(data.systemBrands); if(data.systemAgents) setSystemAgents(data.systemAgents); if(data.archivedCustomers) setArchivedCustomers(data.archivedCustomers); if(data.archivedExtinguishers) setArchivedExtinguishers(data.archivedExtinguishers); if(data.disabledBulkFields) setDisabledBulkFields(data.disabledBulkFields); if(data.dropboxSettings) setDropboxSettings(data.dropboxSettings); if(data.supabaseSettings) setSupabaseSettings(data.supabaseSettings); if(data.voiplySettings) setVoiplySettings(data.voiplySettings); if(data.deviceMagicSettings) setDeviceMagicSettings(data.deviceMagicSettings); }}
              currentUser={currentUser} onUpdateUser={setCurrentUser}
              technicians={technicians} setTechnicians={setTechnicians} onAddTechnician={(name) => setTechnicians(prev => [...new Set([...prev, name])])}
              registeredUsers={registeredUsers} onUpdateRegisteredUsers={setRegisteredUsers}
              customChecklistItems={customChecklistItems} onUpdateChecklistItems={setCustomChecklistItems}
              customBatteryTypes={customBatteryTypes} onUpdateBatteryTypes={setCustomBatteryTypes}
              disabledBulkFields={disabledBulkFields} onUpdateDisabledBulkFields={setDisabledBulkFields}
              isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              dropboxSettings={dropboxSettings} onUpdateDropboxSettings={setDropboxSettings}
              supabaseSettings={supabaseSettings} onUpdateSupabaseSettings={setSupabaseSettings}
              voiplySettings={voiplySettings} onUpdateVoiplySettings={setVoiplySettings}
              deviceMagicSettings={deviceMagicSettings} onUpdateDeviceMagicSettings={setDeviceMagicSettings}
              onDeleteRecords={(ids) => setRecords(prev => prev.filter(r => !ids.includes(r.id)))}
              assetTypes={assetTypes} setAssetTypes={setAssetTypes}
              extinguisherBrands={extinguisherBrands} setExtinguisherBrands={setExtinguisherBrands}
              systemBrands={systemBrands} setSystemBrands={setSystemBrands}
              systemAgents={systemAgents} setSystemAgents={setSystemAgents}
            />
          )}

          {view === 'customer-manager' && (
            <CustomerManager 
              customers={customers} 
              extinguishers={extinguishers} 
              records={records}
              archivedCustomers={archivedCustomers}
              onAddCustomer={() => { setSelectedId(null); setIsCustomerModalOpen(true); }}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={(id) => { 
                const cust = customers.find(c => c.id === id);
                if (cust) {
                  setArchivedCustomers(prev => [...prev, cust]);
                  setCustomers(prev => prev.filter(c => c.id !== id));
                  addAuditLog('Archived', 'Customer', cust.name);
                }
              }}
              onRestoreCustomer={(id) => {
                  const cust = archivedCustomers.find(c => c.id === id);
                  if (cust) {
                      setCustomers(prev => [...prev, cust]);
                      setArchivedCustomers(prev => prev.filter(c => c.id !== id));
                      addAuditLog('Restored', 'Customer', cust.name);
                  }
              }}
              onPermanentDeleteCustomer={(id) => {
                  const cust = archivedCustomers.find(c => c.id === id);
                  setArchivedCustomers(prev => prev.filter(c => c.id !== id));
                  if (cust) addAuditLog('Deleted', 'Customer', cust.name, 'Permanent purge from archives');
              }}
            />
          )}

          {view === 'calendar' && (
            <CalendarView 
              customers={customers}
              technicians={technicians}
              onScheduleDateChange={handleUpdateCustomerScheduleDate}
              onScheduleTimeChange={handleUpdateCustomerScheduleTime}
              onOpenRunSheet={(id) => { setRunSheetCustomerId(id); setView('run-sheets'); }}
              onEditCustomer={handleEditCustomer}
              onViewReport={handleViewReportFromTracker}
              onAddCustomerAndSchedule={(name, date, time) => {
                  const newId = `c_${Date.now()}`;
                  const newCust: Customer = { id: newId, name, address: 'Pending Entry', contactPerson: '', phone: '', serviceMonths: [date.month], extinguisherTech: currentUser.name, scheduledServiceDate: date, scheduledServiceTime: time, scheduledBy: currentUser.name };
                  setCustomers(prev => [...prev, newCust]);
                  addAuditLog('Created', 'Customer', name, `Quick schedule added from calendar for ${date.month}/${date.day}`);
              }}
              currentUser={currentUser}
            />
          )}

          {view === 'quick-links' && (
            <QuickLinksManager 
              quickLinks={quickLinks}
              onAdd={(link) => { const updated = [...quickLinks, link]; setQuickLinks(updated); localStorage.setItem('fire_safety_quick_links', JSON.stringify(updated)); }}
              onDelete={(id) => { const updated = quickLinks.filter(l => l.id !== id); setQuickLinks(updated); localStorage.setItem('fire_safety_quick_links', JSON.stringify(updated)); }}
              onNavigate={setView}
            />
          )}

          {view === 'messages' && (
            <MessagesView 
                customers={customers}
                messages={messages}
                onSetMessages={setMessages}
                onRefresh={loadMessages}
                onNavigateToCustomer={(id) => { setRunSheetCustomerId(id); setView('run-sheets'); }}
                onNavigateToSettings={() => setView('settings')}
            />
          )}

          {view === 'forms' && (
            <FormsView 
                settings={deviceMagicSettings}
                customers={customers}
                onNavigateToSettings={() => setView('settings')}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {isCustomerModalOpen && (
        <CustomerModal 
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSubmit={(data) => {
            if (selectedId) {
              setCustomers(prev => prev.map(c => c.id === selectedId ? { ...c, ...data } : c));
              addAuditLog('Updated', 'Customer', data.name);
            } else {
              const newId = `c_${Date.now()}`;
              setCustomers(prev => [...prev, { ...data, id: newId }]);
              addAuditLog('Created', 'Customer', data.name);
            }
            setIsCustomerModalOpen(false);
          }}
          initialData={selectedId ? (customers.find(c => c.id === selectedId) || archivedCustomers.find(c => c.id === selectedId)) : null}
          extinguishers={extinguishers}
          technicians={technicians}
        />
      )}

      {isExtinguisherModalOpen && (
        <ExtinguisherModal 
          isOpen={isExtinguisherModalOpen}
          onClose={() => setIsExtinguisherModalOpen(false)}
          onSubmit={(data, addAnother) => {
            if (selectedId) {
              setExtinguishers(prev => prev.map(e => e.id === selectedId ? { ...e, ...data } : e));
              addAuditLog('Updated', 'Asset', `${data.type} at ${data.location}`);
            } else {
              const newId = `e_${Date.now()}`;
              setExtinguishers(prev => [...prev, { ...data, id: newId }]);
              addAuditLog('Created', 'Asset', `${data.type} at ${data.location}`);
            }
            if (!addAnother) setIsExtinguisherModalOpen(false);
          }}
          initialData={selectedId ? extinguishers.find(e => e.id === selectedId) : null}
          customers={customers}
          initialCustomerId={selectedCustomerIdForExt || undefined}
          extinguishers={extinguishers}
          customBatteryTypes={customBatteryTypes}
        />
      )}
    </div>
  );
};

export default App;