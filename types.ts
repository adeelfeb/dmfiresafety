
export type AssetType = string;
export type ExtinguisherStatus = 'Operational' | 'Needs Attention' | 'Critical' | 'Pending Inspection';
export type UserRole = 'admin' | 'tech';

export interface User {
  name: string; // Display name (First Last)
  technicianId: string;
  role?: UserRole;
  email?: string;
}

export interface VoiplyMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: 'sms' | 'voicemail';
  read: boolean;
  duration?: number; // for voicemails
  transcription?: string;
}

export interface VoiplySettings {
  apiKey: string;
  enabled: boolean;
}

export interface DeviceMagicSettings {
  apiKey: string;
  orgId: string;
  defaultFormId: string;
  enabled: boolean;
}

export interface DeviceMagicForm {
  id: number;
  name: string;
  description?: string;
  updated_at: string;
}

export interface Conversation {
  phoneNumber: string;
  customer?: Customer;
  lastMessage: VoiplyMessage;
  unreadCount: number;
}

export interface RegisteredUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  pin: string; // Simple password/pin
  role: UserRole;
  technicianId: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'Created' | 'Updated' | 'Archived' | 'Deleted' | 'Cleared' | 'Restored';
  entityType: 'Customer' | 'Asset' | 'User' | 'System';
  entityName: string;
  details?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  customerId?: string;
  dueDate?: string; // ISO Date String (YYYY-MM-DD)
  addedBy?: string;
  ownedBy?: string; // Name of technician who took ownership
}

export interface QuickLink {
  id: string;
  label: string;
  targetView: ViewState;
  iconName: string;
  color?: string;
}

export interface ExtinguisherOutEntry {
  id: string;
  quantity: number;
  size: string;
  type: string;
  brand: string;
  year: string;
}

export interface SystemTankEntry {
  id: string;
  quantity: number;
  size: string;
  brand: string;
  type: string; 
  year: string; // Last service year
}

export interface ServiceCompletion {
  year: number;
  month: number;
  type: 'Extinguisher' | 'System';
  completedDate: string; // ISO Date
  completedBy: string;
  notesSnapshot?: string;
  extinguishersOutSnapshot?: ExtinguisherOutEntry[];
  systemTanksSnapshot?: SystemTankEntry[];
}

export interface CustomerDocument {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
  uploadDate: string;
  size: number;
}

export interface Customer {
  id: string;
  name: string;
  address: string; // Combined string for display/legacy
  addressStreetNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  coordinates?: { lat: number; lng: number };
  email?: string; 
  phone: string;
  contactPerson: string;
  serviceMonths?: number[]; // Array of months (1-12)
  systemMonths?: number[]; // Array of months (1-12), max 2
  assignedTechnician?: string; // Legacy field, mapping to extinguisherTech
  extinguisherTech?: string;
  systemTech?: string;
  notes?: string;
  doorCode?: string;
  lockBox?: string;
  completedServices?: ServiceCompletion[]; // Log of completed services
  documents?: CustomerDocument[];
  manualUnitCounts?: Record<string, number>; // User-defined counts if no run sheet data exists
  extinguishersOut?: ExtinguisherOutEntry[];
  systemTanks?: SystemTankEntry[];
  scheduledServiceDate?: { month: number; day: number }; // Persisted scheduled date for service tracker
  scheduledServiceTime?: string; // Persisted scheduled time
  scheduledBy?: string; // Technician who set the appointment
}

export interface Extinguisher {
  id: string;
  unitNumber?: string; // Sequential ID for the run sheet (e.g. "1", "2", "3")
  location: string; // Specific location within the customer site (e.g. "Kitchen")
  customerId: string; // Link to Customer entity
  type: AssetType;
  brand?: string; 
  size?: string;
  batteryType?: string;
  batteryReplacementDue?: boolean; 
  lastInspectionDate: string | null; // ISO Date string
  nextInspectionDue: string; // ISO Date string
  lastServiceDate?: string; // Year string (e.g. "2023")
  status: ExtinguisherStatus;
  imageUrl?: string;
  sortOrder?: number; // Custom ordering for run sheets
}

export interface InspectionRecord {
  id: string;
  extinguisherId: string;
  date: string;
  inspectorName: string;
  checks: Record<string, boolean | null>; // true=Pass, false=Fail, null=Pending
  notes: string;
  aiAnalysis?: string; // Analysis provided by Gemini
  severityRating?: 'Low' | 'Medium' | 'High';
  disposition?: 'Replace' | 'New';
}

export type BackupFrequency = 'manual' | 'daily' | 'weekly' | 'monthly';
export type BackupFormat = 'json' | 'excel';

export interface DropboxSettings {
  accessToken: string;
  frequency: BackupFrequency;
  format?: BackupFormat;
  lastBackup: string | null; // ISO Date string
}

export interface SupabaseSettings {
  url: string;
  apiKey: string;
  tablePrefix: string;
  frequency: BackupFrequency;
  lastSync: string | null;
}

export type ViewState = 'dashboard' | 'asset-list' | 'inspect' | 'history' | 'ai-chat' | 'nfpa-finder' | 'reports' | 'settings' | 'customer-manager' | 'run-sheets' | 'service-tracker' | 'calendar' | 'quick-links' | 'messages' | 'forms';

export const getStandardChecklist = (type: AssetType) => {
  if (type === 'Exit Light' || type === 'Emergency Light') {
    return [
      { id: 'acPower', label: 'AC Power Indicator Lamp Illuminated' },
      { id: 'batteryBackup', label: '90-Min Battery Backup Test Passed (Push Test)' },
      { id: 'bulbs', label: 'Bulbs/LEDs in Good Working Order' },
      { id: 'casing', label: 'Casing and Mounting Secure' },
      { id: 'directional', label: 'Directional Arrows Correctly Displayed' },
    ];
  }

  const items = [
    { id: 'safetyPin', label: 'Pin and Safety Seal Integrity' },
    { id: 'hoseCondition', label: 'Nozzle and Hose Condition' },
    { id: 'cylinderCondition', label: 'Visible Signs of Damage or Corrosion' },
    { id: 'labelLegible', label: 'Operating Instructions Legible' },
  ];

  if (type !== 'CO2') {
    items.unshift({ id: 'pressureGauge', label: 'Green Zone Status' });
  }

  return items;
};
