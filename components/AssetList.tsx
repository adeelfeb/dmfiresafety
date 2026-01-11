
import React, { useEffect, useRef, useState } from 'react';
import { Extinguisher, Customer, InspectionRecord, DeviceMagicSettings } from '../types';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, XCircle, Clock, MapPin, Search, Building2, Plus, Edit2, UserPlus, Phone, Mail, User, Tag, Zap, FileText, Trash2, Eye, EyeOff, GripHorizontal, ExternalLink } from 'lucide-react';

interface AssetListProps {
  extinguishers: Extinguisher[];
  customers: Customer[];
  records: InspectionRecord[];
  onInspect: (id: string) => void;
  onSelect: (id: string) => void;
  onAddExtinguisher: (customerId?: string) => void;
  onEditExtinguisher: (id: string) => void;
  onDeleteExtinguisher: (id: string) => void;
  onAddCustomer: () => void;
  onEditCustomer: (id: string) => void;
  onQuickInspect: (id: string) => void;
  onReorder?: (updatedExts: Extinguisher[]) => void;
  fixedCustomerId?: string; // New prop for Run Sheet mode
  deviceMagicSettings?: DeviceMagicSettings;
}

export const AssetList: React.FC<AssetListProps> = ({ 
  extinguishers, 
  customers,
  records,
  onInspect, 
  onSelect,
  onAddExtinguisher,
  onEditExtinguisher,
  onDeleteExtinguisher,
  onAddCustomer,
  onEditCustomer,
  onQuickInspect,
  onReorder,
  fixedCustomerId,
  deviceMagicSettings
}) => {
  const [filter, setFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('All');
  
  // Default to hiding cleared items if in Run Sheet mode (fixedCustomerId present), showing all otherwise
  const [showCleared, setShowCleared] = useState(!fixedCustomerId);
  
  // Drag and Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [longPressActiveId, setLongPressActiveId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonthIso = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Long Press Logic for "Ready to Move" state
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = (id: string) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        setLongPressActiveId(id);
    }, 500); // 500ms for "Hold to Move" activation
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  // Sync fixedCustomerId with local filter state if it changes
  useEffect(() => {
    if (fixedCustomerId) {
      setCustomerIdFilter(fixedCustomerId);
      // Reset to hidden when entering run sheet mode
      setShowCleared(false);
    } else {
      setShowCleared(true);
    }
  }, [fixedCustomerId]);

  const isCleared = (extId: string) => {
      // Check if there is an inspection record for this month
      return records.some(r => r.extinguisherId === extId && r.date.startsWith(currentMonthIso));
  };

  const filtered = extinguishers.filter(e => {
    const matchesSearch = e.location.toLowerCase().includes(filter.toLowerCase()) || e.type.toLowerCase().includes(filter.toLowerCase());
    const matchesCustomer = fixedCustomerId 
        ? e.customerId === fixedCustomerId 
        : (customerIdFilter === 'All' || e.customerId === customerIdFilter);
    
    // Check if unit is cleared (inspected this month)
    const cleared = isCleared(e.id);
    
    // If showCleared is false, hide cleared items
    const matchesStatus = showCleared ? true : !cleared;

    return matchesSearch && matchesCustomer && matchesStatus;
  });

  // Reordering logic
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    // Fallback to numeric sort of unit number
    return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
  });

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId || !onReorder) return;

    const sourceIndex = sortedFiltered.findIndex(e => e.id === draggedId);
    const targetIndex = sortedFiltered.findIndex(e => e.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newSortedList = [...sortedFiltered];
    const [movedItem] = newSortedList.splice(sourceIndex, 1);
    newSortedList.splice(targetIndex, 0, movedItem);

    // Map new sort orders based on list position
    const updatedExts = extinguishers.map(ext => {
      const newIdx = newSortedList.findIndex(item => item.id === ext.id);
      if (newIdx !== -1) {
        return { ...ext, sortOrder: newIdx };
      }
      return ext;
    });

    onReorder(updatedExts);
    setDraggedId(null);
    setDragOverId(null);
    setLongPressActiveId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setLongPressActiveId(null);
  };

  // Calculate count of cleared items (hidden or shown) matching other filters
  const clearedCount = extinguishers.filter(e => {
      const matchesSearch = e.location.toLowerCase().includes(filter.toLowerCase());
      const matchesCustomer = fixedCustomerId 
        ? e.customerId === fixedCustomerId 
        : (customerIdFilter === 'All' || e.customerId === customerIdFilter);
      return matchesSearch && matchesCustomer && isCleared(e.id);
  }).length;

  const selectedCustomer = customers.find(c => c.id === (fixedCustomerId || customerIdFilter));

  const getStatusColor = (status: Extinguisher['status']) => {
    switch (status) {
      case 'Operational': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'Needs Attention': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'Critical': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status: Extinguisher['status']) => {
    switch (status) {
      case 'Operational': return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'Needs Attention': return <Clock className="w-3 h-3 mr-1" />;
      case 'Critical': return <AlertTriangle className="w-3 h-3 mr-1" />;
      default: return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const getLastInspectionResult = (extId: string) => {
    const extRecords = records
      .filter(r => r.extinguisherId === extId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (extRecords.length === 0) return null;

    const lastRecord = extRecords[0];
    const isFail = lastRecord.severityRating === 'High' || Object.values(lastRecord.checks).some(c => c === false);
    
    return {
        date: new Date(lastRecord.date).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', year: '2-digit'}),
        status: isFail ? 'Failed' : 'Passed'
    };
  };

  const getServiceInterval = (type: string) => {
      if (['Exit Light', 'Emergency Light'].includes(type)) return 0;
      return ['ABC', 'Clean Agent'].includes(type) ? 6 : 5;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{fixedCustomerId ? 'Site Assets' : 'All Assets'}</h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{fixedCustomerId ? 'Tap to edit. Hold to reorder units.' : 'Overview of all registered units'}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(fixedCustomerId || clearedCount > 0) && (
              <Button 
                variant={showCleared ? "primary" : "secondary"}
                onClick={() => setShowCleared(!showCleared)}
                icon={showCleared ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                className={`flex-1 md:flex-none text-xs md:text-sm whitespace-nowrap ${!showCleared && 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'}`}
              >
                {showCleared ? 'Hide Cleared' : `Show Cleared (${clearedCount})`}
              </Button>
          )}
          
          {!fixedCustomerId && (
              <Button variant="secondary" onClick={onAddCustomer} icon={<UserPlus className="w-4 h-4"/>} className="flex-1 md:flex-none text-xs md:text-sm whitespace-nowrap">
                New Customer
              </Button>
          )}
          <Button onClick={() => onAddExtinguisher(selectedCustomer?.id)} icon={<Plus className="w-4 h-4"/>} className="flex-1 md:flex-none text-xs md:text-sm whitespace-nowrap">
            Add Unit
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            {!fixedCustomerId && (
                <select 
                    value={customerIdFilter}
                    onChange={(e) => setCustomerIdFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white w-full md:w-auto md:min-w-[200px] text-sm"
                >
                    <option value="All">All Customers</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                type="text" 
                placeholder="Search location or type..." 
                className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-transparent outline-none text-sm dark:bg-gray-700 dark:text-white"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                />
            </div>
          </div>

          {selectedCustomer && (
            <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fadeIn">
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
                         </div>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onEditCustomer(selectedCustomer.id); }}
                            className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg md:hidden"
                         >
                            <Edit2 className="w-4 h-4" />
                         </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{selectedCustomer.address}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                            <User className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{selectedCustomer.contactPerson}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                            <Phone className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{selectedCustomer.phone}</span>
                        </div>
                    </div>
                </div>
                <Button size="sm" variant="danger" onClick={() => onEditCustomer(selectedCustomer.id)} icon={<Edit2 className="w-3 h-3"/>} className="hidden md:flex">
                    Edit Details
                </Button>
            </div>
          )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {sortedFiltered.map(ext => {
          const lastInspection = getLastInspectionResult(ext.id);
          const isLight = ext.type === 'Exit Light' || ext.type === 'Emergency Light';
          const isBeingDragged = draggedId === ext.id;
          const isDragOver = dragOverId === ext.id;
          const isLongPressed = longPressActiveId === ext.id;
          const cleared = isCleared(ext.id);
          
          let majorServiceDueYear: number | null = null;
          let isMajorDue = false;

          const interval = getServiceInterval(ext.type);
          if (interval > 0 && ext.lastServiceDate) {
              const lastYear = parseInt(ext.lastServiceDate);
              if (!isNaN(lastYear)) {
                  majorServiceDueYear = lastYear + interval;
                  if (majorServiceDueYear <= currentYear) {
                      isMajorDue = true;
                  }
              }
          }
          
          return (
            <div 
                key={ext.id} 
                draggable={!!onReorder}
                onDragStart={() => handleDragStart(ext.id)}
                onDragOver={(e) => handleDragOver(e, ext.id)}
                onDrop={() => handleDrop(ext.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onEditExtinguisher(ext.id)}
                className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border cursor-pointer ${
                    isBeingDragged ? 'opacity-30 border-blue-500 scale-95' : 
                    isDragOver ? 'border-blue-400 scale-105 shadow-lg bg-blue-50 dark:bg-blue-900/10' : 
                    isLongPressed ? 'border-safety-500 scale-[1.02] shadow-lg ring-2 ring-safety-200 dark:ring-safety-900/30' :
                    cleared ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700' :
                    isMajorDue ? 'bg-red-50 border-red-400 dark:bg-red-900/40 dark:border-red-600' :
                    isLight ? 'bg-white border-orange-200 dark:bg-gray-800 dark:border-orange-800' : 
                    'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                } flex flex-col group relative animate-fadeIn select-none touch-none`}
                onMouseDown={() => handlePressStart(ext.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(ext.id)}
                onTouchEnd={handlePressEnd}
                onTouchMove={handlePressEnd}
            >
              
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (window.confirm("Are you sure you want to delete this unit?")) {
                            onDeleteExtinguisher(ext.id);
                        }
                    }}
                    className="text-gray-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm md:bg-transparent"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
              </div>

              <div className={`p-3 md:p-4 flex-1 flex flex-col gap-2 md:gap-3 ${isLight && !cleared ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-1 pr-6 md:pr-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {onReorder && <GripHorizontal className={`w-3.5 h-3.5 transition-opacity ${isLongPressed ? 'text-safety-500' : 'text-gray-300 md:opacity-0 md:group-hover:opacity-100'}`} />}
                            {ext.unitNumber && (
                                <span className={`inline-block text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${isLight ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                    {ext.unitNumber.startsWith('L') ? '' : '#'}{ext.unitNumber}
                                </span>
                            )}
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] md:text-xs block mb-0.5 truncate">
                            {isLight ? (ext.batteryType || 'Unknown Battery') : ext.brand}
                        </span>
                        <h3 className={`text-sm md:text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 transition-colors`}>
                            {!isLight ? `${ext.size || ''} ` : ''}{ext.type}
                        </h3>
                    </div>
                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] md:text-[10px] uppercase font-bold tracking-wide border w-fit ${getStatusColor(ext.status)}`}>
                        {getStatusIcon(ext.status)}
                        {ext.status === 'Needs Attention' ? 'Attn Reqd' : ext.status}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-gray-50 dark:border-gray-700 mt-auto">
                    <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center text-[10px] md:text-xs text-gray-600 dark:text-gray-400" title="Customer">
                            <Building2 className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="font-medium truncate">{getCustomerName(ext.customerId)}</span>
                        </div>
                        <div className="flex items-center text-[10px] md:text-xs text-gray-600 dark:text-gray-400" title="Location">
                            <MapPin className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{ext.location}</span>
                        </div>
                    </div>

                    <div className="space-y-1 overflow-hidden">
                        {!isLight && ext.lastServiceDate && (
                            <div className="flex items-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400" title="Last Service Date">
                                <Tag className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate">Svc: {ext.lastServiceDate}</span>
                            </div>
                        )}
                        {isLight && (
                            <div className="flex items-center text-[10px] md:text-xs text-orange-600 dark:text-orange-400" title="Battery Type">
                                <Zap className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{ext.batteryType}</span>
                            </div>
                        )}
                        
                        {lastInspection ? (
                            <div className="flex items-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400" title={`Last Inspection: ${lastInspection.date}`}>
                                {lastInspection.status === 'Passed' ? (
                                    <CheckCircle className={`w-3 h-3 mr-1.5 ${isLight ? 'text-orange-600' : 'text-green-600'} dark:text-orange-400 flex-shrink-0`} />
                                ) : (
                                    <XCircle className="w-3 h-3 mr-1.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                )}
                                <span className={`truncate ${lastInspection.status === 'Failed' ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                                    {lastInspection.date}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center text-[10px] md:text-xs text-gray-400 italic">
                                <Clock className="w-3 h-3 mr-1.5 text-gray-300 flex-shrink-0" />
                                <span>No Insp.</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
              
              <div className={`px-3 py-2 md:px-4 md:py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 ${cleared ? 'bg-yellow-100/50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                    {isMajorDue && majorServiceDueYear && !cleared ? (
                        <div className="animate-pulse">
                            <span className="text-[9px] uppercase text-red-500 font-bold block">Svc Due</span>
                            <span className="font-bold text-red-600 dark:text-red-400">{majorServiceDueYear}</span>
                        </div>
                    ) : (
                        <div>
                            <span className="text-[9px] uppercase text-gray-400 font-semibold block">Due</span>
                            {new Date(ext.nextInspectionDue).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onQuickInspect(ext.id); }}
                    className={`flex-1 md:flex-none md:w-auto flex justify-center items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 ${isLight ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg md:rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all`}
                    title="Quick Pass"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="font-bold text-xs md:text-sm">Quick Check</span>
                  </button>

                  <div className="flex-shrink-0">
                      <Button 
                          variant="danger" 
                          onClick={(e) => { e.stopPropagation(); onInspect(ext.id); }} 
                          className="text-[10px] md:text-xs px-2 py-1.5 md:px-3 md:py-2 h-auto shadow-sm active:scale-95"
                          title="Report Issues / Full Inspection"
                      >
                        <span className="hidden md:inline">Issues</span>
                        <span className="md:hidden"><AlertTriangle className="w-4 h-4" /></span>
                      </Button>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{showCleared ? 'No assets found.' : 'All pending inspections complete!'}</p>
          {!showCleared && clearedCount > 0 && (
              <Button variant="secondary" onClick={() => setShowCleared(true)}>Show {clearedCount} Completed</Button>
          )}
          {showCleared && (
              <Button onClick={() => onAddExtinguisher(selectedCustomer?.id)}>Add Unit</Button>
          )}
        </div>
      )}
    </div>
  );
};
