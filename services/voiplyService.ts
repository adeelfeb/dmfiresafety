
import { VoiplyMessage, Customer, VoiplySettings } from '../types';

/**
 * Voiply Integration Service
 * Handles fetching SMS and Voicemail data from Voiply endpoints.
 */

// Mock data for initial implementation
const MOCK_MESSAGES: VoiplyMessage[] = [
  {
    id: 'm1',
    from: '(555) 010-2020',
    to: 'Office',
    body: 'Hi, this is Alice from TechGlobal. We need two 5lb ABC units recharged at the main lobby.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'sms',
    read: false
  },
  {
    id: 'm2',
    from: '(555) 030-4040',
    to: 'Office',
    body: 'Voicemail from Cafe Delight regarding monthly inspection schedule.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'voicemail',
    read: true,
    duration: 45,
    transcription: 'Hello D&M, this is Bob. Just calling to confirm we are still good for Tuesday morning at 8am. Thanks!'
  }
];

// Updated to accept settings argument to fix build error in App.tsx
export const fetchVoiplyMessages = async (settings?: VoiplySettings): Promise<VoiplyMessage[]> => {
  // In a real scenario, this would call:
  // const response = await fetch('https://api.voiply.com/v1/messages', { 
  //   headers: { 'Authorization': `Bearer ${settings?.apiKey}` }
  // });
  // return response.json();
  
  // For now, simulate network delay and return mock data
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_MESSAGES), 800);
  });
};

/**
 * Normalizes phone numbers for matching (strips non-digits)
 */
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

/**
 * Links messages to customers by matching phone numbers
 */
export const linkMessagesToCustomers = (messages: VoiplyMessage[], customers: Customer[]) => {
  return messages.map(msg => {
    const fromNormalized = normalizePhone(msg.from);
    const customer = customers.find(c => {
      if (!c.phone) return false;
      return normalizePhone(c.phone) === fromNormalized;
    });
    return { ...msg, customer };
  });
};