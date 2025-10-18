/// <reference lib="webworker" />

import { getPendingSubmissions, deleteSubmissionFromSyncQueue, SubmissionPayload } from './services/db';
import { uploadFile } from './services/supabase';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'ficha-ministerial-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/constants.ts',
  '/types.ts',
  '/services/db.ts',
  '/services/fileGenerators.ts',
  '/services/supabase.ts',
  // URLs de CDNs
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/jspdf@^3.0.3',
  'https://aistudiocdn.com/xlsx@^0.18.5',
  'https://aistudiocdn.com/jspdf-autotable@^5.0.2',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  'https://cdn.jsdelivr.net/npm/idb@7/+esm'
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(APP_SHELL_URLS).catch(error => {
        console.error('Failed to cache one or more resources:', error);
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      // Not in cache, go to network
      return fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


const syncSubmissions = async () => {
    const pendingSubmissions = await getPendingSubmissions();
    console.log(`Sincronizando ${pendingSubmissions.length} envíos pendientes.`);

    for (const submission of pendingSubmissions) {
        try {
            const { formData, pdfBlob, excelBlob, filenameBase, id } = submission;
            if (!id) continue;

            const pdfFile = new File([pdfBlob], `${filenameBase}.pdf`, { type: 'application/pdf' });
            // FIX: Corrected typo from filenamebase to filenameBase
            const excelFile = new File([excelBlob], `${filenameBase}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const uploads = [
                uploadFile(pdfFile, `documents/${pdfFile.name}`),
                uploadFile(excelFile, `documents/${excelFile.name}`)
            ];

            if (formData.minister.photo) uploads.push(uploadFile(formData.minister.photo, `photos/minister_${filenameBase}.jpg`));
            if (formData.wife.photo) uploads.push(uploadFile(formData.wife.photo, `photos/wife_${filenameBase}.jpg`));

            const results = await Promise.all(uploads);
            const firstError = results.find(r => r.error);

            if (firstError) {
                throw firstError.error;
            } else {
                console.log(`Envío ${id} subido con éxito.`);
                await deleteSubmissionFromSyncQueue(id);
            }
        } catch (error) {
            console.error(`Fallo al sincronizar el envío ${submission.id}:`, error);
            // El envío permanecerá en la cola para el próximo intento
        }
    }
};


self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-submissions') {
        console.log('Service Worker: evento sync recibido para sync-submissions');
        event.waitUntil(syncSubmissions());
    }
});