
import React, { useState, useMemo } from 'react';
import { InspectionRecord, Extinguisher, Customer, User } from '../types';
import { History, Search, Calendar, User as UserIcon, Building2, Tag, AlertTriangle, CheckCircle, ChevronRight, Filter, Clock, ChevronDown, ChevronUp, Trash2, XCircle, FileText, Settings, ShieldAlert, List, Table as TableIcon, Info } from 'lucide-react';
import { Button } from './Button';

interface HistoryLogProps {
  records: InspectionRecord[];
  extinguishers: Extinguisher[];
  customers: Customer[];
  technicians: string[];
  currentUser: User | null;
  onDeleteRecords: (ids: string[]) => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ 
    records = [], 
    extinguishers = [], 
    customers = [], 
    technicians = [], 
    currentUser,
    onDeleteRecords 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [techFilter, setTechFilter] = useState<string>('All');
  const [customerFilter, setCustomerFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>(''); 
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('table');
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [cleanupMonths, setCleanupMonths] = useState(12);

  // Privacy Filtering: Non-admins can ONLY see their own records.
  const authorizedRecords = useMemo(() => {
    if (currentUser?.role === 'admin') return records;
    return records.filter(r => r.inspectorName === currentUser?.name);
  }, [records, currentUser]);

  // UI Filtering
  const filteredRecords = useMemo(() => {
    return authorizedRecords.filter(record => {
      const ext = extinguishers.find(e => e.id === record.extinguisherId);
      const customer = ext ? customers.find(c => c.id === ext.customerId) : null;
      
      const searchString = `${customer?.name || ''} ${ext?.location || ''} ${record.inspectorName || ''} ${record.notes || ''}`.toLowerCase();
      const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'All' || record.severityRating === severityFilter;
      const matchesTech = techFilter === 'All' || record.inspectorName === techFilter;
      const matchesCustomer = customerFilter === 'All' || customer?.id === customerFilter;
      const matchesMonth = !monthFilter || (record.date && record.date.startsWith(monthFilter));

      return matchesSearch && matchesSeverity && matchesTech && matchesCustomer && matchesMonth;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [authorizedRecords, extinguishers, customers, searchTerm, severityFilter, techFilter, customerFilter, monthFilter]);

  // Grouping by Site + Date (Inspection Run)
  const groupedRecords = useMemo(() => {
    const groups: Record<string, { customerName: string; date: string; inspector: string; records: InspectionRecord[] }> = {};
    
    filteredRecords.forEach(record => {
        const ext = extinguishers.find(e => e.id === record.extinguisherId);
        const customer = ext ? customers.find(c => c.id === ext.customerId) : null;
        const dateKey = (record.date || '1970-01-01').split('T')[0]; 
        const siteKey = customer?.id || 'unknown';
        const groupKey = `${siteKey}-${dateKey}`;
        
        if (!groups[groupKey]) {
            groups[groupKey] = {
                customerName: customer?.name || 'Unknown Site',
                date: dateKey,
                inspector: record.inspectorName,
                records: []
            };
        }
        groups[groupKey].records.push(record);
    });
    
    return Object.entries(groups).sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime());
  }, [filteredRecords, extinguishers, customers]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCleanup = () => {
      if (currentUser?.role !== 'admin') return;
      if (!confirm(`Are you sure you want to delete all inspection records older than ${cleanupMonths} months? This cannot be undone.`)) return;
      
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - cleanupMonths);
      
      const toDelete = records.filter(r => new Date(r.date) < cutoff).map(r => r.id);
      
      if (toDelete.length === 0) {
          alert("No records found matching that criteria.");
          return;
      }
      
      onDeleteRecords(toDelete);
      alert(`Deleted ${toDelete.length} records.`);
  };

  const formatDate = (dateStr?: string) => {
      if (!dateStr) return 'N/A';
      try {
          return new Date(dateStr).toLocaleDateString();
      } catch (e) { return 'Invalid Date'; }
  };

  const formatTime = (dateStr?: string) => {
      if (!dateStr) return 'N/A';
      try {
          return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return 'N/A'; }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
            <History className="w-6 h-6 text-safety-600" />
            Inspection Archives
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {currentUser?.role === 'admin' ? 'Company-wide inspection telemetry' : 'Your personal inspection history'}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 mr-2">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Audit Table View"
                >
                    <TableIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('grouped')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Site Grouped View"
                >
                    <List className="w-4 h-4" />
                </button>
            </div>
            {currentUser?.role === 'admin' && (
                <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                    icon={<Settings className="w-4 h-4" />}
                >
                    Cleanup
                </Button>
            )}
        </div>
      </div>

      {isAdminPanelOpen && currentUser?.role === 'admin' && (
          <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 p-6 rounded-2xl animate-fadeIn shadow-inner">
              <h3 className="text-red-900 dark:text-red-300 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4" /> Admin Data Cleanup
              </h3>
              <div className="flex flex-wrap items-end gap-6">
                  <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-black text-red-700 dark:text-red-400 uppercase mb-2">Delete logs older than</label>
                      <select 
                        value={cleanupMonths} 
                        onChange={(e) => setCleanupMonths(Number(e.target.value))}
                        className="w-full bg-white dark:bg-gray-800 border-red-300 dark:border-red-800 rounded-xl text-sm font-bold p-2.5 outline-none"
                      >
                          <option value={3}>3 Months</option>
                          <option value={6}>6 Months</option>
                          <option value={12}>12 Months (1 Year)</option>
                          <option value={24}>24 Months (2 Years)</option>
                      </select>
                  </div>
                  <Button variant="danger" onClick={handleCleanup} icon={<Trash2 className="w-4 h-4" />}>Perform Cleanup</Button>
              </div>
              <p className="mt-3 text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> This will remove records for ALL technicians
              </p>
          </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by notes, site, unit or tech..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-safety-500 rounded-xl text-sm font-medium transition-all outline-none dark:text-white"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                    value={customerFilter} 
                    onChange={e => setCustomerFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg text-xs font-bold appearance-none outline-none border border-transparent focus:border-safety-500"
                >
                    <option value="All">All Customers</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                    value={techFilter} 
                    onChange={e => setTechFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg text-xs font-bold appearance-none outline-none border border-transparent focus:border-safety-500"
                >
                    <option value="All">All Technicians</option>
                    {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="month" 
                    value={monthFilter} 
                    onChange={e => setMonthFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg text-xs font-bold appearance-none outline-none border border-transparent focus:border-safety-500"
                />
            </div>
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                    value={severityFilter} 
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-lg text-xs font-bold appearance-none outline-none border border-transparent focus:border-safety-500"
                >
                    <option value="All">All Statuses</option>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority (Issues)</option>
                </select>
            </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-widest font-black text-[9px] border-b border-gray-100 dark:border-gray-700">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Site</th>
                        <th className="p-4">Unit</th>
                        <th className="p-4">Tech</th>
                        <th className="p-4">Priority</th>
                        <th className="p-4">Observation</th>
                        <th className="p-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {filteredRecords.map(record => {
                        const ext = extinguishers.find(e => e.id === record.extinguisherId);
                        const customer = ext ? customers.find(c => c.id === ext.customerId) : null;
                        const isFail = record.severityRating === 'High';
                        
                        return (
                            <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="p-4 whitespace-nowrap">
                                    <div className="font-bold text-gray-900 dark:text-white">{formatDate(record.date)}</div>
                                    <div className="text-[10px] text-gray-400">{formatTime(record.date)}</div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{customer?.name || 'Unknown Site'}</div>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{customer?.address}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ${isFail ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{ext?.unitNumber || '?'}</span>
                                        <div>
                                            <div className="font-bold">{ext?.type}</div>
                                            <div className="text-[10px] text-gray-400">{ext?.location}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 whitespace-nowrap font-medium text-gray-600 dark:text-gray-300">{record.inspectorName}</td>
                                <td className="p-4">
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                        record.severityRating === 'High' ? 'bg-red-600 text-white border-red-600' : 
                                        record.severityRating === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                    }`}>
                                        {record.severityRating}
                                    </span>
                                </td>
                                <td className="p-4 min-w-[200px]">
                                    <div className="text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                                        {record.notes ? `"${record.notes}"` : 'No comments recorded.'}
                                    </div>
                                    {record.disposition && (
                                        <div className="mt-1 text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                            <Info className="w-2.5 h-2.5" /> Action: {record.disposition}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {currentUser?.role === 'admin' && (
                                        <button 
                                            onClick={() => onDeleteRecords([record.id])}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                            title="Purge Record"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedRecords.map(([key, group]) => {
            const isExpanded = !!expandedGroups[key];
            const hasIssues = group.records.some(r => r.severityRating === 'High');

            return (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300">
                  <button 
                      onClick={() => toggleGroup(key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                      <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl shadow-sm ${hasIssues ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
                              {hasIssues ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          </div>
                          <div>
                              <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{group.customerName}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {formatDate(group.date)}
                                  </span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" /> {group.inspector}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-inner">
                              {group.records.length} Units
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                      </div>
                  </button>

                  {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-2 animate-fadeIn bg-gray-50/30 dark:bg-gray-900/20">
                          {group.records.map(record => {
                              const ext = extinguishers.find(e => e.id === record.extinguisherId);
                              const isFail = record.severityRating === 'High';
                              return (
                                  <div key={record.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm group">
                                      <div className="flex items-center gap-4 flex-1">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isFail ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                              {ext?.unitNumber || '?'}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                                                  {ext?.location} <span className="text-gray-400 font-medium ml-1">({ext?.type})</span>
                                              </p>
                                              {record.notes && (
                                                  <p className="text-[10px] text-gray-500 italic mt-0.5 truncate">"{record.notes}"</p>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          {record.severityRating !== 'Low' && (
                                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                                  record.severityRating === 'High' ? 'bg-red-600 text-white border-red-600' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                              }`}>
                                                  {record.severityRating}
                                              </span>
                                          )}
                                          <span className="text-[10px] font-bold text-gray-400">{formatTime(record.date)}</span>
                                          {currentUser?.role === 'admin' && (
                                            <button 
                                                onClick={() => onDeleteRecords([record.id])}
                                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {filteredRecords.length === 0 && (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <XCircle className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Archive Empty</h3>
          <p className="text-sm text-gray-500 mt-2">Try clearing your search filters</p>
        </div>
      )}
    </div>
  );
};
