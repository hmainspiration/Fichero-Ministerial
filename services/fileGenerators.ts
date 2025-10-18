import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { FormData } from '../types';

export const generatePdf = async (data: FormData): Promise<Blob> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    const addHeader = (title: string) => {
        doc.setFillColor(0, 90, 156);
        doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(title, pageWidth / 2, y + 7, { align: 'center' });
        y += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
    };

    const checkPageBreak = () => {
        if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

    const addField = (label: string, value: string | number | undefined, x: number, width: number, customY?: number) => {
        const fieldY = customY || y;
        doc.text(`${label}:`, x, fieldY);
        doc.setLineWidth(0.2);
        const valStr = (value === undefined || value === null) ? '' : String(value);
        doc.text(valStr, x + 2, fieldY + 5);
        doc.line(x, fieldY + 6, x + width, fieldY + 6);
        if(!customY) y += 12;
    };
    
    const addPhotoPlaceholder = (x: number, yPos: number, personType: 'minister' | 'wife') => {
        doc.setLineWidth(0.5);
        doc.rect(x, yPos, 40, 50);
        doc.text("Foto", x + 20, yPos + 25, { align: 'center' });
        const photoSrc = data[personType].photoPreview;
        if(photoSrc){
             try {
                doc.addImage(photoSrc, 'JPEG', x + 1, yPos + 1, 38, 48);
             } catch(e){
                console.error("Error al añadir imagen al PDF:", e);
             }
        }
    };


    // --- PÁGINA 1 ---
    addHeader("Información del Ministro");
    addPhotoPlaceholder(pageWidth - margin - 40, y, 'minister');
    addField("Nombre Completo (Según la cedula)", data.minister.fullName, margin, 120);
    addField("Fecha de Nacimiento", data.minister.birthDate, margin, 58);
    addField("Departamento", data.minister.department, 80, 58, y-12);
    addField("Ciudad", data.minister.city, margin, 58);
    addField("País", data.minister.country, 80, 58, y-12);
    addField("Fecha de Bautismo", data.minister.baptismDate, margin, 58);
    addField("Quien Bautizo", data.minister.baptizedBy, 80, 58, y-12);
    addField("Fecha de Espiritual", data.minister.spiritualDate, margin, 58);
    addField("Quien Testifico", data.minister.testifiedBy, 80, 58, y-12);
    y += 5;
    addField("Se caso por la Iglesia", data.minister.churchMarried, margin, 58);
    addField("Iglesia", data.minister.marriageChurch, 80, 58, y-12);
    addField("Fecha de Matrimonio", data.minister.marriageDate, margin, 58);
    addField("Quien los Caso", data.minister.marriedBy, 80, 58, y-12);
    y += 5;
    addField("Fecha que Salió a la Obra", data.minister.workStartDate, margin, 58);
    addField("Lugar donde salió", data.minister.whereStarted, 80, 58, y-12);
    addField("Salió Soltero o Casado", data.minister.singleOrMarried, margin, 58);
    addField("Ministro que lo recomendó", data.minister.recommendedBy, 80, 58, y-12);
    y += 5;
    addField("Nombre del Padre", data.minister.fatherName, margin, 80);
    addField("Vive Aún", data.minister.fatherAlive, 100, 28, y-12);
    addField("Es Hermano", data.minister.fatherIsBeliever, 140, 28, y-12);
    addField("Nombre de la Madre", data.minister.motherName, margin, 80);
    addField("Vive Aún", data.minister.motherAlive, 100, 28, y-12);
    addField("Es Hermano", data.minister.motherIsBeliever, 140, 28, y-12);

    
    addHeader("Información de la Esposa");
    addPhotoPlaceholder(pageWidth - margin - 40, y, 'wife');
    // Campos de la esposa... (similar al ministro)
    addField("Nombre Completo (Según la cedula)", data.wife.fullName, margin, 120);
    addField("Fecha de Nacimiento", data.wife.birthDate, margin, 58);
    addField("Departamento", data.wife.department, 80, 58, y-12);
    addField("Ciudad", data.wife.city, margin, 58);
    addField("País", data.wife.country, 80, 58, y-12);
    y+=12; // Espacio extra

    addHeader("Ministerio");
    addField("Fecha de Obrero Evangelista", data.ministry.evangelistWorkerDate, margin, 58);
    addField("Fecha de Encargado Evangelista", data.ministry.evangelistInChargeDate, 80, 58, y-12);
    addField("Fecha de Diacono Evangelista", data.ministry.evangelistDeaconDate, margin, 58);
    addField("Fecha de Pastor Evangelista", data.ministry.evangelistPastorDate, 80, 58, y-12);
    y += 5;

    addHeader("Diciplina Ministerial");
    addField("Ha sido puesto en diciplina alguna vez", data.discipline.wasDisciplined, margin, 58);
    addField("En que Fecha", data.discipline.disciplineDate, 80, 58, y-12);
    
    
    // --- PÁGINA 2 ---
    doc.addPage();
    y = 20;
    
    addHeader("Información de los Hijos");
    addField("¿Cuántos Hijos Tiene?", data.childrenCount, margin, 40);
    addField("Cuantos Varones", data.maleChildrenCount, 65, 40, y-12);
    addField("Cuantos Mujeres", data.femaleChildrenCount, 120, 40, y-12);

    data.children.forEach((child, index) => {
        checkPageBreak();
        doc.setFont(undefined, 'bold');
        doc.text(`Datos del Hijo o Hija ${index+1}`, margin, y);
        doc.setFont(undefined, 'normal');
        y += 7;
        addField("Nombre Completo", child.fullName, margin, 120);
        addField("Fecha de Nacimiento", child.birthDate, margin, 58);
        addField("Nivel Académico", child.academicLevel, 80, 58, y-12);
        addField("Conocimiento de Oficio", child.tradeKnowledge, margin, 120);
        y+=5;
    });

    checkPageBreak();
    y += 10;
    addHeader("Récord Ministerial");
    
    data.churchRecords.forEach((record, index) => {
        checkPageBreak();
        doc.setFont(undefined, 'bold');
        doc.text(`Datos de la Iglesia donde fue enviado ${index + 1}`, margin, y);
        doc.setFont(undefined, 'normal');
        y += 7;
        addField("Iglesia", record.church, margin, 80);
        addField("Lugar", record.location, 100, 70, y-12);
        addField("Fecha de Llegada", record.arrivalDate, margin, 80);
        addField("Fecha en fue Cambiado", record.changedDate, 100, 70, y-12);
        addField("Miembros que Recibió", record.membersReceived, margin, 40);
        addField("Miembros que Dejo", record.membersLeft, 60, 40, y-12);
        addField("Bautismos", record.baptisms, 120, 40, y-12);
        addField("Sellados", record.sealed, margin, 40);
        addField("Restaurados", record.restored, 60, 40, y-12);
        addField("Presentaciones (40 días)", record.presentations40days, 120, 40, y-12);
        addField("Matrimonios", record.marriages, margin, 40);
        addField("Honra", record.honors, 60, 40, y-12);
        addField("En Casa", record.inHouse, 120, 40, y-12);
        y += 10;
    });


    const pdfBlob = doc.output('blob');
    return pdfBlob;
};


export const generateExcel = (data: FormData): Blob => {
    const wb = XLSX.utils.book_new();

    // Hoja para el Ministro
    const ministerData = [{...data.minister}];
    delete ministerData[0].photo;
    delete ministerData[0].photoPreview;
    const ministerSheet = XLSX.utils.json_to_sheet(ministerData);
    XLSX.utils.book_append_sheet(wb, ministerSheet, "Ministro");

    // Hoja para la Esposa
    const wifeData = [{...data.wife}];
    delete wifeData[0].photo;
    delete wifeData[0].photoPreview;
    const wifeSheet = XLSX.utils.json_to_sheet(wifeData);
    XLSX.utils.book_append_sheet(wb, wifeSheet, "Esposa");
    
    // Hoja para Ministerio
    const ministrySheet = XLSX.utils.json_to_sheet([data.ministry]);
    XLSX.utils.book_append_sheet(wb, ministrySheet, "Ministerio");

    // Hoja para Disciplina
    const disciplineSheet = XLSX.utils.json_to_sheet([data.discipline]);
    XLSX.utils.book_append_sheet(wb, disciplineSheet, "Disciplina");

    // Hoja para Hijos (si hay)
    if (data.children.length > 0) {
        const childrenSheet = XLSX.utils.json_to_sheet(data.children.map(({id, ...rest}) => rest)); // Quitar ID
        XLSX.utils.book_append_sheet(wb, childrenSheet, "Hijos");
    }

    // Hoja para Récord Ministerial (si hay)
    if (data.churchRecords.length > 0) {
        const recordsSheet = XLSX.utils.json_to_sheet(data.churchRecords.map(({id, ...rest}) => rest)); // Quitar ID
        XLSX.utils.book_append_sheet(wb, recordsSheet, "Récord Ministerial");
    }
    
    // Generar el archivo
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
