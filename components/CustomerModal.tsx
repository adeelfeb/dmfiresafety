import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, CustomerDocument, Extinguisher, ExtinguisherOutEntry, SystemTankEntry, User, AssetType } from '../types';
import { Button } from './Button';
import { X, Save, Building2, MapPin, Briefcase, Clipboard, Wrench, PackageMinus, Plus, Cylinder, RefreshCw, Search, WifiOff, Eye, EyeOff, Calendar, Zap, LayoutGrid, Trash2, Archive, Loader2, KeyRound, Lock, ChevronDown, ChevronUp, CheckCircle2, Navigation, AlertTriangle, Info, ListTree } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Customer, 'id'>) => void;
  onDelete?: (id: string) => void;
  initialData?: Customer | null;
  extinguishers: Extinguisher[];
  technicians: string[];
  currentUser?: User | null;
  initialTargetSection?: 'extinguishersOut' | 'systemTanks';
}

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
];

const TYPES_LIST: AssetType[] = ['ABC', 'CO2', 'Water', 'Foam', 'Wet Chemical', 'Clean Agent', 'Water Mist', 'Exit Light', 'Emergency Light'];
const BRANDS = ['Amerex', 'Ansul', 'Ansul (Old)', 'Ansul (New)', 'Badger', 'Buckeye', 'Kidde', 'Pyro Chem', 'Other'];
const SYSTEM_BRANDS = ['Amerex', 'Ansul', 'Buckeye', 'Kidde', 'Pyro Chem', 'Range Guard'];

const getSizesForType = (type: string): string[] => {
  switch (type) {
    case 'ABC':
      return ['2.5lb', '5lb', '10lb', '20lb'];
    case 'CO2':
      return ['5lb', '10lb', '15lb', '20lb'];
    case 'Water':
    case 'Water Mist':
    case 'Foam':
      return ['1.5 gal', '2.5 gal'];
    case 'Clean Agent':
      return ['2.5lb', '5lb', '9lb', '11lb', '15lb', '20lb'];
    case 'Wet Chemical':
      return ['6 Liter', '2.5 gal']; 
    default:
      return ['2.5lb', '5lb', '10lb', '15lb', '20lb', '1.5 gal', '2.5 gal'];
  }
};

const getServiceInterval = (type: string): number => {
  if (['Exit Light', 'Emergency Light'].includes(type)) return 0;
  return ['ABC', 'Clean Agent'].includes(type) ? 6 : 5;
};

const getStateAbbr = (input: string) => {
  if (!input) return 'VT';
  const normalized = input.toLowerCase().trim();
  if (normalized.length === 2) return normalized.toUpperCase();
  
  const stateMap: { [key: string]: string } = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA', 
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA', 
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD', 
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO', 
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  };
  
  return stateMap[normalized] || input.toUpperCase().slice(0, 2);
};

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  extinguishers,
  technicians,
  currentUser,
  initialTargetSection
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const extOutServiceYears = Array.from({ length: 9 }, (_, i) => (currentYear - i).toString());
  const systemServiceYears = Array.from({ length: 14 }, (_, i) => (currentYear - i).toString());

  const [formData, setFormData] = useState({
    name: '',
    addressStreetNumber: '',
    addressStreet: '',
    addressCity: '',
    addressState: 'VT',
    addressZip: '',
    coordinates: undefined as { lat: number, lng: number } | undefined,
    contactPerson: '',
    phone: '',
    email: '',
    serviceMonths: [] as number[],
    systemMonths: [] as number[],
    extinguisherTech: '',
    systemTech: '',
    notes: '',
    doorCode: '',
    lockBox: '',
    documents: [] as CustomerDocument[],
    extinguishersOut: [] as ExtinguisherOutEntry[],
    systemTanks: [] as SystemTankEntry[]
  });

  const [manualCounts, setManualCounts] = useState<Record<string, number>>({});
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [justUsedGps, setJustUsedGps] = useState(false);
  const isOnline = navigator.onLine;

  const [showExtOut, setShowExtOut] = useState(false);
  const [showSysOut, setShowSysOut] = useState(false);
  const [showCompletedExt, setShowCompletedExt] = useState(false);
  const [showCompletedSys, setShowCompletedSys] = useState(false);
  const [showUnitInventory, setShowUnitInventory] = useState(false);
  
  // State for expanded grouped assets
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Automatic Sync Logic: Calculate overdue site assets
  const autoSyncedExtinguishers = useMemo(() => {
    if (!initialData) return [];
    const siteAssets = extinguishers.filter(e => e.customerId === initialData.id);
    
    const dueAssets = siteAssets.filter(e => {
        const interval = getServiceInterval(e.type);
        if (interval === 0 || !e.lastServiceDate) return false;
        const lastYear = parseInt(e.lastServiceDate);
        if (isNaN(lastYear)) return false;

        // If a manual entry already exists for this exact unit type/brand/size with current year, hide from Live Sync
        const isClearedInSession = formData.extinguishersOut.some(m => 
            m.type === e.type && m.brand === e.brand && m.size === e.size && m.year === currentYear.toString()
        );
        if (isClearedInSession) return false;

        return (lastYear + interval) <= currentYear;
    });

    const groups: Record<string, ExtinguisherOutEntry> = {};
    dueAssets.forEach(e => {
        const key = `${e.brand}-${e.size}-${e.type}-${e.lastServiceDate}`;
        if (!groups[key]) {
            groups[key] = {
                id: `auto-${key}`,
                quantity: 0,
                brand: e.brand || 'Other',
                size: e.size || '',
                type: e.type,
                year: e.lastServiceDate || ''
            };
        }
        groups[key].quantity += 1;
    });

    return Object.values(groups);
  }, [initialData, extinguishers, currentYear, formData.extinguishersOut]);

  // Combined and Grouped Extinguishers for Display
  const groupedExtOutList = useMemo(() => {
    const manual = formData.extinguishersOut.filter(i => showCompletedExt || !isExtOutDone(itemToEntry(i)));
    
    // Helper to treat manual entry objects similarly to synced ones for calculation
    function itemToEntry(i: any) : ExtinguisherOutEntry { return i as ExtinguisherOutEntry; }

    const combined = [
        ...autoSyncedExtinguishers.map(e => ({ ...e, isAuto: true })),
        ...manual.map(e => ({ ...e, isAuto: false }))
    ];

    const groups: Record<string, {
        key: string;
        brand: string;
        size: string;
        type: string;
        totalQty: number;
        items: any[];
    }> = {};

    combined.forEach(item => {
        const key = `${item.brand}-${item.size}-${item.type}`.toLowerCase();
        if (!groups[key]) {
            groups[key] = {
                key,
                brand: item.brand,
                size: item.size,
                type: item.type,
                totalQty: 0,
                items: []
            };
        }
        groups[key].totalQty += item.quantity;
        groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => a.type.localeCompare(b.type));
  }, [autoSyncedExtinguishers, formData.extinguishersOut, showCompletedExt, currentYear]);

  useEffect(() => {
    if (initialData) {
      const siteAssets = extinguishers.filter(e => e.customerId === initialData.id);
      const runSheetCounts: Record<string, number> = {
        'ABC': 0, 'CO2': 0, 'Wet Chem': 0, 'Clean Agent': 0, 'Water': 0, 'Exit Light': 0
      };

      siteAssets.forEach(ext => {
        if (ext.type === 'ABC') runSheetCounts['ABC']++;
        else if (ext.type === 'CO2') runSheetCounts['CO2']++;
        else if (ext.type === 'Wet Chemical') runSheetCounts['Wet Chem']++;
        else if (ext.type === 'Clean Agent') runSheetCounts['Clean Agent']++;
        else if (ext.type === 'Water' || ext.type === 'Water Mist' || ext.type === 'Foam') runSheetCounts['Water']++;
        else if (ext.type === 'Exit Light' || ext.type === 'Emergency Light') runSheetCounts['Exit Light']++;
      });

      const savedCounts = initialData.manualUnitCounts || {};
      const mergedCounts = { ...runSheetCounts, ...savedCounts };

      setFormData({
        name: initialData.name,
        addressStreetNumber: initialData.addressStreetNumber || '',
        addressStreet: initialData.addressStreet || initialData.address,
        addressCity: initialData.addressCity || '',
        addressState: initialData.addressState || 'VT',
        addressZip: initialData.addressZip || '',
        coordinates: initialData.coordinates,
        contactPerson: initialData.contactPerson,
        phone: initialData.phone,
        email: initialData.email || '',
        serviceMonths: initialData.serviceMonths || [],
        systemMonths: initialData.systemMonths || [],
        extinguisherTech: initialData.extinguisherTech || initialData.assignedTechnician || '',
        systemTech: initialData.systemTech || '',
        notes: initialData.notes || '',
        doorCode: initialData.doorCode || '',
        lockBox: initialData.lockBox || '',
        documents: initialData.documents || [],
        extinguishersOut: initialData.extinguishersOut || [],
        systemTanks: initialData.systemTanks || []
      });
      setManualCounts(mergedCounts);

      if (initialTargetSection === 'extinguishersOut') setShowExtOut(true);
      if (initialTargetSection === 'systemTanks') setShowSysOut(true);
    } else {
      setFormData({
        name: '', addressStreetNumber: '', addressStreet: '', addressCity: '', addressState: 'VT', addressZip: '',
        coordinates: undefined,
        contactPerson: '', phone: '', email: '',
        serviceMonths: [], systemMonths: [],
        extinguisherTech: '', systemTech: '',
        notes: '', doorCode: '', lockBox: '', documents: [], extinguishersOut: [], systemTanks: []
      });
      setManualCounts({ 'ABC': 0, 'CO2': 0, 'Wet Chem': 0, 'Clean Agent': 0, 'Water': 0, 'Exit Light': 0 });
    }
  }, [initialData, isOpen, initialTargetSection, extinguishers]);

  const osmFetch = async (query: string) => {
    try {
      const viewbox = `-73.4542,45.016,-71.465,42.7268`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&addressdetails=1&limit=5&countrycodes=us&email=safety-tracker-app@dmfire.com`;
      const res = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Accept-Language': 'en-US',
          'User-Agent': 'D-and-M-Fire-Safety-Tracker/1.0'
        }
      });
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error("OSM Fetch Error:", e);
      return null;
    }
  };

  const osmReverse = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&email=safety-tracker-app@dmfire.com`;
      const res = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Accept-Language': 'en-US',
          'User-Agent': 'D-and-M-Fire-Safety-Tracker/1.0'
        }
      });
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error("OSM Reverse Error:", e);
      return null;
    }
  };

  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    setIsGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const data = await osmReverse(latitude, longitude);
            
            if (data && data.address) {
                const addr = data.address;
                setJustUsedGps(true);
                setFormData(prev => ({
                    ...prev,
                    addressStreetNumber: addr.house_number || '',
                    addressStreet: addr.road || addr.street || addr.pedestrian || addr.suburb || '',
                    addressCity: addr.city || addr.town || addr.village || addr.municipality || '',
                    addressState: getStateAbbr(addr.state || ''),
                    addressZip: (addr.postcode || '').split('-')[0],
                    coordinates: { lat: latitude, lng: longitude }
                }));
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(() => setJustUsedGps(false), 2000);
            } else {
                alert("Could not determine address from current location.");
            }
            setIsGpsLocating(false);
        },
        (error) => {
            console.error("GPS Error:", error);
            alert(`GPS Error: ${error.message}. Please ensure location services are enabled.`);
            setIsGpsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    if (formData.addressZip.length === 5 && isOnline && !justUsedGps) {
      const lookupZip = async () => {
        setIsSearching(true);
        const data = await osmFetch(formData.addressZip);
        if (data && data.length > 0) {
          const addr = data[0].address;
          setFormData(prev => ({
            ...prev,
            addressCity: prev.addressCity || addr.city || addr.town || addr.village || '',
            addressState: prev.addressState === 'VT' ? getStateAbbr(addr.state || 'VT') : prev.addressState,
            coordinates: prev.coordinates || (data[0].lat ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : undefined)
          }));
        }
        setIsSearching(false);
      };
      lookupZip();
    }
  }, [formData.addressZip, isOnline, justUsedGps]);

  useEffect(() => {
    const { addressCity, addressState, addressZip } = formData;
    if (isOnline && addressCity && addressCity.length > 3 && addressState && addressZip.length < 5 && !justUsedGps) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        const query = `${addressCity}, ${addressState}`;
        const data = await osmFetch(query);
        if (data && data.length > 0) {
          const match = data.find((d: any) => d.address && d.address.postcode);
          if (match) {
            const postcode = match.address.postcode.split('-')[0];
            setFormData(prev => ({ ...prev, addressZip: postcode }));
          }
        }
        setIsSearching(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.addressCity, formData.addressState, isOnline, justUsedGps]);

  useEffect(() => {
    const { addressStreet, addressCity, addressState, addressZip } = formData;
    if (isOnline && addressStreet && addressCity && addressState && !addressZip && !justUsedGps) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        const query = `${formData.addressStreetNumber} ${addressStreet}, ${addressCity}, ${addressState}`;
        const data = await osmFetch(query);
        if (data && data.length > 0) {
          const postcode = data[0].address.postcode;
          if (postcode) {
            setFormData(prev => ({ ...prev, addressZip: postcode.split('-')[0] }));
          }
        }
        setIsSearching(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [formData.addressStreet, formData.addressCity, formData.addressState, isOnline, formData.addressZip, justUsedGps]);

  useEffect(() => {
    if (!addressSearch || addressSearch.length < 3 || !isOnline) {
      setAddressSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const data = await osmFetch(addressSearch);
      if (data) {
        setAddressSuggestions(data);
        setShowSuggestions(true);
      }
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [addressSearch, isOnline]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextData = { ...prev, [name]: value };
      if (name === 'extinguisherTech' && value && value !== 'None' && prev.serviceMonths.length === 0) {
        nextData.serviceMonths = [currentMonthNum];
      }
      if (name === 'systemTech' && value && value !== 'None' && prev.systemMonths.length === 0) {
        const oppositeMonth = currentMonthNum > 6 ? currentMonthNum - 6 : currentMonthNum + 6;
        nextData.systemMonths = [currentMonthNum, oppositeMonth].sort((a, b) => a - b);
      }
      return nextData;
    });
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const addr = suggestion.address;
    setJustUsedGps(true);
    setFormData(prev => ({
      ...prev,
      addressStreetNumber: addr.house_number || '',
      addressStreet: addr.road || addr.street || addr.pedestrian || '',
      addressCity: addr.city || addr.town || addr.village || '',
      addressState: getStateAbbr(addr.state || ''),
      addressZip: (addr.postcode || '').split('-')[0],
      coordinates: suggestion.lat ? { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) } : undefined
    }));
    setAddressSearch('');
    setShowSuggestions(false);
    setTimeout(() => setJustUsedGps(false), 2000);
  };

  const toggleMonth = (type: 'service' | 'system', month: number) => {
    setFormData(prev => {
      const current = type === 'service' ? prev.serviceMonths : prev.systemMonths;
      if (current.includes(month)) {
        return { ...prev, [type === 'service' ? 'serviceMonths' : 'systemMonths']: current.filter(m => m !== month) };
      } else {
        if (type === 'service') {
          return { ...prev, serviceMonths: [...current, month].sort((a, b) => a - b) };
        } else {
          const oppositeMonth = month > 6 ? month - 6 : month + 6;
          if (current.length === 0) {
            return { ...prev, systemMonths: [month, oppositeMonth].sort((a, b) => a - b) };
          } else if (current.length === 1) {
            return { ...prev, systemMonths: [...current, month].sort((a, b) => a - b) };
          }
          return prev;
        }
      }
    });
  };

  const handleManualCountChange = (type: string, val: string) => {
    const count = parseInt(val) || 0;
    setManualCounts(prev => ({ ...prev, [type]: count }));
  };

  const handleAddNewType = () => {
    if (!newTypeName.trim()) return;
    setManualCounts(prev => ({ ...prev, [newTypeName.trim()]: 0 }));
    setNewTypeName('');
    setIsAddingNewType(false);
  };

  const isExtOutDone = (item: ExtinguisherOutEntry) => {
    if (!item.year) return false;
    const last = parseInt(item.year);
    if (isNaN(last)) return false;
    const interval = ['ABC', 'Clean Agent'].some(t => item.type.includes(t)) ? 6 : 5;
    return (last + interval) > currentYear;
  };

  const isSysOutDone = (item: SystemTankEntry) => {
    if (!item.year) return false;
    const last = parseInt(item.year);
    if (isNaN(last)) return false;
    const interval = item.type.includes('Wet') ? 12 : 6;
    return (last + interval) > currentYear;
  };

  const clearDueExt = (id: string) => {
    setFormData(prev => ({
        ...prev,
        extinguishersOut: prev.extinguishersOut.map(i => i.id === id ? { ...i, year: currentYear.toString() } : i)
    }));
  };

  const clearDueTank = (id: string) => {
    setFormData(prev => ({
        ...prev,
        systemTanks: prev.systemTanks.map(i => i.id === id ? { ...i, year: currentYear.toString() } : i)
    }));
  };

  const handleClearAutoSynced = (item: ExtinguisherOutEntry) => {
    const newManualEntry: ExtinguisherOutEntry = {
        ...item,
        id: `cleared-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        year: currentYear.toString()
    };
    setFormData(prev => ({
        ...prev,
        extinguishersOut: [...prev.extinguishersOut, newManualEntry]
    }));
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormError("Business Name is required."); return; }
    const fullAddress = [`${formData.addressStreetNumber} ${formData.addressStreet}`.trim(), formData.addressCity, formData.addressState, formData.addressZip].filter(Boolean).join(', ');
    onSubmit({ ...formData, address: fullAddress, manualUnitCounts: manualCounts, assignedTechnician: formData.extinguisherTech });
  };

  const toggleGroupExpansion = (key: string) => {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-safety-600 dark:text-safety-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{initialData ? 'Edit Customer' : 'Add New Customer'}</h3>
          </div>
          <div className="flex items-center gap-2">
            {initialData && onDelete && (
              <button 
                type="button" 
                onClick={() => { if (window.confirm(`ARCHIVE SITE: Are you sure you want to archive "${initialData.name}"? They will be removed from the active schedule and moved to history.`)) { onDelete(initialData.id); onClose(); } }} 
                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full"
                title="Archive Customer"
              >
                <Archive className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-safety-500 outline-none" required />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                Site Address Lookup
                {!isOnline && <span className="text-[10px] text-gray-400 flex items-center"><WifiOff className="w-3 h-3 mr-1" /> Offline</span>}
              </label>
              <div className="relative group">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isSearching ? 'animate-pulse text-safety-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  placeholder="Start typing site address..."
                  disabled={!isOnline}
                  className="w-full pl-9 pr-24 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-safety-500 outline-none disabled:opacity-50"
                />
                
                <div className="absolute right-1 top-1 bottom-1 flex items-center">
                    <button 
                        type="button" 
                        onClick={handleGpsLocation}
                        disabled={isGpsLocating}
                        className={`flex items-center gap-1.5 px-3 h-full rounded-md text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm ${isGpsLocating ? 'bg-blue-100 text-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                        title="Get Address from GPS"
                    >
                        {isGpsLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                        {isGpsLocating ? 'Locating' : 'GPS'}
                    </button>
                </div>
                
                {isSearching && <div className="absolute right-14 top-2.5"><Loader2 className="w-4 h-4 animate-spin text-safety-500" /></div>}
              </div>
              
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-none border-gray-100 dark:border-gray-700 dark:text-white"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">No.</label><input type="text" name="addressStreetNumber" value={formData.addressStreetNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
              <div className="col-span-3"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Street</label><input type="text" name="addressStreet" value={formData.addressStreet} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">City</label>
                <input type="text" name="addressCity" value={formData.addressCity} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ST</label>
                <input type="text" name="addressState" value={formData.addressState} onChange={handleChange} className="w-full px-1 py-2 border rounded-lg text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Zip</label>
                <div className="relative">
                  <input type="text" name="addressZip" value={formData.addressZip} onChange={handleChange} maxLength={5} placeholder="00000" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono" />
                  {isSearching && <div className="absolute right-2 top-2.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-safety-500" /></div>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label><input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center"><KeyRound className="w-4 h-4 mr-2 text-safety-500" /> Access Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Door Code</label>
                <input type="text" name="doorCode" value={formData.doorCode} onChange={handleChange} placeholder="Keypad" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-safety-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lock Box</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" name="lockBox" value={formData.lockBox} onChange={handleChange} placeholder="Loc/Code" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-safety-500 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-4">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Service Assignments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Extinguisher Tech</label>
                <select name="extinguisherTech" value={formData.extinguisherTech} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                  <option value="">None</option>
                  {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">System Tech</label>
                <select name="systemTech" value={formData.systemTech} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                  <option value="">None</option>
                  {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {formData.extinguisherTech && formData.extinguisherTech !== 'None' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Extinguisher Months</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                  {MONTHS.map(m => (
                    <button key={m.value} type="button" onClick={() => toggleMonth('service', m.value)} className={`py-1.5 text-[10px] font-bold rounded border transition-all ${formData.serviceMonths.includes(m.value) ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}>{m.label}</button>
                  ))}
                </div>
              </div>
            )}

            {formData.systemTech && formData.systemTech !== 'None' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">System Months (Max 2)</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                  {MONTHS.map(m => (
                    <button key={m.value} type="button" onClick={() => toggleMonth('system', m.value)} className={`py-1.5 text-[10px] font-bold rounded border transition-all ${formData.systemMonths.includes(m.value) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}>{m.label}</button>
                  ))}
                </div>
                <p className="text-[10px] text-blue-400 mt-1 italic">Selecting suggests a 6-month pair. Adjust individually.</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button 
              type="button" 
              onClick={() => setShowUnitInventory(!showUnitInventory)}
              className="w-full p-4 flex items-center justify-between text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center">
                <LayoutGrid className="w-4 h-4 mr-2 text-gray-400" /> 
                Unit Inventory
              </div>
              {showUnitInventory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showUnitInventory && (
              <div className="p-4 pt-0 animate-fadeIn">
                <p className="text-[10px] text-gray-400 mb-3 italic">Calculated from site assets. Overwrite manually as needed.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(manualCounts).map(([type, count]) => (
                    <div key={type} className="group relative">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 truncate pr-5" title={type}>{type}</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={count || ''}
                          onChange={(e) => handleManualCountChange(type, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border rounded-lg text-sm text-center dark:bg-gray-600 dark:text-white focus:ring-1 focus:ring-safety-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nc = { ...manualCounts };
                            delete nc[type];
                            setManualCounts(nc);
                          }}
                          className="absolute -top-6 -right-1 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove Type"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                  {isAddingNewType ? (
                    <div className="flex gap-2 animate-fadeIn">
                      <input
                        type="text"
                        autoFocus
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="e.g. Fire Blanket"
                        className="flex-1 px-3 py-1 text-xs border rounded-lg dark:bg-gray-600 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewType())}
                      />
                      <button type="button" onClick={handleAddNewType} className="px-3 py-1 bg-safety-600 text-white text-xs font-bold rounded-lg shadow-sm">Add</button>
                      <button type="button" onClick={() => setIsAddingNewType(false)} className="px-2 py-1 text-gray-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewType(true)}
                      className="flex items-center text-[10px] font-bold text-gray-400 hover:text-safety-600 uppercase tracking-tight transition-colors"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Custom Unit Type
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {formData.extinguisherTech && (
              <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                <div className="flex justify-between items-center mb-3">
                  <button type="button" onClick={() => setShowExtOut(!showExtOut)} className="text-sm font-bold text-orange-900 dark:text-orange-300 flex items-center">
                    <PackageMinus className="w-4 h-4 mr-2" /> Extinguishers Out ({groupedExtOutList.length} Groups)
                  </button>
                  <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setShowCompletedExt(!showCompletedExt)} className={`p-1.5 rounded ${showCompletedExt ? 'text-blue-600' : 'text-gray-400'}`}>{showCompletedExt ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  </div>
                </div>
                
                {showExtOut && (
                  <div className="space-y-3">
                    {groupedExtOutList.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold text-gray-400 uppercase tracking-widest">No assets out</div>
                    )}

                    {groupedExtOutList.map((group) => {
                      const isExpanded = !!expandedGroups[group.key];
                      return (
                        <div key={group.key} className="bg-white dark:bg-gray-700 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm overflow-hidden transition-all">
                            <div 
                                onClick={() => toggleGroupExpansion(group.key)}
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm">{group.totalQty}</div>
                                    <div>
                                        <h5 className="font-bold text-gray-900 dark:text-white text-sm">{group.size} {group.brand} {group.type}</h5>
                                        <p className="text-[9px] font-black text-orange-600 uppercase tracking-tighter flex items-center gap-1">
                                            <ListTree className="w-2.5 h-2.5" /> Tap for breakdown
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {group.items.some(i => i.isAuto) && (
                                        <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border border-blue-200">Synced</span>
                                    )}
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border-t border-orange-50 dark:border-orange-900/50 space-y-2 animate-fadeIn">
                                    {group.items.map((item, idx) => (
                                        <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600 shadow-xs">
                                            <div className="flex items-center gap-2">
                                                {item.isAuto ? (
                                                    <input 
                                                        type="number" readOnly value={item.quantity}
                                                        className="w-9 h-7 text-[10px] font-black bg-gray-50 border border-gray-200 rounded text-center text-gray-400" 
                                                    />
                                                ) : (
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => setFormData(prev => ({ ...prev, extinguishersOut: prev.extinguishersOut.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i) }))} 
                                                        className="w-9 h-7 text-[10px] font-black border border-gray-200 dark:border-gray-600 rounded text-center dark:bg-gray-600 dark:text-white" 
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200">
                                                        {item.isAuto ? 'From Site Map' : 'Manual Entry'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {item.isAuto ? (
                                                            <span className="text-[9px] font-black text-blue-500 uppercase">Year: {item.year}</span>
                                                        ) : (
                                                            <select 
                                                                value={item.year} 
                                                                onChange={(e) => setFormData(prev => ({ ...prev, extinguishersOut: prev.extinguishersOut.map(i => i.id === item.id ? { ...i, year: e.target.value } : i) }))} 
                                                                className={`h-6 text-[9px] font-bold border rounded bg-transparent dark:text-white ${!isExtOutDone(item) ? 'border-orange-500 text-orange-600' : 'border-gray-100'}`}
                                                            >
                                                                <option value="">Year</option>
                                                                {extOutServiceYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {item.isAuto ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleClearAutoSynced(item)}
                                                        className="h-7 px-2 bg-blue-600 text-white hover:bg-blue-700 rounded text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1 transition-all shadow-sm"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" /> Clear
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        {!isExtOutDone(item) && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => clearDueExt(item.id)}
                                                                className="h-7 px-2 bg-orange-600 text-white hover:bg-orange-700 rounded text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1 transition-all shadow-sm"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Clear
                                                            </button>
                                                        )}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData(prev => ({ ...prev, extinguishersOut: prev.extinguishersOut.filter(i => i.id !== item.id) }))} 
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                      );
                    })}

                    <Button 
                        type="button" variant="secondary" size="sm" 
                        onClick={() => setFormData(prev => ({ ...prev, extinguishersOut: [...prev.extinguishersOut, { id: Date.now().toString(), quantity: 1, size: '5lb', type: 'ABC', brand: 'Amerex', year: '' }] }))} 
                        className="w-full text-[10px] font-black uppercase py-3 mt-2 border-2 border-dashed border-gray-200 hover:border-orange-300 dark:border-gray-700"
                    >
                        + Add Manual Ext Out Entry
                    </Button>
                  </div>
                )}
              </div>
            )}

            {formData.systemTech && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex justify-between items-center mb-3">
                  <button type="button" onClick={() => setShowSysOut(!showSysOut)} className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center">
                    <Cylinder className="w-4 h-4 mr-2" /> System Tanks Out ({formData.systemTanks.length})
                  </button>
                  <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setShowCompletedSys(!showCompletedSys)} className={`p-1.5 rounded ${showCompletedSys ? 'text-blue-600' : 'text-gray-400'}`}>{showCompletedSys ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  </div>
                </div>
                {showSysOut && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formData.systemTanks.filter(i => showCompletedSys || !isSysOutDone(i)).map(item => {
                        const due = !isSysOutDone(item);
                        return (
                          <div key={item.id} className={`bg-white dark:bg-gray-700 p-4 rounded-xl border shadow-sm transition-all relative ${due ? 'border-blue-300 dark:border-blue-700' : 'dark:border-gray-600'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={item.quantity} 
                                  onChange={(e) => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i) }))} 
                                  className="w-12 h-10 text-sm font-black border border-gray-200 dark:border-gray-600 rounded-lg text-center dark:bg-gray-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500" 
                                />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.filter(i => i.id !== item.id) }))} 
                                className="text-gray-300 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Brand</label>
                                <select value={item.brand} onChange={(e) => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.map(i => i.id === item.id ? { ...i, brand: e.target.value } : i) }))} className="w-full h-9 text-xs font-bold border border-gray-100 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white">
                                  {SYSTEM_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Agent</label>
                                <select value={item.type} onChange={(e) => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.map(i => i.id === item.id ? { ...i, type: e.target.value } : i) }))} className="w-full h-9 text-xs font-bold border border-gray-100 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white">
                                  <option value="Wet Chemical">Wet Chem</option>
                                  <option value="Dry Chemical">Dry Chem</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Size</label>
                                <input type="text" value={item.size} onChange={(e) => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.map(i => i.id === item.id ? { ...i, size: e.target.value } : i) }))} className="w-full h-9 text-xs font-bold border border-gray-100 dark:border-gray-600 rounded-lg px-2 dark:bg-gray-600 dark:text-white" placeholder="Size" />
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Last Svc</label>
                                <select value={item.year} onChange={(e) => setFormData(prev => ({ ...prev, systemTanks: prev.systemTanks.map(i => i.id === item.id ? { ...i, year: e.target.value } : i) }))} className={`w-full h-9 text-xs font-bold border rounded-lg dark:bg-gray-600 dark:text-white ${due ? 'border-blue-500 text-blue-600' : 'border-gray-100'}`}>
                                  <option value="">Year</option>
                                  {systemServiceYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                            </div>
                            
                            {due && (
                                <button 
                                    type="button" 
                                    onClick={() => clearDueTank(item.id)}
                                    className="w-full bg-blue-600 text-white hover:bg-blue-700 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Clear Tank Svc
                                </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, systemTanks: [...prev.systemTanks, { id: Date.now().toString(), quantity: 1, size: '', brand: 'Ansul', type: 'Wet Chemical', year: '' }] }))} className="w-full text-xs font-bold py-3 border-2 border-dashed border-gray-200 hover:border-blue-300 dark:border-gray-700">+ Add Manual Sys Tank Out</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Access codes, site specific details, etc." className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none outline-none focus:ring-2 focus:ring-safety-500" />
          </div>

          {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-fadeIn">{formError}</div>}

          <Button type="submit" variant="success" className="w-full py-3 shadow-lg" icon={<Save className="w-4 h-4" />}>
            {initialData ? 'Update Customer' : 'Create Customer'}
          </Button>
        </form>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};