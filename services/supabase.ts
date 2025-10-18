import { createClient } from '@supabase/supabase-js';

// Pega tu URL y tu clave anónima de Supabase aquí
const SUPABASE_URL = 'https://gciwhtxjwqwblnhwlgtb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjaXdodHhqd3F3YmxuaHdsZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjY1MjIsImV4cCI6MjA3NTYwMjUyMn0.d8EI8ArxmYiiZQKsvXVT9g-VzZcyyAYXciSoDPiIbN4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface UploadResult {
    path: string | null;
    error: Error | null;
}

export const uploadFile = async (file: File | Blob, path: string): Promise<UploadResult> => {
    const { data, error } = await supabase.storage
        .from('fichas-ministeriales')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        console.error('Error al subir el archivo:', error);
        return { path: null, error: new Error(error.message) };
    }

    console.log('Archivo subido exitosamente:', data.path);
    return { path: data.path, error: null };
};
