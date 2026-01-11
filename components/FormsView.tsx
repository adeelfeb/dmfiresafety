
import React, { useState, useEffect } from 'react';
import { DeviceMagicSettings, Customer, DeviceMagicForm } from '../types';
import { fetchDeviceMagicForms } from '../services/deviceMagicService';
import { Button } from './Button';
import { Smartphone, ExternalLink, Settings, ShieldCheck, ClipboardList, Building2, RefreshCw, Loader2, FileText, ChevronRight, Search } from 'lucide-react';

interface FormsViewProps {
  settings?: DeviceMagicSettings;
  customers: Customer[];
  onNavigateToSettings: () => void;
}

export const FormsView: React.FC<FormsViewProps> = ({ settings, customers, onNavigateToSettings }) => {
  const [forms, setForms] = useState<DeviceMagicForm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isEnabled = settings?.enabled && settings.apiKey;

  const loadForms = async () => {
    if (!settings) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDeviceMagicForms(settings);
      setForms(data);
    } catch (err) {
      setError('Could not retrieve forms from Device Magic. Check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      loadForms();
    }
  }, [isEnabled]);

  const launchGeneral = () => {
    window.location.href = 'devicemagic://';
  };

  const launchSpecific = (formId: string | number) => {
    window.location.href = `devicemagic://submit?form_id=${formId}`;
  };

  const filteredForms = forms.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <Smartphone className="w-7 h-7 text-green-600" />
            System Forms
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Launch external safety forms and site audits</p>
        </div>
        {isEnabled && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={loadForms} 
            disabled={isLoading}
            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Library
          </Button>
        )}
      </div>

      {!isEnabled ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Integration Not Configured</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2 mb-6">
            Link your Device Magic API key in cloud settings to browse and launch your digital forms library.
          </p>
          <Button variant="primary" onClick={onNavigateToSettings} icon={<Settings className="w-4 h-4" />}>
            Open Cloud Settings
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 bg-green-50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-2">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                      <h3 className="font-black text-green-900 dark:text-green-300 uppercase tracking-tighter">Primary Dispatch</h3>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Standard entry for your main inspection workflow.</p>
              </div>
              <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Default Form ID</p>
                          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 font-bold">{settings.defaultFormId || 'Not set'}</p>
                      </div>
                      <Smartphone className="w-8 h-8 text-gray-100 dark:text-gray-700" />
                  </div>

                  <div className="space-y-3">
                      <Button 
                          onClick={() => settings.defaultFormId && launchSpecific(settings.defaultFormId)} 
                          disabled={!settings.defaultFormId}
                          className="w-full justify-center !bg-green-600 hover:!bg-green-700 shadow-lg shadow-green-100 dark:shadow-none py-4"
                          icon={<ExternalLink className="w-4 h-4" />}
                      >
                          Launch Default
                      </Button>
                      <Button 
                          onClick={launchGeneral} 
                          variant="secondary"
                          className="w-full justify-center"
                          icon={<Smartphone className="w-4 h-4" />}
                      >
                          Open Mobile App
                      </Button>
                  </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Field Context</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                  Did you know? Launching forms from the <span className="font-bold text-blue-600">Run Sheets</span> view will pre-fill customer metadata automatically.
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metadata injection active</span>
                </div>
            </div>
          </div>

          {/* Form Library */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        Available Cloud Forms
                    </h3>
                    <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Filter forms..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[400px] p-4">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3 py-20">
                            <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronizing Library...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                <Settings className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-red-600 font-medium text-center max-w-xs">{error}</p>
                            <Button variant="secondary" size="sm" onClick={loadForms}>Retry Connection</Button>
                        </div>
                    ) : filteredForms.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-20">
                            <FileText className="w-12 h-12 text-gray-100 mb-2" />
                            <p className="text-gray-400 text-sm italic">No forms found matching your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredForms.map((form) => (
                                <button
                                    key={form.id}
                                    onClick={() => launchSpecific(form.id)}
                                    className="text-left p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500 hover:shadow-md transition-all group flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-gray-900 dark:text-white group-hover:text-green-600 transition-colors uppercase tracking-tight">{form.name}</h4>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                                        {form.description || 'No description provided by Cloud.'}
                                    </p>
                                    <div className="pt-3 border-t border-gray-50 dark:border-gray-700 mt-auto flex items-center justify-between">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Updated: {new Date(form.updated_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-[10px] font-bold text-green-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            Launch <ExternalLink className="w-3 h-3" />
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Endpoint: api.devicemagic.com • Org: {settings?.orgId || 'Cloud'}
                    </p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
