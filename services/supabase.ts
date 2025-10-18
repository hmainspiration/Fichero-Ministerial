import { createClient } from '@supabase/supabase-js';
// FIX: Import all necessary types from ../types.ts
import type { FormData, PersonInfo, ChildInfo, ChurchRecord, MinistryInfo, DisciplineInfo } from '../types';

// Pega tu URL y tu clave anónoma de Supabase aquí
const SUPABASE_URL = 'https://gciwhtxjwqwblnhwlgtb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjaXdodHhqd3F3YmxuaHdsZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjY1MjIsImV4cCI6MjA3NTYwMjUyMn0.d8EI8ArxmYiiZQKsvXVT9g-VzZcyyAYXciSoDPiIbN4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface UploadResult {
    path: string | null;
    error: Error | null;
}

export const uploadFile = async (file: File, path: string): Promise<UploadResult> => {
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

export const saveDraftToSupabase = async (draftId: string, formData: Omit<FormData, 'minister' | 'wife' | 'children' | 'ministry' | 'discipline' | 'churchRecords'> & { minister: Omit<PersonInfo, 'photo' | 'photoPreview'>, wife: Omit<PersonInfo, 'photo' | 'photoPreview'>, children: ChildInfo[], ministry: MinistryInfo, discipline: DisciplineInfo, churchRecords: ChurchRecord[] }): Promise<{ error: Error | null }> => {
    const { error } = await supabase
        .from('drafts')
        .upsert({ 
            id: draftId, 
            data: formData,
            updated_at: new Date().toISOString() 
        });

    if (error) {
        console.error('Error al guardar el borrador en Supabase:', error);
        return { error: new Error(error.message) };
    }
    return { error: null };
};


export const loadDraftFromSupabase = async (draftId: string): Promise<{ data: FormData | null; error: Error | null }> => {
    const { data, error } = await supabase
        .from('drafts')
        .select('data')
        .eq('id', draftId)
        .single();

    if (error) {
        // Un error 'PGRST116' significa que no se encontró la fila, lo cual no es un error real para nosotros.
        if (error.code === 'PGRST116') {
            return { data: null, error: null };
        }
        console.error('Error al cargar el borrador desde Supabase:', error);
        return { data: null, error: new Error(error.message) };
    }
    
    return { data: data?.data as FormData | null, error: null };
};