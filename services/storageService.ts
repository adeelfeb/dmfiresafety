
import { Customer, Extinguisher, InspectionRecord, User, Todo, RegisteredUser, DropboxSettings, SupabaseSettings, AuditEntry, VoiplySettings, DeviceMagicSettings } from '../types';
// @ts-ignore
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'fire_safety_app_data_v1';
const USER_KEY = 'fire_safety_user_session';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export interface AppData {
  customers: Customer[];
  extinguishers: Extinguisher[];
  records: InspectionRecord[];
  auditLogs?: AuditEntry[];
  todos: Todo[];
  technicians?: string[];
  registeredUsers?: RegisteredUser[];
  customChecklistItems?: string[]; 
  customBatteryTypes?: string[]; 
  assetTypes?: string[];
  extinguisherBrands?: string[];
  systemBrands?: string[];
  systemAgents?: string[];
  archivedCustomers?: Customer[];
  archivedExtinguishers?: Extinguisher[];
  disabledBulkFields?: string[];
  dropboxSettings?: DropboxSettings;
  supabaseSettings?: SupabaseSettings;
  voiplySettings?: VoiplySettings;
  deviceMagicSettings?: DeviceMagicSettings;
  lastUpdated: string;
}

const getMockData = (): AppData => {
  const customers: Customer[] = [
    {
      id: 'c1',
      name: 'The Daily Grind Cafe',
      address: '124 Main St, Burlington, VT 05401',
      addressStreetNumber: '124',
      addressStreet: 'Main St',
      addressCity: 'Burlington',
      addressState: 'VT',
      addressZip: '05401',
      phone: '(802) 555-0101',
      contactPerson: 'Sarah Jenkins',
      serviceMonths: [3, 9],
      systemMonths: [6, 12],
      extinguisherTech: 'Tobey',
      systemTech: 'Michael',
      notes: 'Best entry through rear kitchen door. Door code 1234.',
      doorCode: '1234',
      completedServices: []
    },
    {
      id: 'c2',
      name: 'Northside Manufacturing',
      address: '500 Industrial Pkwy, Rutland, VT 05701',
      addressStreetNumber: '500',
      addressStreet: 'Industrial Pkwy',
      addressCity: 'Rutland',
      addressState: 'VT',
      addressZip: '05701',
      phone: '(802) 555-0202',
      contactPerson: 'Mike Ross',
      serviceMonths: [5, 11],
      systemMonths: [],
      extinguisherTech: 'Travis',
      notes: 'Large facility. Check in at security desk A.',
      completedServices: []
    },
    {
      id: 'c3',
      name: 'Green Mountain High School',
      address: '100 School St, Montpelier, VT 05602',
      addressStreetNumber: '100',
      addressStreet: 'School St',
      addressCity: 'Montpelier',
      addressState: 'VT',
      addressZip: '05602',
      phone: '(802) 555-0303',
      contactPerson: 'Principal Miller',
      serviceMonths: [8],
      systemMonths: [8],
      extinguisherTech: 'Michael',
      systemTech: 'Michael',
      notes: 'Service during summer break only.',
      lockBox: 'Side Entrance B',
      completedServices: []
    },
    {
      id: 'c4',
      name: 'Lakeside Resort & Spa',
      address: '45 Shoreline Dr, Colchester, VT 05446',
      addressStreetNumber: '45',
      addressStreet: 'Shoreline Dr',
      addressCity: 'Colchester',
      addressState: 'VT',
      addressZip: '05446',
      phone: '(802) 555-0404',
      contactPerson: 'Elena Rodriguez',
      serviceMonths: [4, 10],
      systemMonths: [4, 10],
      extinguisherTech: 'Tobey',
      systemTech: 'Tobey',
      notes: 'High volume of exit lights in west wing.',
      completedServices: []
    }
  ];

  const extinguishers: Extinguisher[] = [
    // Daily Grind
    { id: 'e1', customerId: 'c1', unitNumber: '1', location: 'Front Counter', type: 'ABC', brand: 'Amerex', size: '5lb', status: 'Operational', lastServiceDate: '2023', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e2', customerId: 'c1', unitNumber: '2', location: 'Kitchen - Grill', type: 'Wet Chemical', brand: 'Ansul (New)', size: '6 Liter', status: 'Operational', lastServiceDate: '2022', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e3', customerId: 'c1', unitNumber: 'L1', location: 'Back Exit', type: 'Exit Light', status: 'Operational', lastInspectionDate: null, nextInspectionDue: new Date().toISOString(), batteryType: 'Lead Acid' },
    
    // Northside Manufacturing
    { id: 'e4', customerId: 'c2', unitNumber: '1', location: 'Warehouse Row A', type: 'ABC', brand: 'Badger', size: '10lb', status: 'Operational', lastServiceDate: '2021', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e5', customerId: 'c2', unitNumber: '2', location: 'Warehouse Row B', type: 'ABC', brand: 'Badger', size: '10lb', status: 'Needs Attention', lastServiceDate: '2019', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e6', customerId: 'c2', unitNumber: '3', location: 'Office Lobby', type: 'ABC', brand: 'Amerex', size: '5lb', status: 'Operational', lastServiceDate: '2023', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    
    // Green Mountain High
    { id: 'e7', customerId: 'c3', unitNumber: '1', location: 'Science Lab 101', type: 'CO2', brand: 'Buckeye', size: '10lb', status: 'Operational', lastServiceDate: '2020', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e8', customerId: 'c3', unitNumber: '2', location: 'Main Office', type: 'ABC', brand: 'Amerex', size: '5lb', status: 'Critical', lastServiceDate: '2018', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e9', customerId: 'c3', unitNumber: 'L1', location: 'Gym Exit East', type: 'Emergency Light', status: 'Operational', lastInspectionDate: null, nextInspectionDue: new Date().toISOString(), batteryType: 'NiCad', batteryReplacementDue: true },
    
    // Lakeside
    { id: 'e10', customerId: 'c4', unitNumber: '1', location: 'Spa Reception', type: 'Clean Agent', brand: 'Amerex', size: '11lb', status: 'Operational', lastServiceDate: '2022', lastInspectionDate: null, nextInspectionDue: new Date().toISOString() },
    { id: 'e11', customerId: 'c4', unitNumber: 'L1', location: 'Pool Deck Exit', type: 'Exit Light', status: 'Operational', lastInspectionDate: null, nextInspectionDue: new Date().toISOString(), batteryType: 'Lead Acid' }
  ];

  return {
    customers,
    extinguishers,
    records: [],
    auditLogs: [],
    todos: [
      { id: 't1', text: 'Schedule Northside warehouse walkthrough', completed: false, createdAt: new Date().toISOString(), customerId: 'c2' },
      { id: 't2', text: 'Order 6L Wet Chem refills', completed: false, createdAt: new Date().toISOString() }
    ],
    technicians: ['Tobey', 'Travis', 'Michael'],
    registeredUsers: [
      { id: 'u1', firstName: 'Tobey', lastName: 'Admin', email: 'tobey@dmfire.com', pin: '6876', role: 'admin', technicianId: 'TECH-001' },
      { id: 'u2', firstName: 'Travis', lastName: 'Tech', email: 'travis@dmfire.com', pin: '1111', role: 'tech', technicianId: 'TECH-002' },
      { id: 'u3', firstName: 'Michael', lastName: 'Tech', email: 'michael@dmfire.com', pin: '2222', role: 'tech', technicianId: 'TECH-003' }
    ],
    customChecklistItems: ['Check wall mount stability', 'Verify clear accessibility path'],
    customBatteryTypes: ['Lead Acid', 'NiCad', 'Lithium'],
    assetTypes: ['ABC', 'CO2', 'Water', 'Foam', 'Wet Chemical', 'Clean Agent', 'Water Mist', 'Exit Light', 'Emergency Light'],
    extinguisherBrands: ['Amerex', 'Ansul (Old)', 'Ansul (New)', 'Badger', 'Buckeye', 'Pyro Chem', 'Kidde'],
    systemBrands: ['Amerex', 'Ansul', 'Buckeye', 'Kidde', 'Pyro Chem', 'Range Guard'],
    systemAgents: ['Wet Chemical', 'Dry Chemical'],
    archivedCustomers: [],
    archivedExtinguishers: [],
    disabledBulkFields: [],
    dropboxSettings: { accessToken: '', frequency: 'manual', format: 'json', lastBackup: null },
    supabaseSettings: { url: '', apiKey: '', tablePrefix: 'dm_fire_', frequency: 'manual', lastSync: null },
    voiplySettings: { apiKey: '', enabled: true },
    deviceMagicSettings: { apiKey: '', orgId: '', defaultFormId: '', enabled: true },
    lastUpdated: new Date().toISOString()
  };
};

// Data persistence
export const loadState = (): AppData | null => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      // Seed with mock data if storage is empty
      const mock = getMockData();
      saveState(mock);
      return mock;
    }
    const parsed = JSON.parse(serializedState);
    
    // Ensure nested structures exist for backward compatibility
    if (!parsed.todos) parsed.todos = [];
    if (!parsed.technicians) parsed.technicians = ['Tobey', 'Travis', 'Michael'];
    if (!parsed.auditLogs) parsed.auditLogs = [];

    if (!parsed.registeredUsers || parsed.registeredUsers.length === 0) {
        parsed.registeredUsers = [
            { id: 'u1', firstName: 'Tobey', lastName: 'Admin', email: '', pin: '6876', role: 'admin', technicianId: 'TECH-001' }
        ];
    }

    if (!parsed.customChecklistItems) parsed.customChecklistItems = [];
    if (!parsed.customBatteryTypes) parsed.customBatteryTypes = [];
    
    if (!parsed.assetTypes) parsed.assetTypes = ['ABC', 'CO2', 'Water', 'Foam', 'Wet Chemical', 'Clean Agent', 'Water Mist', 'Exit Light', 'Emergency Light'];
    if (!parsed.extinguisherBrands) parsed.extinguisherBrands = ['Amerex', 'Ansul (Old)', 'Ansul (New)', 'Badger', 'Buckeye', 'Pyro Chem', 'Kidde'];
    if (!parsed.systemBrands) parsed.systemBrands = ['Amerex', 'Ansul', 'Buckeye', 'Kidde', 'Pyro Chem', 'Range Guard'];
    if (!parsed.systemAgents) parsed.systemAgents = ['Wet Chemical', 'Dry Chemical'];

    if (!parsed.archivedCustomers) parsed.archivedCustomers = [];
    if (!parsed.archivedExtinguishers) parsed.archivedExtinguishers = [];
    if (!parsed.disabledBulkFields) parsed.disabledBulkFields = [];

    if (!parsed.dropboxSettings) {
        parsed.dropboxSettings = { accessToken: '', frequency: 'manual', format: 'json', lastBackup: null };
    }
    if (!parsed.supabaseSettings) {
        parsed.supabaseSettings = { url: '', apiKey: '', tablePrefix: 'dm_fire_', frequency: 'manual', lastSync: null };
    }
    if (!parsed.voiplySettings) {
        parsed.voiplySettings = { apiKey: '', enabled: true };
    }
    if (!parsed.deviceMagicSettings) {
        parsed.deviceMagicSettings = { apiKey: '', orgId: '', defaultFormId: '', enabled: false };
    }

    return parsed;
  } catch (err) {
    console.error("Could not load state", err);
    return null;
  }
};

export const saveState = (data: Omit<AppData, 'lastUpdated'>) => {
  try {
    const stateToSave: AppData = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state", err);
  }
};

// User Session Persistence
export const loadUser = (): User | null => {
  try {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    if (parsed.user && parsed.expiry) {
        if (Date.now() > parsed.expiry) {
            localStorage.removeItem(USER_KEY);
            return null;
        }
        saveUser(parsed.user); 
        return parsed.user;
    }

    if (parsed.name) {
        saveUser(parsed);
        return parsed;
    }

    return null;
  } catch (err) {
    return null;
  }
};

export const saveUser = (user: User) => {
  const session = {
      user,
      expiry: Date.now() + SESSION_DURATION
  };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
};

// --- Smart Merge Logic ---
export const mergeDatasets = (current: AppData, incoming: Partial<AppData>): AppData => {
  const merge = <T extends { id: string }>(currentList: T[], incomingList?: T[]) => {
    if (!incomingList) return currentList;
    const map = new Map<string, T>();
    currentList.forEach(item => map.set(item.id, item));
    incomingList.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  };

  const mergeSimple = (current: string[] = [], incoming: string[] = []) => {
    return Array.from(new Set([...current, ...incoming]));
  };

  return {
    customers: merge(current.customers, incoming.customers),
    extinguishers: merge(current.extinguishers, incoming.extinguishers),
    records: merge(current.records, incoming.records),
    auditLogs: merge(current.auditLogs || [], incoming.auditLogs),
    todos: merge(current.todos, incoming.todos),
    technicians: mergeSimple(current.technicians, incoming.technicians),
    registeredUsers: merge(current.registeredUsers || [], incoming.registeredUsers),
    customChecklistItems: mergeSimple(current.customChecklistItems, incoming.customChecklistItems),
    customBatteryTypes: mergeSimple(current.customBatteryTypes, incoming.customBatteryTypes),
    assetTypes: mergeSimple(current.assetTypes, incoming.assetTypes),
    extinguisherBrands: mergeSimple(current.extinguisherBrands, incoming.extinguisherBrands),
    systemBrands: mergeSimple(current.systemBrands, incoming.systemBrands),
    systemAgents: mergeSimple(current.systemAgents, incoming.systemAgents),
    archivedCustomers: merge(current.archivedCustomers || [], incoming.archivedCustomers),
    archivedExtinguishers: merge(current.archivedExtinguishers || [], incoming.archivedExtinguishers),
    disabledBulkFields: mergeSimple(current.disabledBulkFields, incoming.disabledBulkFields),
    dropboxSettings: current.dropboxSettings, 
    supabaseSettings: current.supabaseSettings,
    voiplySettings: incoming.voiplySettings || current.voiplySettings,
    deviceMagicSettings: incoming.deviceMagicSettings || current.deviceMagicSettings,
    lastUpdated: new Date().toISOString()
  };
};

export const exportData = (data: AppData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fire_safety_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importData = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

const parseMonths = (str: any): number[] => {
    if (typeof str === 'number') return [str];
    if (!str) return [];
    return str.toString().split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
};

export const importFromExcel = async (file: File): Promise<Partial<AppData>> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const result: Partial<AppData> = {};

                const custSheet = workbook.Sheets['Customers'];
                if (custSheet) {
                    const rawCusts = XLSX.utils.sheet_to_json(custSheet);
                    result.customers = rawCusts.map((row: any) => {
                        const streetNum = row.Street_Number?.toString() || '';
                        const streetName = row.Street_Name || '';
                        const city = row.City || '';
                        const state = row.State || '';
                        const zip = row.Zip_Code?.toString() || '';
                        
                        let fullAddress = row.Address || '';
                        if (streetName || city) {
                             const streetPart = [streetNum, streetName].filter(Boolean).join(' ');
                             const parts = [streetPart, city, state].filter(Boolean);
                             fullAddress = parts.join(', ');
                             if (zip) fullAddress += ` ${zip}`;
                        }

                        return {
                            id: row.ID?.toString() || `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: row.Name || 'Unknown',
                            address: fullAddress,
                            addressStreetNumber: streetNum,
                            addressStreet: streetName,
                            addressCity: city,
                            addressState: state,
                            addressZip: zip,
                            contactPerson: row.Contact || '',
                            phone: row.Phone?.toString() || '',
                            email: row.Email || '',
                            extinguisherTech: row.Ext_Tech || '',
                            systemTech: row.Sys_Tech || '',
                            serviceMonths: parseMonths(row.Service_Months),
                            systemMonths: parseMonths(row.System_Months),
                            notes: row.Notes || ''
                        };
                    });
                }

                const extSheet = workbook.Sheets['Extinguishers'];
                if (extSheet) {
                    const rawExts = XLSX.utils.sheet_to_json(extSheet);
                    result.extinguishers = rawExts.map((row: any) => {
                        let custId = row.Customer_ID?.toString();
                        if (!custId && result.customers) {
                            const found = result.customers.find(c => c.name === row.Customer);
                            if (found) custId = found.id;
                        }

                        return {
                            id: row.ID?.toString() || `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            customerId: custId || '', 
                            unitNumber: row.Unit_No?.toString() || '',
                            location: row.Location || '',
                            type: row.Type || 'ABC',
                            size: row.Size || '',
                            brand: row.Brand || '',
                            status: row.Status || 'Pending Inspection',
                            lastServiceDate: row.Last_Service?.toString() || '',
                            nextInspectionDue: row.Next_Due || '',
                            lastInspectionDate: row.Last_Inspection || null,
                            batteryType: row.Battery_Type || '',
                            batteryReplacementDue: row.Battery_Due === 'Yes'
                        };
                    });
                }

                const recSheet = workbook.Sheets['Inspections'];
                if (recSheet) {
                    const rawRecs = XLSX.utils.sheet_to_json(recSheet);
                    result.records = rawRecs.map((row: any) => ({
                        id: row.ID?.toString() || `r_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        extinguisherId: row.Extinguisher_ID?.toString() || '',
                        date: row.Date_ISO || new Date().toISOString(), 
                        inspectorName: row.Inspector || 'Unknown',
                        severityRating: row.Severity || 'Low',
                        notes: row.Notes || '',
                        aiAnalysis: row.AI_Analysis || '',
                        checks: row.Checks_JSON ? JSON.parse(row.Checks_JSON) : {} 
                    }));
                }

                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const generateExcelBlob = (data: AppData): Blob => {
    const wb = XLSX.utils.book_new();

    const customerRows = data.customers.map(c => ({
        ID: c.id,
        Name: c.name,
        Street_Number: c.addressStreetNumber || '',
        Street_Name: c.addressStreet || '',
        City: c.addressCity || '',
        State: c.addressState || '',
        Zip_Code: c.addressZip || '',
        Address: c.address, 
        Contact: c.contactPerson,
        Phone: c.phone,
        Email: c.email,
        Ext_Tech: c.extinguisherTech || c.assignedTechnician,
        Sys_Tech: c.systemTech,
        Service_Months: c.serviceMonths?.join(', '),
        System_Months: c.systemMonths?.join(', '),
        Notes: c.notes
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

    const extRows = data.extinguishers.map(e => {
        const cust = data.customers.find(c => c.id === e.customerId);
        return {
            ID: e.id,
            Customer_ID: e.customerId, 
            Customer: cust?.name || 'Unknown',
            Unit_No: e.unitNumber,
            Location: e.location,
            Type: e.type,
            Size: e.size,
            Brand: e.brand,
            Status: e.status,
            Last_Service: e.lastServiceDate,
            Next_Due: e.nextInspectionDue,
            Last_Inspection: e.lastInspectionDate,
            Battery_Type: e.batteryType || '',
            Battery_Due: e.batteryReplacementDue ? 'Yes' : 'No'
        };
    });
    const wsExt = XLSX.utils.json_to_sheet(extRows);
    XLSX.utils.book_append_sheet(wb, wsExt, "Extinguishers");

    const recRows = data.records.map(r => {
        const ext = data.extinguishers.find(e => e.id === r.extinguisherId);
        const cust = data.customers.find(c => c.id === ext?.customerId);
        return {
            ID: r.id, 
            Extinguisher_ID: r.extinguisherId, 
            Date_ISO: r.date, 
            Date: new Date(r.date).toLocaleDateString(),
            Time: new Date(r.date).toLocaleTimeString(),
            Inspector: r.inspectorName,
            Customer: cust?.name,
            Unit_Loc: ext?.location,
            Unit_Type: ext?.type,
            Severity: r.severityRating,
            Notes: r.notes,
            AI_Analysis: r.aiAnalysis,
            Passed: Object.values(r.checks).every(v => v === true) ? 'Yes' : 'No',
            Checks_JSON: JSON.stringify(r.checks) 
        };
    });
    const wsRec = XLSX.utils.json_to_sheet(recRows);
    XLSX.utils.book_append_sheet(wb, wsRec, "Inspections");

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const exportToExcel = (data: AppData) => {
    const blob = generateExcelBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fire_Safety_Data_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
