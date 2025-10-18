import React, { useState, useCallback, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import type { FormData, PersonInfo, ChildInfo, ChurchRecord, MinistryInfo, DisciplineInfo } from './types';
import { initialFormData, createInitialChild, createInitialChurchRecord, MAX_PHOTO_SIZE_MB, MAX_PHOTO_SIZE_BYTES } from './constants';
import { uploadFile, saveDraftToSupabase, loadDraftFromSupabase } from './services/supabase';
import { generatePdf, generateExcel } from './services/fileGenerators';

// --- Sistema de Notificaciones Toast ---

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast debe ser usado dentro de un ToastProvider");
    return context;
};

const ToastMessage: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
    };
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div className={`flex items-start p-4 mb-4 text-white rounded-lg shadow-lg ${colors[toast.type]} animate-fade-in-right`}>
            <i className={`fas ${icons[toast.type]} mr-3 text-xl`}></i>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="ml-4 -mt-1 -mr-1 text-xl font-bold leading-none opacity-70 hover:opacity-100">&times;</button>
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
    <div className="fixed top-5 right-5 z-[100] w-full max-w-xs">
        {toasts.map(toast => (
            <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
    </div>
);

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 6000); // Duración de 6 segundos
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast}/>
        </ToastContext.Provider>
    );
};


// --- Componentes Reutilizables ---

const TabButton: React.FC<{ title: string; isActive: boolean; onClick: () => void; icon: string }> = ({ title, isActive, onClick, icon }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-grow px-4 py-3 text-sm font-bold transition-all duration-300 flex items-center justify-center rounded-lg whitespace-nowrap sm:flex-grow-0 ${
            isActive
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-100'
        }`}
    >
        <i className={`fas ${icon} mr-2`}></i>
        <span>{title}</span>
    </button>
);


const InputField: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string; required?: boolean; error?: string; }> = ({ label, name, value, onChange, type = 'text', placeholder, required = false, error }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
        <input 
            type={type} 
            id={name} 
            name={name} 
            value={value} 
            onChange={onChange}
            placeholder={placeholder || label} 
            required={required} 
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`} 
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
        />
        {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

const DateDropdownPicker: React.FC<{ label: string; name: string; value: string; onChange: (e: { target: { name: string; value: string; } }) => void; error?: string; required?: boolean; }> = ({ label, name, value, onChange, error, required }) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            const [d, m, y] = value.split('/');
            setDay(d);
            setMonth(m);
            setYear(y);
        } else {
            setDay('');
            setMonth('');
            setYear('');
        }
    }, [value]);
    
    useEffect(() => {
        if (day && month && year) {
            const dateString = `${day}/${month}/${year}`;
            if(dateString !== value) {
                onChange({ target: { name, value: dateString } });
            }
        } else if (value) {
            // Si el valor no está vacío pero los selectores sí, lo limpiamos.
            onChange({ target: { name, value: '' } });
        }
    }, [day, month, year, name, onChange, value]);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 101 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    
    const daysInMonth = useMemo(() => {
        if (!month || !year) return 31;
        return new Date(Number(year), Number(month), 0).getDate();
    }, [month, year]);

    useEffect(() => {
        if (Number(day) > daysInMonth) {
            setDay(String(daysInMonth));
        }
    }, [day, daysInMonth]);

    const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
    
    const selectClasses = `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none transition-colors ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`;

    return (
         <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
            <div className="grid grid-cols-3 gap-2">
                <select name={`${name}-day`} value={day} onChange={e => setDay(e.target.value)} className={selectClasses} aria-label={`${label} día`}>
                    <option value="">Día</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select name={`${name}-month`} value={month} onChange={e => setMonth(e.target.value)} className={selectClasses} aria-label={`${label} mes`}>
                    <option value="">Mes</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                 <select name={`${name}-year`} value={year} onChange={e => setYear(e.target.value)} className={selectClasses} aria-label={`${label} año`}>
                    <option value="">Año</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};


const RadioGroup: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; options: string[] }> = ({ label, name, value, onChange, options }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center space-x-4 flex-wrap">
            {options.map(opt => (
                <label key={opt} className="flex items-center mt-1">
                    <input type="radio" name={name} value={opt} checked={value === opt} onChange={onChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                    <span className="ml-2 text-sm text-gray-700">{opt}</span>
                </label>
            ))}
        </div>
    </div>
);

const CheckboxField: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => (
    <div className="flex items-center p-2 bg-gray-50 rounded-lg">
        <input id={name} name={name} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
        <label htmlFor={name} className="ml-3 text-sm font-medium text-gray-700">{label}</label>
    </div>
);


const PhotoUpload: React.FC<{ label: string; person: PersonInfo; onPhotoChange: (photo: File | null, preview: string) => void; }> = ({ label, person, onPhotoChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.size > MAX_PHOTO_SIZE_BYTES) {
                addToast(`El archivo es demasiado grande. El tamaño máximo es de ${MAX_PHOTO_SIZE_MB}MB.`, 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => { onPhotoChange(file, reader.result as string); };
            reader.readAsDataURL(file);
        } else {
            onPhotoChange(null, '');
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="mb-4 text-center">
            <h3 className="font-semibold text-lg mb-4 text-brand-dark">{label}</h3>
            <div 
                className="w-48 h-60 mx-auto bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-500 hover:bg-gray-200 transition-all"
                onClick={triggerFileSelect}
            >
                {person.photoPreview ? (
                    <img src={person.photoPreview} alt="Vista previa" className="w-full h-full object-cover rounded-md" />
                ) : (
                    <div className="text-center">
                        <i className="fas fa-camera text-3xl mb-2"></i>
                        <p>Subir Foto</p>
                        <p className="text-xs mt-1">(Máx. {MAX_PHOTO_SIZE_MB}MB)</p>
                    </div>
                )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
        </div>
    );
};


const PersonDetails: React.FC<{ person: PersonInfo; onChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; } }) => void; onPhotoChange: (photo: File | null, preview: string) => void; personType: 'minister' | 'wife'; errors: Record<string, string> }> = ({ person, onChange, onPhotoChange, personType, errors }) => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Información del {personType === 'minister' ? 'Ministro' : 'Cónyuge'}</h2>
            <InputField label="Nombre Completo (Según Cédula)" name="fullName" value={person.fullName} onChange={onChange} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateDropdownPicker label="Fecha de Nacimiento" name="birthDate" value={person.birthDate} onChange={onChange} error={errors.birthDate} />
                <InputField label="Ciudad" name="city" value={person.city} onChange={onChange} />
                <InputField label="Departamento" name="department" value={person.department} onChange={onChange} />
                <InputField label="País" name="country" value={person.country} onChange={onChange} />
            </div>
             <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Información Eclesiástica</legend>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateDropdownPicker label="Fecha de Bautismo" name="baptismDate" value={person.baptismDate} onChange={onChange} error={errors.baptismDate} />
                    <InputField label="Iglesia (Bautismo)" name="baptismChurch" value={person.baptismChurch} onChange={onChange} />
                    <InputField label="Quien Bautizo" name="baptizedBy" value={person.baptizedBy} onChange={onChange} />
                    <DateDropdownPicker label="Fecha de Bautismo Espiritual" name="spiritualDate" value={person.spiritualDate} onChange={onChange} error={errors.spiritualDate} />
                    <InputField label="Iglesia (Espiritual)" name="spiritualChurch" value={person.spiritualChurch} onChange={onChange} />
                    <InputField label="Quien Testifico" name="testifiedBy" value={person.testifiedBy} onChange={onChange} />
                </div>
            </fieldset>
            {personType === 'minister' &&
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-sm font-medium text-gray-700 px-2">Matrimonio</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RadioGroup label="Se caso por la Iglesia" name="churchMarried" value={person.churchMarried} onChange={onChange} options={['Sí', 'No', 'Unión Libre']} />
                        <DateDropdownPicker label="Fecha de Matrimonio" name="marriageDate" value={person.marriageDate} onChange={onChange} error={errors.marriageDate} />
                        <InputField label="Quien los Caso" name="marriedBy" value={person.marriedBy} onChange={onChange} />
                        <InputField label="Iglesia" name="marriageChurch" value={person.marriageChurch} onChange={onChange} />
                    </div>
                </fieldset>
            }
            <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Inicio Obra</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateDropdownPicker label="Fecha que Salió a la Obra" name="workStartDate" value={person.workStartDate} onChange={onChange} error={errors.workStartDate} />
                    <InputField label="Lugar donde salió" name="whereStarted" value={person.whereStarted} onChange={onChange} />
                    <InputField label="Salió Soltero o Casado" name="singleOrMarried" value={person.singleOrMarried} onChange={onChange} />
                    <InputField label="Ministro que lo recomendó" name="recommendedBy" value={person.recommendedBy} onChange={onChange} />
                </div>
            </fieldset>
             <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Padres</legend>
                <InputField label="Nombre del Padre" name="fatherName" value={person.fatherName} onChange={onChange} />
                <div className="grid grid-cols-2 gap-4">
                  <RadioGroup label="Vive Aún" name="fatherAlive" value={person.fatherAlive} onChange={onChange} options={['Sí', 'No']} />
                  <RadioGroup label="Es Hermano" name="fatherIsBeliever" value={person.fatherIsBeliever} onChange={onChange} options={['Sí', 'No']} />
                </div>
                 <InputField label="Nombre de la Madre" name="motherName" value={person.motherName} onChange={onChange} />
                 <div className="grid grid-cols-2 gap-4">
                    <RadioGroup label="Vive Aún" name="motherAlive" value={person.motherAlive} onChange={onChange} options={['Sí', 'No']} />
                    <RadioGroup label="Es Hermano" name="motherIsBeliever" value={person.motherIsBeliever} onChange={onChange} options={['Sí', 'No']} />
                </div>
            </fieldset>
             <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Documentación y Salud</legend>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <RadioGroup label="Posee Visa" name="hasVisa" value={person.hasVisa} onChange={onChange} options={['Sí', 'No']} />
                    <DateDropdownPicker label="Vigente (Visa)" name="visaVigente" value={person.visaVigente} onChange={onChange} error={errors.visaVigente} />
                    <RadioGroup label="Posee Residencia" name="hasResidency" value={person.hasResidency} onChange={onChange} options={['Sí', 'No']} />
                    <DateDropdownPicker label="Vigente (Residencia)" name="residencyVigente" value={person.residencyVigente} onChange={onChange} error={errors.residencyVigente} />
                    <RadioGroup label="Enfermedad" name="illness" value={person.illness} onChange={onChange} options={['Sí', 'No']} />
                    <InputField label="Tipo de Enfermedad" name="illnessType" value={person.illnessType} onChange={onChange} />
                    <DateDropdownPicker label="Desde Cuando" name="illnessSince" value={person.illnessSince} onChange={onChange} error={errors.illnessSince} />
                    <RadioGroup label="Está en Tratamiento" name="inTreatment" value={person.inTreatment} onChange={onChange} options={['Sí', 'No']} />
                </div>
            </fieldset>
        </div>
        <div className="md:col-span-3 lg:col-span-1">
            <PhotoUpload label={`Foto d${personType === 'minister' ? 'el Ministro' : 'e la Esposa'}`} person={person} onPhotoChange={onPhotoChange} />
        </div>
    </div>
);


// --- Lógica Principal de la Aplicación ---

const AppContent: React.FC = () => {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDraftLoading, setIsDraftLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('minister');
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [draftId, setDraftId] = useState<string | null>(null);
    const { addToast } = useToast();
    const [formErrors, setFormErrors] = useState<any>({});


    useEffect(() => {
        let id = localStorage.getItem('ministerialDraftId');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('ministerialDraftId', id);
        }
        setDraftId(id);
    }, []);

    const handlePersonChange = useCallback((personKey: 'minister' | 'wife') => (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; } }) => {
        const { name, value } = e.target;
        setFormErrors(prev => {
            const newErrors = {...prev};
            if(newErrors[personKey]) delete newErrors[personKey][name];
            return newErrors;
        });
        setFormData(prev => ({ ...prev, [personKey]: { ...prev[personKey], [name]: value } }));
    }, []);

    const handlePhotoChange = useCallback((personKey: 'minister' | 'wife') => (photo: File | null, preview: string) => {
        setFormData(prev => ({ ...prev, [personKey]: { ...prev[personKey], photo, photoPreview: preview } }));
    }, []);
    
    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; } }) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = useCallback((section: 'ministry' | 'discipline') => (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; } }) => {
        const { name, value } = e.target;
        const finalValue = (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [section]: { ...prev[section], [name]: finalValue } }));
    }, []);

    useEffect(() => {
        const newCount = Number(formData.childrenCount) || 0;
        const currentCount = formData.children.length;
        if (newCount === currentCount) return;

        let newChildren: ChildInfo[] = [...formData.children];
        if (newCount > currentCount) {
            for (let i = currentCount; i < newCount; i++) newChildren.push(createInitialChild(Date.now() + i));
        } else {
            newChildren = newChildren.slice(0, newCount);
        }
        setFormData(prev => ({ ...prev, children: newChildren }));
    }, [formData.childrenCount, formData.children]);

    useEffect(() => {
        const newCount = Number(formData.churchRecordsCount) || 0;
        const currentCount = formData.churchRecords.length;
        if (newCount === currentCount) return;

        let newRecords: ChurchRecord[] = [...formData.churchRecords];
        if (newCount > currentCount) {
            for (let i = currentCount; i < newCount; i++) newRecords.push(createInitialChurchRecord(Date.now() + i));
        } else {
            newRecords = newRecords.slice(0, newCount);
        }
        setFormData(prev => ({ ...prev, churchRecords: newRecords }));
    }, [formData.churchRecordsCount, formData.churchRecords]);

    const validateForm = (): boolean => {
        // La validación de fechas ya no es necesaria aquí,
        // ya que el DateDropdownPicker previene fechas inválidas.
        // Se pueden agregar otras validaciones si es necesario.
        if (!formData.minister.fullName) {
             addToast('El nombre completo del ministro es obligatorio.', 'error');
             setActiveTab('minister');
             return false;
        }
        return true;
    };

    const handleSaveDraft = async () => {
        if (!draftId) {
            addToast('No se pudo generar un ID para el borrador. Intente recargar la página.', 'error');
            return;
        }
        setIsDraftLoading(true);
        try {
            const draftData = JSON.parse(JSON.stringify(formData));
            delete draftData.minister.photo;
            delete draftData.wife.photo;
            
            const { error } = await saveDraftToSupabase(draftId, draftData);
            if (error) throw error;
            
            addToast('Borrador guardado exitosamente en la nube', 'success');
            setIsFabMenuOpen(false);
        } catch (error) {
            const message = `No se pudo guardar el borrador: ${error instanceof Error ? error.message : 'Error desconocido'}`;
            addToast(message, 'error');
        } finally {
            setIsDraftLoading(false);
        }
    };

    const handleLoadDraft = async () => {
        if (!draftId) {
            addToast('No se pudo encontrar un ID de borrador. Intente recargar la página.', 'error');
            return;
        }
        setIsDraftLoading(true);
        try {
            const { data, error } = await loadDraftFromSupabase(draftId);
            if (error) throw error;

            if (data) {
                data.minister.photo = null;
                data.wife.photo = null;
                setFormData(data);
                addToast('Borrador cargado desde la nube. Recuerda volver a seleccionar las fotos.', 'success');
                setIsFabMenuOpen(false);
            } else {
                addToast('No se encontró ningún borrador en la nube para este dispositivo.', 'info');
            }
        } catch(error) {
            addToast(`Error al cargar el borrador: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
        } finally {
            setIsDraftLoading(false);
        }
    };

    const handleAction = async (action: 'download' | 'upload') => {
        if (!validateForm()) {
            return;
        }
        setIsProcessing(true);
        try {
            const filenameBase = formData.minister.fullName.replace(/\s+/g, '_');
            const pdfBlob = await generatePdf(formData);
            const excelBlob = generateExcel(formData);

            if (action === 'download') {
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const pdfLink = document.createElement('a');
                pdfLink.href = pdfUrl;
                pdfLink.download = `${filenameBase}.pdf`;
                document.body.appendChild(pdfLink);
                pdfLink.click();
                document.body.removeChild(pdfLink);
                URL.revokeObjectURL(pdfUrl);

                const excelUrl = URL.createObjectURL(excelBlob);
                const excelLink = document.createElement('a');
                excelLink.href = excelUrl;
                excelLink.download = `${filenameBase}.xlsx`;
                document.body.appendChild(excelLink);
                excelLink.click();
                document.body.removeChild(excelLink);
                URL.revokeObjectURL(excelUrl);
                addToast('Documentos descargados exitosamente.', 'success');
            } else { // upload
                const pdfFile = new File([pdfBlob], `${filenameBase}.pdf`, { type: 'application/pdf' });
                const excelFile = new File([excelBlob], `${filenameBase}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
                const uploads = [
                    uploadFile(pdfFile, `documents/${pdfFile.name}`),
                    uploadFile(excelFile, `documents/${excelFile.name}`)
                ];
                if (formData.minister.photo) uploads.push(uploadFile(formData.minister.photo, `photos/minister_${filenameBase}.jpg`));
                if (formData.wife.photo) uploads.push(uploadFile(formData.wife.photo, `photos/wife_${filenameBase}.jpg`));
    
                const results = await Promise.all(uploads);
                const firstErrorResult = results.find(r => r.error);
                if (firstErrorResult?.error) throw firstErrorResult.error;
                
                addToast('¡Ficha Ministerial enviada y guardada exitosamente!', 'success');
            }
        } catch (error: any) {
            let toastMessage = `Ocurrió un error: ${error.message || 'Error desconocido'}`;
            if (action === 'upload' && error.message?.includes('violates row-level security policy')) {
                toastMessage = 'Error de Permisos: No se pudo subir los archivos. Contacte al administrador.';
            }
            addToast(toastMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'minister':
                return <PersonDetails person={formData.minister} onChange={handlePersonChange('minister')} onPhotoChange={handlePhotoChange('minister')} personType="minister" errors={formErrors.minister || {}} />;
            case 'wife':
                return <PersonDetails person={formData.wife} onChange={handlePersonChange('wife')} onPhotoChange={handlePhotoChange('wife')} personType="wife" errors={formErrors.wife || {}} />;
            case 'ministry':
                 return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Información del Ministerio</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DateDropdownPicker label="Fecha de Obrero Evangelista" name="evangelistWorkerDate" value={formData.ministry.evangelistWorkerDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.evangelistWorkerDate} />
                            <DateDropdownPicker label="Fecha de Diacono Evangelista" name="evangelistDeaconDate" value={formData.ministry.evangelistDeaconDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.evangelistDeaconDate} />
                            <DateDropdownPicker label="Fecha de Encargado Evangelista" name="evangelistInChargeDate" value={formData.ministry.evangelistInChargeDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.evangelistInChargeDate} />
                            <DateDropdownPicker label="Fecha de Pastor Evangelista" name="evangelistPastorDate" value={formData.ministry.evangelistPastorDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.evangelistPastorDate} />
                            <InputField label="Cargo dentro del Ministerio" name="role" value={formData.ministry.role} onChange={handleNestedChange('ministry')} />
                            <InputField label="Ministerio que colabora" name="collaboration" value={formData.ministry.collaboration} onChange={handleNestedChange('ministry')} />
                            <DateDropdownPicker label="Desde Cuando" name="sinceDate" value={formData.ministry.sinceDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.sinceDate} />
                            <DateDropdownPicker label="Cambio o Cesado de Ministerio" name="ministryChangeDate" value={formData.ministry.ministryChangeDate} onChange={handleNestedChange('ministry')} error={formErrors.ministry?.ministryChangeDate} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Trabajo material realizado en la obra</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <CheckboxField label="Compra de terreno" name="landPurchase" checked={formData.ministry.landPurchase} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Cancelar deuda" name="cancelDebt" checked={formData.ministry.cancelDebt} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Comenzar a pagar" name="startPayment" checked={formData.ministry.startPayment} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Continuar pagando" name="continuePaying" checked={formData.ministry.continuePaying} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Iniciar construcción" name="startTempleConstruction" checked={formData.ministry.startTempleConstruction} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Finalizar Construcción" name="finishConstruction" checked={formData.ministry.finishConstruction} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Elaboración de planos" name="planElaboration" checked={formData.ministry.planElaboration} onChange={handleNestedChange('ministry')} />
                            <CheckboxField label="Aprobación de planos" name="planApproval" checked={formData.ministry.planApproval} onChange={handleNestedChange('ministry')} />
                        </div>
                    </div>
                );
            case 'discipline':
                return (
                    <div>
                         <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Disciplina Ministerial</h2>
                         <RadioGroup label="Ha sido puesto en diciplina alguna vez" name="wasDisciplined" value={formData.discipline.wasDisciplined} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                         {formData.discipline.wasDisciplined === 'Sí' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <DateDropdownPicker label="En que Fecha" name="disciplineDate" value={formData.discipline.disciplineDate} onChange={handleNestedChange('discipline')} error={formErrors.discipline?.disciplineDate} />
                                <InputField label="Tipo de Falta Cometida" name="faultType" value={formData.discipline.faultType} onChange={handleNestedChange('discipline')} />
                                <InputField label="Pastor que Juzgo la Falta" name="judgingPastor" value={formData.discipline.judgingPastor} onChange={handleNestedChange('discipline')} />
                                <RadioGroup label="Salió culpable o inocente" name="guilty" value={formData.discipline.guilty} onChange={handleNestedChange('discipline')} options={['Culpable', 'Innocente']} />
                                <RadioGroup label="Hubo testigos en el juicio" name="witnesses" value={formData.discipline.witnesses} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                                <RadioGroup label="Fue recogido o suspendido" name="suspended" value={formData.discipline.suspended} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                                <InputField label="Por cuanto tiempo" name="suspensionTime" value={formData.discipline.suspensionTime} onChange={handleNestedChange('discipline')} />
                                <RadioGroup label="Cambiado de Iglesia" name="churchChanged" value={formData.discipline.churchChanged} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                                <RadioGroup label="Solo recibió amonestación" name="admonished" value={formData.discipline.admonished} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                            </div>
                         )}
                    </div>
                );
            case 'children':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Información de los Hijos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <InputField label="¿Cuántos Hijos Tiene?" name="childrenCount" value={formData.childrenCount} onChange={handleSimpleChange} type="number" />
                            <InputField label="Varones" name="maleChildrenCount" value={formData.maleChildrenCount} onChange={handleSimpleChange} type="number" />
                            <InputField label="Mujeres" name="femaleChildrenCount" value={formData.femaleChildrenCount} onChange={handleSimpleChange} type="number" />
                        </div>
                        {formData.children.map((child, index) => (
                            <div key={child.id} className="p-4 border-t mt-4">
                                <h3 className="font-semibold text-lg mb-2 text-brand-dark">Hijo/a {index + 1}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                    <InputField label="Nombre Completo" name="fullName" value={child.fullName} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].fullName = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} />
                                    <DateDropdownPicker label="Fecha de Nacimiento" name="birthDate" value={child.birthDate} error={formErrors.children?.[index]?.birthDate} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].birthDate = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} />
                                    <InputField label="Nivel Académico" name="academicLevel" value={child.academicLevel} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].academicLevel = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} />
                                    <InputField label="Conocimiento de Oficio" name="tradeKnowledge" value={child.tradeKnowledge} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].tradeKnowledge = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} />
                                    <RadioGroup label="Enfermedad" name={`illness-${child.id}`} value={child.illness} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].illness = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} options={['Sí', 'No']} />
                                    <InputField label="Tipo de Enfermedad" name="illnessType" value={child.illnessType} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].illnessType = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }}/>
                                    <DateDropdownPicker label="Desde Cuando" name="illnessSince" value={child.illnessSince} error={formErrors.children?.[index]?.illnessSince} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].illnessSince = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} />
                                    <RadioGroup label="Está en Tratamiento" name={`inTreatment-${child.id}`} value={child.inTreatment} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].inTreatment = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }} options={['Sí', 'No']} />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'records':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">Récord Ministerial</h2>
                        <InputField label="¿En cuántas iglesias ha estado?" name="churchRecordsCount" value={formData.churchRecordsCount} onChange={handleSimpleChange} type="number" />
                        {formData.churchRecords.map((record, index) => (
                            <div key={record.id} className="p-4 border-t mt-4">
                            <h3 className="font-semibold text-lg mb-2 text-brand-dark">Iglesia {index + 1}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <InputField label="Nombre de la Iglesia" name="church" value={record.church} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].church = e.target.value; setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Lugar" name="location" value={record.location} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].location = e.target.value; setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <DateDropdownPicker label="Fecha de Llegada" name="arrivalDate" value={record.arrivalDate} error={formErrors.churchRecords?.[index]?.arrivalDate} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].arrivalDate = e.target.value; setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <DateDropdownPicker label="Fecha de Cambio" name="changedDate" value={record.changedDate} error={formErrors.churchRecords?.[index]?.changedDate} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].changedDate = e.target.value; setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Miembros Recibidos" type="number" name="membersReceived" value={record.membersReceived} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].membersReceived = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Bautismos" type="number" name="baptisms" value={record.baptisms} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].baptisms = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Sellados" type="number" name="sealed" value={record.sealed} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].sealed = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Restaurados" type="number" name="restored" value={record.restored} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].restored = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Presentaciones 40 días" type="number" name="presentations40days" value={record.presentations40days} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].presentations40days = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Matrimonios" type="number" name="marriages" value={record.marriages} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].marriages = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Honra" type="number" name="honors" value={record.honors} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].honors = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Miembros Dejados" type="number" name="membersLeft" value={record.membersLeft} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].membersLeft = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="En Casa" type="number" name="inHouse" value={record.inHouse} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].inHouse = Number(e.target.value); setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    }
    
    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans" onClick={() => { if(isFabMenuOpen) setIsFabMenuOpen(false); }}>
             <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-xl shadow-2xl mb-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Ficha Ministerial Digital</h1>
                    <p className="text-indigo-200 mt-2 text-lg">Edición 2025</p>
                </header>
                <div className="mt-6 hidden sm:flex flex-row justify-center gap-4">
                    <button 
                        type="button" 
                        onClick={handleSaveDraft} 
                        disabled={isProcessing || isDraftLoading} 
                        className="bg-white/20 text-white font-semibold py-2 px-6 rounded-lg hover:bg-white/30 transition duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isDraftLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</> : <><i className="fas fa-cloud-upload-alt mr-2"></i> Guardar Borrador</>}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleLoadDraft} 
                        disabled={isProcessing || isDraftLoading} 
                        className="bg-white/20 text-white font-semibold py-2 px-6 rounded-lg hover:bg-white/30 transition duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                       {isDraftLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</> : <><i className="fas fa-cloud-download-alt mr-2"></i> Cargar Borrador</>}
                    </button>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAction('upload'); }} noValidate>
                 <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg mb-6">
                    <nav className="flex flex-wrap gap-2 mb-8 p-2 bg-gray-100 rounded-xl">
                        <TabButton title="Ministro" isActive={activeTab === 'minister'} onClick={() => setActiveTab('minister')} icon="fa-user-tie"/>
                        <TabButton title="Esposa" isActive={activeTab === 'wife'} onClick={() => setActiveTab('wife')} icon="fa-user-group"/>
                        <TabButton title="Hijos" isActive={activeTab === 'children'} onClick={() => setActiveTab('children')} icon="fa-children"/>
                        <TabButton title="Ministerio" isActive={activeTab === 'ministry'} onClick={() => setActiveTab('ministry')} icon="fa-scroll"/>
                        <TabButton title="Disciplina" isActive={activeTab === 'discipline'} onClick={() => setActiveTab('discipline')} icon="fa-gavel"/>
                        <TabButton title="Récord" isActive={activeTab === 'records'} onClick={() => setActiveTab('records')} icon="fa-landmark"/>
                    </nav>
                    {renderContent()}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg mt-6 space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button" onClick={() => handleAction('download')} disabled={isProcessing} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-300 flex items-center justify-center shadow-md">
                           {isProcessing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Procesando...</> : <><i className="fas fa-download mr-2"></i>Descargar (PDF/Excel)</>}
                        </button>
                        <button type="submit" disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 disabled:bg-green-400 flex items-center justify-center shadow-md">
                           {isProcessing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Enviando...</> : <><i className="fas fa-paper-plane mr-2"></i>Enviar Información</>}
                        </button>
                    </div>
                </div>
            </form>

            <div className="sm:hidden fixed bottom-6 right-6 z-50">
                <div className="relative">
                    <div className={`absolute bottom-16 right-0 flex flex-col items-center gap-2 transition-all duration-300 ${isFabMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <button type="button" onClick={handleLoadDraft} disabled={isDraftLoading} className="bg-white text-indigo-600 rounded-full p-3 shadow-lg flex items-center justify-center w-40 text-sm font-semibold disabled:opacity-50">
                            {isDraftLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Cargando...</> : <><i className="fas fa-cloud-download-alt mr-2"></i> Cargar Borrador</>}
                        </button>
                         <button type="button" onClick={handleSaveDraft} disabled={isDraftLoading} className="bg-white text-indigo-600 rounded-full p-3 shadow-lg flex items-center justify-center w-40 text-sm font-semibold disabled:opacity-50">
                             {isDraftLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</> : <><i className="fas fa-cloud-upload-alt mr-2"></i> Guardar Borrador</>}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsFabMenuOpen(!isFabMenuOpen); }}
                        className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl text-2xl transition-transform duration-300 hover:scale-110"
                    >
                       <i className={`fas transition-transform duration-300 ${isFabMenuOpen ? 'fa-times rotate-90' : 'fa-plus'}`}></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
);


export default App;