
import React, { useState, useEffect, useRef } from 'react';
import { Customer, Todo, User, QuickLink, ViewState } from '../types';
import { Briefcase, Wrench, Calendar, BarChart3, UserPlus, ListTodo, Plus, Trash2, CheckSquare, Square, Clock, X, Zap, Building, User as UserIcon, FileBarChart, Shield, ClipboardList, LayoutGrid, ExternalLink, Users, CalendarClock, Hand, Edit3, Save, XCircle } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  customers: Customer[];
  onTechClick?: (tech: string) => void;
  onAddCustomer?: () => void;
  todos: Todo[];
  onAddTodo: (text: string, customerId?: string, dueDate?: string, addedBy?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo?: (id: string, text: string) => void;
  onAssignTodo?: (id: string, technicianName: string | undefined) => void;
  onClearCompletedTodos: () => void;
  onCustomerClick?: (customerId: string) => void;
  currentUser: User | null;
  quickLinks: QuickLink[];
  onNavigate: (view: ViewState) => void;
}

const ICON_MAP: Record<string, any> = {
  'Reports': FileBarChart,
  'Calendar': Calendar,
  'Schedule': Briefcase,
  'Customers': Users,
  'Sheets': ClipboardList,
  'Codes': Shield,
  'Quick': Zap,
};

const formatTo12H = (time24?: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    customers, 
    onTechClick, 
    onAddCustomer,
    todos,
    onAddTodo,
    onToggleTodo,
    onDeleteTodo,
    onUpdateTodo,
    onAssignTodo,
    onClearCompletedTodos,
    onCustomerClick,
    currentUser,
    quickLinks,
    onNavigate
}) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const todayDay = currentDate.getDate();
  
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Searchable Dropdown State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Edit State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
  };

  const startEditing = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  };

  const cancelEditing = () => {
    setEditingTodoId(null);
    setEditingTodoText('');
  };

  const saveEdit = (id: string) => {
    if (onUpdateTodo && editingTodoText.trim()) {
        onUpdateTodo(id, editingTodoText.trim());
    }
    setEditingTodoId(null);
  };

  // Helper: Is a service pending?
  const isServicePending = (c: Customer, type: 'Extinguisher' | 'System', month: number) => {
    const done = c.completedServices?.some(s => s.type === type && s.year === currentYear && s.month === month);
    return !done;
  };

  // Helper: Get overdue/due months for Workload counts
  const getPendingMonths = (c: Customer, type: 'Extinguisher' | 'System') => {
      const scheduledMonths = type === 'Extinguisher' ? c.serviceMonths : c.systemMonths;
      if (!scheduledMonths) return [];
      const monthsToCheck = Array.from({length: currentMonth}, (_, i) => i + 1);
      return monthsToCheck.filter(m => scheduledMonths.includes(m) && isServicePending(c, type, m));
  };

  const extCustomers = customers.filter(c => getPendingMonths(c, 'Extinguisher').length > 0);
  const sysCustomers = customers.filter(c => getPendingMonths(c, 'System').length > 0);
  
  const techWorkload: Record<string, { stops: Set<string>; extCount: number; sysCount: number }> = {};

  const initTechWorkload = (tech: string) => {
      const t = tech || 'None';
      if (!techWorkload[t]) techWorkload[t] = { stops: new Set(), extCount: 0, sysCount: 0 };
      return t;
  };

  extCustomers.forEach(c => {
    const techName = c.extinguisherTech || c.assignedTechnician || 'None';
    const tech = initTechWorkload(techName);
    techWorkload[tech].stops.add(c.id);
    techWorkload[tech].extCount += 1; 
  });

  sysCustomers.forEach(c => {
    const techName = c.systemTech || 'None';
    const tech = initTechWorkload(techName);
    techWorkload[tech].stops.add(c.id);
    techWorkload[tech].sysCount += 1;
  });

  const handleTodoSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newTodoText.trim()) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;
          onAddTodo(newTodoText.trim(), selectedCustomerId || undefined, todayStr, currentUser?.name);
          setNewTodoText('');
          setSelectedCustomerId('');
          setCustomerSearch('');
      }
  };

  const sortedWorkload = Object.entries(techWorkload).sort(([techA], [techB]) => {
      const nameA = techA.toLowerCase().trim();
      const nameB = techB.toLowerCase().trim();
      const currentName = (currentUser?.name || '').toLowerCase().trim();
      const currentFirst = currentName.split(' ')[0];

      const isCurrentA = nameA === currentName || nameA === currentFirst;
      const isCurrentB = nameB === currentName || nameB === currentFirst;

      if (isCurrentA && !isCurrentB) return -1;
      if (!isCurrentA && isCurrentB) return 1;

      return techA.localeCompare(techB);
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="flex flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400">Service Overview for {currentMonthName} {currentYear}</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="hidden md:flex bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 items-center shadow-sm w-fit">
                <Calendar className="w-4 h-4 mr-2 text-safety-600" />
                {currentMonthName}
            </div>
            <button 
                onClick={onAddCustomer} 
                className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-safety-600 dark:hover:text-safety-400 shadow-sm transition-colors"
                title="Add New Customer"
            >
                <UserPlus className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Quick Access Widget */}
      {quickLinks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4">
                <Zap className="w-5 h-5 mr-2 text-orange-500" />
                Quick Access
            </h3>
            <div className="flex flex-wrap gap-3">
                {quickLinks.map(link => {
                    const IconComp = ICON_MAP[link.iconName] || ExternalLink;
                    return (
                        <button
                            key={link.id}
                            onClick={() => onNavigate(link.targetView)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-safety-50 dark:hover:bg-safety-900/30 text-gray-700 dark:text-gray-200 hover:text-safety-600 dark:hover:text-safety-400 rounded-xl border border-gray-100 dark:border-gray-600 transition-all font-bold text-sm shadow-sm"
                        >
                            <IconComp className="w-4 h-4" />
                            {link.label}
                        </button>
                    );
                })}
            </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-gray-400" />
                  Technician Workload
              </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedWorkload.length > 0 ? (
                  sortedWorkload.map(([tech, counts]) => {
                      const isMe = tech.toLowerCase().trim() === (currentUser?.name.toLowerCase().trim() || '') || tech.toLowerCase().trim() === (currentUser?.name.toLowerCase().split(' ')[0].trim() || '');
                      const techLower = tech.toLowerCase().trim();

                      // STRICT Marquee Logic: 
                      // 1. Must have explicitly set date for TODAY
                      // 2. Must NOT be marked as completed in Service Tracker for THIS MONTH
                      const todaySkdAppointments = customers.filter(c => {
                          const isScheduledToday = c.scheduledServiceDate?.month === currentMonth && c.scheduledServiceDate?.day === todayDay;
                          if (!isScheduledToday) return false;
                          
                          const extTechLower = (c.extinguisherTech || c.assignedTechnician || '').toLowerCase().trim();
                          const sysTechLower = (c.systemTech || '').toLowerCase().trim();
                          const belongsToThisTech = extTechLower === techLower || sysTechLower === techLower;
                          if (!belongsToThisTech) return false;

                          // Completion check: Find if the assigned tasks for this stop are done
                          const extAssignedToThisTile = extTechLower === techLower;
                          const sysAssignedToThisTile = sysTechLower === techLower;

                          const extDone = c.completedServices?.some(s => s.type === 'Extinguisher' && s.month === currentMonth && s.year === currentYear);
                          const sysDone = c.completedServices?.some(s => s.type === 'System' && s.month === currentMonth && s.year === currentYear);

                          // Logic: The notification stays if any assigned work for this tech at this site is still pending
                          const extPending = extAssignedToThisTile && !extDone;
                          const sysPending = sysAssignedToThisTile && !sysDone;

                          return extPending || sysPending;
                      }).sort((a, b) => (a.scheduledServiceTime || '23:59').localeCompare(b.scheduledServiceTime || '23:59'));

                      return (
                        <div key={tech} onClick={() => onTechClick?.(tech)} className="group cursor-pointer bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-safety-500 transition-colors relative flex flex-col overflow-hidden">
                            {isMe && todaySkdAppointments.length > 0 && (
                                <div className="mb-4 space-y-2 animate-fadeIn">
                                    <div className="flex items-center gap-2 px-1">
                                        <CalendarClock className="w-3.5 h-3.5 text-safety-600 dark:text-safety-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scheduled Today</span>
                                    </div>
                                    <div className="relative overflow-hidden bg-safety-600/5 dark:bg-safety-400/5 rounded-lg py-1 border border-safety-600/10">
                                        <div className="animate-marquee whitespace-nowrap">
                                            {[...todaySkdAppointments, ...todaySkdAppointments].map((app, appIdx) => (
                                                <div key={`${app.id}-${appIdx}`} className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 bg-safety-600 text-white rounded-lg shadow-sm">
                                                    <span className="text-[8px] font-black bg-white/20 px-1 py-0.5 rounded uppercase tracking-tighter">{formatTo12H(app.scheduledServiceTime) || 'TBD'}</span>
                                                    <span className="text-[10px] font-bold">{app.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-safety-600 transition-colors">
                                    {tech} { isMe && <span className="ml-1 text-[10px] text-blue-500 font-black uppercase">(You)</span> }
                                </span>
                                <span className="text-xs font-black text-safety-600 dark:text-safety-400 bg-safety-50 dark:bg-safety-900/50 px-2 py-0.5 rounded">{counts.stops.size} Stops</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 flex overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(counts.extCount / (counts.extCount + counts.sysCount)) * 100 || 0}%` }}></div>
                                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(counts.sysCount / (counts.extCount + counts.sysCount)) * 100 || 0}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-tight text-gray-400">
                                <span>Ext: {counts.extCount}</span>
                                <span>Sys: {counts.sysCount}</span>
                            </div>
                        </div>
                      );
                  })
              ) : (
                  <div className="col-span-full text-center py-8 text-gray-400 italic text-sm">No services pending for any technician.</div>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <ListTodo className="w-5 h-5 mr-2 text-gray-400" />
                    Quick Tasks
                </h3>
                {todos.some(t => t.completed) && (
                    <button onClick={onClearCompletedTodos} className="text-xs text-red-500 hover:underline font-bold">Clear Done</button>
                )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {todos.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic">No pending tasks.</div>
                ) : (
                    todos.map(todo => {
                        const isOwnedByMe = todo.ownedBy === currentUser?.name;
                        const isOwnedByOther = todo.ownedBy && todo.ownedBy !== currentUser?.name;
                        const isEditing = editingTodoId === todo.id;

                        return (
                            <div key={todo.id} className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900' : ''}`}>
                                <button onClick={() => onToggleTodo(todo.id)} className={`mt-0.5 transition-colors ${todo.completed ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>
                                    {todo.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <div className="space-y-2 animate-fadeIn">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={editingTodoText} 
                                                onChange={(e) => setEditingTodoText(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(todo.id);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => saveEdit(todo.id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm hover:bg-blue-700"
                                                >
                                                    <Save className="w-3 h-3" /> Save Changes
                                                </button>
                                                <button 
                                                    onClick={cancelEditing}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-gray-200"
                                                >
                                                    <XCircle className="w-3 h-3" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`text-sm font-medium ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{todo.text}</p>
                                                {todo.ownedBy && !todo.completed && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1 ${isOwnedByMe ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                        <Hand className="w-2.5 h-2.5" />
                                                        {isOwnedByMe ? 'You have this' : `${todo.ownedBy} attending`}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] font-medium text-gray-400">
                                                {todo.customerId && (
                                                    <button onClick={() => onCustomerClick?.(todo.customerId!)} className="text-blue-500 hover:underline flex items-center gap-1">
                                                        <Building className="w-3 h-3" />
                                                        {customers.find(c => c.id === todo.customerId)?.name || 'View Site'}
                                                    </button>
                                                )}
                                                {todo.addedBy && (
                                                    <span className="flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" />
                                                        by {todo.addedBy}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(todo.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {!isEditing && (
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => startEditing(todo)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 transition-all"
                                            title="Edit task"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        {!todo.completed && (
                                            <button 
                                                onClick={() => onAssignTodo?.(todo.id, todo.ownedBy ? undefined : (currentUser?.name || 'Unknown'))}
                                                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-tighter ${todo.ownedBy ? 'text-gray-400 hover:text-red-500' : 'text-blue-600 hover:bg-blue-50'}`}
                                                title={todo.ownedBy ? "Release task" : "Take ownership"}
                                            >
                                                {todo.ownedBy ? (isOwnedByMe ? 'Release' : 'Unclaim') : 'Take Task'}
                                            </button>
                                        )}
                                        <button onClick={() => onDeleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={handleTodoSubmit} className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        placeholder="Task description..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white"
                        required
                    />
                    <Button type="submit" size="sm" disabled={!newTodoText.trim()}>Add Task</Button>
                </div>

                <div className="relative" ref={searchRef}>
                    <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={customerSearch}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowCustomerDropdown(true);
                                if (selectedCustomerId) setSelectedCustomerId('');
                            }}
                            placeholder="Optional: Link to customer..."
                            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white"
                        />
                        {customerSearch && (
                            <button 
                                type="button" 
                                onClick={handleClearCustomer} 
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {showCustomerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                            {customers
                                .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                                .slice(0, 50)
                                .map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleSelectCustomer(c)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-none border-gray-100 dark:border-gray-700 dark:text-white"
                                    >
                                        <p className="font-semibold">{c.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{c.address}</p>
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
