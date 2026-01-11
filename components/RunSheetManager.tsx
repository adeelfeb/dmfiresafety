import React, { useState, useEffect } from 'react';
import { Customer, Extinguisher, InspectionRecord } from '../types';
import { Button } from './Button';
import { Search, MapPin, Building2, ChevronRight, ArrowLeft, ClipboardList, Filter, Calendar, User, Map, Plus, X, Phone } from 'lucide-react';
import { AssetList } from './AssetList';

interface RunSheetManagerProps {
  customers: Customer[];
  extinguishers: Extinguisher[];
  records: InspectionRecord[];
  onInspect: (id: string) => void;
  onSelect: (id: string) => void;
  onAddExtinguisher: (customerId?: string) => void;
  onEditExtinguisher: (id: string) => void;
  onDeleteExtinguisher: (id: string) => void;
  onAddCustomer: () => void;
  onEditCustomer: (id: string) => void;
  onReorder: (updatedExts: Extinguisher[]) => void;
  onQuickInspect: (id: string) => void;
  // Controlled props from parent (App.tsx)
  activeCustomerId: string | null;
  onCustomerSelect: (id: string | null) => void;
  technicians: string[];
}

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
];

export const RunSheetManager: React.FC<RunSheetManagerProps> = ({
  customers,
  extinguishers,
  records,
  onInspect,
  onSelect,
  onAddExtinguisher,
  onEditExtinguisher,
  onDeleteExtinguisher,
  onAddCustomer,
  onEditCustomer,
  onReorder,
  onQuickInspect,
  activeCustomerId,
  onCustomerSelect,
  technicians
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedTech, setSelectedTech] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'address'>('name');

  // New Run Sheet Modal State
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [newSheetSearch, setNewSheetSearch] = useState('');

  // --- View 1: Customer List Selection ---
  const renderCustomerList = () => {
    // Filter Logic
    const filteredCustomers = customers.filter(c => {
        // 1. Text Search
        const matchesSearch = 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.address.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // 2. Month & Tech Filter (Combined logic)
        const isExtinguisherDue = c.serviceMonths?.includes(selectedMonth);
        const isSystemDue = c.systemMonths?.includes(selectedMonth);

        if (selectedTech === 'All') {
            return isExtinguisherDue || isSystemDue;
        } else {
            const extTech = c.extinguisherTech || c.assignedTechnician;
            const sysTech = c.systemTech;

            const extMatch = isExtinguisherDue && (extTech === selectedTech);
            const sysMatch = isSystemDue && (sysTech === selectedTech);
            return extMatch || sysMatch;
        }
    }).sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            return a.address.localeCompare(b.address);
        }
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Run Sheets</h2>
            <p className="text-gray-500 dark:text-gray-400">Select a job site to begin inspection</p>
          </div>
          <Button onClick={() => setShowNewSheetModal(true)} icon={<Plus className="w-4 h-4" />}>
            New Run Sheet
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                type="text" 
                placeholder="Search name or address..." 
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                <div className="relative min-w-[140px]">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="pl-9 pr-8 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        {MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[160px]">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select 
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                        className="pl-9 pr-8 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="All">All Technicians</option>
                        {technicians.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="relative min-w-[140px]">
                    <Map className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'address')}
                        className="pl-9 pr-8 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="address">Sort by Town/City</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Customer List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map(customer => {
                const unitCount = extinguishers.filter(e => e.customerId === customer.id).length;
                
                const isExtDue = customer.serviceMonths?.includes(selectedMonth);
                const isSysDue = customer.systemMonths?.includes(selectedMonth);

                return (
                    <div 
                        key={customer.id} 
                        onClick={() => onCustomerSelect(customer.id)}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                    >
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate" title={customer.name}>{customer.name}</h3>
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                                {unitCount} Units
                            </span>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                            {/* Address Text - Link removed per request */}
                            <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1.5 w-full">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                <span className="truncate">{customer.address}</span>
                            </div>

                            {/* Phone remains a link for practical technician utility */}
                            {customer.phone && (
                                <a 
                                    href={`tel:${customer.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
                                >
                                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                    <span>{customer.phone}</span>
                                </a>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex gap-1.5">
                                {isExtDue && (
                                    <span className="text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded border border-red-100 dark:border-red-900">
                                        EXT
                                    </span>
                                )}
                                {isSysDue && (
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900">
                                        SYS
                                    </span>
                                )}
                                {!isExtDue && !isSysDue && (
                                    <span className="text-[10px] font-medium text-gray-400 px-1">
                                        Off Schedule
                                    </span>
                                )}
                            </div>
                            
                            <div className="text-gray-300 group-hover:text-blue-600 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {filteredCustomers.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No customers found.</p>
                <p className="text-xs text-gray-400">Try adjusting the month or technician filter.</p>
            </div>
        )}

        {/* New Run Sheet Modal */}
        {showNewSheetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                            Start Run Sheet
                        </h3>
                        <button onClick={() => setShowNewSheetModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Link to Existing Customer</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Search by name or address..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={newSheetSearch}
                                    onChange={e => setNewSheetSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {newSheetSearch.trim().length > 0 && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    {customers.filter(c => 
                                        c.name.toLowerCase().includes(newSheetSearch.toLowerCase()) || 
                                        c.address.toLowerCase().includes(newSheetSearch.toLowerCase())
                                    ).map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                onCustomerSelect(c.id);
                                                setShowNewSheetModal(false);
                                                setNewSheetSearch('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex justify-between items-center border-b border-gray-100 dark:border-gray-600 last:border-none group"
                                        >
                                            <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">{c.name}</span>
                                            <span className="text-xs text-gray-400 truncate max-w-[120px]">{c.address.split(',')[0]}</span>
                                        </button>
                                    ))}
                                    {customers.filter(c => c.name.toLowerCase().includes(newSheetSearch.toLowerCase()) || c.address.toLowerCase().includes(newSheetSearch.toLowerCase())).length === 0 && (
                                        <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center italic">No customers found</div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="relative flex items-center py-1">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase">OR</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        </div>

                        <Button 
                            onClick={() => {
                                onAddCustomer();
                                setShowNewSheetModal(false);
                            }} 
                            className="w-full justify-center"
                            icon={<Plus className="w-4 h-4" />}
                        >
                            Create New Customer
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  // --- View 2: Run Sheet Detail (Tiles) ---
  if (activeCustomerId) {
      const customer = customers.find(c => c.id === activeCustomerId);
      if (!customer) return <div>Customer not found</div>;

      return (
        <div className="space-y-4">
             {/* Back Header */}
            <div className="flex items-center gap-3 mb-2">
                <button 
                    onClick={() => onCustomerSelect(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <ClipboardList className="w-4 h-4" />
                        <span>Run Sheet</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h2>
                </div>
            </div>

            <AssetList 
                extinguishers={extinguishers}
                customers={customers}
                records={records}
                onInspect={onInspect}
                onSelect={onSelect}
                onAddExtinguisher={onAddExtinguisher}
                onEditExtinguisher={onEditExtinguisher}
                onDeleteExtinguisher={onDeleteExtinguisher}
                onAddCustomer={onAddCustomer}
                onEditCustomer={onEditCustomer}
                onQuickInspect={onQuickInspect}
                onReorder={onReorder}
                fixedCustomerId={activeCustomerId}
            />
        </div>
      );
  }

  return renderCustomerList();
};