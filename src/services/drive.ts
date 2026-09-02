import { getAccessToken } from './auth';
import { DriveProjectFile, SavedProjectData } from '../types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'AB YAPI Projeleri';

/**
 * Ensures authorized headers with access token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive erişimi için lütfen önce Google hesabınızla giriş yapın.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Searches for or creates the dedicated 'AB YAPI Projeleri' folder in Google Drive
 */
export async function getOrCreateAppFolder(): Promise<string> {
  const headers = await getAuthHeaders();

  // Search existing folder
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
  const res = await fetch(`${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Google Drive klasörü sorgulanamadı: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'AB YAPI İnşaat Hesaplayıcı tarafından kaydedilen proje ve teklif dosyaları',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Google Drive klasörü oluşturulamadı: ${createRes.statusText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * Lists AB YAPI related project files and reports in Google Drive
 */
export async function listDriveProjects(): Promise<DriveProjectFile[]> {
  const headers = await getAuthHeaders();

  // Fetch files in the folder or matching AB YAPI naming
  const query = encodeURIComponent(
    `trashed=false and (name contains 'AB_YAPI' or name contains 'AB YAPI')`
  );

  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,description)&orderBy=modifiedTime desc&pageSize=50`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Google Drive dosyaları listelenemedi: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Saves a full project calculation state as JSON in Google Drive
 */
export async function saveProjectJsonToDrive(
  projectData: SavedProjectData,
  customName?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const headers = await getAuthHeaders();
  const folderId = await getOrCreateAppFolder();

  const safeAddress = projectData.projectAddress
    ? projectData.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').substring(0, 30)
    : 'Proje';
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = customName || `AB_YAPI_${safeAddress}_${timestamp}.json`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    description: `AB YAPI Projesi - ${projectData.projectAddress} - Toplam: ${projectData.results.grandTotal.toLocaleString('tr-TR')} TL`,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(projectData, null, 2);

  // Use multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Projeyi Google Drive'a kaydetme başarısız oldu: ${errText}`);
  }

  return await res.json();
}

/**
 * Saves an HTML/Document report (Offer, Contract, Spec, Managerial Report) to Google Drive
 */
export async function saveReportDocumentToDrive(
  reportName: string,
  htmlContent: string,
  description: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const headers = await getAuthHeaders();
  const folderId = await getOrCreateAppFolder();

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: reportName,
    parents: [folderId],
    description,
    mimeType: 'text/html',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
    htmlContent +
    closeDelimiter;

  const res = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Raporu Google Drive'a kaydetme başarısız oldu: ${errText}`);
  }

  return await res.json();
}

/**
 * Loads project JSON file content from Google Drive
 */
export async function loadProjectFromDrive(fileId: string): Promise<SavedProjectData> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Google Drive dosyası indirilemedi: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Deletes a file from Google Drive (Must be preceded by user confirmation dialog)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Google Drive dosyası silinemedi: ${res.statusText}`);
  }
}
