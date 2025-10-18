export interface PersonInfo {
    fullName: string;
    birthDate: string;
    city: string;
    department: string;
    country: string;
    baptismDate: string;
    baptismChurch: string;
    baptizedBy: string;
    spiritualDate: string;
    spiritualChurch: string;
    testifiedBy: string;
    churchMarried: string; // "Sí", "No", "Unión Libre"
    marriageDate: string;
    marriedBy: string;
    marriageChurch: string;
    workStartDate: string;
    whereStarted: string;
    singleOrMarried: string;
    recommendedBy: string;
    fatherName: string;
    fatherAlive: string; // 'Sí' o 'No'
    fatherIsBeliever: string; // 'Sí' o 'No'
    motherName: string;
    motherAlive: string; // 'Sí' o 'No'
    motherIsBeliever: string; // 'Sí' o 'No'
    academicLevel: string;
    tradeKnowledge: string;
    hasVisa: string; // 'Sí' o 'No'
    visaVigente: string;
    hasResidency: string; // 'Sí' o 'No'
    residencyVigente: string;
    illness: string; // 'Sí' o 'No'
    illnessType: string;
    illnessSince: string;
    inTreatment: string; // 'Sí' o 'No'
    photo?: File | null;
    photoPreview?: string;
}

export interface ChildInfo {
    id: number;
    fullName: string;
    birthDate: string;
    academicLevel: string;
    tradeKnowledge: string;
    illness: string; // 'Sí' o 'No'
    illnessType: string;
    illnessSince: string;
    inTreatment: string; // 'Sí' o 'No'
}

export interface ChurchRecord {
    id: number;
    church: string;
    location: string;
    arrivalDate: string;
    membersReceived: number;
    baptisms: number;
    sealed: number;
    restored: number;
    presentations40days: number;
    marriages: number;
    honors: number;
    inHouse: number;
    membersLeft: number;
    changedDate: string;
}

export interface MinistryInfo {
    evangelistWorkerDate: string;
    evangelistDeaconDate: string;
    evangelistInChargeDate: string;
    evangelistPastorDate: string;
    role: string;
    collaboration: string;
    sinceDate: string;
    ministryChangeDate: string;
    // Checkboxes para trabajo material
    landPurchase: boolean;
    cancelDebt: boolean;
    startPayment: boolean;
    continuePaying: boolean;
    startTempleConstruction: boolean;
    finishConstruction: boolean;
    planElaboration: boolean;
    planApproval: boolean;
}

export interface DisciplineInfo {
    wasDisciplined: string; // 'Sí' o 'No'
    disciplineDate: string;
    faultType: string;
    judgingPastor: string;
    guilty: string; // 'Culpable' o 'Inocente'
    witnesses: string; // 'Sí' o 'No'
    suspended: string; // 'Sí' o 'No'
    suspensionTime: string;
    churchChanged: string; // 'Sí' o 'No'
    admonished: string; // 'Sí' o 'No'
}


export interface FormData {
    minister: PersonInfo;
    wife: PersonInfo;
    childrenCount: number;
    maleChildrenCount: number;
    femaleChildrenCount: number;
    children: ChildInfo[];
    ministry: MinistryInfo;
    discipline: DisciplineInfo;
    churchRecordsCount: number;
    churchRecords: ChurchRecord[];
}