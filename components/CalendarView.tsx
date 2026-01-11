import React, { useState, useMemo, useEffect } from 'react';
import { Customer, User } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User as UserIcon, Building2, MapPin, Phone, ClipboardList, Edit2, Search, X, Clock, Plus, LayoutGrid, CalendarDays, List, Trash2, FileText, Layers, GripVertical, Check } from 'lucide-react';
import { Button } from './Button';
import { ReportType } from './ReportsView';

interface CalendarViewProps {
  customers: Customer[];
  technicians: string[];
  onScheduleDateChange: (customerId: string, date: { month: number; day: number } | undefined) => void;
  onScheduleTimeChange: (customerId: string, time: string | undefined) => void;
  onOpenRunSheet: (id: string) => void;
  onEditCustomer: (id: string) => void;
  onViewReport?: (type: ReportType, filters: { customerId: string, month: number, year: number, tech: string }) => void;
  onAddCustomerAndSchedule?: (name: string, date: { month: number; day: number }, time: string) => void;
  currentUser: User | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ViewMode = 'day' | 'week' | 'month';

const formatTo12H = (time24?: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  customers,
  technicians,
  onScheduleDateChange,
  onScheduleTimeChange,
  onOpenRunSheet,
  onEditCustomer,
  onViewReport,
  onAddCustomerAndSchedule,
  currentUser
}) => {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [selectedTech, setSelectedTech] = useState<string>('All');
  
  // Rescheduling Drag State
  const [draggedCustomerId, setDraggedCustomerId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Quick Schedule Modal State
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('08:00');

  // Calendar Logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Reset modal state when it opens
  useEffect(() => {
    if (isQuickScheduleOpen) {
      const d = selectedDay || now.getDate();
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      setModalDate(dateStr);
      setSearchQuery('');
      setSelectedCustomerId(null);
    }
  }, [isQuickScheduleOpen]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const scheduledCustomers = useMemo(() => {
    return customers.filter(c => {
      const hasDate = c.scheduledServiceDate?.month === currentMonth + 1;
      if (!hasDate) return false;
      
      if (selectedTech === 'All') return true;
      const tech = c.extinguisherTech || c.assignedTechnician;
      const sysTech = c.systemTech;
      return tech === selectedTech || sysTech === selectedTech;
    });
  }, [customers, currentMonth, selectedTech]);

  const agendaItems = useMemo(() => {
    if (!selectedDay) return [];
    return scheduledCustomers.filter(c => c.scheduledServiceDate?.day === selectedDay)
      .sort((a, b) => (a.scheduledServiceTime || 'zzzz').localeCompare(b.scheduledServiceTime || 'zzzz'));
  }, [scheduledCustomers, selectedDay]);

  const weekItems = useMemo(() => {
    if (!selectedDay) return [];
    const startOfWeek = selectedDay - (new Date(currentYear, currentMonth, selectedDay).getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = startOfWeek + i;
      if (d <= 0 || d > daysInMonth) return { day: d, jobs: [] };
      return {
        day: d,
        jobs: scheduledCustomers.filter(c => c.scheduledServiceDate?.day === d)
      };
    });
  }, [scheduledCustomers, selectedDay, currentMonth, currentYear, daysInMonth]);

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !modalDate) return;

    const [y, m, d] = modalDate.split('-').map(Number);
    const dateObj = { month: m, day: d };

    if (selectedCustomerId) {
      onScheduleDateChange(selectedCustomerId, dateObj);
      onScheduleTimeChange(selectedCustomerId, modalTime);
    } else if (onAddCustomerAndSchedule) {
      // Create new customer and schedule
      onAddCustomerAndSchedule(searchQuery.trim(), dateObj, modalTime);
    }

    setIsQuickScheduleOpen(false);
  };

  const handleSelectExisting = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setSearchQuery(c.name);
  };

  const handleTriggerCombinedReport = (customerId: string, tech?: string) => {
    if (onViewReport) {
        onViewReport('combined_out', {
            customerId,
            month: currentMonth + 1,
            year: currentYear,
            tech: tech || 'All'
        });
    }
  };

  // Drag and Drop Rescheduling
  const onDragStart = (e: React.DragEvent, customerId: string) => {
    setDraggedCustomerId(customerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDay(day);
  };

  const onDrop = (e: React.DragEvent, targetDay: number) => {
    e.preventDefault();
    if (draggedCustomerId) {
      onScheduleDateChange(draggedCustomerId, { month: currentMonth + 1, day: targetDay });
    }
    setDraggedCustomerId(null);
    setDragOverDay(null);
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-safety-600" />
            Calendar
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage on-site schedules</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => setViewMode('month')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" /> Month
                </button>
                <button 
                    onClick={() => setViewMode('week')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CalendarDays className="w-3.5 h-3.5" /> Week
                </button>
                <button 
                    onClick={() => setViewMode('day')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List className="w-3.5 h-3.5" /> Day
                </button>
            </div>

           <div className="relative md:w-48">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-safety-500 outline-none dark:text-white appearance-none cursor-pointer"
              >
                <option value="All">All Techs</option>
                {technicians.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[500px]">
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                        {MONTHS[currentMonth]} {currentYear}
                    </h3>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                
                {viewMode === 'month' && (
                    <div className="animate-fadeIn">
                        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                            {DAYS_SHORT.map(day => (
                                <div key={day} className="py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 last:border-r-0"></div>
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isSelected = selectedDay === day;
                                const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
                                const dayJobs = scheduledCustomers.filter(c => c.scheduledServiceDate?.day === day);
                                const isDragOver = dragOverDay === day;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        onDragOver={(e) => onDragOver(e, day)}
                                        onDrop={(e) => onDrop(e, day)}
                                        className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 last:border-r-0 flex flex-col p-1 transition-all group relative ${
                                            isSelected 
                                                ? 'bg-safety-50 dark:bg-safety-900/20 ring-2 ring-safety-500 ring-inset z-10 shadow-inner' 
                                                : isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset z-10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded-full ${
                                                isToday ? 'bg-safety-600 text-white' : 'text-gray-400'
                                            }`}>
                                                {day}
                                            </span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setIsQuickScheduleOpen(true); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-safety-600 transition-opacity"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                                            {dayJobs.slice(0, 3).map((job, idx) => (
                                                <div 
                                                    key={idx} 
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, job.id)}
                                                    className={`bg-blue-100 dark:bg-blue-900/40 text-[9px] px-1.5 py-1 rounded text-blue-800 dark:text-blue-300 font-bold truncate text-left border border-blue-200 dark:border-blue-800 flex justify-between items-center gap-1 shadow-sm cursor-grab active:cursor-grabbing hover:bg-blue-200 dark:hover:bg-blue-900/60 ${draggedCustomerId === job.id ? 'opacity-50 grayscale' : ''}`}
                                                >
                                                    <span className="truncate">{job.name}</span>
                                                    {job.scheduledServiceTime && <span className="opacity-70 text-[8px] whitespace-nowrap">{formatTo12H(job.scheduledServiceTime)}</span>}
                                                </div>
                                            ))}
                                            {dayJobs.length > 3 && (
                                                <span className="text-[9px] font-black text-gray-400 text-left px-1 uppercase tracking-widest">+{dayJobs.length - 3} more</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewMode === 'week' && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-7 gap-3 animate-fadeIn">
                        {weekItems.map((item, idx) => {
                            const isToday = item.day === now.getDate() && currentMonth === now.getMonth();
                            const isDragOver = dragOverDay === item.day;
                            return (
                                <div 
                                    key={idx} 
                                    onDragOver={(e) => item.day > 0 && onDragOver(e, item.day)}
                                    onDrop={(e) => item.day > 0 && onDrop(e, item.day)}
                                    className={`flex flex-col rounded-xl border p-3 min-h-[400px] transition-all ${item.day === selectedDay ? 'border-safety-500 ring-2 ring-safety-500/20 bg-safety-50/10' : isDragOver ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-700'}`}
                                >
                                    <div className="text-center mb-3 group">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{DAYS_SHORT[idx]}</p>
                                        <div className="flex items-center justify-center gap-1 mt-1">
                                            <p onClick={() => setSelectedDay(item.day)} className={`w-8 h-8 flex items-center justify-center rounded-full font-black cursor-pointer transition-colors ${item.day === selectedDay ? 'bg-safety-600 text-white shadow-lg' : isToday ? 'bg-blue-100 text-blue-600' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                {item.day > 0 && item.day <= daysInMonth ? item.day : ''}
                                            </p>
                                            {item.day > 0 && (
                                                <button onClick={() => { setSelectedDay(item.day); setIsQuickScheduleOpen(true); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-safety-600 transition-opacity">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {item.jobs.map(job => (
                                            <div 
                                                key={job.id} 
                                                draggable
                                                onDragStart={(e) => onDragStart(e, job.id)}
                                                onClick={() => { setSelectedDay(item.day); }} 
                                                className={`bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all group ${draggedCustomerId === job.id ? 'opacity-50' : ''}`}
                                            >
                                                <p className="text-[10px] font-black text-blue-600 truncate">{job.name}</p>
                                                <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-500 font-bold">
                                                    <Clock className="w-3 h-3" /> {formatTo12H(job.scheduledServiceTime) || 'TBD'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'day' && (
                    <div className="p-6 animate-fadeIn">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Route: {MONTHS[currentMonth]} {selectedDay}
                            </h4>
                            <div className="flex gap-2">
                                <Button onClick={() => setIsQuickScheduleOpen(true)} size="sm" variant="secondary" icon={<Plus className="w-4 h-4"/>}>Add Stop</Button>
                                <span className="bg-safety-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center">
                                    {agendaItems.length} Stops
                                </span>
                            </div>
                        </div>
                        <div className="space-y-4 max-w-2xl">
                            {agendaItems.map((job, idx) => (
                                <div 
                                    key={job.id} 
                                    draggable
                                    onDragStart={(e) => onDragStart(e, job.id)}
                                    className={`flex gap-4 group cursor-grab active:cursor-grabbing ${draggedCustomerId === job.id ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-black text-gray-400">
                                            {idx + 1}
                                        </div>
                                        {idx < agendaItems.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-800 my-1"></div>}
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm group-hover:border-safety-400 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                                <GripVertical className="w-4 h-4 text-gray-300" />
                                                {job.name}
                                            </h5>
                                            <div className="flex items-center text-safety-600 font-black text-xs bg-safety-50 dark:bg-safety-900/30 px-2 py-1 rounded-lg">
                                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                {formatTo12H(job.scheduledServiceTime) || 'Not Set'}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5 pl-6">
                                            <MapPin className="w-3.5 h-3.5" /> {job.address}
                                        </p>
                                        <div className="flex gap-2 pl-6">
                                            <Button onClick={() => handleTriggerCombinedReport(job.id, job.extinguisherTech || job.assignedTechnician)} size="sm" variant="secondary" className="text-[10px] uppercase font-black tracking-widest px-4" icon={<Layers className="w-3.5 h-3.5" />}>Out Report</Button>
                                            <Button onClick={() => onEditCustomer(job.id)} size="sm" variant="ghost" className="text-[10px] uppercase font-black tracking-widest">Edit</Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {agendaItems.length === 0 && (
                                <div className="text-center py-20 text-gray-400 italic">No jobs scheduled for this day.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Agenda Pane */}
        <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Day Quick-Agenda
                </h4>
                <button 
                    onClick={() => { if(selectedDay) setIsQuickScheduleOpen(true); }}
                    className={`p-1.5 rounded-lg transition-colors ${selectedDay ? 'bg-safety-100 text-safety-700 dark:bg-safety-900/30 dark:text-safety-400 hover:bg-safety-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                    disabled={!selectedDay}
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-3">
                {agendaItems.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 shadow-inner">
                        <CalendarIcon className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Jobs Scheduled</p>
                        {selectedDay && <p className="text-[9px] text-gray-400 mt-1 italic">Click '+' to add to {MONTHS[currentMonth]} {selectedDay}</p>}
                    </div>
                ) : (
                    agendaItems.map(customer => (
                        <div 
                            key={customer.id} 
                            draggable
                            onDragStart={(e) => onDragStart(e, customer.id)}
                            className={`bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-safety-500 transition-all group cursor-grab active:cursor-grabbing ${draggedCustomerId === customer.id ? 'opacity-50 border-dashed' : ''}`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <GripVertical className="w-3 h-3 text-gray-300" />
                                <h5 className="font-black text-gray-900 dark:text-white text-xs truncate">{customer.name}</h5>
                            </div>
                            <div className="flex items-center gap-2 mb-3 pl-5">
                                <Clock className="w-3 h-3 text-safety-500" />
                                <input 
                                  type="time" 
                                  value={customer.scheduledServiceTime || ''}
                                  onChange={(e) => onScheduleTimeChange(customer.id, e.target.value)}
                                  className="text-[10px] font-bold bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-safety-500 dark:text-white"
                                />
                                {customer.scheduledServiceTime && (
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">({formatTo12H(customer.scheduledServiceTime)})</span>
                                )}
                            </div>
                            <div className="flex gap-2 pl-5">
                                <button onClick={() => handleTriggerCombinedReport(customer.id, customer.extinguisherTech || customer.assignedTechnician)} className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                                    <Layers className="w-3 h-3" /> Report
                                </button>
                                <button onClick={() => onScheduleDateChange(customer.id, undefined)} className="p-1.5 text-gray-300 hover:text-red-500" title="Remove from Agenda"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Add Stop to Route Modal */}
      {isQuickScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Plus className="w-5 h-5 text-safety-600" />
                          Add Stop to Route
                      </h3>
                      <button onClick={() => setIsQuickScheduleOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
                      {/* Name Entry / Search */}
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Business or Contact Name</label>
                          <div className="relative">
                              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                              <input 
                                type="text" 
                                placeholder="Search existing or type new name..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    // If typing manually, deselect existing
                                    if (selectedCustomerId) setSelectedCustomerId(null);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-sm font-medium"
                                autoFocus
                              />
                          </div>
                          
                          {/* Search Results Dropdown */}
                          {searchQuery.trim().length >= 2 && !selectedCustomerId && (
                              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 shadow-inner">
                                  {customers
                                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .slice(0, 5)
                                    .map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectExisting(c)}
                                            className="w-full text-left p-3 hover:bg-white dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 last:border-none transition-colors flex items-center justify-between group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{c.address}</p>
                                            </div>
                                            <div className="bg-blue-50 text-blue-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        </button>
                                    ))
                                  }
                                  {searchQuery.trim().length >= 2 && (
                                    <div className="p-3 text-center border-t border-gray-100 dark:border-gray-800 bg-white/30">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight italic">
                                            No more matches. Hit 'Add' to create as manual stop.
                                        </p>
                                    </div>
                                  )}
                              </div>
                          )}
                          
                          {selectedCustomerId && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 animate-fadeIn">
                                  <div className="w-6 h-6 bg-green-500 text-white rounded-lg flex items-center justify-center">
                                      <Check className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-widest">Linked to Record</span>
                              </div>
                          )}
                      </div>

                      {/* Date & Time Grid */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Date</label>
                              <div className="relative">
                                  <CalendarIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                  <input 
                                    type="date"
                                    value={modalDate}
                                    onChange={(e) => setModalDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-sm font-bold"
                                    required
                                  />
                              </div>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Arrival Time</label>
                              <div className="relative">
                                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                  <input 
                                    type="time"
                                    value={modalTime}
                                    onChange={(e) => setModalTime(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-sm font-bold"
                                    required
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="pt-2">
                          <Button 
                            type="submit" 
                            variant="primary"
                            className="w-full justify-center py-3 shadow-lg shadow-safety-200 dark:shadow-none"
                            disabled={!searchQuery.trim() || !modalDate}
                          >
                             {selectedCustomerId ? 'Confirm Agenda Placement' : 'Create & Add Manual Stop'}
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};