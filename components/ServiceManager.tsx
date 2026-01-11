import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Extinguisher, User, DeviceMagicSettings, ViewState } from '../types';
import { Button } from './Button';
import { Search, Building2, CheckCircle, MapPin, Edit2, ClipboardList, Phone, KeyRound, Clipboard, ClipboardCheck, Calendar, PackageMinus, Cylinder, Rows, LayoutList, User as UserIcon, CalendarClock, Lock, Save as SaveIcon, Check, Smartphone, ExternalLink } from 'lucide-react';
import { ReportType } from './ReportsView';

interface ServiceManagerProps {
  customers: Customer[];
  extinguishers: Extinguisher[];
  onMarkComplete: (customerId: string, type: 'Extinguisher' | 'System', year: number, month: number, customDate?: string) => void;
  onUndoComplete: (customerId: string, type: 'Extinguisher' | 'System', year: number, month: number) => void;
  onEditCustomer: (id: string, targetSection?: 'extinguishersOut' | 'systemTanks') => void;
  onOpenRunSheet: (id: string) => void;
  onViewReport: (type: ReportType, filters: { customerId: string, month: number, year: number, tech: string }) => void;
  onScheduleDateChange: (customerId: string, date: { month: number; day: number } | undefined) => void;
  onScheduleTimeChange: (customerId: string, time: string | undefined) => void;
  initialTech?: string | null;
  technicians: string[];
  initialSearchTerm?: string;
  currentUser?: User | null;
  deviceMagicSettings?: DeviceMagicSettings;
  onNavigate?: (view: ViewState) => void;
}

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
];

const formatTo12H = (time24?: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const ServiceManager: React.FC<ServiceManagerProps> = ({ 
    customers, 
    extinguishers,
    onMarkComplete, 
    onUndoComplete,
    onEditCustomer,
    onOpenRunSheet,
    onViewReport,
    onScheduleDateChange,
    onScheduleTimeChange,
    initialTech,
    technicians,
    initialSearchTerm,
    currentUser,
    deviceMagicSettings,
    onNavigate
}) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [scheduleOpenMap, setScheduleOpenMap] = useState<Record<string, boolean>>({});
  
  // Track which systems have had their forms launched this session
  const [systemFormLaunchedMap, setSystemFormLaunchedMap] = useState<Record<string, boolean>>({});
  
  // Staged changes for scheduling to keep UI stable while editing
  const [localSchedules, setLocalSchedules] = useState<Record<string, { month?: number; day?: number; time?: string }>>({});

  const getMatchingTech = (user: User | null | undefined, techList: string[]) => {
      if (!user) return null;
      const userName = user.name.toLowerCase().trim();
      const userFirst = userName.split(' ')[0];
      
      let match = techList.find(t => t.toLowerCase().trim() === userName);
      if (match) return match;
      
      match = techList.find(t => t.toLowerCase().trim() === userFirst);
      if (match) return match;

      match = techList.find(t => {
          const tLower = t.toLowerCase().trim();
          const tFirst = tLower.split(' ')[0];
          return tFirst === userFirst;
      });
      if (match) return match;
      
      return null;
  };

  const [selectedTech, setSelectedTech] = useState<string>(() => {
      if (initialTech) return initialTech;
      const match = getMatchingTech(currentUser, technicians);
      return match || 'All';
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  const sortedTechnicians = useMemo(() => {
      let sorted = [...technicians];
      
      if (currentUser) {
          const userName = currentUser.name.toLowerCase().trim();
          const userFirst = userName.split(' ')[0];
          
          let matchName = sorted.find(t => t.toLowerCase().trim() === userName);
          if (!matchName) matchName = sorted.find(t => t.toLowerCase().trim() === userFirst);
          if (!matchName) matchName = sorted.find(t => {
              const tLower = t.toLowerCase().trim();
              const tFirst = tLower.split(' ')[0];
              return tFirst === userFirst;
          });

          if (matchName) {
              const techIndex = sorted.indexOf(matchName);
              if (techIndex > -1) {
                  sorted.splice(techIndex, 1);
                  sorted.unshift(matchName);
              }
          }
      }
      return sorted;
  }, [technicians, currentUser]);

  const [isCondensed, setIsCondensed] = useState(() => {
      const saved = localStorage.getItem('serviceTrackerCondensedView');
      return saved === 'true';
  });

  useEffect(() => {
      localStorage.setItem('serviceTrackerCondensedView', String(isCondensed));
  }, [isCondensed]);

  const [showCompleted, setShowCompleted] = useState(() => {
      const saved = localStorage.getItem('serviceTrackerShowCompleted');
      return saved === 'true';
  });

  useEffect(() => {
      localStorage.setItem('serviceTrackerShowCompleted', String(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    if (initialTech) {
        setSelectedTech(initialTech);
    }
  }, [initialTech]);

  useEffect(() => {
    if (typeof initialSearchTerm === 'string') {
        setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - 1 + i);

  const getCity = (addr: string) => {
    if (!addr) return '';
    const parts = addr.split(',');
    return parts.length > 1 ? parts[1].trim() : addr;
  };

  const toggleSchedule = (tileKey: string, customerId: string) => {
      const isOpen = !!scheduleOpenMap[tileKey];
      if (!isOpen) {
          // Opening: Load current customer data into local state
          const customer = customers.find(c => c.id === customerId);
          if (customer) {
              setLocalSchedules(prev => ({
                  ...prev,
                  [customerId]: {
                      month: customer.scheduledServiceDate?.month,
                      day: customer.scheduledServiceDate?.day,
                      time: customer.scheduledServiceTime
                  }
              }));
          }
          setScheduleOpenMap(prev => ({ ...prev, [tileKey]: true }));
      } else {
          // Closing: Simply close without committing (or call commit logic if desired)
          handleSaveSchedule(customerId, tileKey);
      }
  };

  const handleSaveSchedule = (customerId: string, tileKey: string) => {
      const local = localSchedules[customerId];
      if (local) {
          if (local.month !== undefined && local.day !== undefined) {
              onScheduleDateChange(customerId, { month: local.month, day: local.day });
          } else {
              onScheduleDateChange(customerId, undefined);
          }
          onScheduleTimeChange(customerId, local.time);
      }
      setScheduleOpenMap(prev => ({ ...prev, [tileKey]: false }));
  };

  const monthsToCheck = (selectedYear === currentYear && selectedMonth === currentMonth)
      ? Array.from({length: currentMonth}, (_, i) => i + 1)
      : [selectedMonth];

  const filteredItems = customers.flatMap(c => {
    const extTech = (c.extinguisherTech || c.assignedTechnician || 'None').trim();
    const sysTech = (c.systemTech || 'None').trim();
    
    const extTechMatch = selectedTech === 'All' || extTech === selectedTech;
    const sysTechMatch = selectedTech === 'All' || sysTech === selectedTech;

    const itemsForCustomer = monthsToCheck.flatMap(m => {
        const extCompletedInfo = c.completedServices?.find(s => 
            s.year === selectedYear && s.month === m && s.type === 'Extinguisher'
        );
        const isExtComplete = !!extCompletedInfo;

        const sysCompletedInfo = c.completedServices?.find(s => 
            s.year === selectedYear && s.month === m && s.type === 'System'
        );
        const isSysComplete = !!sysCompletedInfo;

        const isExtinguisherScheduled = c.serviceMonths?.includes(m) || isExtComplete;
        const isSystemScheduled = c.systemMonths?.includes(m) || isSysComplete;

        if (!isExtinguisherScheduled && !isSystemScheduled) return [];

        const isPastCarryOver = m < selectedMonth;

        let showExt = isExtinguisherScheduled && extTechMatch;
        let showSys = isSystemScheduled && sysTechMatch;

        const hideComplete = isPastCarryOver || !showCompleted;

        if (hideComplete) {
            if (isExtComplete) showExt = false;
            if (isSysComplete) showSys = false;
        } 

        if (!showExt && !showSys) return [];

        const canCombine = isExtinguisherScheduled && isSystemScheduled && (extTech.toLowerCase() === sysTech.toLowerCase());
        const items = [];

        if (canCombine && extTechMatch && sysTechMatch && showExt && showSys) {
             items.push({
                customer: c,
                type: 'Combined',
                tech: extTech,
                month: m,
                ext: { isComplete: isExtComplete, completedInfo: extCompletedInfo },
                sys: { isComplete: isSysComplete, completedInfo: sysCompletedInfo }
            });
        } else {
             if (showExt) {
                items.push({
                    customer: c,
                    type: 'Extinguisher',
                    tech: extTech,
                    month: m,
                    isComplete: isExtComplete,
                    completedInfo: extCompletedInfo
                });
             }
             if (showSys) {
                items.push({
                    customer: c,
                    type: 'System',
                    tech: sysTech,
                    month: m,
                    isComplete: isSysComplete,
                    completedInfo: sysCompletedInfo
                });
             }
        }
        return items;
    });

    if (itemsForCustomer.length <= 1) return itemsForCustomer;

    const maxMonth = Math.max(...itemsForCustomer.map(i => i.month));
    return itemsForCustomer.filter(i => i.month === maxMonth);

  }).filter(item => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
          item.customer.name.toLowerCase().includes(searchLower) ||
          item.customer.address.toLowerCase().includes(searchLower)
      );
  }).sort((a, b) => {
      const dateA = a.customer.scheduledServiceDate || { month: 0, day: 0 };
      const dateB = b.customer.scheduledServiceDate || { month: 0, day: 0 };
      
      const hasDateA = dateA.month > 0 || dateA.day > 0;
      const hasDateB = dateB.month > 0 || dateB.day > 0;

      if (hasDateA && hasDateB) {
          if (dateA.month !== dateB.month) return dateA.month - dateB.month;
          if (dateA.day !== dateB.day) return dateA.day - dateB.day;
          const timeA = a.customer.scheduledServiceTime || '23:59';
          const timeB = b.customer.scheduledServiceTime || '23:59';
          return timeA.localeCompare(timeB);
      }

      if (hasDateA && !hasDateB) return -1;
      if (!hasDateA && hasDateB) return 1;

      const cityA = getCity(a.customer.address);
      const cityB = getCity(b.customer.address);
      const cityCompare = cityA.localeCompare(cityB);
      if (cityCompare !== 0) return cityCompare;
      
      return a.customer.name.localeCompare(b.customer.name);
  });

  const handleToggleComplete = (customerId: string, type: 'Extinguisher' | 'System', isComplete: boolean, month: number) => {
      // Custom Logic for System Completion with Device Magic
      const isDMActive = deviceMagicSettings?.enabled && deviceMagicSettings?.defaultFormId;
      const key = `${customerId}-${selectedYear}-${month}`;
      
      if (type === 'System' && !isComplete && isDMActive) {
          const formLaunched = systemFormLaunchedMap[key];
          if (!formLaunched) {
              // First Click: Launch Form
              window.location.href = `devicemagic://submit?form_id=${deviceMagicSettings.defaultFormId}`;
              if (onNavigate) onNavigate('forms');
              setSystemFormLaunchedMap(prev => ({ ...prev, [key]: true }));
              return; // Do not finalize yet
          }
          // Second Click: Proceed to completion and clear flag
          setSystemFormLaunchedMap(prev => {
              const next = { ...prev };
              delete next[key];
              return next;
          });
      }

      if (isComplete) {
          onUndoComplete(customerId, type, selectedYear, month);
      } else {
          let customDateStr: string | undefined = undefined;
          
          const customer = customers.find(c => c.id === customerId);
          const tileDate = customer?.scheduledServiceDate;
          const tileTime = customer?.scheduledServiceTime;

          if (tileDate?.month && tileDate?.day) {
              const m = tileDate.month;
              const d = tileDate.day;
              if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                  const now = new Date();
                  const year = selectedYear || now.getFullYear();
                  
                  const dateObj = new Date(year, m - 1, d);
                  if (tileTime) {
                      const [hours, minutes] = tileTime.split(':').map(Number);
                      dateObj.setHours(hours, minutes, 0, 0);
                  } else {
                      dateObj.setHours(12, 0, 0, 0);
                  }
                  
                  customDateStr = dateObj.toISOString();
              }
          }

          onMarkComplete(customerId, type, selectedYear, month, customDateStr);

          if (customer) {
              const assignedTech = type === 'Extinguisher' 
                  ? (customer.extinguisherTech || customer.assignedTechnician) 
                  : customer.systemTech;
              
              const currentName = (currentUser?.name || '').toLowerCase().trim();
              const techName = (assignedTech || '').toLowerCase().trim();
              const currentFirst = currentName.split(' ')[0];
              const techFirst = techName.split(' ')[0];

              const isTechMatch = currentName && (currentName === techName || currentFirst === techFirst);

              if (isTechMatch) {
                  const scheduledMonths = type === 'Extinguisher' ? customer.serviceMonths : customer.systemMonths;
                  
                  if (scheduledMonths) {
                      for (let m = 1; m < month; m++) {
                          if (scheduledMonths.includes(m)) {
                              const isAlreadyDone = customer.completedServices?.some(s => 
                                  s.type === type && s.year === selectedYear && s.month === m
                              );
                              if (!isAlreadyDone) {
                                  onMarkComplete(customerId, type, selectedYear, m, customDateStr);
                              }
                          }
                      }
                  }
              }
          }
      }
  };

  const getMonthName = (m: number) => MONTHS[m-1]?.label || '';

  const isViewingCurrent = selectedMonth === currentMonth && selectedYear === currentYear;

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Service Tracker</h2>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                   Viewing Schedule: <span className={`font-bold ${isViewingCurrent ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{MONTHS[selectedMonth - 1]?.label} {selectedYear}</span>
                </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm w-fit">
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Show Completed</span>
                    <button 
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${showCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${showCompleted ? 'translate-x-4' : ''}`}></div>
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm w-fit">
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Condensed View</span>
                    <button 
                        onClick={() => setIsCondensed(!isCondensed)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isCondensed ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isCondensed ? 'translate-x-4' : ''}`}></div>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {!isCondensed && (
          <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="pl-9 pr-4 py-1.5 md:py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none text-sm dark:bg-gray-700 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                <div className="relative min-w-[80px]">
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-1 py-1.5 md:px-2 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white text-xs md:text-sm"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="relative min-w-[90px]">
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-1 py-1.5 md:px-2 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white text-xs md:text-sm"
                    >
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                <div className="relative min-w-[120px]">
                    <select 
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                        className="w-full px-1 py-1.5 md:px-2 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white text-xs md:text-sm"
                    >
                        <option value="All">All Techs</option>
                        {sortedTechnicians.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
          </div>
      )}

      <div className={`grid grid-cols-1 ${isCondensed ? 'gap-2' : 'gap-2 md:gap-4'}`}>
        {filteredItems.map((item: any, idx) => {
            const isCombined = item.type === 'Combined';
            const hasAssets = extinguishers.some(e => e.customerId === item.customer.id);
            
            const extinguishersOutCount = item.customer.extinguishersOut?.filter((e: any) => {
                if (!e.year) return true;
                const lastYear = parseInt(e.year);
                if (isNaN(lastYear)) return true;
                let interval = 5;
                if (['ABC', 'Clean Agent'].some(t => e.type.includes(t))) interval = 6;
                const nextDue = lastYear + interval;
                return nextDue <= currentYear;
            }).length || 0;
            const hasExtinguishersOut = extinguishersOutCount > 0;

            const tileKey = `${item.customer.id}-${item.type}-${item.month}`;
            const isScheduleOpen = !!scheduleOpenMap[tileKey];
            
            const systemTanksDueCount = item.customer.systemTanks?.filter((tank: any) => {
                const lastYear = parseInt(tank.year);
                if (isNaN(lastYear)) return false;
                const interval = tank.type === 'Wet Chemical' ? 12 : 6;
                return (lastYear + interval) <= currentYear;
            }).length || 0;
            const hasSystemTanksDue = systemTanksDueCount > 0;

            let cardBgClass = 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
            if (isCombined) {
                if (item.ext.isComplete && item.sys.isComplete) cardBgClass = 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800';
                else if (item.ext.isComplete || item.sys.isComplete) cardBgClass = 'bg-white border-purple-200 dark:bg-gray-800 dark:border-purple-800';
            } else {
                if (item.isComplete) cardBgClass = 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800';
            }

            const isOverdue = item.month < selectedMonth;
            if (isOverdue) cardBgClass = 'bg-red-50/30 border-red-200 dark:bg-red-900/10 dark:border-red-800';

            if (hasExtinguishersOut && hasSystemTanksDue) {
                cardBgClass = 'bg-gradient-to-r from-orange-100 via-orange-100 via-[50%] to-blue-100 to-[50%] border-orange-300 dark:from-orange-900/40 dark:via-orange-900/40 dark:via-[50%] dark:to-blue-900/40 dark:to-[50%] dark:border-blue-800 shadow-sm';
            } else if (hasExtinguishersOut) {
                cardBgClass = 'bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
            } else if (hasSystemTanksDue) {
                cardBgClass = 'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
            }

            // Scheduling Logic using local state
            const currentTileDate = localSchedules[item.customer.id] || { 
                month: item.customer.scheduledServiceDate?.month || 0, 
                day: item.customer.scheduledServiceDate?.day || 0 
            };
            const currentTileTime = localSchedules[item.customer.id]?.time !== undefined 
                ? localSchedules[item.customer.id].time 
                : item.customer.scheduledServiceTime || '';

            const hasScheduledDate = (currentTileDate.month || 0) > 0 || (currentTileDate.day || 0) > 0;

            const handleDateChange = (field: 'month' | 'day', val: string) => {
                const numVal = parseInt(val) || 0;
                setLocalSchedules(prev => {
                    const existing = prev[item.customer.id] || {
                        month: item.customer.scheduledServiceDate?.month,
                        day: item.customer.scheduledServiceDate?.day,
                        time: item.customer.scheduledServiceTime
                    };
                    return {
                        ...prev,
                        [item.customer.id]: {
                            ...existing,
                            [field]: numVal
                        }
                    };
                });
            };

            const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const newTime = e.target.value;
                setLocalSchedules(prev => {
                    const existing = prev[item.customer.id] || {
                        month: item.customer.scheduledServiceDate?.month,
                        day: item.customer.scheduledServiceDate?.day,
                        time: item.customer.scheduledServiceTime
                    };
                    return {
                        ...prev,
                        [item.customer.id]: {
                            ...existing,
                            time: newTime
                        }
                    };
                });
            };

            const renderDatePicker = (
                <div className="flex flex-col gap-3">
                    <div className={`flex items-center gap-1 bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600 p-1.5 rounded border h-fit transition-colors duration-200 shadow-sm`} title="Schedule Date">
                        <Calendar className={`w-4 h-4 text-gray-400`} />
                        <select 
                            value={currentTileDate.month || ''} 
                            onChange={(e) => handleDateChange('month', e.target.value)}
                            className="text-sm p-0.5 rounded border-none bg-transparent focus:ring-0 w-14 cursor-pointer outline-none font-medium text-gray-700 dark:text-gray-200"
                        >
                            <option value="">M</option>
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <span className="text-gray-300 dark:text-gray-500 text-sm">/</span>
                        <input 
                            type="number" 
                            placeholder="D" 
                            value={currentTileDate.day || ''}
                            onChange={(e) => handleDateChange('day', e.target.value)}
                            min="1" max="31"
                            className="text-sm p-0.5 w-10 rounded border-none bg-transparent focus:ring-0 text-center outline-none font-medium text-gray-700 dark:text-gray-200"
                        />
                        
                        <span className="text-gray-300 dark:text-gray-500 text-sm mx-0.5">@</span>
                        <input 
                            type="time" 
                            value={currentTileTime || ''}
                            onChange={handleTimeChange}
                            className="text-sm p-0.5 w-auto rounded border-none bg-transparent focus:ring-0 text-center outline-none font-medium text-gray-700 dark:text-gray-200"
                        />
                    </div>
                    <Button 
                        size="sm" 
                        variant="success" 
                        className="w-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                        onClick={(e) => { e.stopPropagation(); handleSaveSchedule(item.customer.id, tileKey); }}
                        icon={<Check className="w-3.5 h-3.5" />}
                    >
                        Commit Appointment
                    </Button>
                </div>
            );

            if (isCondensed) {
                const sysKey = `${item.customer.id}-${selectedYear}-${item.month}`;
                const sysFormLaunched = systemFormLaunchedMap[sysKey];

                return (
                    <div 
                        key={`${item.customer.id}-${item.type}-${item.month}-${idx}-condensed`}
                        className={`border rounded-lg p-3 flex items-center justify-between shadow-sm transition-all ${cardBgClass}`}
                    >
                         <div className="min-w-0 flex-1 mr-3">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate mb-1">{item.customer.name}</h4>
                            
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate max-w-[120px]">{getCity(item.customer.address)}</span>
                                </div>

                                {hasScheduledDate && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">
                                        <CalendarClock className="w-3 h-3" />
                                        <span className="text-[10px] font-black">{currentTileDate.month}/{currentTileDate.day}{currentTileTime ? ` @ ${formatTo12H(currentTileTime)}` : ''}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                    {isCombined ? (
                                        <div className="flex -space-x-px">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-l bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Ext</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-r bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">Sys</span>
                                        </div>
                                    ) : (
                                        item.type === 'Extinguisher' ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Ext</span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">Sys</span>
                                        )
                                    )}
                                    
                                    {hasExtinguishersOut && (
                                        <div 
                                            className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 cursor-pointer" 
                                            title="Extinguishers Out - Click to view report"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewReport('combined_out', { customerId: item.customer.id, month: item.month, year: selectedYear, tech: item.tech });
                                            }}
                                        >
                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{extinguishersOutCount}</span>
                                        </div>
                                    )}
                                    {hasSystemTanksDue && (
                                        <div 
                                            className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 cursor-pointer" 
                                            title="System Tanks Due - Click to view report"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewReport('combined_out', { customerId: item.customer.id, month: item.month, year: selectedYear, tech: item.tech });
                                            }}
                                        >
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{systemTanksDueCount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEditCustomer(item.customer.id); }}
                                className="text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-6 h-6" fill="currentColor" />
                            </button>

                            {isCombined ? (
                                <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={(e) => {e.stopPropagation(); handleToggleComplete(item.customer.id, 'Extinguisher', item.ext.isComplete, item.month);}}
                                        className={`h-7 w-24 flex items-center justify-center rounded border transition-all shadow-sm ${item.ext.isComplete ? 'bg-white border-gray-300 text-gray-400 dark:bg-gray-700 dark:border-gray-600' : 'bg-red-600 border-red-600 text-white hover:bg-red-700'}`}
                                        title={item.ext.isComplete ? "Undo Extinguisher" : "Complete Extinguisher"}
                                    >
                                        {item.ext.isComplete ? <CheckCircle className="w-4 h-4"/> : <span className="text-[10px] font-bold">EXT</span>}
                                    </button>
                                    <button 
                                        onClick={(e) => {e.stopPropagation(); handleToggleComplete(item.customer.id, 'System', item.sys.isComplete, item.month);}}
                                        className={`h-7 w-24 flex items-center justify-center rounded border transition-all shadow-sm ${item.sys.isComplete ? 'bg-white border-gray-300 text-gray-400 dark:bg-gray-700 dark:border-gray-600' : (sysFormLaunched ? 'bg-orange-600 border-orange-700 text-white animate-pulse' : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700')}`}
                                        title={item.sys.isComplete ? "Undo System" : (sysFormLaunched ? "Confirm System Completion" : "Complete System")}
                                    >
                                        {item.sys.isComplete ? <CheckCircle className="w-4 h-4"/> : <span className="text-[9px] font-black uppercase tracking-tighter">{sysFormLaunched ? 'CONFIRM SYS' : 'SYS'}</span>}
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    onClick={(e) => {e.stopPropagation(); handleToggleComplete(item.customer.id, item.type, item.isComplete, item.month);}}
                                    variant={item.isComplete ? 'secondary' : 'success'}
                                    className={`h-8 px-4 text-xs shadow-sm ${!item.isComplete ? (item.type === 'System' ? (sysFormLaunched ? '!bg-orange-600 !border-orange-700 !text-white animate-pulse' : '!bg-blue-600 !hover:bg-blue-700 !text-white') : '!bg-red-600 !hover:bg-red-700 !text-white') : ''}`}
                                    icon={item.isComplete ? <CheckCircle className="w-3.5 h-3.5"/> : undefined}
                                >
                                    {item.isComplete ? 'Done' : (sysFormLaunched ? 'CONFIRM SYS' : 'Complete')}
                                </Button>
                            )}
                        </div>
                    </div>
                );
            }

            const sysKey = `${item.customer.id}-${selectedYear}-${item.month}`;
            const sysFormLaunched = systemFormLaunchedMap[sysKey];

            return (
                <div 
                    key={`${item.customer.id}-${item.type}-${item.month}-${idx}`} 
                    className={`border rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-all ${cardBgClass}`}
                >
                    <div className="flex flex-row gap-4">
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            {isScheduleOpen && (
                                <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-fadeIn">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-xs font-bold text-yellow-800 dark:text-yellow-200 uppercase">Set Appointment</div>
                                        {item.customer.scheduledBy && (
                                            <div className="text-[10px] text-yellow-700 dark:text-yellow-400 font-medium">by {item.customer.scheduledBy}</div>
                                        )}
                                    </div>
                                    {renderDatePicker}
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`p-1.5 rounded-lg flex-shrink-0 hidden md:flex items-center justify-center ${
                                        isCombined ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' :
                                        item.type === 'Extinguisher' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg leading-tight truncate">
                                        {item.customer.name}
                                    </h4>
                                </div>
                            </div>

                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.customer.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline group w-fit"
                            >
                                <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 group-hover:text-blue-600" />
                                <span className="truncate">{item.customer.address}</span>
                            </a>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                {isOverdue ? (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        Overdue ({getMonthName(item.month)})
                                    </span>
                                ) : item.month !== selectedMonth ? (
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        {getMonthName(item.month)}
                                    </span>
                                ) : null}

                                {isCombined ? (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                        Extinguisher & System
                                    </span>
                                ) : (
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                        item.type === 'Extinguisher' 
                                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' 
                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                    }`}>
                                        {item.type}
                                    </span>
                                )}

                                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
                                    <UserIcon className="w-3 h-3 mr-1" /> {item.tech}
                                </span>

                                {hasScheduledDate && !isScheduleOpen && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 flex items-center cursor-pointer" onClick={() => toggleSchedule(tileKey, item.customer.id)}>
                                        <CalendarClock className="w-3 h-3 mr-1" />
                                        {MONTHS[(item.customer.scheduledServiceDate?.month || 1) - 1]?.label} {item.customer.scheduledServiceDate?.day}
                                        {item.customer.scheduledServiceTime && ` @ ${formatTo12H(item.customer.scheduledServiceTime)}`}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-1">
                                {(item.customer.doorCode || item.customer.lockBox) && (
                                    <div className="flex gap-1.5 items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-600">
                                        {item.customer.doorCode && (
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1" title={`Door Code: ${item.customer.doorCode}`}>
                                                <KeyRound className="w-3 h-3 text-safety-500" /> {item.customer.doorCode}
                                            </span>
                                        )}
                                        {item.customer.doorCode && item.customer.lockBox && <span className="w-px h-2 bg-gray-300 dark:bg-gray-500"></span>}
                                        {item.customer.lockBox && (
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1" title={`Lock Box: ${item.customer.lockBox}`}>
                                                <Lock className="w-3 h-3 text-blue-500" /> {item.customer.lockBox}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {hasExtinguishersOut && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            onViewReport('combined_out', { customerId: item.customer.id, month: item.month, year: selectedYear, tech: item.tech });
                                        }}
                                        className="flex items-center text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 rounded px-2 py-0.5 transition-colors"
                                    >
                                        {extinguishersOutCount} Ext. Out
                                    </button>
                                )}
                                {hasSystemTanksDue && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            onViewReport('combined_out', { customerId: item.customer.id, month: item.month, year: selectedYear, tech: item.tech });
                                        }}
                                        className="flex items-center text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 rounded px-2 py-0.5 transition-colors"
                                    >
                                        {systemTanksDueCount} Tanks Due
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0 min-w-[80px]">
                            <div className="flex gap-2 justify-end w-full">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleSchedule(tileKey, item.customer.id); }}
                                    className={`flex-1 px-2 py-1.5 text-xs font-bold border shadow-sm rounded-lg transition-colors text-center ${isScheduleOpen ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    title={isScheduleOpen ? "Save Schedule" : "Schedule Service"}
                                >
                                    {isScheduleOpen ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <SaveIcon className="w-3 h-3" /> Save
                                        </div>
                                    ) : 'Skd'}
                                </button>
                                {hasAssets && item.customer.phone && (
                                    <a href={`tel:${item.customer.phone}`} className="p-1.5 text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg shadow-sm transition-colors flex items-center justify-center" title="Call">
                                        <Phone className="w-4 h-4" />
                                    </a>
                                )}
                            </div>

                            <button 
                                onClick={() => onOpenRunSheet(item.customer.id)}
                                className="w-full px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                                title="Open Run Sheet"
                            >
                                <ClipboardList className="w-3 h-3" /> Sheet
                            </button>

                            <button 
                                onClick={() => onEditCustomer(item.customer.id)}
                                className="w-full px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                                title="Edit Details"
                            >
                                <Edit2 className="w-3 h-3" /> Edit
                            </button>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                        {isCombined ? (
                            <>
                                <Button 
                                    onClick={() => handleToggleComplete(item.customer.id, 'Extinguisher', item.ext.isComplete, item.month)}
                                    variant={item.ext.isComplete ? 'secondary' : 'success'}
                                    size="sm"
                                    className="flex-1 text-[10px] md:text-xs h-8 md:h-9 shadow-sm"
                                    icon={item.ext.isComplete ? undefined : <CheckCircle className="w-3 h-3 md:w-4 md:h-4"/>}
                                >
                                    {item.ext.isComplete ? 'Undo Extinguisher' : 'Complete Extinguisher'}
                                </Button>
                                <Button 
                                    onClick={() => handleToggleComplete(item.customer.id, 'System', item.sys.isComplete, item.month)}
                                    variant={item.sys.isComplete ? 'secondary' : 'success'}
                                    size="sm"
                                    className={`flex-1 text-[10px] md:text-xs h-8 md:h-9 shadow-sm ${!item.sys.isComplete && sysFormLaunched ? '!bg-orange-600 !border-orange-700 !text-white animate-pulse' : ''}`}
                                    icon={item.sys.isComplete ? undefined : <CheckCircle className="w-3 h-3 md:w-4 md:h-4"/>}
                                >
                                    {item.sys.isComplete ? 'Undo System' : (sysFormLaunched ? 'CONFIRM SYSTEM' : 'Complete System')}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => handleToggleComplete(item.customer.id, item.type, item.isComplete, item.month)}
                                variant={item.isComplete ? 'secondary' : 'success'}
                                size="sm"
                                className={`w-full text-xs md:text-sm h-8 md:h-10 shadow-sm ${!item.isComplete ? (item.type === 'System' ? (sysFormLaunched ? '!bg-orange-600 !border-orange-700 !text-white animate-pulse' : '!bg-blue-600 !hover:bg-blue-700 !text-white') : '!bg-red-600 !hover:bg-red-700 !text-white') : ''}`}
                                icon={item.isComplete ? <ClipboardCheck className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                            >
                                {item.isComplete ? 'Mark Incomplete' : (sysFormLaunched ? 'CONFIRM SYSTEM' : 'Mark Complete')}
                            </Button>
                        )}
                    </div>
                </div>
            );
        })}

        {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No services scheduled.</p>
                <p className="text-xs text-gray-400">Try changing the year, month, or technician filter.</p>
            </div>
        )}
      </div>
    </div>
  );
};