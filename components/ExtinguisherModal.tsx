import React, { useState, useEffect } from 'react';
import { Extinguisher, AssetType, Customer } from '../types';
import { Button } from './Button';
import { X, Plus, Save, CalendarRange, Hash, Zap, AlertCircle, RefreshCw, Info } from 'lucide-react';

interface ExtinguisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Extinguisher, 'id'>, addAnother: boolean) => void;
  initialData?: Extinguisher | null;
  customers: Customer[];
  initialCustomerId?: string;
  extinguishers?: Extinguisher[]; // Passed to calculate sequential ID
  customBatteryTypes: string[];
}

const BRANDS = ['Amerex', 'Ansul (Old)', 'Ansul (New)', 'Badger', 'Buckeye', 'Pyro Chem', 'Kidde'];
const TYPES: AssetType[] = ['ABC', 'CO2', 'Water', 'Foam', 'Wet Chemical', 'Clean Agent', 'Water Mist', 'Exit Light', 'Emergency Light'];

// Size options mapping based on asset type
const getSizesForType = (type: AssetType): string[] => {
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

const getServiceInterval = (type: AssetType): number => {
  if (type === 'Exit Light' || type === 'Emergency Light') return 0;
  return (type === 'ABC' || type === 'Clean Agent') ? 6 : 5;
};

const isLightType = (type: AssetType) => type === 'Exit Light' || type === 'Emergency Light';

export const ExtinguisherModal: React.FC<ExtinguisherModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  customers,
  initialCustomerId,
  extinguishers = [],
  customBatteryTypes = []
}) => {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    location: '',
    unitNumber: '',
    customerId: '',
    type: 'ABC' as AssetType,
    brand: 'Amerex',
    size: '5lb',
    batteryType: '',
    batteryReplacementDue: false,
    lastServiceDate: '',
    nextInspectionDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Dynamic dropdown list calculation
  const getYearsList = () => {
    // Group types that should have a shorter selection range (e.g. 5-6 year maintenance cycles)
    const shortCycleTypes: AssetType[] = ['ABC', 'Clean Agent', 'CO2', 'Water', 'Foam', 'Water Mist', 'Wet Chemical'];
    // Use 8 for current year + 7 years back, or 15 for a wider historical range
    const length = shortCycleTypes.includes(formData.type) ? 8 : 15;
    return Array.from({ length }, (_, i) => (currentYear - i).toString());
  };

  const years = getYearsList();
  const isLightAsset = isLightType(formData.type);
  const availableSizes = getSizesForType(formData.type);

  useEffect(() => {
    if (initialData) {
      setFormData({
        location: initialData.location,
        unitNumber: initialData.unitNumber || '',
        customerId: initialData.customerId,
        type: initialData.type,
        brand: initialData.brand || 'Amerex',
        size: initialData.size || '5lb',
        batteryType: initialData.batteryType || '',
        batteryReplacementDue: !!initialData.batteryReplacementDue,
        lastServiceDate: initialData.lastServiceDate || '',
        nextInspectionDue: initialData.nextInspectionDue.split('T')[0],
      });
    } else {
      // Reset for new entry
      setFormData(prev => {
        const defaultType = prev.type || 'ABC';
        const sizes = getSizesForType(defaultType);
        return {
          ...prev,
          location: '',
          unitNumber: '',
          customerId: initialCustomerId || (customers.length > 0 ? customers[0].id : ''),
          lastServiceDate: '',
          type: defaultType, 
          brand: prev.brand || 'Amerex',
          size: sizes.includes(prev.size) ? prev.size : sizes[0],
          batteryType: '',
          batteryReplacementDue: false
        };
      });
    }
  }, [initialData, initialCustomerId, isOpen, customers, currentYear]);

  // Auto-calculate Unit Number when customer or type changes (only for new entries)
  useEffect(() => {
      if (!initialData && isOpen && formData.customerId) {
          const currentIsLight = isLightType(formData.type);
          const customerAssets = extinguishers.filter(e => e.customerId === formData.customerId);
          
          let max = 0;
          customerAssets.forEach(e => {
              const eIsLight = isLightType(e.type);
              // Only compare against assets of the same "category" (Light vs Extinguisher)
              if (currentIsLight === eIsLight) {
                  // Extract number (strip 'L' if present)
                  const rawNum = e.unitNumber || '0';
                  const numericPart = rawNum.replace(/[^0-9]/g, '');
                  const num = parseInt(numericPart, 10);
                  if (!isNaN(num) && num > max) max = num;
              }
          });

          const nextNum = max + 1;
          const suggestedUnit = currentIsLight ? `L${nextNum}` : nextNum.toString();
          
          setFormData(prev => ({ ...prev, unitNumber: suggestedUnit }));
      }
  }, [formData.customerId, formData.type, isOpen, initialData, extinguishers]);

  // Auto-sync Next Inspection Due when Customer changes
  useEffect(() => {
    const customerId = formData.customerId;
    if (!customerId) return;
    if (initialData && initialData.customerId === customerId) return; 

    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.serviceMonths && customer.serviceMonths.length > 0) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; 
        const currentYearValue = now.getFullYear();
        const sortedMonths = [...customer.serviceMonths].sort((a, b) => a - b);
        let nextMonth = sortedMonths.find(m => m >= currentMonth);
        let year = currentYearValue;
        if (!nextMonth) {
            nextMonth = sortedMonths[0];
            year = currentYearValue + 1;
        }
        const nextDate = new Date(year, nextMonth - 1, 1);
        const dateString = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, nextInspectionDue: dateString }));
    }
  }, [formData.customerId, customers, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setFormData(prev => {
      const val = type === 'checkbox' ? checked : value;
      const newData = { ...prev, [name]: val };
      if (name === 'type') {
        const newSizes = getSizesForType(value as AssetType);
        if (!newSizes.includes(prev.size)) {
          newData.size = newSizes[0];
        }
      }
      return newData;
    });
  };

  const handleUpdateYear = () => {
    const newYearStr = currentYear.toString();
    const updatedData = { ...formData, lastServiceDate: newYearStr };
    
    setFormData(updatedData);
    
    // Auto-save if in edit mode (Service & Save action)
    if (initialData) {
        const submissionData = {
          ...updatedData,
          status: initialData.status,
          lastInspectionDate: initialData.lastInspectionDate,
          ...(isLightAsset ? { brand: '', size: '', lastServiceDate: '' } : { batteryType: '', batteryReplacementDue: false })
        } as Omit<Extinguisher, 'id'>;
        
        onSubmit(submissionData, false);
    }
  };

  const handleSubmit = (e: React.FormEvent, addAnother: boolean) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      status: initialData ? initialData.status : 'Pending Inspection',
      lastInspectionDate: initialData ? initialData.lastInspectionDate : null,
      ...(isLightAsset ? { brand: '', size: '', lastServiceDate: '' } : { batteryType: '', batteryReplacementDue: false })
    } as Omit<Extinguisher, 'id'>;

    onSubmit(submissionData, addAnother);

    if (addAnother) {
      setFormData(prev => {
        return {
          ...prev,
          location: '',
          unitNumber: '', // Reset to trigger sequential recalculation
        };
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit Asset' : 'Add New Asset'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white" required>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer / Site</label>
              <select name="customerId" value={formData.customerId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white" required>
                <option value="" disabled>Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
             <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit #</label>
                <div className="relative">
                    <Hash className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
                    <input type="text" name="unitNumber" value={formData.unitNumber} onChange={handleChange} placeholder="1" className="w-full pl-6 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-center font-bold" required />
                </div>
             </div>
             <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Detail</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. North Hallway" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white" />
             </div>
          </div>

          {!isLightAsset ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size</label>
                  <select name="size" value={formData.size} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white" required>
                    {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                  <select name="brand" value={formData.brand} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white" required>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Service Year</label>
                  <select 
                    name="lastServiceDate" 
                    value={formData.lastServiceDate} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Battery Type</label>
                <div className="relative">
                    <Zap className="absolute left-3 top-2.5 w-4 h-4 text-orange-400" />
                    <input 
                      list="battery-types"
                      name="batteryType" 
                      value={formData.batteryType} 
                      onChange={handleChange} 
                      placeholder="e.g. Lead Acid"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                      required
                    />
                    <datalist id="battery-types">
                        {customBatteryTypes.map(t => <option key={t} value={t} />)}
                    </datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Replacement Status</label>
                <div className="relative">
                    <AlertCircle className={`absolute left-3 top-2.5 w-4 h-4 ${formData.batteryReplacementDue ? 'text-red-500' : 'text-gray-400'}`} />
                    <select 
                      name="batteryReplacementDue" 
                      value={formData.batteryReplacementDue.toString()} 
                      onChange={(e) => handleChange({ target: { name: 'batteryReplacementDue', value: e.target.value === 'true' }} as any)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 outline-none dark:bg-gray-700 dark:text-white ${formData.batteryReplacementDue ? 'border-red-300 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500'}`}
                      required
                    >
                      <option value="false">Replacement OK</option>
                      <option value="true">Replacement Due</option>
                    </select>
                </div>
              </div>
            </div>
          )}

          <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Inspection Due</label>
               <input type="date" name="nextInspectionDue" value={formData.nextInspectionDue} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white" required />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
            {initialData && !isLightAsset && (
                <Button type="button" variant="danger" onClick={handleUpdateYear} icon={<CalendarRange className="w-4 h-4"/>}>Service & Save</Button>
            )}
            <div className="flex-1"></div>
            {!initialData && (
              <Button type="button" variant="secondary" onClick={(e) => handleSubmit(e as any, true)} icon={<Plus className="w-4 h-4" />}>Save & Add Another</Button>
            )}
            <Button type="submit" variant={initialData ? 'success' : 'primary'} icon={<Save className="w-4 h-4" />}>{initialData ? 'Update Asset' : 'Save Asset'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};