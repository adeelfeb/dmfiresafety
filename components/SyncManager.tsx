
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppData } from '../services/storageService';
import { RegisteredUser, Customer, Extinguisher, InspectionRecord, Todo, User, UserRole, DropboxSettings, SupabaseSettings, AssetType, BackupFormat, AuditEntry, VoiplySettings, DeviceMagicSettings } from '../types';
import { Button } from './Button';
import { Download, Upload, Users, Trash2, Plus, Database, FileSpreadsheet, KeyRound, Shield, AlertTriangle, Mail, Moon, Sun, Fingerprint, Edit2, CheckCircle, XCircle, Settings, UserPlus, ShieldCheck, UserCog, Eye, EyeOff, Cloud, Clock, Zap, History, LayoutGrid, Save, Filter, ChevronRight, Box, RefreshCw, UserCircle, Type as TypeIcon, Hash, Search, ArrowRightLeft, Rows, Building2, Layers, ClipboardList, ListTodo, ShieldAlert, Binary, UserMinus, UserCheck, Lock, Link as LinkIcon, Fingerprint as BiometricIcon, MessageSquare, ExternalLink, Smartphone } from 'lucide-react';
import { isBiometricSupported, registerBiometric, removeBiometricCredential, hasBiometricCredential } from '../services/biometricService';
import { uploadToDropbox, verifyDropboxToken } from '../services/dropboxService';
import { AuditLogView } from './AuditLogView';

interface SyncManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  extinguishers: Extinguisher[];
  setExtinguishers: React.Dispatch<React.SetStateAction<Extinguisher[]>>;
  records: InspectionRecord[];
  setRecords?: React.Dispatch<React.SetStateAction<InspectionRecord[]>>;
  auditLogs: AuditEntry[];
  onDeleteAuditLogs?: (ids: string[]) => void;
  todos: Todo[];
  setTodos?: React.Dispatch<React.SetStateAction<Todo[]>>;
  onImport: (data: AppData) => void;
  currentUser: User | null;
  onUpdateUser: (user: User) => void;
  technicians: string[];
  setTechnicians?: React.Dispatch<React.SetStateAction<string[]>>;
  onAddTechnician: (name: string) => void;
  registeredUsers: RegisteredUser[];
  onUpdateRegisteredUsers: (users: RegisteredUser[]) => void;
  customChecklistItems: string[];
  onUpdateChecklistItems?: (items: string[]) => void;
  customBatteryTypes: string[];
  onUpdateBatteryTypes?: (types: string[]) => void;
  disabledBulkFields?: string[];
  onUpdateDisabledBulkFields?: (fields: string[]) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  dropboxSettings?: DropboxSettings;
  onUpdateDropboxSettings?: (settings: DropboxSettings) => void;
  supabaseSettings?: SupabaseSettings;
  onUpdateSupabaseSettings?: (settings: SupabaseSettings) => void;
  voiplySettings?: VoiplySettings;
  onUpdateVoiplySettings?: (settings: VoiplySettings) => void;
  deviceMagicSettings?: DeviceMagicSettings;
  onUpdateDeviceMagicSettings?: (settings: DeviceMagicSettings) => void;
  onDeleteRecords?: (ids: string[]) => void;
  // Managed Lists
  assetTypes?: string[];
  setAssetTypes?: React.Dispatch<React.SetStateAction<string[]>>;
  extinguisherBrands?: string[];
  setExtinguisherBrands?: React.Dispatch<React.SetStateAction<string[]>>;
  systemBrands?: string[];
  setSystemBrands?: React.Dispatch<React.SetStateAction<string[]>>;
  systemAgents?: string[];
  setSystemAgents?: React.Dispatch<React.SetStateAction<string[]>>;
}

type SettingsTab = 'general' | 'profile' | 'registry' | 'cloud' | 'activity' | 'terminal';
type CollectionType = 'customers' | 'extinguishers' | 'records' | 'todos' | 'registeredUsers';
type RegistryType = 'technicians' | 'assetTypes' | 'extinguisherBrands' | 'systemBrands' | 'systemAgents' | 'batteryTypes' | 'checklists';

export const SyncManager: React.FC<SyncManagerProps> = ({ 
  customers,
  setCustomers,
  extinguishers,
  setExtinguishers,
  records,
  setRecords,
  auditLogs = [],
  onDeleteAuditLogs,
  todos,
  setTodos,
  onImport, 
  currentUser,
  onUpdateUser,
  technicians = [], 
  setTechnicians,
  onAddTechnician, 
  registeredUsers,
  onUpdateRegisteredUsers,
  customChecklistItems,
  onUpdateChecklistItems,
  customBatteryTypes,
  onUpdateBatteryTypes,
  disabledBulkFields = [],
  onUpdateDisabledBulkFields,
  isDarkMode,
  onToggleDarkMode,
  dropboxSettings,
  onUpdateDropboxSettings,
  supabaseSettings,
  onUpdateSupabaseSettings,
  voiplySettings,
  onUpdateVoiplySettings,
  deviceMagicSettings,
  onUpdateDeviceMagicSettings,
  onDeleteRecords,
  assetTypes = [],
  setAssetTypes,
  extinguisherBrands = [],
  setExtinguisherBrands,
  systemBrands = [],
  setSystemBrands,
  systemAgents = [],
  setSystemAgents
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [activeRegistry, setActiveRegistry] = useState<RegistryType>('technicians');
  const [newItemName, setNewItemName] = useState('');

  // Dropbox UI Local state
  const [dbxToken, setDbxToken] = useState(dropboxSettings?.accessToken || '');
  const [dbxFreq, setDbxFreq] = useState(dropboxSettings?.frequency || 'manual');
  const [dbxFormat, setDbxFormat] = useState<BackupFormat>(dropboxSettings?.format || 'json');
  const [isUploadingDbx, setIsUploadingDbx] = useState(false);
  const [dbxStatus, setDbxStatus] = useState<string | null>(null);

  // Supabase UI Local state
  const [supaUrl, setSupaUrl] = useState(supabaseSettings?.url || '');
  const [supaKey, setSupaKey] = useState(supabaseSettings?.apiKey || '');
  const [supaPrefix, setSupaPrefix] = useState(supabaseSettings?.tablePrefix || 'dm_fire_');
  const [supaFreq, setSupaFreq] = useState(supabaseSettings?.frequency || 'manual');
  const [isSyncingSupa, setIsSyncingSupa] = useState(false);
  const [supaStatus, setSupaStatus] = useState<string | null>(null);

  // Voiply UI local state
  const [voiplyToken, setVoiplyToken] = useState(voiplySettings?.apiKey || '');
  const [voiplyEnabled, setVoiplyEnabled] = useState(voiplySettings?.enabled ?? true);
  const [voiplyStatus, setVoiplyStatus] = useState<string | null>(null);

  // Device Magic UI local state
  const [dmKey, setDmKey] = useState(deviceMagicSettings?.apiKey || '');
  const [dmOrg, setDmOrg] = useState(deviceMagicSettings?.orgId || '');
  const [dmForm, setDmForm] = useState(deviceMagicSettings?.defaultFormId || '');
  const [dmEnabled, setDmEnabled] = useState(deviceMagicSettings?.enabled || false);
  const [dmStatus, setDmStatus] = useState<string | null>(null);

  useEffect(() => {
    setDbxToken(dropboxSettings?.accessToken || '');
    setDbxFreq(dropboxSettings?.frequency || 'manual');
    setDbxFormat(dropboxSettings?.format || 'json');
  }, [dropboxSettings]);

  useEffect(() => {
    setSupaUrl(supabaseSettings?.url || '');
    setSupaKey(supabaseSettings?.apiKey || '');
    setSupaPrefix(supabaseSettings?.tablePrefix || 'dm_fire_');
    setSupaFreq(supabaseSettings?.frequency || 'manual');
  }, [supabaseSettings]);

  useEffect(() => {
    setVoiplyToken(voiplySettings?.apiKey || '');
    setVoiplyEnabled(voiplySettings?.enabled ?? true);
  }, [voiplySettings]);

  useEffect(() => {
    setDmKey(deviceMagicSettings?.apiKey || '');
    setDmOrg(deviceMagicSettings?.orgId || '');
    setDmForm(deviceMagicSettings?.defaultFormId || '');
    setDmEnabled(deviceMagicSettings?.enabled || false);
  }, [deviceMagicSettings]);

  // Registry Definition mapping
  const registryMap = useMemo(() => ({
    technicians: { list: technicians, setter: setTechnicians, label: 'Technician List' },
    assetTypes: { list: assetTypes, setter: setAssetTypes, label: 'Asset Categories' },
    extinguisherBrands: { list: extinguisherBrands, setter: setExtinguisherBrands, label: 'Extinguisher Brands' },
    systemBrands: { list: systemBrands, setter: setSystemBrands, label: 'System Brands' },
    systemAgents: { list: systemAgents, setter: setSystemAgents, label: 'System Agents' },
    batteryTypes: { list: customBatteryTypes, setter: onUpdateBatteryTypes, label: 'Battery Types' },
    checklists: { list: customChecklistItems, setter: onUpdateChecklistItems, label: 'Checklist Library' }
  }), [technicians, assetTypes, extinguisherBrands, systemBrands, systemAgents, customBatteryTypes, customChecklistItems, onUpdateBatteryTypes, onUpdateChecklistItems, setAssetTypes, setExtinguisherBrands, setSystemBrands, setSystemAgents, setTechnicians]);

  const currentRegistry = registryMap[activeRegistry];

  const handleAddItem = () => {
    if (!isAdmin || !newItemName.trim() || !currentRegistry.setter) return;
    currentRegistry.setter((prev: string[]) => [...new Set([...prev, newItemName.trim()])]);
    setNewItemName('');
  };

  const handleRemoveItem = (name: string) => {
    if (!isAdmin || !currentRegistry.setter) return;
    if (window.confirm(`Remove "${name}" from the ${currentRegistry.label}? This will not affect existing records, but prevents new selections.`)) {
        currentRegistry.setter((prev: string[]) => prev.filter(t => t !== name));
    }
  };

  // Master Terminal State
  const [targetCollection, setTargetCollection] = useState<CollectionType>('extinguishers');
  const [targetId, setTargetId] = useState<string>('All');
  const [targetField, setTargetField] = useState<string>('');
  const [overrideValue, setOverrideValue] = useState<any>('');
  const [valueType, setValueType] = useState<'text' | 'number' | 'boolean' | 'date'>('text');

  const dataMap: Record<CollectionType, any[]> = {
    customers,
    extinguishers,
    records,
    todos,
    registeredUsers
  };

  const availableFields = useMemo(() => {
    const dataset = dataMap[targetCollection];
    if (!dataset || dataset.length === 0) return [];
    
    const keys = new Set<string>();
    dataset.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'id') keys.add(key);
      });
    });
    return Array.from(keys).sort();
  }, [targetCollection, customers, extinguishers, records, todos, registeredUsers]);

  const handleFieldChange = (field: string) => {
    setTargetField(field);
    const dataset = dataMap[targetCollection];
    const sample = dataset.find(item => item[field] !== undefined);
    if (sample) {
      const val = sample[field];
      if (typeof val === 'boolean') setValueType('boolean');
      else if (typeof val === 'number') setValueType('number');
      else if (field.toLowerCase().includes('date')) setValueType('date');
      else setValueType('text');
    }
  };

  const [userForm, setUserForm] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    pin: string;
    role: 'admin' | 'tech';
    technicianId: string;
  }>({ id: '', firstName: '', lastName: '', email: '', pin: '', role: 'tech', technicianId: '' });

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
      const checkBio = async () => {
          const supported = await isBiometricSupported();
          if (currentUser) {
              setBiometricEnabled(hasBiometricCredential(currentUser.technicianId));
          }
      };
      checkBio();
  }, [currentUser]);

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      const newUser: RegisteredUser = {
          id: userForm.id || Date.now().toString(),
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          pin: userForm.pin,
          role: userForm.role,
          technicianId: userForm.technicianId || `TECH-${Math.floor(1000 + Math.random() * 9000)}`
      };

      const updatedUsers = userForm.id ? registeredUsers.map(u => u.id === userForm.id ? newUser : u) : [...registeredUsers, newUser];
      onUpdateRegisteredUsers(updatedUsers);
      setIsAddingUser(false);
  };

  const handleMasterOverride = () => {
    if (!isAdmin || !targetField) return;
    
    const finalValue = valueType === 'number' ? Number(overrideValue) : overrideValue;
    let affectedCount = 0;
    const dataset = dataMap[targetCollection];

    const updatedData = dataset.map(item => {
      if (targetId === 'All' || item.id === targetId) {
        affectedCount++;
        return { ...item, [targetField]: finalValue };
      }
      return item;
    });

    if (window.confirm(`FORCE OVERRIDE: Update "${targetField}" to "${finalValue}" for ${affectedCount} entries in "${targetCollection}"?`)) {
      switch (targetCollection) {
        case 'customers': setCustomers(updatedData); break;
        case 'extinguishers': setExtinguishers(updatedData); break;
        case 'records': setRecords?.(updatedData); break;
        case 'todos': setTodos?.(updatedData); break;
        case 'registeredUsers': onUpdateRegisteredUsers(updatedData); break;
      }
      alert(`Success: ${affectedCount} entries updated.`);
      setOverrideValue('');
    }
  };

  const handleSaveDropboxSettings = async () => {
      if (!isAdmin || !onUpdateDropboxSettings) return;
      if (dbxToken) {
          const isValid = await verifyDropboxToken(dbxToken);
          if (!isValid) { setDbxStatus("Invalid Token."); return; }
      }
      onUpdateDropboxSettings({ 
          accessToken: dbxToken, 
          frequency: dbxFreq as any, 
          format: dbxFormat,
          lastBackup: dropboxSettings?.lastBackup || null 
      });
      setDbxStatus("Stored.");
  };

  const handleManualDropboxBackup = async () => {
      if (!isAdmin || !dbxToken || !onUpdateDropboxSettings) return;
      setIsUploadingDbx(true);
      const fullData: AppData = { 
        customers, extinguishers, records, auditLogs, todos, technicians, registeredUsers, 
        customChecklistItems, customBatteryTypes, assetTypes, extinguisherBrands, 
        systemBrands, systemAgents, dropboxSettings, supabaseSettings, voiplySettings, lastUpdated: new Date().toISOString() 
      };
      const result = await uploadToDropbox(dbxToken, fullData, dbxFormat);
      if (result.success) {
          setDbxStatus("Success!");
          onUpdateDropboxSettings({ 
              accessToken: dbxToken, 
              frequency: dbxFreq as any, 
              format: dbxFormat,
              lastBackup: new Date().toISOString() 
          });
      } else setDbxStatus(`Failed: ${result.message}`);
      setIsUploadingDbx(false);
  };

  const handleSaveSupabaseSettings = () => {
      if (!isAdmin || !onUpdateSupabaseSettings) return;
      onUpdateSupabaseSettings({
          url: supaUrl,
          apiKey: supaKey,
          tablePrefix: supaPrefix,
          frequency: supaFreq as any,
          lastSync: supabaseSettings?.lastSync || null
      });
      setSupaStatus("Supabase Settings Stored.");
      setTimeout(() => setSupaStatus(null), 3000);
  };

  const handleManualSupabaseSync = async () => {
      if (!isAdmin || !supaUrl || !supaKey || !onUpdateSupabaseSettings) return;
      setIsSyncingSupa(true);
      setSupaStatus("Syncing...");
      
      try {
          const fullData = { 
              customers, extinguishers, records, todos, technicians, registeredUsers, 
              lastUpdated: new Date().toISOString() 
          };

          const response = await fetch(`${supaUrl}/rest/v1/app_snapshots`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'apikey': supaKey,
                  'Authorization': `Bearer ${supaKey}`,
                  'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                  data: fullData,
                  technician_id: currentUser?.technicianId,
                  timestamp: new Date().toISOString()
              })
          });

          if (response.ok) {
              setSupaStatus("Sync Complete!");
              onUpdateSupabaseSettings({
                url: supaUrl,
                apiKey: supaKey,
                tablePrefix: supaPrefix,
                frequency: supaFreq as any,
                lastSync: new Date().toISOString()
            });
          } else {
              const err = await response.json();
              setSupaStatus(`Error: ${err.message || 'Check URL/Key'}`);
          }
      } catch (e: any) {
          setSupaStatus(`Network Error: ${e.message}`);
      } finally {
          setIsSyncingSupa(false);
          setTimeout(() => setSupaStatus(null), 5000);
      }
  };

  const handleSaveVoiply = () => {
    if (!isAdmin || !onUpdateVoiplySettings) return;
    onUpdateVoiplySettings({ apiKey: voiplyToken, enabled: voiplyEnabled });
    setVoiplyStatus("Integration saved.");
    setTimeout(() => setVoiplyStatus(null), 3000);
  };

  const handleSaveDeviceMagic = () => {
    if (!isAdmin || !onUpdateDeviceMagicSettings) return;
    onUpdateDeviceMagicSettings({
        apiKey: dmKey,
        orgId: dmOrg,
        defaultFormId: dmForm,
        enabled: dmEnabled
    });
    setDmStatus("Integration saved.");
    setTimeout(() => setDmStatus(null), 3000);
  };

  const myProfile = useMemo(() => {
      return registeredUsers.find(u => u.technicianId === currentUser?.technicianId);
  }, [registeredUsers, currentUser]);

  return (
    <div className="space-y-6 md:space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('general')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><Settings className="w-4 h-4" /> General</button>
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><UserCheck className="w-4 h-4" /> My Profile</button>
          {isAdmin && <button onClick={() => setActiveTab('registry')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><Layers className="w-4 h-4" /> Registry & Users</button>}
          {isAdmin && <button onClick={() => setActiveTab('terminal')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'terminal' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><Box className="w-4 h-4" /> Terminal</button>}
          {isAdmin && <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cloud' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><Cloud className="w-4 h-4" /> Cloud</button>}
          <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-white dark:bg-gray-700 text-safety-600 shadow-sm' : 'text-gray-500'}`}><History className="w-4 h-4" /> Activity Log</button>
      </div>

      <div className="animate-fadeIn">
        {activeTab === 'general' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><UserCog className="w-5 h-5 mr-2 text-gray-500" /> App Preferences</h3>
                    <div className="flex items-center justify-between">
                        <div><h4 className="font-bold text-gray-900 dark:text-white">Dark Mode</h4><p className="text-xs text-gray-500 dark:text-gray-400">Toggle UI theme</p></div>
                        <button onClick={onToggleDarkMode} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">{isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}</button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'cloud' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Device Magic Tile */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Smartphone className="w-5 h-5 mr-2 text-green-600" /> Device Magic</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">External Forms Integration</p>
                        </div>
                        <button 
                            onClick={() => setDmEnabled(!dmEnabled)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${dmEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${dmEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                            <label className="block text-[9px] font-black text-gray-400 uppercase">Device Magic API Key</label>
                            <input 
                                type="password" 
                                value={dmKey} 
                                onChange={(e) => setDmKey(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                placeholder="Paste API Key..." 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="block text-[9px] font-black text-gray-400 uppercase">Org ID</label>
                                <input 
                                    type="text" 
                                    value={dmOrg} 
                                    onChange={(e) => setDmOrg(e.target.value)} 
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl outline-none dark:bg-gray-700 dark:text-white text-sm font-mono" 
                                    placeholder="Org Identifier" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[9px] font-black text-gray-400 uppercase">Default Form ID</label>
                                <input 
                                    type="text" 
                                    value={dmForm} 
                                    onChange={(e) => setDmForm(e.target.value)} 
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                    placeholder="Form ID" 
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800">
                             <p className="text-[10px] text-green-700 dark:text-green-300 font-medium">
                                Enabling integration adds "System Forms" to the sidebar, allowing deep-linking to Device Magic audit templates.
                             </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        <Button onClick={handleSaveDeviceMagic} variant="primary" className="w-full !bg-green-600 hover:!bg-green-700 border-green-700" icon={<Save className="w-4 h-4" />}>
                            Save Integration Settings
                        </Button>
                    </div>
                    {dmStatus && <p className="text-xs font-bold uppercase text-center mt-4 text-green-600">{dmStatus}</p>}
                </div>

                {/* Voiply Tile */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-blue-600" /> Voiply Integration</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">SMS and Voicemail Access</p>
                        </div>
                        <button 
                            onClick={() => setVoiplyEnabled(!voiplyEnabled)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${voiplyEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${voiplyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Voiply API Token</label>
                            <input 
                                type="password" 
                                value={voiplyToken} 
                                onChange={(e) => setVoiplyToken(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                placeholder="Paste your Voiply Token..." 
                            />
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                             <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                Enabling Voiply allows technicians to access the "Messages" tab on the sidebar to view site SMS and voicemails.
                             </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        <Button onClick={handleSaveVoiply} variant="primary" className="w-full" icon={<Save className="w-4 h-4" />}>
                            Save Integration Settings
                        </Button>
                    </div>
                    {voiplyStatus && <p className="text-xs font-bold uppercase text-center mt-4 text-green-600">{voiplyStatus}</p>}
                </div>

                {/* Dropbox Tile */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Cloud className="w-5 h-5 mr-2 text-blue-500" /> Dropbox Data Sync</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">Remote Safety Database Mirror</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Access Token</label>
                                <input type="password" value={dbxToken} onChange={(e) => setDbxToken(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white text-sm" placeholder="Paste Dropbox token..." />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Automation Cycle</label>
                                <select value={dbxFreq} onChange={(e) => setDbxFreq(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white text-sm">
                                    <option value="manual">Off (Manual Only)</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Backup Format</label>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
                                <button 
                                    onClick={() => setDbxFormat('json')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dbxFormat === 'json' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    JSON Database
                                </button>
                                <button 
                                    onClick={() => setDbxFormat('excel')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dbxFormat === 'excel' ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Excel Spreadsheet
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        <Button onClick={handleSaveDropboxSettings} variant="primary" disabled={!dbxToken} className="w-full">Apply Settings</Button>
                        <Button onClick={handleManualDropboxBackup} variant="secondary" disabled={!dbxToken || isUploadingDbx} isLoading={isUploadingDbx} icon={<Upload className="w-4 h-4"/>} className="w-full bg-blue-50 text-blue-700 border-blue-200">Sync Mirror Now</Button>
                    </div>
                    {dbxStatus && <p className="text-xs font-bold uppercase text-center mt-4 text-blue-600">{dbxStatus}</p>}
                </div>

                {/* Supabase Tile */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><LinkIcon className="w-5 h-5 mr-2 text-emerald-500" /> Supabase Connection</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">PostgreSQL / Realtime Backend</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Project URL</label>
                            <input 
                                type="text" 
                                value={supaUrl} 
                                onChange={(e) => setSupaUrl(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                placeholder="https://xyz.supabase.co" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">API Key (Service Role/Anon)</label>
                            <input 
                                type="password" 
                                value={supaKey} 
                                onChange={(e) => setSupaKey(e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                placeholder="Supabase API Key..." 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Table Prefix</label>
                                <input 
                                    type="text" 
                                    value={supaPrefix} 
                                    onChange={(e) => setSupaPrefix(e.target.value)} 
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white text-sm" 
                                    placeholder="dm_fire_" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Automation</label>
                                <select value={supaFreq} onChange={(e) => setSupaFreq(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white text-sm">
                                    <option value="manual">Manual Push</option>
                                    <option value="daily">Daily Sync</option>
                                    <option value="weekly">Weekly Sync</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                        <Button onClick={handleSaveSupabaseSettings} variant="primary" disabled={!supaUrl || !supaKey} className="w-full !bg-emerald-600 hover:!bg-emerald-700 border-emerald-700">Update Link Settings</Button>
                        <Button onClick={handleManualSupabaseSync} variant="secondary" disabled={!supaUrl || !supaKey || isSyncingSupa} isLoading={isSyncingSupa} icon={<RefreshCw className="w-4 h-4"/>} className="w-full bg-emerald-50 text-emerald-700 border-emerald-200">Push to Database</Button>
                    </div>
                    {supaStatus && <p className={`text-xs font-bold uppercase text-center mt-4 ${supaStatus.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{supaStatus}</p>}
                </div>
            </div>
        )}
        
        {activeTab === 'terminal' && isAdmin && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-purple-600" /> Master Terminal Override</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-2xl border border-gray-800">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-purple-400 uppercase">Collection</label>
                        <select value={targetCollection} onChange={(e) => setTargetCollection(e.target.value as any)} className="w-full bg-gray-800 border-gray-700 text-white rounded-xl p-3 text-xs">
                            <option value="customers">Customers</option>
                            <option value="extinguishers">Units</option>
                            <option value="records">Inspections</option>
                            <option value="registeredUsers">System Users</option>
                        </select>
                        <label className="block text-[10px] font-black text-purple-400 uppercase">Target ID</label>
                        <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-gray-800 border-gray-700 text-white rounded-xl p-3 text-xs">
                            <option value="All">All Entries (Bulk)</option>
                            {dataMap[targetCollection].map(item => <option key={item.id} value={item.id}>{item.name || item.location || item.firstName || item.id}</option>)}
                        </select>
                        <label className="block text-[10px] font-black text-purple-400 uppercase">Field</label>
                        <select value={targetField} onChange={(e) => handleFieldChange(e.target.value)} className="w-full bg-gray-800 border-gray-700 text-white rounded-xl p-3 text-xs">
                            <option value="">Select Field</option>
                            {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-purple-400 uppercase">New Value</label>
                        <input type="text" value={overrideValue} onChange={e => setOverrideValue(e.target.value)} className="w-full bg-gray-800 border-gray-700 text-white rounded-xl p-3 text-xs" placeholder="Atomic value..." />
                        <Button variant="primary" className="w-full !bg-purple-600 hover:!bg-purple-500 shadow-xl" onClick={handleMasterOverride}>Commit Atomic Overwrite</Button>
                        <p className="text-[9px] text-red-400 italic">WARNING: This directly modifies indices. Invalid data types may crash components.</p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><UserCircle className="w-5 h-5 mr-2 text-safety-600" /> Technician Account</h3>
                    {myProfile ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-600">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-2xl shadow-inner">{myProfile.firstName.charAt(0)}</div>
                                <div>
                                    <h4 className="font-black text-xl text-gray-900 dark:text-white">{myProfile.firstName} {myProfile.lastName}</h4>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{myProfile.role} • {myProfile.technicianId}</p>
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => { setUserForm(myProfile); setIsAddingUser(true); }} icon={<Edit2 className="w-4 h-4"/>}>Edit Profile</Button>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-sm">Profile record not found in system storage.</p>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Shield className="w-5 h-5 mr-2 text-violet-600" /> Biometric Access</h3>
                    <div className="flex items-center justify-between bg-violet-50/50 dark:bg-violet-900/10 p-6 rounded-xl border border-violet-100 dark:border-violet-900/40">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">Secure Enclave Enrollment</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{biometricEnabled ? 'Your device is enrolled for fast PIN-less login.' : 'Enroll your device fingerprint or face to skip PIN entry.'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {biometricEnabled ? (
                                <Button variant="secondary" size="sm" onClick={() => { removeBiometricCredential(currentUser?.technicianId || ''); setBiometricEnabled(false); }} className="text-red-600">Unenroll</Button>
                            ) : (
                                <Button variant="primary" size="sm" className="!bg-violet-600 hover:!bg-violet-700" onClick={async () => { 
                                    const success = await registerBiometric(currentUser?.technicianId || '', currentUser?.name || '');
                                    if (success) setBiometricEnabled(true);
                                }} icon={<Fingerprint className="w-4 h-4"/>}>Enroll Device</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'registry' && isAdmin && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             <ShieldCheck className="w-6 h-6 text-blue-600" />
                             <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">System Access Management</h3>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Admin Only Level</p>
                             </div>
                        </div>
                        <Button size="sm" onClick={() => { setIsAddingUser(true); setUserForm({ id: '', firstName: '', lastName: '', email: '', pin: '', role: 'tech', technicianId: '' }); }}><UserPlus className="w-4 h-4 mr-2" /> New User</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {registeredUsers.map(user => (
                            <div key={user.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{user.firstName.charAt(0)}</div>
                                    <div><h4 className="font-bold text-sm">{user.firstName} {user.lastName}</h4><p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{user.role} • {user.technicianId}</p></div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setUserForm(user); setIsAddingUser(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit User / Reset Password"><Edit2 className="w-4 h-4" /></button>
                                    {user.technicianId !== currentUser?.technicianId && (
                                        <button onClick={() => onUpdateRegisteredUsers(registeredUsers.filter(u => u.id !== user.id))} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-safety-600 rounded-xl flex items-center justify-center shadow-lg"><Lock className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">Global Registry Manager</h3>
                                <p className="text-xs text-gray-500 mt-1 font-black uppercase tracking-widest text-safety-600">Administrative Data Architect</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 space-y-1">
                            {(Object.keys(registryMap) as RegistryType[]).map((key) => {
                                const def = (registryMap as any)[key];
                                return (
                                    <button 
                                        key={key} 
                                        onClick={() => { setActiveRegistry(key); setNewItemName(''); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeRegistry === key ? 'bg-safety-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {def.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="lg:col-span-3 space-y-4">
                            {currentRegistry.setter ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder={`Add new ${currentRegistry.label} value...`}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm font-medium"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    />
                                    <Button onClick={handleAddItem} disabled={!newItemName.trim()} icon={<Plus className="w-4 h-4"/>}>Add Value</Button>
                                </div>
                            ) : (
                                <div className="p-3 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-lg border border-red-200 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Missing Setter: This list is currently read-only. Ensure props are passed correctly from App.tsx.
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {currentRegistry.list.map(item => (
                                    <div key={item} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 group">
                                        <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{item}</span>
                                        {isAdmin && currentRegistry.setter && (
                                            <button 
                                                onClick={() => handleRemoveItem(item)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {currentRegistry.list.length === 0 && (
                                    <p className="col-span-full py-10 text-center text-gray-400 italic text-sm">Registry is empty. Add values to shape the app dropdowns.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'general' && <div className="p-10 text-center text-gray-400">Settings loaded. Use tabs to navigate.</div>}
        {activeTab === 'activity' && <AuditLogView auditLogs={auditLogs} currentUser={currentUser} onDeleteLogs={onDeleteAuditLogs} />}
      </div>

      {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-fadeIn">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-safety-600" />
                        {userForm.id ? 'Edit User Details' : 'Register New User'}
                      </h3>
                      <button onClick={() => setIsAddingUser(false)}><XCircle className="w-5 h-5 text-gray-400 hover:text-red-500"/></button>
                  </div>
                  
                  <form onSubmit={handleSaveUser} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase">First Name</label>
                          <input type="text" required value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} placeholder="John" className="w-full p-2 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase">Last Name</label>
                          <input type="text" required value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} placeholder="Doe" className="w-full p-2 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="john.doe@dmfire.com" className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase">Technician ID</label>
                          <div className="relative">
                            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input type="text" value={userForm.technicianId} onChange={e => setUserForm({...userForm, technicianId: e.target.value})} placeholder="Auto-gen" className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm font-mono" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-blue-600 uppercase">Password / PIN</label>
                          <div className="relative">
                            <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                            <input type="password" required value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} placeholder="Secure PIN" className="w-full pl-9 pr-2 py-2 border border-blue-200 bg-blue-50/30 rounded-lg dark:bg-gray-700 dark:border-blue-900/30 text-sm font-bold" />
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">System Privilege Level</label>
                          <div className="flex gap-6">
                              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer group">
                                  <input type="radio" name="role" value="tech" checked={userForm.role === 'tech'} onChange={() => setUserForm({...userForm, role: 'tech'})} className="w-4 h-4 text-safety-600" /> 
                                  <span className="group-hover:text-safety-600 transition-colors">Field Technician</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer group">
                                  <input type="radio" name="role" value="admin" checked={userForm.role === 'admin'} onChange={() => setUserForm({...userForm, role: 'admin'})} className="w-4 h-4 text-purple-600" /> 
                                  <span className="group-hover:text-purple-600 transition-colors">System Admin</span>
                              </label>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="submit" className="flex-1 shadow-lg" icon={<Save className="w-4 h-4"/>}>
                          {userForm.id ? 'Update Record' : 'Create User'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setIsAddingUser(false)} className="flex-1">Discard</Button>
                      </div>
                      
                      {userForm.id && (
                        <p className="text-[10px] text-gray-400 italic text-center">Admin Note: Changing the PIN here will immediately reset the user's login access.</p>
                      )}
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
