import React, { useState, useMemo } from 'react';
import { Customer, Extinguisher, InspectionRecord } from '../types';
import { Button } from './Button';
import { 
  Users, Search, Filter, Calendar, Briefcase, Plus, MapPin, 
  Edit2, Phone, Clipboard, Wrench, Trash2, Archive, RefreshCcw, 
  AlertTriangle, User, Building2, Clock, ChevronDown, ChevronUp, 
  WifiOff, Mail, CalendarClock, Hash, ExternalLink
} from 'lucide-react';
import { CustomerHistoryModal } from './CustomerHistoryModal';

interface CustomerManagerProps {
  customers: Customer[];
  extinguishers: Extinguisher[];
  records: InspectionRecord[];
  archivedCustomers?: Customer[];
  onAddCustomer: () => void;
  onEditCustomer: (id: string) => void;
  onDeleteCustomer: (id: string) => void;
  onRestoreCustomer?: (id: string) => void;
  onPermanentDeleteCustomer?: (id: string) => void;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type ServiceTypeFilter = 'All' | 'Extinguisher' | 'System' | 'Both';

export const CustomerManager: React.FC<CustomerManagerProps> = ({ 
  customers, 
  extinguishers, 
  records,
  archivedCustomers = [],
  onAddCustomer, 
  onEditCustomer,
  onDeleteCustomer,
  onRestoreCustomer,
  onPermanentDeleteCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | 'All'>('All');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>('All');
  const [repFilter, setRepFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isCondensed, setIsCondensed] = useState(false); 
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const isOnline = navigator.onLine;
  
  const sourceList = showArchived ? archivedCustomers : customers;

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    sourceList.forEach(c => {
      if (c.addressCity) cities.add(c.addressCity);
      else {
        const parts = c.address.split(',');
        if (parts.length > 1) cities.add(parts[1].trim());
      }
    });
    return Array.from(cities).sort();
  }, [sourceList]);

  const uniqueReps = useMemo(() => {
    const reps = new Set<string>();
    sourceList.forEach(c => {
      if (c.extinguisherTech) reps.add(c.extinguisherTech);
      if (c.systemTech) reps.add(c.systemTech);
      if (c.assignedTechnician) reps.add(c.assignedTechnician);
    });
    return Array.from(reps).sort();
  }, [sourceList]);

  const filteredCustomers = useMemo(() => {
    return sourceList.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const matchesMonth = monthFilter === 'All' || 
                           (c.serviceMonths && c.serviceMonths.includes(monthFilter)) ||
                           (c.systemMonths && c.systemMonths.includes(monthFilter));
      if (!matchesMonth) return false;

      const hasExt = (c.serviceMonths && c.serviceMonths.length > 0);
      const hasSys = (c.systemMonths && c.systemMonths.length > 0);
      if (serviceTypeFilter === 'Extinguisher' && !hasExt) return false;
      if (serviceTypeFilter === 'System' && !hasSys) return false;
      if (serviceTypeFilter === 'Both' && (!hasExt || !hasSys)) return false;

      if (repFilter !== 'All') {
        const isExtTech = c.extinguisherTech === repFilter || c.assignedTechnician === repFilter;
        const isSysTech = c.systemTech === repFilter;
        if (!isExtTech && !isSysTech) return false;
      }

      if (cityFilter !== 'All') {
        const city = c.addressCity || c.address.split(',')[1]?.trim();
        if (city !== cityFilter) return false;
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceList, searchTerm, monthFilter, serviceTypeFilter, repFilter, cityFilter]);

  const getExtinguisherCount = (customerId: string) => {
    const customer = sourceList.find(c => c.id === customerId);
    const systemCount = extinguishers.filter(e => e.customerId === customerId).length;
    let manualTotal = 0;
    if (customer && customer.manualUnitCounts) {
        manualTotal = (Object.values(customer.manualUnitCounts) as number[]).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    }
    return systemCount + manualTotal;
  };

  const handleArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const customer = sourceList.find(c => c.id === id);
    if (window.confirm(`ARCHIVE SITE: Are you sure you want to archive "${customer?.name}"?`)) {
        onDeleteCustomer(id);
    }
  };

  const handleRestore = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (onRestoreCustomer) onRestoreCustomer(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const customer = sourceList.find(c => c.id === id);
      if (window.confirm(`PERMANENT DELETE "${customer?.name}"? This cannot be undone.`)) {
          if (onPermanentDeleteCustomer) onPermanentDeleteCustomer(id);
      }
  };

  const getMonthNames = (months?: number[]) => {
    if (!months || months.length === 0) return 'Unscheduled';
    return months.map(m => MONTHS_SHORT[m-1]).join(', ');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Site Portfolio</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Maintenance Management</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">List</span>
                <button 
                    onClick={() => setIsCondensed(!isCondensed)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isCondensed ? 'bg-safety-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isCondensed ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
            </div>
            {!showArchived && (
                <Button onClick={onAddCustomer} icon={<Plus className="w-4 h-4" />} className="text-xs font-black uppercase tracking-widest py-2">
                    Add Site
                </Button>
            )}
            <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`text-xs py-1.5 px-3 font-black uppercase tracking-widest rounded-lg border transition-all ${showArchived ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
                {showArchived ? 'Active' : 'Archives'}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search site, contact, or location..." 
                    className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 font-medium text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border transition-all text-xs font-bold ${isFiltersOpen ? 'bg-safety-50 border-safety-500 text-safety-700 dark:bg-safety-900/20' : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-700'}`}
            >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {isFiltersOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>
        </div>
        
        {isFiltersOpen && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 animate-fadeIn border-t border-gray-50 dark:border-gray-700">
                <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="pl-7 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white outline-none font-bold">
                        <option value="All">All Months</option>
                        {MONTHS_SHORT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <Wrench className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <select value={serviceTypeFilter} onChange={(e) => setServiceTypeFilter(e.target.value as ServiceTypeFilter)} className="pl-7 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white outline-none font-bold">
                        <option value="All">All Types</option>
                        <option value="Extinguisher">Extinguisher</option>
                        <option value="System">System</option>
                    </select>
                </div>
                <div className="relative">
                    <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="pl-7 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white outline-none font-bold">
                        <option value="All">All Techs</option>
                        {uniqueReps.map(rep => <option key={rep} value={rep}>{rep}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="pl-7 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white outline-none font-bold">
                        <option value="All">All Cities</option>
                        {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                </div>
            </div>
        )}
      </div>

      <div className="space-y-4">
        {isCondensed ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="hidden md:grid md:grid-cols-12 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 p-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <div className="col-span-4">Business</div>
                    <div className="col-span-3">Address</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2">Techs</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredCustomers.map(customer => {
                        const unitCount = getExtinguisherCount(customer.id);
                        return (
                            <div key={customer.id} className="flex flex-col md:grid md:grid-cols-12 p-3 md:items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group gap-1 md:gap-0">
                                <div className="flex items-center justify-between md:col-span-4 min-w-0">
                                    <div className="min-w-0 flex items-center gap-2">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{customer.name}</p>
                                        <span className="md:hidden inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-[9px] px-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                                            {unitCount}
                                        </span>
                                    </div>
                                    <div className="flex md:hidden gap-1">
                                        {showArchived ? (
                                            <div className="flex gap-1">
                                                {/* Corrected: replaced 'RefreshCw' with 'RefreshCcw' */}
                                                <button onClick={(e) => handleRestore(e, customer.id)} className="p-1.5 text-green-600 bg-green-50 rounded-lg"><RefreshCcw className="w-4 h-4"/></button>
                                                <button onClick={(e) => handlePermanentDelete(e, customer.id)} className="p-1.5 text-red-600 bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => onEditCustomer(customer.id)} className="p-1.5 text-gray-400 hover:text-safety-600"><Edit2 className="w-4 h-4"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); setHistoryCustomer(customer); }} className="p-1.5 text-gray-400 hover:text-blue-500"><Clock className="w-4 h-4"/></button>
                                                <button onClick={(e) => handleArchive(e, customer.id)} className="p-1.5 text-gray-400 hover:text-orange-500"><Archive className="w-4 h-4"/></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-3 flex items-center gap-1 text-[11px] text-gray-500 truncate font-medium">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span>{customer.address}</span>
                                </div>
                                <div className="hidden md:block col-span-1 text-center">
                                    <span className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-[10px] px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                        {unitCount}
                                    </span>
                                </div>
                                <div className="flex md:col-span-2 items-center gap-3 md:flex-col md:items-start md:gap-0">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500">
                                        <Briefcase className="w-2.5 h-2.5 text-red-400" />
                                        <span>{customer.extinguisherTech || customer.assignedTechnician || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500">
                                        <Wrench className="w-2.5 h-2.5 text-blue-400" />
                                        <span>{customer.systemTech || '-'}</span>
                                    </div>
                                </div>
                                <div className="hidden md:flex col-span-2 justify-end gap-1">
                                    {showArchived ? (
                                        <>
                                            {/* Corrected: replaced 'RefreshCw' with 'RefreshCcw' */}
                                            <button onClick={(e) => handleRestore(e, customer.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Restore"><RefreshCcw className="w-4 h-4"/></button>
                                            <button onClick={(e) => handlePermanentDelete(e, customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Permanent"><Trash2 className="w-4 h-4"/></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); setHistoryCustomer(customer); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="History"><Clock className="w-4 h-4"/></button>
                                            <button onClick={() => onEditCustomer(customer.id)} className="p-2 text-safety-600 hover:bg-red-50 rounded-xl transition-all" title="Edit"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={(e) => handleArchive(e, customer.id)} className="p-2 text-gray-400 hover:text-orange-500 rounded-xl transition-all" title="Archive"><Archive className="w-4 h-4"/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredCustomers.map(customer => {
                    const unitCount = getExtinguisherCount(customer.id);
                    return (
                        <div key={customer.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-md transition-all relative group flex flex-col overflow-hidden ${showArchived ? 'border-orange-100 dark:border-orange-900/30 grayscale opacity-80' : 'border-gray-100 dark:border-gray-700'}`}>
                            
                            {/* Actions (Enlarged and consistently positioned) */}
                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                {showArchived ? (
                                    <>
                                        {/* Corrected: replaced 'RefreshCw' with 'RefreshCcw' */}
                                        <button onClick={(e) => handleRestore(e, customer.id)} className="bg-green-600 text-white p-2 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all" title="Restore"><RefreshCcw className="w-5 h-5" /></button>
                                        <button onClick={(e) => handlePermanentDelete(e, customer.id)} className="bg-red-600 text-white p-2 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all" title="Delete Permanent"><Trash2 className="w-5 h-5" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setHistoryCustomer(customer); }} className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 border border-blue-100 hover:scale-105 active:scale-95 transition-all" title="History"><Clock className="w-5 h-5" /></button>
                                        <button onClick={() => onEditCustomer(customer.id)} className="bg-safety-600 text-white p-2 rounded-xl shadow-lg hover:bg-safety-700 hover:scale-105 active:scale-95 transition-all" title="Edit Site"><Edit2 className="w-5 h-5" /></button>
                                        <button onClick={(e) => handleArchive(e, customer.id)} className="bg-gray-100 dark:bg-gray-700 text-gray-400 p-2 rounded-xl hover:bg-orange-100 hover:text-orange-600 hover:scale-105 active:scale-95 transition-all" title="Archive"><Archive className="w-5 h-5" /></button>
                                    </>
                                )}
                            </div>

                            <div className="p-3 pb-2">
                                <div className="flex items-start gap-2.5">
                                    <div className={`p-2 rounded-lg shadow-inner flex-shrink-0 ${showArchived ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1 pr-10">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tight leading-tight">{customer.name}</h3>
                                        <div className="flex items-center text-[10px] font-bold text-gray-400 mt-0.5">
                                            <User className="w-3 h-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{customer.contactPerson || 'No Primary Contact'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-3 pb-2">
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-all group/addr"
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5 text-safety-600" /> Location
                                        </span>
                                        <ExternalLink className="w-2.5 h-2.5 text-gray-300 group-hover/addr:text-blue-500" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight truncate">{customer.address}</p>
                                </a>
                            </div>

                            {/* Service Cycle & Technician (Text-based Month names & Assigned Techs) */}
                            <div className="px-3 pb-3 space-y-2">
                                <div className="space-y-1.5 bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-700 p-2 rounded-xl shadow-inner">
                                    <div className="flex items-start gap-2">
                                        <div className="w-1 h-6 bg-red-500 rounded-full mt-1"></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Extinguisher</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                                   <Briefcase className="w-2 h-2" /> {customer.extinguisherTech || customer.assignedTechnician || 'Unassigned'}
                                                </p>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 truncate">
                                                {getMonthNames(customer.serviceMonths)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="w-1 h-6 bg-blue-500 rounded-full mt-1"></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">System</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                                   <Wrench className="w-2 h-2" /> {customer.systemTech || 'Unassigned'}
                                                </p>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 truncate">
                                                {getMonthNames(customer.systemMonths)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 border-t border-gray-50 dark:border-gray-700 mt-auto">
                                <div className="p-2 border-r border-gray-50 dark:border-gray-700">
                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <Phone className="w-2.5 h-2.5 text-green-600" /> Phone
                                    </p>
                                    {customer.phone ? (
                                        <a href={`tel:${customer.phone}`} className="block text-[10px] font-bold text-blue-600 hover:underline truncate">
                                            {customer.phone}
                                        </a>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 italic">—</span>
                                    )}
                                </div>
                                <div className="p-2 bg-gray-50/20">
                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <Clipboard className="w-2.5 h-2.5 text-blue-600" /> Units
                                    </p>
                                    <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{unitCount} Count</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
        
        {filteredCustomers.length === 0 && (
            <div className="text-center py-24 text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-300">No Sites Matching Criteria</p>
            </div>
        )}
      </div>

      {historyCustomer && (
          <CustomerHistoryModal 
            isOpen={!!historyCustomer}
            onClose={() => setHistoryCustomer(null)}
            customer={historyCustomer}
            records={records}
            extinguishers={extinguishers}
          />
      )}
    </div>
  );
};