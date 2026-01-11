
import React, { useState, useMemo } from 'react';
import { AuditEntry, User } from '../types';
import { History, Search, Filter, ChevronDown, ChevronUp, User as UserIcon, Calendar, Clock, Info, ShieldAlert, CheckCircle2, UserCog, Building2, PackageMinus, Trash2, Archive, RefreshCw, AlertTriangle, Eraser } from 'lucide-react';
import { Button } from './Button';

interface AuditLogViewProps {
  auditLogs: AuditEntry[];
  currentUser: User | null;
  onDeleteLogs?: (ids: string[]) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs, currentUser, onDeleteLogs }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [entityFilter, setEntityFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Admin Purge States
  const [purgeUser, setPurgeUser] = useState('All');
  const [purgeAge, setPurgeAge] = useState('All');
  const [isPurgePanelOpen, setIsPurgePanelOpen] = useState(false);

  // Unique users found in logs for the purge dropdown
  const uniqueLogUsers = useMemo(() => {
    const users = new Map<string, string>();
    auditLogs.forEach(log => {
      users.set(log.userId, log.userName);
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [auditLogs]);

  // Filter logs by authorization and UI filters
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Authorization: Techs see only their own actions
      if (!isAdmin && log.userId !== currentUser?.technicianId) return false;

      // 2. Text Search
      const matchesSearch = !searchTerm || 
        log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // 3. Action Filter
      if (actionFilter !== 'All' && log.action !== actionFilter) return false;

      // 4. Entity Filter
      if (entityFilter !== 'All' && log.entityType !== entityFilter) return false;

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, isAdmin, currentUser, searchTerm, actionFilter, entityFilter]);

  const handlePurge = () => {
    if (!isAdmin || !onDeleteLogs) return;

    let toDelete = [...auditLogs];

    // Filter by user
    if (purgeUser !== 'All') {
      toDelete = toDelete.filter(log => log.userId === purgeUser);
    }

    // Filter by age
    if (purgeAge !== 'All') {
      const now = new Date();
      let cutoff = new Date();
      
      switch (purgeAge) {
        case '1w': cutoff.setDate(now.getDate() - 7); break;
        case '1m': cutoff.setMonth(now.getMonth() - 1); break;
        case '3m': cutoff.setMonth(now.getMonth() - 3); break;
        case '6m': cutoff.setMonth(now.getMonth() - 6); break;
        case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      }
      toDelete = toDelete.filter(log => new Date(log.timestamp) < cutoff);
    }

    const idsToDelete = toDelete.map(l => l.id);

    if (idsToDelete.length === 0) {
      alert("No records match the selected criteria for deletion.");
      return;
    }

    const userLabel = purgeUser === 'All' ? 'ALL users' : `tech ID: ${purgeUser}`;
    const ageLabel = purgeAge === 'All' ? 'all history' : `records older than ${purgeAge}`;

    if (window.confirm(`PERMANENT PURGE: Delete ${idsToDelete.length} activity records for ${userLabel} ${ageLabel}? This cannot be undone.`)) {
      onDeleteLogs(idsToDelete);
      setIsPurgePanelOpen(false);
    }
  };

  const getActionIcon = (action: AuditEntry['action']) => {
    switch (action) {
      case 'Cleared': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Created': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'Updated': return <UserCog className="w-4 h-4 text-purple-600" />;
      case 'Archived': return <Archive className="w-4 h-4 text-orange-600" />;
      case 'Deleted': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'Restored': return <RefreshCw className="w-4 h-4 text-green-600" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEntityIcon = (type: AuditEntry['entityType']) => {
    switch (type) {
      case 'Customer': return <Building2 className="w-4 h-4" />;
      case 'Asset': return <PackageMinus className="w-4 h-4" />;
      case 'User': return <UserIcon className="w-4 h-4" />;
      case 'System': return <ShieldAlert className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-red-900 dark:text-red-300 font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Activity Maintenance Tools
            </h3>
            <button 
              onClick={() => setIsPurgePanelOpen(!isPurgePanelOpen)}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              {isPurgePanelOpen ? 'Hide Tools' : 'Show Purge Options'}
              {isPurgePanelOpen ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
          </div>

          {isPurgePanelOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn border-t border-red-100 dark:border-red-900/50 pt-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-red-700 dark:text-red-400 uppercase">Target Technician</label>
                <select 
                  value={purgeUser} 
                  onChange={(e) => setPurgeUser(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 rounded-xl text-xs font-bold p-2 outline-none"
                >
                  <option value="All">All Technicians</option>
                  {uniqueLogUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-red-700 dark:text-red-400 uppercase">Retention Period</label>
                <select 
                  value={purgeAge} 
                  onChange={(e) => setPurgeAge(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 rounded-xl text-xs font-bold p-2 outline-none"
                >
                  <option value="All">Delete All Matching User</option>
                  <option value="1w">Older than 1 Week</option>
                  <option value="1m">Older than 1 Month</option>
                  <option value="3m">Older than 3 Months</option>
                  <option value="6m">Older than 6 Months</option>
                  <option value="1y">Older than 1 Year</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="danger" 
                  onClick={handlePurge} 
                  className="w-full shadow-lg"
                  icon={<Eraser className="w-4 h-4" />}
                >
                  Purge Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activity by name or tech..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold bg-white dark:bg-gray-700 outline-none"
            >
              <option value="All">All Actions</option>
              <option value="Cleared">Cleared</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Archived">Archived</option>
              <option value="Deleted">Deleted</option>
              <option value="Restored">Restored</option>
            </select>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold bg-white dark:bg-gray-700 outline-none"
            >
              <option value="All">All Entities</option>
              <option value="Customer">Customers</option>
              <option value="Asset">Assets</option>
              <option value="User">Users</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredLogs.map((log) => (
            <div key={log.id} className="transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div 
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="p-4 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 shadow-inner">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-safety-600">{log.action}</span>
                      <span className="text-gray-300 dark:text-gray-600">/</span>
                      <span className="truncate">{log.entityName}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> {log.userName}
                      </span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-gray-500">
                    {getEntityIcon(log.entityType)} {log.entityType}
                  </span>
                  {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              
              {expandedId === log.id && (
                <div className="p-4 pt-0 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Audit Detail Trace</p>
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-medium font-mono leading-relaxed break-words whitespace-pre-wrap">
                        {log.details || 'No extended metadata for this action.'}
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm("Delete this individual log?")) onDeleteLogs?.([log.id]); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors ml-4"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 italic text-sm">No activity records match your current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
