import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Extinguisher, InspectionRecord, Customer, AssetType, ExtinguisherOutEntry, SystemTankEntry, User, ServiceCompletion } from '../types';
import { Button } from './Button';
import { Printer, Mail, Calendar, FileText, CheckCircle, XCircle, AlertTriangle, MapPin, User as UserIcon, Phone, Flame, Clock, AlertCircle, CalendarRange, Share2, Briefcase, Filter, CheckSquare, Square, PackageMinus, Cylinder, Grid3X3, Map as MapIcon, Loader2, Wrench, WifiOff, Layers, Paperclip, Zap, ChevronRight, Building2, ClipboardList, KeyRound, Lock, Sun, ChevronDown, ListChecks, CalendarClock, RefreshCcw, FilePlus, History, CheckCircle2, Clipboard, ChevronUp, Info, Activity } from 'lucide-react';

// Declare html2pdf and Leaflet for TypeScript since they're loaded via CDN
declare var html2pdf: any;
declare var L: any;

export type ReportType = 'monthly' | 'service' | 'schedule' | 'extinguisher_out' | 'system_tanks' | 'heat_map' | 'combined_out' | 'lights' | 'inventory_summary' | 'battery_replacement' | 'lifecycle_timeline';

interface ReportsViewProps {
  extinguishers: Extinguisher[];
  customers: Customer[];
  records: InspectionRecord[];
  technicians: string[];
  initialReportType?: ReportType;
  initialCustomerId?: string;
  initialMonth?: string; // YYYY-MM
  initialTech?: string;
  currentUser?: User | null;
  onBack?: () => void;
}

type FilterMode = 'all' | 'due_year' | 'overdue';

const MONTHS_FULL = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

interface ReportDefinition {
    id: ReportType;
    label: string;
    description: string;
    icon: React.ElementType;
    category: 'Actionable' | 'Management' | 'Compliance';
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
    { id: 'combined_out', label: 'Combined Out List', description: 'All units due for major service', icon: Layers, category: 'Actionable' },
    { id: 'extinguisher_out', label: 'Extinguishers Out', description: 'Extinguishers due for 6/12yr service', icon: PackageMinus, category: 'Actionable' },
    { id: 'system_tanks', label: 'System Cylinders Out', description: 'Suppression tanks due for recharge', icon: Cylinder, category: 'Actionable' },
    { id: 'battery_replacement', label: 'Batteries Due', description: 'Lights needing battery replacement', icon: Zap, category: 'Actionable' },
    { id: 'schedule', label: 'Monthly List', description: 'Scheduled site stops for the month', icon: Briefcase, category: 'Management' },
    { id: 'service', label: 'Service Forecast List', description: 'Yearly projection of major services', icon: CalendarClock, category: 'Management' },
    { id: 'inventory_summary', label: 'Inventory Summary', description: 'Counts per site by type/size', icon: ClipboardList, category: 'Management' },
    { id: 'heat_map', label: 'Customer Locations', description: 'Site location map of client portfolio', icon: MapIcon, category: 'Management' },
    { id: 'monthly', label: 'Monthly Inspection', description: 'Fire extinguisher check log', icon: FileText, category: 'Compliance' },
    { id: 'lights', label: 'Emergency Light Test', description: 'Monthly light testing log', icon: Sun, category: 'Compliance' },
    { id: 'lifecycle_timeline', label: 'Service Lifecycle', description: 'Chronological event log for sites', icon: History, category: 'Compliance' },
];

const SiteLocationReport: React.FC<{ customers: Customer[], extinguishers: Extinguisher[] }> = ({ customers, extinguishers }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!mapContainerRef.current || typeof L === 'undefined') return;

        // Cleanup previous map if it exists
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
        }

        const validCustomers = customers.filter(c => c.coordinates && c.coordinates.lat && c.coordinates.lng);
        
        if (validCustomers.length === 0) {
            mapContainerRef.current.innerHTML = '<div class="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl p-10 text-center">No coordinate data found for current customers. Use the GPS or Lookup features in Customer Settings to plot sites on this map.</div>';
            return;
        }

        // Initialize map
        const firstCoord = validCustomers[0].coordinates!;
        const map = L.map(mapContainerRef.current).setView([firstCoord.lat, firstCoord.lng], 10);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const bounds = L.latLngBounds([]);

        validCustomers.forEach(customer => {
            const siteAssets = extinguishers.filter(e => e.customerId === customer.id);
            const unitCount = siteAssets.length;
            const coords = [customer.coordinates!.lat, customer.coordinates!.lng];
            bounds.extend(coords);

            // Determine Pin Color based on site capabilities
            const hasExt = siteAssets.some(e => !['Exit Light', 'Emergency Light'].includes(e.type)) || (customer.extinguisherTech && customer.extinguisherTech !== 'None');
            const hasSys = (customer.systemTanks && customer.systemTanks.length > 0) || (customer.systemTech && customer.systemTech !== 'None');
            
            let pinColor = 'bg-red-600'; // Default extinguisher
            let pinBorder = 'border-red-600';
            if (hasExt && hasSys) {
                pinColor = 'bg-purple-600';
                pinBorder = 'border-purple-600';
            } else if (hasSys) {
                pinColor = 'bg-blue-600';
                pinBorder = 'border-blue-600';
            }

            // Professional Map Pin using divIcon
            const marker = L.marker(coords, {
                icon: L.divIcon({
                    className: 'custom-site-marker',
                    html: `
                        <div class="relative group">
                            <div class="w-8 h-8 ${pinColor} rounded-full border-2 border-white shadow-xl flex items-center justify-center transform -translate-y-1/2 -translate-x-1/2 hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                            </div>
                            <div class="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-${pinColor.split('-')[1]}-600"></div>
                        </div>
                    `,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                })
            }).addTo(map);

            marker.bindPopup(`
                <div class="min-w-[200px] font-sans">
                    <div class="border-b border-gray-100 pb-2 mb-2">
                        <h4 class="font-black text-sm uppercase text-gray-900 m-0">${customer.name}</h4>
                        <p class="text-[10px] text-gray-500 m-0 mt-1">${customer.address}</p>
                    </div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-bold uppercase text-gray-400">Inventory Volume</span>
                        <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-black">${unitCount} Units</span>
                    </div>
                    <div class="flex gap-1 mb-2">
                        ${hasExt ? '<span class="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[8px] font-black uppercase">Extinguisher</span>' : ''}
                        ${hasSys ? '<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-black uppercase">System</span>' : ''}
                    </div>
                    ${customer.phone ? `<div class="mt-2 pt-2 border-t border-gray-100"><a href="tel:${customer.phone}" class="text-[10px] font-bold text-blue-600 no-underline hover:underline flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${customer.phone}</a></div>` : ''}
                </div>
            `);
            
            marker.bindTooltip(customer.name, {
                permanent: false,
                direction: 'top',
                offset: [0, -20],
                className: 'bg-white border-none shadow-lg font-black px-2 py-1 text-[10px] rounded-lg uppercase tracking-tight text-gray-900 border-2 border-red-500'
            });
        });

        if (validCustomers.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [customers, extinguishers]);

    return (
        <div className="space-y-4">
            <div className="bg-red-50 p-5 rounded-xl border-l-4 border-red-600 flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-black text-red-900 uppercase flex items-center gap-2"><MapIcon className="w-7 h-7" /> Territory Distribution Map</h2>
                    <p className="text-xs text-red-700 font-medium">Detailed visualization of site geographic density and service routing coverage.</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-red-900 leading-none">{customers.length}</p>
                    <p className="text-[9px] font-black uppercase text-red-600 tracking-widest mt-1">Filtered Sites</p>
                </div>
            </div>
            <div 
                ref={mapContainerRef} 
                className="w-full h-[650px] rounded-2xl border-2 border-gray-100 shadow-inner overflow-hidden z-0"
                style={{ minHeight: '650px' }}
            ></div>
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded-full border border-white shadow-sm"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase">Extinguisher Only</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border border-white shadow-sm"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase">System Only</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded-full border border-white shadow-sm"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase">Both Services</span>
                </div>
                <p className="text-[10px] text-gray-400 italic ml-auto">Click markers for site details and inventory volume snapshots.</p>
            </div>
        </div>
    );
};

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  extinguishers, 
  customers, 
  records, 
  technicians, 
  initialReportType, 
  initialCustomerId,
  initialMonth,
  initialTech,
  currentUser,
  onBack
}) => {
  const [reportType, setReportType] = useState<ReportType>(initialReportType || 'combined_out');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReportSelectorOpen, setIsReportSelectorOpen] = useState(false);
  
  const [expandedTimelineEvents, setExpandedTimelineEvents] = useState<Record<string, boolean>>({});

  useEffect(() => {
      if (initialReportType) {
          setReportType(initialReportType);
      }
  }, [initialReportType]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || 'All');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonth || new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [selectedTech, setSelectedTech] = useState<string>(initialTech || 'All');
  
  const currentYear = new Date().getFullYear();
  const [forecastYear, setForecastYear] = useState<number>(currentYear);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [showExtinguishers, setShowExtinguishers] = useState(true);
  const [showSystems, setShowSystems] = useState(true);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
        window.removeEventListener('online', handleStatusChange);
        window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const currentReportDef = REPORT_DEFINITIONS.find(r => r.id === reportType)!;

  const isTechAssigned = (c: Customer, tech: string) => {
      if (tech === 'All') return true;
      const extTech = c.extinguisherTech || c.assignedTechnician;
      const sysTech = c.systemTech;
      return extTech === tech || sysTech === tech;
  };

  const selectedCustomer = selectedCustomerId !== 'All' ? customers.find(c => c.id === selectedCustomerId) : null;
  const filterMonthIndex = parseInt(selectedMonth.split('-')[1], 10);
  const filterYear = parseInt(selectedMonth.split('-')[0], 10);

  // DATA PROCESSING
  const filteredExtinguishers = extinguishers.filter(e => {
      const customerMatch = selectedCustomerId === 'All' || e.customerId === selectedCustomerId;
      return customerMatch;
  });
  
  const monthlyData = filteredExtinguishers.map(ext => {
    const record = records.find(r => 
      r.extinguisherId === ext.id && 
      r.date.startsWith(selectedMonth)
    );
    return {
      extinguisher: ext,
      record: record,
      status: record 
        ? (record.severityRating === 'High' || Object.values(record.checks).some(c => !c) ? 'Failed' : 'Passed')
        : 'Not Inspected'
    };
  });

  const lightsData = filteredExtinguishers.filter(e => e.type === 'Exit Light' || e.type === 'Emergency Light').map(ext => {
    const record = records.find(r => 
      r.extinguisherId === ext.id && 
      r.date.startsWith(selectedMonth)
    );
    return {
      asset: ext,
      record: record,
      status: record 
        ? (record.severityRating === 'High' || Object.values(record.checks).some(c => !c) ? 'Failed' : 'Passed')
        : 'Not Inspected'
    };
  });

  const batteryReplacementData = extinguishers.filter(e => {
      const customerMatch = selectedCustomerId === 'All' || e.customerId === selectedCustomerId;
      const isDue = e.batteryReplacementDue;
      return customerMatch && isDue;
  }).map(ext => ({
      customer: customers.find(c => c.id === ext.customerId),
      asset: ext
  }));

  const getServiceInterval = (type: string): number => {
    if (type === 'ABC' || type === 'Clean Agent') return 6;
    return 5;
  };

  const getServiceStatus = (ext: Extinguisher) => {
    if (!ext.lastServiceDate) return { status: 'Unknown', nextYear: null, label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-500' };
    const lastYear = parseInt(ext.lastServiceDate, 10);
    const interval = getServiceInterval(ext.type);
    const nextServiceYear = lastYear + interval;
    if (nextServiceYear === forecastYear) return { status: 'Target', nextYear: nextServiceYear, label: `Due ${forecastYear}`, bg: 'bg-purple-100', text: 'text-purple-700' };
    if (nextServiceYear < currentYear) return { status: 'Overdue', nextYear: nextServiceYear, label: `Overdue (${nextServiceYear})`, bg: 'bg-red-100', text: 'text-red-700' };
    return { status: 'OK', nextYear: nextServiceYear, label: `Due ${nextServiceYear}`, bg: 'bg-green-100', text: 'text-green-700' };
  };

  const serviceData = filteredExtinguishers.map(ext => ({
      extinguisher: ext,
      serviceInfo: getServiceStatus(ext)
    })).filter(item => {
      if (filterMode === 'due_year') return item.serviceInfo.status === 'Target';
      if (filterMode === 'overdue') return item.serviceInfo.status === 'Overdue';
      return true;
    }).sort((a, b) => (a.serviceInfo.nextYear || 0) - (b.serviceInfo.nextYear || 0));

  const scheduleData = customers.filter(c => {
    const customerMatch = selectedCustomerId === 'All' || c.id === selectedCustomerId;
    if (!customerMatch) return false;

    const extTech = c.extinguisherTech || c.assignedTechnician;
    const sysTech = c.systemTech;
    const isExtMatch = (selectedTech === 'All' || extTech === selectedTech) && (c.serviceMonths?.includes(filterMonthIndex));
    const isSysMatch = (selectedTech === 'All' || sysTech === selectedTech) && (c.systemMonths?.includes(filterMonthIndex));
    return (showExtinguishers && isExtMatch) || (showSystems && isSysMatch);
  });

  const filteredMapCustomers = (selectedCustomerId === 'All' ? customers : [selectedCustomer!]).filter(c => {
      const siteAssets = extinguishers.filter(e => e.customerId === c.id);
      const hasExt = siteAssets.some(e => !['Exit Light', 'Emergency Light'].includes(e.type)) || (c.extinguisherTech && c.extinguisherTech !== 'None');
      const hasSys = (c.systemTanks && c.systemTanks.length > 0) || (c.systemTech && c.systemTech !== 'None');
      
      const techMatch = isTechAssigned(c, selectedTech);
      if (!techMatch) return false;

      if (!showExtinguishers && !showSystems) return true; // Show all if no filter selected
      
      const extMatch = showExtinguishers && hasExt;
      const sysMatch = showSystems && hasSys;
      
      return extMatch || sysMatch;
  });

  const extOutData: { customer: Customer; entry: ExtinguisherOutEntry }[] = customers.flatMap(c => {
     const customerMatch = selectedCustomerId === 'All' || c.id === selectedCustomerId;
     if (!customerMatch) return [];
     if (!isTechAssigned(c, selectedTech)) return [];
     if (!c.extinguishersOut || c.extinguishersOut.length === 0) return [];
     
     return c.extinguishersOut
       .filter(entry => {
         if (!entry.year) return true;
         const lastYear = parseInt(entry.year);
         if (isNaN(lastYear)) return true;
         const interval = ['ABC', 'Clean Agent'].some(t => entry.type.includes(t)) ? 6 : 5;
         return (lastYear + interval) <= currentYear;
       })
       .map(entry => ({ customer: c, entry }));
  });

  const systemTanksData: { customer: Customer; tank: SystemTankEntry }[] = customers.flatMap(c => {
      const customerMatch = selectedCustomerId === 'All' || c.id === selectedCustomerId;
      if (!customerMatch) return [];
      if (!isTechAssigned(c, selectedTech)) return [];
      if (!c.systemTanks || c.systemTanks.length === 0) return [];
      
      return c.systemTanks
        .filter(tank => {
          if (!tank.year) return true;
          const lastYear = parseInt(tank.year);
          if (isNaN(lastYear)) return true;
          const interval = tank.type.includes('Wet') ? 12 : 6;
          return (lastYear + interval) <= currentYear;
        })
        .map(tank => ({ customer: c, tank }));
  });

  const inventorySummaryData: { customer: Customer; totals: { type: string; size: string; count: number }[]; grandTotal: number }[] = (() => {
    const activeCustomers = customers.filter(c => {
        const customerMatch = selectedCustomerId === 'All' || c.id === selectedCustomerId;
        if (!customerMatch) return false;
        return isTechAssigned(c, selectedTech);
    });
    const summaryList: { customer: Customer; totals: { type: string; size: string; count: number }[]; grandTotal: number }[] = [];
    activeCustomers.forEach(cust => {
        const siteAssets = extinguishers.filter(e => e.customerId === cust.id);
        if (siteAssets.length === 0) return;
        const grouping: Record<string, number> = {};
        siteAssets.forEach(e => {
            const key = `${e.type}|${e.size || '-'}`;
            grouping[key] = (grouping[key] || 0) + 1;
        });
        const totals = Object.entries(grouping).map(([key, count]) => {
            const [type, size] = key.split('|');
            return { type, size, count };
        }).sort((a, b) => a.type.localeCompare(b.type));
        summaryList.push({ customer: cust, totals, grandTotal: siteAssets.length });
    });
    return summaryList.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  })();

  const groupedExtOut: { customer: Customer; entries: ExtinguisherOutEntry[] }[] = (() => {
      const groups: Record<string, { customer: Customer, entries: ExtinguisherOutEntry[] }> = {};
      extOutData.forEach(d => {
          if (!groups[d.customer.id]) groups[d.customer.id] = { customer: d.customer, entries: [] };
          
          const existing = groups[d.customer.id].entries.find(e => 
              e.brand === d.entry.brand && e.size === d.entry.size && e.type === d.entry.type
          );
          
          if (existing) {
              existing.quantity += d.entry.quantity;
          } else {
              groups[d.customer.id].entries.push({ ...d.entry });
          }
      });
      return Object.values(groups).sort((a,b) => a.customer.name.localeCompare(b.customer.name));
  })();

  const groupedSysOut: { customer: Customer; entries: SystemTankEntry[] }[] = (() => {
      const groups: Record<string, { customer: Customer, entries: SystemTankEntry[] }> = {};
      systemTanksData.forEach(d => {
          if (!groups[d.customer.id]) groups[d.customer.id] = { customer: d.customer, entries: [] };
          groups[d.customer.id].entries.push(d.tank);
      });
      return Object.values(groups).sort((a,b) => a.customer.name.localeCompare(b.customer.name));
  })();

  const groupedBatteryOut: { customer: Customer; entries: Extinguisher[] }[] = (() => {
    const groups: Record<string, { customer: Customer, entries: Extinguisher[] }> = {};
    extinguishers.forEach(e => {
        if (!e.batteryReplacementDue) return;
        const customerMatch = selectedCustomerId === 'All' || e.customerId === selectedCustomerId;
        if (!customerMatch) return;
        const customer = customers.find(c => c.id === e.customerId);
        if (!customer) return;
        if (!groups[customer.id]) groups[customer.id] = { customer, entries: [] };
        groups[customer.id].entries.push(e);
    });
    return Object.values(groups).sort((a,b) => a.customer.name.localeCompare(b.customer.name));
  })();

  interface GroupedCombinedEntry {
    customer: Customer;
    extEntries: ExtinguisherOutEntry[];
    sysEntries: SystemTankEntry[];
    batteryEntries: Extinguisher[];
  }

  const groupedCombinedOut: GroupedCombinedEntry[] = (() => {
      const groups: Record<string, GroupedCombinedEntry> = {};
      
      const addExtToGroup = (custId: string, entry: ExtinguisherOutEntry, customer: Customer) => {
          if (!groups[custId]) groups[custId] = { customer, extEntries: [], sysEntries: [], batteryEntries: [] };
          const existing = groups[custId].extEntries.find(e => 
              e.brand === entry.brand && e.size === entry.size && e.type === entry.type
          );
          if (existing) {
              existing.quantity += entry.quantity;
          } else {
              groups[custId].extEntries.push({ ...entry });
          }
      };

      extOutData.forEach(d => addExtToGroup(d.customer.id, d.entry, d.customer));
      
      systemTanksData.forEach(d => {
          if (!groups[d.customer.id]) groups[d.customer.id] = { customer: d.customer, extEntries: [], sysEntries: [], batteryEntries: [] };
          groups[d.customer.id].sysEntries.push(d.tank);
      });
      
      extinguishers.forEach(e => {
        if (!e.batteryReplacementDue) return;
        const cust = customers.find(c => c.id === e.customerId);
        if (!cust) return;
        if (!groups[cust.id]) groups[cust.id] = { customer: cust, extEntries: [], sysEntries: [], batteryEntries: [] };
        groups[cust.id].batteryEntries.push(e);
      });
      return Object.values(groups).sort((a,b) => a.customer.name.localeCompare(b.customer.name)) as GroupedCombinedEntry[];
  })();

  const handlePrint = () => window.print();

  const handleEmailReport = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    const filename = `DM_Fire_Report_${reportType}_${selectedCustomerId === 'All' ? 'Aggregate' : (selectedCustomer?.name || '').replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
        const pdfBlob = await html2pdf().from(reportRef.current).set(opt).output('blob');
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Fire Safety Report: ${selectedCustomerId === 'All' ? 'Aggregate' : (selectedCustomer?.name || '').replace(/\s+/g, '_')}`,
                text: `Attached is the ${reportType.replace('_', ' ')} report for ${MONTHS_FULL[filterMonthIndex-1]?.label} ${filterYear}.`
            });
        } else {
            html2pdf().from(reportRef.current).set(opt).save();
            const subject = encodeURIComponent(`Fire Safety Report - ${selectedCustomerId === 'All' ? 'Multiple Sites' : selectedCustomer?.name}`);
            const body = encodeURIComponent(`Hello,\n\nPlease find the attached ${reportType.replace('_', ' ')} report for ${selectedMonth}.`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    } catch (err) {
        console.error('PDF/Share failed:', err);
        alert("Failed to generate or share report.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    let shareText = `D&M Fire Safety Report - ${reportType.toUpperCase()}\n`;
    shareText += `Generated: ${new Date().toLocaleDateString()}\n`;
    shareText += `Target: ${selectedCustomerId === 'All' ? 'All Companies' : selectedCustomer?.name}\n\n`;

    if (reportType === 'monthly' || reportType === 'lights') {
        const data = reportType === 'lights' ? lightsData : monthlyData;
        data.forEach((d: any) => {
            const unit = d.extinguisher || d.asset;
            shareText += `[${d.status}] #${unit.unitNumber || '-'} ${unit.location} (${unit.type})\n`;
        });
    } else if (reportType === 'combined_out') {
        groupedCombinedOut.forEach((group: GroupedCombinedEntry) => {
            shareText += `SITE: ${group.customer.name}\n`;
            group.extEntries.forEach((e: ExtinguisherOutEntry) => shareText += `  - Ext: ${e.quantity}x ${e.size} ${e.brand} ${e.type}\n`);
            group.sysEntries.forEach((t: SystemTankEntry) => shareText += `  - Tank: ${t.quantity}x ${t.size} ${t.brand} (${t.year})\n`);
            group.batteryEntries.forEach((b: Extinguisher) => shareText += `  - Battery Due: #${b.unitNumber} ${b.location} (${b.batteryType})\n`);
            shareText += `\n`;
        });
    }

    if (navigator.share) {
        try { await navigator.share({ text: shareText }); } catch (err) { }
    } else {
        try { await navigator.clipboard.writeText(shareText); alert("Report summary copied."); } catch (err) { }
    }
  };

  // Logic to chunk schedule data for pagination (10 per page)
  const chunkedScheduleData = useMemo(() => {
    if (reportType !== 'schedule') return [];
    const chunks = [];
    for (let i = 0; i < scheduleData.length; i += 10) {
      chunks.push(scheduleData.slice(i, i + 10));
    }
    return chunks;
  }, [scheduleData, reportType]);

  const lifecycleTimelineData = useMemo(() => {
    if (reportType !== 'lifecycle_timeline') return [];
    
    // Flatten all events across filtered customers
    const activeCustomers = selectedCustomerId === 'All' 
        ? customers.filter(c => isTechAssigned(c, selectedTech))
        : [selectedCustomer!].filter(Boolean);

    interface TimelineEvent {
        id: string;
        date: string;
        type: 'Service' | 'Inspection';
        customerName: string;
        tech: string;
        detail: string;
        severity?: string;
        snapshot?: any;
    }

    const events: TimelineEvent[] = [];

    activeCustomers.forEach(cust => {
        // 1. Add Completed Services
        (cust.completedServices || []).forEach(svc => {
            events.push({
                id: `svc-${cust.id}-${svc.completedDate}`,
                date: svc.completedDate,
                type: 'Service',
                customerName: cust.name,
                tech: svc.completedBy,
                detail: `${svc.type} Service Completion`,
                snapshot: {
                    ext: svc.extinguishersOutSnapshot,
                    sys: svc.systemTanksSnapshot,
                    notes: svc.notesSnapshot
                }
            });
        });

        // 2. Add Inspection Records - Grouped by Day to avoid timeline bloat
        const siteAssetIds = extinguishers
            .filter(e => e.customerId === cust.id)
            .map(e => e.id);
        
        const siteRecords = records.filter(r => siteAssetIds.includes(r.extinguisherId));
        const dayGroups: Record<string, InspectionRecord[]> = {};
        
        siteRecords.forEach(r => {
            const dayKey = r.date.split('T')[0];
            if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
            dayGroups[dayKey].push(r);
        });

        Object.entries(dayGroups).forEach(([day, dayRecs]) => {
            const latestRec = [...dayRecs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const failCount = dayRecs.filter(r => r.severityRating === 'High' || Object.values(r.checks).some(c => c === false)).length;
            
            events.push({
                id: `insp-group-${cust.id}-${day}`,
                date: latestRec.date,
                type: 'Inspection',
                customerName: cust.name,
                tech: latestRec.inspectorName,
                detail: `${dayRecs.length} Units Checked ${failCount > 0 ? `(${failCount} Defects Found)` : '(Passed Clean)'}`,
                severity: failCount > 0 ? 'High' : 'Low',
                snapshot: { 
                    records: dayRecs, 
                    notes: latestRec.notes 
                }
            });
        });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reportType, customers, extinguishers, records, selectedCustomerId, selectedTech]);

  const toggleTimelineEvent = (id: string) => {
      setExpandedTimelineEvents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Report Selection Header */}
      <div className="no-print bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Reports Center</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Select a report type and apply filters below</p>
            </div>
            
            {/* Desktop Quick Category Switcher */}
            <div className="hidden lg:flex gap-4">
                {['Actionable', 'Management', 'Compliance'].map(cat => (
                    <div key={cat} className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{cat}</span>
                        <div className="flex gap-1.5">
                            {REPORT_DEFINITIONS.filter(r => r.category === cat).map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setReportType(r.id)}
                                    title={r.label}
                                    className={`p-2 rounded-xl transition-all border shadow-sm ${reportType === r.id ? 'bg-safety-600 border-safety-600 text-white shadow-md scale-105' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                                >
                                    <r.icon className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile/Compact Report Selector Button */}
            <button 
                onClick={() => setIsReportSelectorOpen(!isReportSelectorOpen)}
                className="lg:hidden w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-safety-500 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-safety-600 rounded-lg text-white">
                        <currentReportDef.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-black text-safety-600 dark:text-safety-400 uppercase tracking-widest">{currentReportDef.category}</p>
                        <h4 className="font-bold text-gray-900 dark:text-white">{currentReportDef.label}</h4>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isReportSelectorOpen ? 'rotate-180' : ''}`} />
            </button>
        </div>

        {isReportSelectorOpen && (
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                {['Actionable', 'Management', 'Compliance'].map(cat => (
                    <div key={cat} className="space-y-2">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pt-2">{cat} Reports</h5>
                        <div className="grid grid-cols-1 gap-2">
                            {REPORT_DEFINITIONS.filter(r => r.category === cat).map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => { setReportType(r.id); setIsReportSelectorOpen(false); }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${reportType === r.id ? 'bg-safety-50 border-safety-500 ring-1 ring-safety-500 dark:bg-safety-900/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                                >
                                    <div className={`p-2 rounded-lg ${reportType === r.id ? 'bg-safety-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                        <r.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm ${reportType === r.id ? 'text-safety-700 dark:text-safety-400' : 'text-gray-700 dark:text-gray-200'}`}>{r.label}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{r.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 justify-between items-end border-t border-gray-100 dark:border-gray-700 pt-5">
            <div className="flex flex-wrap lg:flex-nowrap items-end gap-3 w-full">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Company</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-safety-500 outline-none">
                        <option value="All">All Companies</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="w-[130px]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Period</label>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-safety-500 outline-none" />
                </div>
                <div className="w-[140px]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Technician</label>
                    <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-safety-500 outline-none">
                        <option value="All">All Techs</option>
                        {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {(reportType === 'schedule' || reportType === 'heat_map') && (
                    <div className="flex gap-1.5 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">Service Filter</label>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                <button 
                                    onClick={() => setShowExtinguishers(!showExtinguishers)}
                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${showExtinguishers ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Ext
                                </button>
                                <button 
                                    onClick={() => setShowSystems(!showSystems)}
                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${showSystems ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Sys
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {reportType === 'service' && (
                    <div className="w-[100px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> Year</label>
                        <select value={forecastYear} onChange={(e) => setForecastYear(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-safety-500 outline-none">
                            {[0,1,2,3,4,5].map(i => <option key={i} value={currentYear + i}>{currentYear + i}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex gap-1.5 lg:ml-auto">
                    <Button variant="primary" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />} className="px-4 py-1.5 text-[10px]">Print</Button>
                    <Button variant="secondary" onClick={handleEmailReport} isLoading={isGeneratingPdf} icon={<Mail className="w-3.5 h-3.5" />} className="px-4 py-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 text-[10px]">Email</Button>
                    <Button variant="secondary" onClick={handleShare} icon={<Share2 className="w-3.5 h-3.5" />} className="px-4 py-1.5 text-[10px]">Share</Button>
                </div>
            </div>
        </div>
      </div>

      {/* Generated Report Content */}
      <div ref={reportRef} className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-200 min-h-[800px] text-gray-900 overflow-x-auto transition-all animate-fadeIn">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center rounded-xl shadow-md">
                    <Flame className="w-9 h-9" fill="currentColor" />
                </div>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">D&M Fire and Safety</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mt-2">Inspection & Compliance Record</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Report Type</div>
                <div className="text-lg font-black uppercase tracking-tighter">
                    {reportType === 'schedule' ? 'Monthly List' : 
                     reportType === 'service' ? 'Service Forecast List' : 
                     reportType === 'heat_map' ? 'Site Location Map' : 
                     reportType === 'lifecycle_timeline' ? 'Service Lifecycle Timeline' :
                     reportType.replace('_', ' ')}
                </div>
                <div className="text-xs font-bold text-gray-500 mt-1">Period: {MONTHS_FULL[filterMonthIndex-1]?.label} {filterYear}</div>
            </div>
        </div>

        {reportType === 'lifecycle_timeline' && (
            <div className="space-y-8">
                <div className="bg-blue-50 p-5 rounded-xl border-l-4 border-blue-600 flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-black text-blue-900 uppercase flex items-center gap-2"><History className="w-7 h-7" /> Lifecycle Event Audit</h2>
                        <p className="text-xs text-blue-700 font-medium">Site visit chronology. Tap company headers to reveal maintenance snapshots.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-blue-900 leading-none">{lifecycleTimelineData.length}</p>
                        <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mt-1">Visit Sessions</p>
                    </div>
                </div>

                {lifecycleTimelineData.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <Clipboard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No Historical Records Found</p>
                    </div>
                ) : (
                    <div className="relative pl-10 space-y-6">
                        {/* Timeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gray-100"></div>

                        {lifecycleTimelineData.map((event, idx) => {
                            const isExpanded = !!expandedTimelineEvents[event.id];
                            return (
                                <div key={event.id} className="relative break-inside-avoid">
                                    {/* Dot */}
                                    <div className={`absolute -left-[2.85rem] top-1 w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
                                        event.type === 'Service' ? 'bg-blue-600' : 'bg-gray-600'
                                    }`}>
                                        {event.type === 'Service' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Activity className="w-4 h-4 text-white" />}
                                    </div>

                                    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden group">
                                        <div 
                                            onClick={() => toggleTimelineEvent(event.id)}
                                            className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm flex items-center gap-2">
                                                        {event.customerName}
                                                        {event.severity === 'High' && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                            event.type === 'Service' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                                                        }`}>
                                                            {event.type}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-700">{event.detail}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            {new Date(event.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{event.tech}</p>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase">{new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-5 space-y-4 animate-fadeIn bg-white">
                                                {event.type === 'Service' && event.snapshot && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {event.snapshot.ext && event.snapshot.ext.length > 0 && (
                                                            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <PackageMinus className="w-3 h-3 text-orange-600" />
                                                                    <span className="text-[9px] font-black text-orange-700 uppercase tracking-widest">Extinguisher Out-List</span>
                                                                </div>
                                                                <ul className="text-[10px] space-y-1 text-gray-600 font-bold">
                                                                    {event.snapshot.ext.map((e: any, i: number) => (
                                                                        <li key={i}>{e.quantity}x {e.size} {e.brand} {e.type}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {event.snapshot.sys && event.snapshot.sys.length > 0 && (
                                                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <Cylinder className="w-3 h-3 text-blue-600" />
                                                                    <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">System Out-List</span>
                                                                </div>
                                                                <ul className="text-[10px] space-y-1 text-gray-600 font-bold">
                                                                    {event.snapshot.sys.map((t: any, i: number) => (
                                                                        <li key={i}>{t.quantity}x {t.size} {t.brand} ({t.year})</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {event.type === 'Inspection' && event.snapshot?.records && (
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Session Asset Trace</span>
                                                        {event.snapshot.records.map((rec: InspectionRecord, rIdx: number) => {
                                                            const unit = extinguishers.find(e => e.id === rec.extinguisherId);
                                                            const isDefect = rec.severityRating === 'High';
                                                            return (
                                                                <div key={rIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ${isDefect ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{unit?.unitNumber || '?'}</span>
                                                                        <span className="text-[10px] font-bold text-gray-700">{unit?.location} ({unit?.type})</span>
                                                                    </div>
                                                                    {isDefect && <span className="text-[8px] font-black text-red-600 uppercase border border-red-200 px-1.5 py-0.5 rounded bg-red-50">Defect Logged</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clipboard className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Field Observations</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-700 italic font-medium leading-relaxed">
                                                        {event.snapshot?.notes || 'No specific maintenance notes recorded for this site session.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {reportType === 'heat_map' && (
            <SiteLocationReport 
                customers={filteredMapCustomers} 
                extinguishers={extinguishers} 
            />
        )}

        {reportType === 'battery_replacement' && (
            <div className="space-y-6">
                <div className="bg-red-50 p-5 rounded-xl border-l-4 border-red-600 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-red-900 uppercase flex items-center gap-2"><Zap className="w-7 h-7" /> Battery Replacement List</h2>
                        <p className="text-xs text-red-700 font-medium">Light units identified as needing battery replacement.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-red-900 leading-none">{batteryReplacementData.length}</p>
                        <p className="text-[9px] font-black uppercase text-red-600 tracking-widest mt-1">Total Due</p>
                    </div>
                </div>
                {groupedBatteryOut.map(group => (
                    <div key={group.customer.id} className="border border-gray-200 rounded-xl overflow-hidden break-inside-avoid shadow-sm mb-6">
                        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
                            <div>
                                <h3 
                                    onClick={onBack}
                                    className="font-black text-md uppercase tracking-tight cursor-pointer hover:underline"
                                >
                                    {group.customer.name}
                                </h3>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{group.customer.address}</span>
                            </div>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-400 uppercase font-black tracking-widest text-[8px] border-b border-gray-200">
                                    <tr><th className="p-3 text-left">Unit #</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Battery Type</th><th className="p-3 text-left">Asset Type</th><th className="p-3 text-center">Action</th></tr>
                                </thead>
                                <tbody>
                                    {group.entries.map((e: Extinguisher) => (<tr key={e.id} className="border-b last:border-none border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 font-black text-sm">{e.unitNumber}</td><td className="p-3 font-medium text-gray-700">{e.location}</td><td className="p-3 font-bold text-red-600">{e.batteryType}</td><td className="p-3 text-gray-500 uppercase font-bold">{e.type}</td><td className="p-3 text-center font-black text-red-600 uppercase italic text-[10px]">REPLACE</td></tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {reportType === 'combined_out' && (
            <div className="space-y-6">
                <div className="bg-orange-50 p-5 rounded-xl border-l-4 border-orange-600 flex items-center justify-between">
                    <div><h2 className="text-xl font-black text-orange-900 uppercase">Equipment Out List</h2><p className="text-xs text-orange-700 font-medium">Items requiring workshop service or specialized replacement.</p></div>
                    <div className="text-right flex gap-6">
                        <div className="text-center"><p className="text-2xl font-black text-orange-900">{extOutData.reduce((acc: number, curr: { entry: ExtinguisherOutEntry }) => acc + curr.entry.quantity, 0)}</p><p className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Extinguishers</p></div>
                        <div className="text-center"><p className="text-2xl font-black text-blue-900">{systemTanksData.length}</p><p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Sys Cylinders</p></div>
                        <div className="text-center"><p className="text-2xl font-black text-red-900">{batteryReplacementData.length}</p><p className="text-[9px] font-black uppercase text-red-600 tracking-widest">Batteries</p></div>
                    </div>
                </div>
                {groupedCombinedOut.map((group: GroupedCombinedEntry) => (
                    <div key={group.customer.id} className="border border-gray-200 rounded-xl overflow-hidden break-inside-avoid shadow-sm mb-6">
                        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
                            <div>
                                <h3 
                                    onClick={onBack}
                                    className="font-black text-md uppercase tracking-tight cursor-pointer hover:underline"
                                >
                                    {group.customer.name}
                                </h3>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{group.customer.address}</span>
                            </div>
                        </div>
                        <div className="p-0">
                            {group.extEntries.length > 0 && (
                                <div className="p-3 bg-orange-50/20 border-b border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <PackageMinus className="w-4 h-4 text-orange-600" />
                                        <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.15em]">Extinguishers Due (Grouped by Brand/Size)</h4>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-1.5 px-2"><span>Qty</span><span>Size</span><span>Brand</span><span>Type</span></div>
                                    {group.extEntries.map((e: ExtinguisherOutEntry, idx: number) => (<div key={idx} className="grid grid-cols-4 gap-4 text-xs py-1.5 px-2 border-b border-gray-50 last:border-none hover:bg-white transition-colors"><span className="font-black">{e.quantity}</span><span className="font-medium">{e.size}</span><span className="font-medium text-gray-500">{e.brand}</span><span className="font-bold">{e.type}</span></div>))}
                                </div>
                            )}
                            {group.sysEntries.length > 0 && (
                                <div className="p-3 bg-blue-50/20 border-b border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Cylinder className="w-4 h-4 text-blue-600" />
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">System Cylinders Due</h4>
                                    </div>
                                    <div className="grid grid-cols-5 gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-1.5 px-2"><span>Qty</span><span>Size</span><span>Brand</span><span>Type</span><span className="text-right">Last Service</span></div>
                                    {group.sysEntries.map((t: SystemTankEntry) => (<div key={t.id} className="grid grid-cols-5 gap-4 text-xs py-1.5 px-2 border-b border-gray-50 last:border-none hover:bg-white transition-colors"><span className="font-black">{t.quantity}</span><span className="font-medium">{t.size}</span><span className="font-medium text-gray-500">{t.brand}</span><span className="font-bold">{t.type}</span><span className="text-blue-600 font-black text-right">{t.year || 'Unknown'}</span></div>))}
                                </div>
                            )}
                            {group.batteryEntries.length > 0 && (
                                <div className="p-3 bg-red-50/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap className="w-4 h-4 text-red-600" />
                                        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.15em]">Batteries Due</h4>
                                    </div>
                                    <div className="grid grid-cols-5 gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-1.5 px-2"><span>Unit #</span><span>Location</span><span>Battery Type</span><span className="col-span-2 text-right">Action</span></div>
                                    {group.batteryEntries.map((b: Extinguisher) => (<div key={b.id} className="grid grid-cols-5 gap-4 text-xs py-1.5 px-2 border-b border-gray-50 last:border-none hover:bg-white transition-colors"><span className="font-black">{b.unitNumber}</span><span className="truncate font-medium">{b.location}</span><span className="font-bold text-red-600">{b.batteryType}</span><span className="col-span-2 text-red-700 font-black text-right uppercase italic text-[10px]">Field Replace</span></div>))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {reportType === 'inventory_summary' && (
            <div className="space-y-6">
                <div className="bg-blue-50 p-5 rounded-xl border-l-4 border-blue-600 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-blue-900 uppercase flex items-center gap-2"><ClipboardList className="w-7 h-7" /> Site Inventory Summary</h2>
                        <p className="text-xs text-blue-700 font-medium">Consolidated asset register per customer location.</p>
                    </div>
                    <div className="text-right">
                         <p className="text-3xl font-black text-blue-900 leading-none">{inventorySummaryData.reduce((acc: number, curr: { grandTotal: number }) => acc + curr.grandTotal, 0)}</p>
                         <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mt-1">Aggregate Units</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventorySummaryData.map((site) => (
                        <div key={site.customer.id} className="border border-gray-200 rounded-xl overflow-hidden break-inside-avoid shadow-sm flex flex-col">
                            <div className="bg-gray-100 p-3 flex justify-between items-start border-b border-gray-200">
                                <div>
                                    <h3 
                                        onClick={onBack}
                                        className="font-black text-gray-900 uppercase tracking-tight text-sm cursor-pointer hover:text-safety-600"
                                    >
                                        {site.customer.name}
                                    </h3>
                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{site.customer.address.split(',')[0]}</p>
                                </div>
                                <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">{site.grandTotal} Units</span>
                            </div>
                            <table className="w-full text-[11px] flex-1">
                                <thead className="bg-gray-50 text-gray-400"><tr><th className="px-3 py-1.5 text-left font-black uppercase text-[8px] tracking-widest">Type</th><th className="px-3 py-1.5 text-left font-black uppercase text-[8px] tracking-widest">Size</th><th className="px-3 py-1.5 text-right font-black uppercase text-[8px] tracking-widest">Qty</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">{site.totals.map((t: { type: string; size: string; count: number }, idx: number) => (<tr key={idx} className="hover:bg-gray-50"><td className="px-3 py-1.5 font-bold">{t.type}</td><td className="px-3 py-1.5 text-gray-600">{t.size}</td><td className="px-3 py-1.5 text-right font-black text-blue-600">{t.count}</td></tr>))}</tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {reportType === 'extinguisher_out' && (
            <div className="space-y-6">
                <div className="bg-orange-50 p-5 rounded-xl border-l-4 border-orange-600 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-orange-900 uppercase">Extinguisher Out List</h2>
                        <p className="text-xs text-orange-700 font-medium">Maintenance cycle tracking grouped by brand/size.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-orange-900 leading-none">{extOutData.reduce((acc: number, curr: { entry: ExtinguisherOutEntry }) => acc + curr.entry.quantity, 0)}</p>
                        <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest mt-1">Total Units</p>
                    </div>
                </div>
                {groupedExtOut.map(group => (
                    <div key={group.customer.id} className="border border-gray-200 rounded-xl overflow-hidden break-inside-avoid shadow-sm mb-6">
                        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
                            <div>
                                <h3 
                                    onClick={onBack}
                                    className="font-black text-md uppercase tracking-tight cursor-pointer hover:underline"
                                >
                                    {group.customer.name}
                                </h3>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{group.customer.address}</span>
                            </div>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-400 uppercase font-black tracking-widest text-[8px] border-b border-gray-200">
                                    <tr><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Brand</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Status</th></tr>
                                </thead>
                                <tbody>
                                    {group.entries.map((e: ExtinguisherOutEntry, idx: number) => (<tr key={idx} className="border-b last:border-none border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 font-black text-sm">{e.quantity}</td><td className="p-3 font-medium text-gray-700">{e.size}</td><td className="p-3 text-gray-500 font-bold">{e.brand}</td><td className="p-3 font-black">{e.type}</td><td className="p-3 text-right font-black text-orange-600 uppercase italic text-[10px]">DUE FOR SVC</td></tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {reportType === 'schedule' && (
            <div className="space-y-4">
                <div className="bg-blue-900 text-white p-4 rounded-xl flex justify-between items-center no-print shadow-lg mb-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><Briefcase className="w-8 h-8" /></div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter leading-tight">Monthly List</h2>
                            <p className="text-blue-200 font-bold tracking-widest uppercase text-[9px] mt-1">{MONTHS_FULL[filterMonthIndex-1]?.label} {filterYear} • Assigned: {selectedTech}</p>
                        </div>
                    </div>
                    <div className="text-right"><p className="text-3xl font-black leading-none">{scheduleData.length}</p><p className="text-[9px] font-black uppercase text-blue-300 tracking-widest mt-1">Planned Stops</p></div>
                </div>

                {chunkedScheduleData.map((chunk, chunkIdx) => (
                  <div key={chunkIdx} className={`${chunkIdx < chunkedScheduleData.length - 1 ? 'page-break' : ''} space-y-2`}>
                    {chunk.map(c => {
                        const isExt = c.serviceMonths?.includes(filterMonthIndex);
                        const isSys = c.systemMonths?.includes(filterMonthIndex);
                        
                        const rawDueExtOut = c.extinguishersOut?.filter(e => {
                            const last = parseInt(e.year);
                            if (isNaN(last)) return true;
                            const interval = ['ABC', 'Clean Agent'].some(t => e.type.includes(t)) ? 6 : 5;
                            return (last + interval) <= currentYear;
                        }) || [];

                        const dueExtOutCount = rawDueExtOut.reduce((acc, curr) => acc + curr.quantity, 0);
                        const dueExtItems = rawDueExtOut.map(e => `${e.quantity}x ${e.size} ${e.brand} ${e.type}`).join(', ');

                        const rawDueSysOut = c.systemTanks?.filter(t => {
                            const last = parseInt(t.year);
                            if (isNaN(last)) return true;
                            const interval = t.type.includes('Wet') ? 12 : 6;
                            return (last + interval) <= currentYear;
                        }) || [];

                        const dueSysOutCount = rawDueSysOut.length;
                        const dueSysItems = rawDueSysOut.map(t => `${t.quantity}x ${t.size} ${t.brand} (${t.type})`).join(', ');

                        const siteRunSheetCount = extinguishers.filter(e => e.customerId === c.id).length;

                        return (
                            <div key={c.id} className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid shadow-sm bg-white print:border-slate-300 print:shadow-none print:m-0 print:mb-1 print:p-2">
                                <div className="flex justify-between items-center p-2 print:p-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h3 
                                              onClick={onBack}
                                              className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none cursor-pointer hover:text-safety-600 transition-colors print:text-xs"
                                          >
                                              {c.name}
                                          </h3>
                                          <div className="flex gap-1">
                                              {isExt && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 print:bg-red-600 print:text-white">EXT</span>}
                                              {isSys && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 print:bg-blue-600 print:text-white">SYS</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 print:text-[8pt]"><MapPin className="w-2.5 h-2.5 text-blue-600 no-print" /> {c.address.split(',')[0]}</p>
                                          {c.phone && <p className="text-[10px] font-black text-blue-600 flex items-center gap-1 print:text-[8pt]"><Phone className="w-2.5 h-2.5 no-print" /> {c.phone}</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex items-center gap-4">
                                        <div className="flex gap-3 text-[9px] font-bold uppercase text-slate-400 print:text-[7pt]">
                                            <div className="flex flex-col">
                                              <span className="text-slate-500">Shop Out:</span>
                                              <span className={(dueExtOutCount > 0 || dueSysOutCount > 0) ? "text-orange-600 font-black" : ""}>{dueExtOutCount} Ext / {dueSysOutCount} Sys</span>
                                            </div>
                                            <div className="flex flex-col border-l border-slate-100 pl-3">
                                              <span className="text-slate-500">Site Map:</span>
                                              <span className="text-slate-700">{siteRunSheetCount} Units</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col text-right no-print">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Access</p>
                                            <p className="text-[9px] font-black text-slate-700">Code: {c.doorCode || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Due for Service / Out Items Details - Compact list for print density */}
                                {(dueExtItems || dueSysItems) && (
                                    <div className="mx-2 mt-1 p-1 bg-slate-50 border border-slate-100 rounded print:mx-0 print:bg-transparent print:border-none print:mt-0.5 print:p-0">
                                        {dueExtItems && (
                                            <p className="text-[8pt] text-orange-800 print:text-[7pt] leading-tight">
                                                <span className="font-black uppercase text-[6pt] opacity-60 mr-1">Ext Out:</span> {dueExtItems}
                                            </p>
                                        )}
                                        {dueSysItems && (
                                            <p className="text-[8pt] text-blue-800 print:text-[7pt] leading-tight">
                                                <span className="font-black uppercase text-[6pt] opacity-60 mr-1">Sys Out:</span> {dueSysItems}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {c.notes && (
                                  <div className="px-2 pb-1 border-t border-slate-50 mt-1 no-print">
                                    <p className="text-[9px] text-slate-500 italic truncate max-w-full">Memo: {c.notes}</p>
                                  </div>
                                )}
                                {/* Print-only footer row */}
                                <div className="hidden print:block border-t border-slate-100 mt-1 pt-1">
                                   <p className="text-[7.5pt] text-slate-500 line-clamp-1">
                                      <span className="font-bold uppercase text-[6pt]">Memo: </span>{c.notes || 'No special instructions.'}
                                      {c.doorCode && <span className="ml-4 font-bold uppercase text-[6pt]">Door: </span>}{c.doorCode}
                                   </p>
                                </div>
                            </div>
                        );
                    })}
                  </div>
                ))}
            </div>
        )}

        {(reportType === 'monthly' || reportType === 'lights') && (
            <div className="space-y-6">
                <div className="bg-gray-900 text-white p-5 rounded-xl shadow-md flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter leading-tight">{reportType === 'lights' ? 'Emergency Light Test Record' : 'Portable Extinguisher Inspection'}</h2>
                        <p className="text-gray-400 text-[9px] font-bold tracking-[0.2em] mt-1">{selectedCustomerId === 'All' ? 'Portfolio Aggregated' : selectedCustomer?.name}</p>
                    </div>
                    <div className="flex gap-8">
                        <div className="text-center"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Units</p><p className="font-black text-xl leading-none mt-1">{reportType === 'lights' ? lightsData.length : monthlyData.length}</p></div>
                        <div className="text-center"><p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Status</p><p className="font-black text-xl text-green-500 leading-none mt-1">VERIFIED</p></div>
                    </div>
                </div>
                <table className="w-full text-xs border-collapse border border-gray-200 shadow-sm">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                        <tr>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Unit #</th>
                            {selectedCustomerId === 'All' && <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Site</th>}
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Location Detail</th>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Spec</th>
                            <th className="p-3 text-center font-black uppercase text-[9px] tracking-widest border-r">Status</th>
                            <th className="p-3 text-center font-black uppercase text-[9px] tracking-widest border-r">Disposition</th>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                        {(reportType === 'lights' ? lightsData : monthlyData).map((d: any, i) => (
                            <tr key={i} className={`hover:bg-gray-50 transition-colors ${d.status === 'Failed' ? 'bg-red-50' : ''}`}>
                                <td className="p-3 font-black text-gray-900 border-r">{d.extinguisher?.unitNumber || d.asset?.unitNumber || '-'}</td>
                                {selectedCustomerId === 'All' && <td className="p-3 text-[10px] font-bold border-r uppercase tracking-tight">{customers.find(c => c.id === (d.extinguisher?.customerId || d.asset?.customerId))?.name.split(' ')[0]}</td>}
                                <td className="p-3 text-gray-700 border-r">{(d.extinguisher?.location || d.asset?.location)}</td>
                                <td className="p-3 text-gray-500 font-bold border-r uppercase text-[9px]">{(d.extinguisher?.size || d.asset?.size || '')} {(d.extinguisher?.type || d.asset?.type)}</td>
                                <td className={`p-3 text-center font-black border-r uppercase text-[9px] tracking-widest ${d.status === 'Passed' ? 'text-green-600' : d.status === 'Failed' ? 'text-red-600' : 'text-gray-300'}`}>
                                    <div className="flex items-center justify-center gap-1">
                                        {d.status === 'Passed' ? <CheckCircle className="w-2.5 h-2.5" /> : d.status === 'Failed' ? <AlertTriangle className="w-2.5 h-2.5" /> : null}
                                        {d.status}
                                    </div>
                                </td>
                                <td className="p-3 text-center border-r font-black uppercase text-[9px] tracking-widest">
                                    {d.record?.disposition ? (
                                        <div className={`flex items-center justify-center gap-1.5 ${d.record.disposition === 'Replace' ? 'text-red-700' : 'text-blue-700'}`}>
                                            {d.record.disposition === 'Replace' ? <RefreshCcw className="w-3 h-3" /> : <FilePlus className="w-3 h-3" />}
                                            {d.record.disposition}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="p-3 text-[10px] italic text-gray-500 font-normal">{d.record?.notes || 'No defects.'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {reportType === 'service' && (
            <div className="space-y-6">
                <div className="bg-purple-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><CalendarRange className="w-8 h-8" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">Service Forecast List</h2>
                            <p className="text-purple-200 font-bold tracking-widest uppercase text-[9px] mt-1">Projection for Year: {forecastYear}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black leading-none">{serviceData.filter(d => d.serviceInfo.status === 'Target').length}</p>
                        <p className="text-[9px] font-black uppercase text-purple-300 tracking-widest mt-1">Services Due</p>
                    </div>
                </div>
                <table className="w-full text-xs border-collapse border border-gray-200">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                        <tr>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Unit #</th>
                            {selectedCustomerId === 'All' && <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Site</th>}
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Unit Loc</th>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Last Svc</th>
                            <th className="p-3 text-left font-black uppercase text-[9px] tracking-widest border-r">Next Svc</th>
                            <th className="p-3 text-center font-black uppercase text-[9px] tracking-widest">Forecast Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                        {serviceData.map((d, i) => (
                            <tr key={i} className={`hover:bg-gray-50 transition-colors ${d.serviceInfo.status === 'Target' ? 'bg-purple-50/50' : d.serviceInfo.status === 'Overdue' ? 'bg-red-50' : ''}`}>
                                <td className="p-3 font-black border-r">{d.extinguisher.unitNumber || '-'}</td>
                                {selectedCustomerId === 'All' && <td className="p-3 text-[10px] font-bold border-r uppercase tracking-tight">{customers.find(c => c.id === d.extinguisher.customerId)?.name.split(' ')[0]}</td>}
                                <td className="p-3 text-gray-700 border-r">{d.extinguisher.location}</td>
                                <td className="p-3 text-gray-500 font-bold border-r">{d.extinguisher.lastServiceDate || 'Unknown'}</td>
                                <td className="p-3 font-black text-gray-900 border-r">{d.serviceInfo.nextYear || '-'}</td>
                                <td className="p-3 text-center font-black text-[9px] uppercase tracking-widest">
                                    <span className={`px-3 py-1 rounded-full shadow-sm border ${d.serviceInfo.bg} ${d.serviceInfo.text}`}>
                                        {d.serviceInfo.label}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        <div className="mt-16 pt-8 border-t-2 border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-left space-y-0.5">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-900 text-white flex items-center justify-center rounded-lg">
                        <Flame className="w-4.5 h-4.5" fill="currentColor" />
                    </div>
                    <span className="font-black text-gray-900 uppercase tracking-tighter text-sm">D&M Fire Safety</span>
                </div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Compliance Intelligence Platform</p>
            </div>
            
            <div className="text-center md:text-right space-y-0.5">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Digital Verification</p>
                <p className="text-[9px] font-bold text-gray-400">Gen: {new Date().toLocaleString()}</p>
                <p className="text-[9px] font-bold text-gray-400">ID: REP-{reportType.toUpperCase()}-{filterYear}</p>
            </div>
        </div>
      </div>
    </div>
  );
};