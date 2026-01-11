
import React, { useState } from 'react';
import { QuickLink, ViewState } from '../types';
import { Button } from './Button';
import { ExternalLink, Plus, Trash2, LayoutGrid, FileBarChart, Calendar, Briefcase, Users, ClipboardList, Shield, Zap } from 'lucide-react';

interface QuickLinksManagerProps {
  quickLinks: QuickLink[];
  onAdd: (link: QuickLink) => void;
  onDelete: (id: string) => void;
  onNavigate: (view: ViewState) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Reports', icon: FileBarChart },
  { name: 'Calendar', icon: Calendar },
  { name: 'Schedule', icon: Briefcase },
  { name: 'Customers', icon: Users },
  { name: 'Sheets', icon: ClipboardList },
  { name: 'Codes', icon: Shield },
  { name: 'Quick', icon: Zap },
];

const TARGET_VIEWS: { value: ViewState; label: string }[] = [
  { value: 'reports', label: 'Reports' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'service-tracker', label: 'Service Tracker' },
  { value: 'customer-manager', label: 'Customer Manager' },
  { value: 'run-sheets', label: 'Run Sheets' },
  { value: 'nfpa-finder', label: 'NFPA Code Finder' },
];

export const QuickLinksManager: React.FC<QuickLinksManagerProps> = ({ quickLinks, onAdd, onDelete, onNavigate }) => {
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkTarget, setNewLinkTarget] = useState<ViewState>('reports');
  const [newLinkIcon, setNewLinkIcon] = useState('Reports');

  const handleAdd = () => {
    if (!newLinkLabel.trim()) return;
    const newLink: QuickLink = {
      id: Date.now().toString(),
      label: newLinkLabel,
      targetView: newLinkTarget,
      iconName: newLinkIcon,
    };
    onAdd(newLink);
    setNewLinkLabel('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Links</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize your navigation shortcuts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-safety-600" />
            Create New Shortcut
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Shortcut Label</label>
              <input 
                type="text" 
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="e.g. Monthly Reports"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Target View</label>
              <select 
                value={newLinkTarget}
                onChange={e => setNewLinkTarget(e.target.value as ViewState)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-safety-500 outline-none dark:bg-gray-700 dark:text-white text-sm"
              >
                {TARGET_VIEWS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pick Icon</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ICONS.map(i => (
                  <button
                    key={i.name}
                    onClick={() => setNewLinkIcon(i.name)}
                    className={`p-2 rounded-lg border transition-all ${newLinkIcon === i.name ? 'bg-safety-600 border-safety-600 text-white' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600'}`}
                  >
                    <i.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full justify-center mt-2" disabled={!newLinkLabel.trim()}>
              Add Shortcut
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
            Your Shortcuts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map(link => {
              const IconComp = AVAILABLE_ICONS.find(i => i.name === link.iconName)?.icon || ExternalLink;
              return (
                <div key={link.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                  <button 
                    onClick={() => onNavigate(link.targetView)}
                    className="flex items-center gap-3 text-left hover:text-safety-600 transition-colors flex-1"
                  >
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-safety-50 group-hover:text-safety-600">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{link.label}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{link.targetView.replace('-', ' ')}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => onDelete(link.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {quickLinks.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-400 italic">No shortcuts created yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
