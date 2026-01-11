
import React from 'react';
import { Customer, InspectionRecord, Extinguisher } from '../types';
import { X, Clock, Calendar, CheckCircle2, User, Building2, PackageMinus, Cylinder, Clipboard } from 'lucide-react';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  records: InspectionRecord[];
  extinguishers: Extinguisher[];
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  records,
  extinguishers
}) => {
  if (!isOpen) return null;

  // 1. Calculate Last Monthly Inspection Date
  const siteAssetIds = extinguishers
    .filter(e => e.customerId === customer.id)
    .map(e => e.id);
  
  const siteRecords = records
    .filter(r => siteAssetIds.includes(r.extinguisherId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastInspectionDate = siteRecords.length > 0 
    ? new Date(siteRecords[0].date).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'No inspection records found';

  // 2. Sort completed services by date (most recent first)
  const history = (customer.completedServices || [])
    .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Site History Log</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Top Summary Card */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Last Site Inspection</p>
                    <p className="font-bold text-gray-900 dark:text-white">{lastInspectionDate}</p>
                </div>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregate Records</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{history.length + siteRecords.length}</p>
              </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] border-b border-gray-100 dark:border-gray-700 pb-2">Service Lifecycle Timeline</h4>
            
            {history.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <Clipboard className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No Major Service Records</p>
                    <p className="text-xs text-gray-400 mt-1 italic">Annual or Semi-Annual completions will appear here.</p>
                </div>
            ) : (
                <div className="relative pl-6 space-y-10">
                    {/* Timeline Line */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700"></div>

                    {history.map((service, idx) => (
                        <div key={idx} className="relative">
                            {/* Dot */}
                            <div className={`absolute -left-[2.2rem] top-1 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 shadow-sm flex items-center justify-center ${
                                service.type === 'Extinguisher' ? 'bg-red-600' : 'bg-blue-600'
                            }`}>
                                <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>

                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                            service.type === 'Extinguisher' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {service.type} Service
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(service.completedDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                                        <User className="w-3 h-3" /> {service.completedBy}
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Snapshot section */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {service.extinguishersOutSnapshot && service.extinguishersOutSnapshot.length > 0 && (
                                            <div className="p-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <PackageMinus className="w-3 h-3 text-orange-600" />
                                                    <span className="text-[8px] font-black text-orange-700 uppercase tracking-widest">Extinguisher Out-List</span>
                                                </div>
                                                <ul className="text-[9px] space-y-0.5 text-gray-600 dark:text-gray-400 font-bold">
                                                    {service.extinguishersOutSnapshot.map((e, i) => (
                                                        <li key={i}>{e.quantity}x {e.size} {e.brand} {e.type}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {service.systemTanksSnapshot && service.systemTanksSnapshot.length > 0 && (
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Cylinder className="w-3 h-3 text-blue-600" />
                                                    <span className="text-[8px] font-black text-blue-700 uppercase tracking-widest">System Out-List</span>
                                                </div>
                                                <ul className="text-[9px] space-y-0.5 text-gray-600 dark:text-gray-400 font-bold">
                                                    {service.systemTanksSnapshot.map((t, i) => (
                                                        <li key={i}>{t.quantity}x {t.size} {t.brand} ({t.year})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes Section */}
                                    <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Clipboard className="w-3 h-3 text-gray-400" />
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Service Technician Notes</span>
                                        </div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 italic font-medium leading-relaxed">
                                            {service.notesSnapshot || 'No specific maintenance notes recorded for this service event.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Lifecycle Data Verification Audit</p>
        </div>
      </div>
    </div>
  );
};
