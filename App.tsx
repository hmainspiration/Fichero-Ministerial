import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { FormData, PersonInfo, ChildInfo, ChurchRecord, MinistryInfo, DisciplineInfo } from './types';
import { initialFormData, createInitialChild, createInitialChurchRecord, MAX_PHOTO_SIZE_MB, MAX_PHOTO_SIZE_BYTES } from './constants';
import { uploadFile } from './services/supabase';
import { generatePdf, generateExcel } from './services/fileGenerators';

// --- Reusable Components ---

const TabButton: React.FC<{ title: string; isActive: boolean; onClick: () => void; icon: string }> = ({ title, isActive, onClick, icon }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-grow px-3 py-3 text-sm font-bold transition-all duration-300 flex items-center justify-center whitespace-nowrap sm:flex-grow-0 ${
            isActive
                ? 'bg-white text-brand-blue rounded-t-lg'
                : 'text-blue-200 hover:bg-brand-light-blue hover:text-white'
        }`}
    >
        <i className={`fas ${icon} mr-2 hidden sm:inline-block`}></i>
        <span>{title}</span>
    </button>
);


const InputField: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string; required?: boolean }> = ({ label, name, value, onChange, type = 'text', placeholder, required = false }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
        <input type={type} id={name} name={name} value={value} onChange={onChange} placeholder={placeholder || label} required={required} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue" />
    </div>
);

const RadioGroup: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; options: string[] }> = ({ label, name, value, onChange, options }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center space-x-4 flex-wrap">
            {options.map(opt => (
                <label key={opt} className="flex items-center mt-1">
                    <input type="radio" name={name} value={opt} checked={value === opt} onChange={onChange} className="focus:ring-brand-light-blue h-4 w-4 text-brand-blue border-gray-300" />
                    <span className="ml-2 text-sm text-gray-700">{opt}</span>
                </label>
            ))}
        </div>
    </div>
);

const CheckboxField: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => (
    <div className="flex items-center p-2 bg-gray-50 rounded-lg">
        <input id={name} name={name} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 text-brand-blue border-gray-300 rounded focus:ring-brand-light-blue" />
        <label htmlFor={name} className="ml-3 text-sm font-medium text-gray-700">{label}</label>
    </div>
);


const PhotoUpload: React.FC<{ label: string; person: PersonInfo; onPhotoChange: (photo: File | null, preview: string) => void; }> = ({ label, person, onPhotoChange }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.size > MAX_PHOTO_SIZE_BYTES) {
                alert(`El archivo es demasiado grande. El tamaño máximo es de ${MAX_PHOTO_SIZE_MB}MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => { onPhotoChange(file, reader.result as string); };
            reader.readAsDataURL(file);
        } else {
            onPhotoChange(null, '');
        }
    };

    return (
        <div className="mb-4 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex flex-col items-center">
                {person.photoPreview ? (
                    <img src={person.photoPreview} alt="Vista previa" className="w-32 h-40 object-cover rounded-md mb-2 border-2 border-brand-light-blue" />
                ) : (
                    <div className="w-32 h-40 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500">Foto</div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-blue file:text-white hover:file:bg-brand-light-blue"/>
                <p className="text-xs text-gray-500 mt-1">Máx. {MAX_PHOTO_SIZE_MB}MB</p>
            </div>
        </div>
    );
};

const PersonDetails: React.FC<{ person: PersonInfo; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onPhotoChange: (photo: File | null, preview: string) => void; personType: 'minister' | 'wife' }> = ({ person, onChange, onPhotoChange, personType }) => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 lg:col-span-2 space-y-4">
            <InputField label="Nombre Completo (Según Cédula)" name="fullName" value={person.fullName} onChange={onChange} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Fecha de Nacimiento (DD/MM/AAAA)" name="birthDate" value={person.birthDate} onChange={onChange} placeholder="01/01/1980" />
                <InputField label="Ciudad" name="city" value={person.city} onChange={onChange} />
                <InputField label="Departamento" name="department" value={person.department} onChange={onChange} />
                <InputField label="País" name="country" value={person.country} onChange={onChange} />
            </div>
             <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Información Eclesiástica</legend>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Fecha de Bautismo" name="baptismDate" value={person.baptismDate} onChange={onChange} />
                    <InputField label="Iglesia (Bautismo)" name="baptismChurch" value={person.baptismChurch} onChange={onChange} />
                    <InputField label="Quien Bautizo" name="baptizedBy" value={person.baptizedBy} onChange={onChange} />
                    <InputField label="Fecha de Bautismo Espiritual" name="spiritualDate" value={person.spiritualDate} onChange={onChange} />
                    <InputField label="Iglesia (Espiritual)" name="spiritualChurch" value={person.spiritualChurch} onChange={onChange} />
                    <InputField label="Quien Testifico" name="testifiedBy" value={person.testifiedBy} onChange={onChange} />
                </div>
            </fieldset>
            {personType === 'minister' &&
                <fieldset className="border p-4 rounded-md">
                    <legend className="text-sm font-medium text-gray-700 px-2">Matrimonio</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RadioGroup label="Se caso por la Iglesia" name="churchMarried" value={person.churchMarried} onChange={onChange} options={['Sí', 'No', 'Unión Libre']} />
                        <InputField label="Fecha de Matrimonio" name="marriageDate" value={person.marriageDate} onChange={onChange} />
                        <InputField label="Quien los Caso" name="marriedBy" value={person.marriedBy} onChange={onChange} />
                        <InputField label="Iglesia" name="marriageChurch" value={person.marriageChurch} onChange={onChange} />
                    </div>
                </fieldset>
            }
            <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Inicio Obra</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Fecha que Salió a la Obra" name="workStartDate" value={person.workStartDate} onChange={onChange} />
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
                    <InputField label="Vigente (Visa)" name="visaVigente" value={person.visaVigente} onChange={onChange} placeholder="DD/MM/AAAA"/>
                    <RadioGroup label="Posee Residencia" name="hasResidency" value={person.hasResidency} onChange={onChange} options={['Sí', 'No']} />
                    <InputField label="Vigente (Residencia)" name="residencyVigente" value={person.residencyVigente} onChange={onChange} placeholder="DD/MM/AAAA"/>
                    <RadioGroup label="Enfermedad" name="illness" value={person.illness} onChange={onChange} options={['Sí', 'No']} />
                    <InputField label="Tipo de Enfermedad" name="illnessType" value={person.illnessType} onChange={onChange} />
                    <InputField label="Desde Cuando" name="illnessSince" value={person.illnessSince} onChange={onChange} placeholder="DD/MM/AAAA"/>
                    <RadioGroup label="Está en Tratamiento" name="inTreatment" value={person.inTreatment} onChange={onChange} options={['Sí', 'No']} />
                </div>
            </fieldset>
        </div>
        <div className="md:col-span-3 lg:col-span-1">
            <PhotoUpload label={`Foto d${personType === 'minister' ? 'el Ministro' : 'e la Esposa'}`} person={person} onPhotoChange={onPhotoChange} />
        </div>
    </div>
);

const FloatingDraftButtons: React.FC<{onSave: () => void, onLoad: () => void, disabled: boolean}> = ({ onSave, onLoad, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className={`flex flex-col items-center space-y-2 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                 <button type="button" onClick={onLoad} disabled={disabled} className="bg-gray-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-gray-600 flex items-center justify-center transition disabled:bg-gray-300" title="Cargar Borrador">
                    <i className="fas fa-upload"></i>
                </button>
                <button type="button" onClick={onSave} disabled={disabled} className="bg-yellow-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-yellow-600 flex items-center justify-center transition disabled:bg-yellow-300" title="Guardar Borrador">
                    <i className="fas fa-save"></i>
                </button>
            </div>
             <button type="button" onClick={() => setIsOpen(!isOpen)} className="bg-brand-blue text-white w-16 h-16 rounded-full shadow-xl hover:bg-brand-light-blue flex items-center justify-center transition mt-2" title="Opciones de Borrador">
                <i className={`fas fa-pen-to-square transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}></i>
            </button>
        </div>
    );
};


// --- Componente Principal ---

const App: React.FC = () => {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [activeTab, setActiveTab] = useState('minister');

    const handlePersonChange = useCallback((personKey: 'minister' | 'wife') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [personKey]: { ...prev[personKey], [name]: value } }));
    }, []);

    const handlePhotoChange = useCallback((personKey: 'minister' | 'wife') => (photo: File | null, preview: string) => {
        setFormData(prev => ({ ...prev, [personKey]: { ...prev[personKey], photo, photoPreview: preview } }));
    }, []);
    
    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = useCallback((section: 'ministry' | 'discipline') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
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

    const handleSaveDraft = () => {
        try {
            const draftData = JSON.parse(JSON.stringify(formData));
            delete draftData.minister.photo;
            delete draftData.wife.photo;
            localStorage.setItem('ministerialFormDraft', JSON.stringify(draftData));
            alert('Borrador guardado exitosamente.');
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el borrador.');
        }
    };

    const handleLoadDraft = () => {
        const draft = localStorage.getItem('ministerialFormDraft');
        if (draft) {
            try {
                const parsedDraft = JSON.parse(draft);
                parsedDraft.minister.photo = null;
                parsedDraft.wife.photo = null;
                setFormData(parsedDraft);
                alert('Borrador cargado. Recuerda volver a seleccionar las fotos si es necesario.');
            } catch(error) {
                console.error(error);
                alert('El borrador guardado parece estar corrupto.');
            }
        } else {
            alert('No se encontró ningún borrador.');
        }
    };

    const handleDownload = async () => {
        if (!formData.minister.fullName) {
            alert('El nombre completo del ministro es obligatorio para nombrar los archivos.');
            setActiveTab('minister');
            return;
        }
        setIsDownloading(true);
        setStatusMessage('Generando PDF y Excel para descargar...');
        try {
            const filenameBase = formData.minister.fullName.replace(/\s+/g, '_');
            
            // Generar y descargar PDF
            const pdfBlob = await generatePdf(formData);
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const pdfLink = document.createElement('a');
            pdfLink.href = pdfUrl;
            pdfLink.download = `${filenameBase}.pdf`;
            document.body.appendChild(pdfLink);
            pdfLink.click();
            document.body.removeChild(pdfLink);
            URL.revokeObjectURL(pdfUrl);

            // Generar y descargar Excel
            const excelBlob = generateExcel(formData);
            const excelUrl = URL.createObjectURL(excelBlob);
            const excelLink = document.createElement('a');
            excelLink.href = excelUrl;
            excelLink.download = `${filenameBase}.xlsx`;
            document.body.appendChild(excelLink);
            excelLink.click();
            document.body.removeChild(excelLink);
            URL.revokeObjectURL(excelUrl);

            setStatusMessage('Documentos listos.');
            alert('Documentos descargados exitosamente.');

        } catch (error: any) {
            console.error("Error al descargar:", error);
            setStatusMessage(`Error al generar: ${error.message}`);
            alert('Ocurrió un error al generar los documentos.');
        } finally {
            setIsDownloading(false);
        }
    };


    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.minister.fullName) {
            alert('El nombre completo del ministro es obligatorio.');
            setActiveTab('minister');
            return;
        }
        setIsUploading(true);
        setStatusMessage('Iniciando proceso de envío...');
        try {
            setStatusMessage('Generando PDF...');
            const pdfBlob = await generatePdf(formData);
            setStatusMessage('Generando Excel...');
            const excelBlob = generateExcel(formData);

            const filenameBase = formData.minister.fullName.replace(/\s+/g, '_');
            const pdfFile = new File([pdfBlob], `${filenameBase}.pdf`, { type: 'application/pdf' });
            const excelFile = new File([excelBlob], `${filenameBase}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            setStatusMessage('Subiendo documentos y fotos a Supabase...');
            const uploads = [
                uploadFile(pdfFile, `documents/${pdfFile.name}`),
                uploadFile(excelFile, `documents/${excelFile.name}`)
            ];
            if (formData.minister.photo) uploads.push(uploadFile(formData.minister.photo, `photos/minister_${filenameBase}.jpg`));
            if (formData.wife.photo) uploads.push(uploadFile(formData.wife.photo, `photos/wife_${filenameBase}.jpg`));

            const results = await Promise.all(uploads);
            
            const firstErrorResult = results.find(r => r.error);
            if (firstErrorResult && firstErrorResult.error) {
                throw firstErrorResult.error;
            }
            
            setStatusMessage('¡Proceso completado con éxito!');
            alert('¡Ficha Ministerial enviada y guardada exitosamente en Supabase!');
        } catch (error: any) {
            const errorMessage = error.message || 'Error desconocido.';
            setStatusMessage(`Error: ${errorMessage}`);
            
            let alertMessage = `Ocurrió un error al enviar: ${errorMessage}`;

            if (errorMessage.includes('violates row-level security policy')) {
                alertMessage = 'Error de Permisos en Supabase:\n\nNo se pudieron subir los archivos porque la política de seguridad de la base de datos lo impidió.\n\nSolución: Ve a tu panel de Supabase > Storage > Policies y crea una nueva política para la operación "INSERT" que aplique al rol "public" para el bucket "fichas-ministeriales".';
            }

            alert(alertMessage);
        } finally {
            setIsUploading(false);
        }
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'minister':
                return <PersonDetails person={formData.minister} onChange={handlePersonChange('minister')} onPhotoChange={handlePhotoChange('minister')} personType="minister" />;
            case 'wife':
                return <PersonDetails person={formData.wife} onChange={handlePersonChange('wife')} onPhotoChange={handlePhotoChange('wife')} personType="wife" />;
            case 'ministry':
                 return (
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Fecha de Obrero Evangelista" name="evangelistWorkerDate" value={formData.ministry.evangelistWorkerDate} onChange={handleNestedChange('ministry')} />
                            <InputField label="Fecha de Diacono Evangelista" name="evangelistDeaconDate" value={formData.ministry.evangelistDeaconDate} onChange={handleNestedChange('ministry')} />
                            <InputField label="Fecha de Encargado Evangelista" name="evangelistInChargeDate" value={formData.ministry.evangelistInChargeDate} onChange={handleNestedChange('ministry')} />
                            <InputField label="Fecha de Pastor Evangelista" name="evangelistPastorDate" value={formData.ministry.evangelistPastorDate} onChange={handleNestedChange('ministry')} />
                            <InputField label="Cargo dentro del Ministerio" name="role" value={formData.ministry.role} onChange={handleNestedChange('ministry')} />
                            <InputField label="Ministerio que colabora" name="collaboration" value={formData.ministry.collaboration} onChange={handleNestedChange('ministry')} />
                            <InputField label="Desde Cuando" name="sinceDate" value={formData.ministry.sinceDate} onChange={handleNestedChange('ministry')} />
                            <InputField label="Cambio o Cesado de Ministerio" name="ministryChangeDate" value={formData.ministry.ministryChangeDate} onChange={handleNestedChange('ministry')} />
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
                         <RadioGroup label="Ha sido puesto en diciplina alguna vez" name="wasDisciplined" value={formData.discipline.wasDisciplined} onChange={handleNestedChange('discipline')} options={['Sí', 'No']} />
                         {formData.discipline.wasDisciplined === 'Sí' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <InputField label="En que Fecha" name="disciplineDate" value={formData.discipline.disciplineDate} onChange={handleNestedChange('discipline')} />
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
                                    <InputField label="Fecha de Nacimiento" name="birthDate" value={child.birthDate} onChange={e => {
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
                                    <InputField label="Desde Cuando" name="illnessSince" value={child.illnessSince} onChange={e => {
                                        const newChildren = [...formData.children]; newChildren[index].illnessSince = e.target.value; setFormData(p => ({...p, children: newChildren}));
                                    }}/>
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
                                    <InputField label="Fecha de Llegada" name="arrivalDate" value={record.arrivalDate} onChange={e => {
                                        const newRecords = [...formData.churchRecords]; newRecords[index].arrivalDate = e.target.value; setFormData(p => ({...p, churchRecords: newRecords}));
                                    }} />
                                    <InputField label="Fecha de Cambio" name="changedDate" value={record.changedDate} onChange={e => {
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
        <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans">
             <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            <div className="bg-brand-blue text-white p-6 rounded-lg shadow-xl mb-8">
                <header className="text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold">Ficha Ministerial Digital</h1>
                    <p className="text-blue-200 mt-2">Complete todos los campos requeridos con información precisa.</p>
                </header>
            </div>

            <form onSubmit={handleUpload}>
                <div className="bg-brand-blue rounded-t-lg shadow-lg">
                    <nav className="flex flex-wrap p-1">
                        <TabButton title="Ministro" isActive={activeTab === 'minister'} onClick={() => setActiveTab('minister')} icon="fa-user-tie"/>
                        <TabButton title="Esposa" isActive={activeTab === 'wife'} onClick={() => setActiveTab('wife')} icon="fa-user-group"/>
                        <TabButton title="Ministerio" isActive={activeTab === 'ministry'} onClick={() => setActiveTab('ministry')} icon="fa-scroll"/>
                        <TabButton title="Disciplina" isActive={activeTab === 'discipline'} onClick={() => setActiveTab('discipline')} icon="fa-gavel"/>
                        <TabButton title="Hijos" isActive={activeTab === 'children'} onClick={() => setActiveTab('children')} icon="fa-children"/>
                        <TabButton title="Récord" isActive={activeTab === 'records'} onClick={() => setActiveTab('records')} icon="fa-landmark"/>
                    </nav>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-b-lg shadow-md mb-6">
                    {renderContent()}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md mt-6 space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button" onClick={handleDownload} disabled={isDownloading || isUploading} className="w-full bg-brand-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-light-blue transition duration-300 disabled:bg-blue-300 flex items-center justify-center">
                           {isDownloading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Generando...</> : <><i className="fas fa-download mr-2"></i>Descargar (PDF/Excel)</>}
                        </button>
                        <button type="submit" disabled={isUploading || isDownloading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 disabled:bg-green-400 flex items-center justify-center">
                           {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Enviando...</> : <><i className="fas fa-cloud-upload-alt mr-2"></i>Enviar a Supabase</>}
                        </button>
                    </div>
                    {(isUploading || isDownloading) && <div className="w-full bg-blue-100 p-3 rounded-md text-center text-blue-800">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        {statusMessage}
                    </div>}
                </div>
            </form>
            <FloatingDraftButtons onSave={handleSaveDraft} onLoad={handleLoadDraft} disabled={isUploading || isDownloading} />
        </div>
    );
};

export default App;
