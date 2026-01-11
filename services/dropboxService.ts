
import { Dropbox } from 'dropbox';
import { AppData, generateExcelBlob } from './storageService';

export const uploadToDropbox = async (token: string, data: AppData, format: 'json' | 'excel' = 'json'): Promise<{ success: boolean; message: string }> => {
  try {
    const dbx = new Dropbox({ accessToken: token });
    
    let blob: Blob;
    let extension: string;
    
    if (format === 'excel') {
        blob = generateExcelBlob(data);
        extension = '.xlsx';
    } else {
        const jsonStr = JSON.stringify(data, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        extension = '.json';
    }

    const filename = `/fire_safety_backup_${new Date().toISOString().replace(/[:.]/g, '-')}${extension}`;

    await dbx.filesUpload({
      path: filename,
      contents: blob
    });

    return { success: true, message: `Backup saved to Dropbox: ${filename}` };
  } catch (error: any) {
    console.error("Dropbox Upload Error:", error);
    if (error.status === 401) {
        return { success: false, message: "Invalid or expired Access Token." };
    }
    return { success: false, message: error.message || "Failed to upload to Dropbox." };
  }
};

export const verifyDropboxToken = async (token: string): Promise<boolean> => {
    try {
        const dbx = new Dropbox({ accessToken: token });
        // Attempt a lightweight call, e.g., get current account info
        await dbx.usersGetCurrentAccount();
        return true;
    } catch (e) {
        console.error("Token verification failed", e);
        return false;
    }
};
