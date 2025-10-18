import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { FormData } from '../types';

const DB_NAME = 'MinisterialAppDB';
const DB_VERSION = 1;
const DRAFT_STORE_NAME = 'drafts';
const SYNC_STORE_NAME = 'sync-queue';

interface MinisterialDB extends DBSchema {
  [DRAFT_STORE_NAME]: {
    key: string;
    value: FormData;
  };
  [SYNC_STORE_NAME]: {
    key: number;
    value: SubmissionPayload;
  };
}

export interface SubmissionPayload {
    id?: number;
    formData: FormData;
    pdfBlob: Blob;
    excelBlob: Blob;
    filenameBase: string;
}

let dbPromise: Promise<IDBPDatabase<MinisterialDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MinisterialDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<MinisterialDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME);
        }
        if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
          db.createObjectStore(SYNC_STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
};

// --- Funciones para Borradores ---

export const saveDraftToDB = async (id: string, data: FormData): Promise<void> => {
  const db = await getDb();
  // Clonar para evitar problemas de almacenamiento de objetos no clonables como Files
  const dataToStore = JSON.parse(JSON.stringify(data));
  
  // Guardar vistas previas y recrear Files al cargar
  if (data.minister.photo) dataToStore.minister.photoPreview = data.minister.photoPreview;
  if (data.wife.photo) dataToStore.wife.photoPreview = data.wife.photoPreview;
  
  delete dataToStore.minister.photo;
  delete dataToStore.wife.photo;

  await db.put(DRAFT_STORE_NAME, dataToStore, id);
};

// Helper para convertir base64 a File
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}


export const loadDraftFromDB = async (id: string): Promise<FormData | undefined> => {
    const db = await getDb();
    const data = await db.get(DRAFT_STORE_NAME, id);
    if (data) {
        // Al cargar, las fotos son null, pero las vistas previas están ahí
        // El usuario tendrá que volver a seleccionarlas si quiere subirlas, pero ve la vista previa
        data.minister.photo = null;
        data.wife.photo = null;
    }
    return data;
};


// --- Funciones para Sincronización ---

export const addSubmissionToSyncQueue = async (payload: SubmissionPayload): Promise<void> => {
  const db = await getDb();
  await db.add(SYNC_STORE_NAME, payload);
};

export const getPendingSubmissions = async (): Promise<SubmissionPayload[]> => {
    const db = await getDb();
    return db.getAll(SYNC_STORE_NAME);
};

export const deleteSubmissionFromSyncQueue = async (id: number): Promise<void> => {
    const db = await getDb();
    await db.delete(SYNC_STORE_NAME, id);
};

export const hasPendingSubmissions = async (): Promise<boolean> => {
    const db = await getDb();
    const count = await db.count(SYNC_STORE_NAME);
    return count > 0;
};
