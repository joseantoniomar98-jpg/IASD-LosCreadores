import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Add granular scopes required for sending and reading Gmail emails, plus Google Drive
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/drive');

let isSigningIn = false;

let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem("iasd_googleAccessToken");
  } catch (e) {
    return null;
  }
})();

let googleUserProfile: { name: string; email: string; picture?: string } | null = (() => {
  try {
    const saved = localStorage.getItem("iasd_googleUserProfile");
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// Initialize auth listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          localStorage.removeItem("iasd_googleAccessToken");
        } catch (e) {}
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      googleUserProfile = null;
      try {
        localStorage.removeItem("iasd_googleAccessToken");
        localStorage.removeItem("iasd_googleUserProfile");
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in via Google popup and obtain access token
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google OAuth.');
    }
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem("iasd_googleAccessToken", cachedAccessToken);
    } catch (e) {
      console.error("Error saving Google access token", e);
    }
    
    // Fetch google profile details
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${cachedAccessToken}` }
      });
      if (profileRes.ok) {
        googleUserProfile = await profileRes.json();
        try {
          localStorage.setItem("iasd_googleUserProfile", JSON.stringify(googleUserProfile));
        } catch (e) {
          console.error("Error saving Google user profile", e);
        }
      }
    } catch (e) {
      console.error('Error fetching Google User Info:', e);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error en login de Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve cached token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Retrieve cached Google Profile info
export const getGoogleUserProfile = () => {
  return googleUserProfile;
};

// Disconnect/Logout from Google Session
export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  googleUserProfile = null;
  try {
    localStorage.removeItem("iasd_googleAccessToken");
    localStorage.removeItem("iasd_googleUserProfile");
  } catch (e) {}
};

// --- GMAIL API FUNCTIONS ---

/**
 * Encodes subject and body in RFC 2822 / MIME base64url format for Gmail
 */
const makeMime = (to: string, subject: string, body: string) => {
  const utf8Subject = `=?utf-8?B?${btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }))}?=`;
  
  const mimeParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body
  ];
  
  const str = mimeParts.join('\r\n');
  const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Sends a real email using Gmail API with the connected account
 */
export const sendGmailEmail = async (to: string, subject: string, htmlBody: string): Promise<boolean> => {
  const token = getAccessToken();
  if (!token) {
    console.warn('Conexión con Gmail ausente: se requiere autenticación de Google.');
    return false;
  }

  try {
    const rawMessage = makeMime(to, subject, htmlBody);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: rawMessage })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gmail Send Error (${res.status}): ${errorText}`);
    }

    console.log(`Email enviado con éxito por Gmail a ${to}`);
    return true;
  } catch (error) {
    console.error('Error enviando con la API de Gmail:', error);
    return false;
  }
};

/**
 * Retrieves the last 10 messages from the authenticated user's Gmail index
 */
export interface GmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export const fetchRecentEmails = async (): Promise<GmailMessage[]> => {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.messages) return [];

    const detailedMessages: GmailMessage[] = await Promise.all(
      data.messages.map(async (msg: { id: string }) => {
        try {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!detailRes.ok) return null;
          const detailData = await detailRes.json();
          
          const subjectHeader = detailData.payload.headers.find((h: any) => h.name.toLowerCase() === 'subject');
          const fromHeader = detailData.payload.headers.find((h: any) => h.name.toLowerCase() === 'from');
          const dateHeader = detailData.payload.headers.find((h: any) => h.name.toLowerCase() === 'date');

          return {
            id: msg.id,
            snippet: detailData.snippet || '',
            subject: subjectHeader ? subjectHeader.value : '(Sin Asunto)',
            from: fromHeader ? fromHeader.value : 'Desconocido',
            date: dateHeader ? dateHeader.value : ''
          };
        } catch (e) {
          return null;
        }
      })
    ).then(arr => arr.filter((m): m is GmailMessage => m !== null));

    return detailedMessages;
  } catch (error) {
    console.error('Error fetching recent Gmail emails:', error);
    return [];
  }
};

// --- GOOGLE DRIVE API FUNCTIONS ---

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  mimeType: string;
}

/**
 * Checks if a specific folder ID exists in Google Drive
 */
export const checkDriveFolderExists = async (folderId: string): Promise<{ exists: boolean; name?: string; error?: string }> => {
  const token = getAccessToken();
  if (!token) return { exists: false, error: 'Auth token missing' };

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { exists: false, error: 'No se encontró la carpeta con ese ID' };
      }
      const errTxt = await res.text();
      return { exists: false, error: `Error ${res.status}: ${errTxt}` };
    }

    const data = await res.json();
    if (data.mimeType !== 'application/vnd.google-apps.folder') {
      return { exists: false, name: data.name, error: 'El ID especificado no es una carpeta' };
    }

    return { exists: true, name: data.name };
  } catch (err: any) {
    return { exists: false, error: err.message || 'Error de red' };
  }
};

/**
 * Creates a new folder in Google Drive
 */
export const createDriveFolder = async (folderName: string, parentId?: string): Promise<{ id: string; name: string } | null> => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const body: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      body.parents = [parentId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Error al crear carpeta: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error creating Drive folder:', error);
    return null;
  }
};

/**
 * Uploads a file to Google Drive (Multipart: metadata + file content)
 */
export const uploadFileToDrive = async (
  fileName: string,
  mimeType: string,
  fileBlob: Blob,
  folderId: string
): Promise<{ id: string; name: string } | null> => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive Upload Error (${res.status}): ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    return null;
  }
};

/**
 * Fetches files belonging to the configured folder ID
 */
export const fetchDriveFiles = async (folderId: string): Promise<DriveFile[]> => {
  const token = getAccessToken();
  if (!token) return [];

  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime,mimeType)&orderBy=createdTime+desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching files from Google Drive folder:', error);
    return [];
  }
};
