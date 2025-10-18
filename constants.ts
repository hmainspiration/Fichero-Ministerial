import type { FormData, PersonInfo, ChildInfo, ChurchRecord, MinistryInfo, DisciplineInfo } from './types';

export const MAX_PHOTO_SIZE_MB = 10;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

const initialPersonInfo: PersonInfo = {
    fullName: '', birthDate: '', city: '', department: '', country: '',
    baptismDate: '', baptizedBy: '', baptismChurch: '',
    spiritualDate: '', testifiedBy: '', spiritualChurch: '',
    churchMarried: 'No', marriageDate: '', marriedBy: '', marriageChurch: '',
    workStartDate: '', whereStarted: '', singleOrMarried: 'Casado', recommendedBy: '',
    fatherName: '', fatherAlive: 'Sí', fatherIsBeliever: 'Sí',
    motherName: '', motherAlive: 'Sí', motherIsBeliever: 'Sí',
    academicLevel: '', tradeKnowledge: '',
    hasVisa: 'No', visaVigente: '',
    hasResidency: 'No', residencyVigente: '',
    illness: 'No', illnessType: '', illnessSince: '', inTreatment: 'No',
    photo: null, photoPreview: '',
};

export const createInitialChild = (id: number): ChildInfo => ({
    id, fullName: '', birthDate: '', academicLevel: '', tradeKnowledge: '',
    illness: 'No', illnessType: '', illnessSince: '', inTreatment: 'No',
});

export const createInitialChurchRecord = (id: number): ChurchRecord => ({
    id, church: '', location: '', arrivalDate: '',
    membersReceived: 0, baptisms: 0, sealed: 0,
    restored: 0, presentations40days: 0, marriages: 0, honors: 0,
    inHouse: 0, membersLeft: 0, changedDate: '',
});

const initialMinistryInfo: MinistryInfo = {
    evangelistWorkerDate: '', evangelistDeaconDate: '', evangelistInChargeDate: '', evangelistPastorDate: '',
    role: '', collaboration: '', sinceDate: '', ministryChangeDate: '',
    landPurchase: false,
    cancelDebt: false,
    startPayment: false,
    continuePaying: false,
    startTempleConstruction: false,
    finishConstruction: false,
    planElaboration: false,
    planApproval: false,
};

const initialDisciplineInfo: DisciplineInfo = {
    wasDisciplined: 'No', disciplineDate: '', faultType: '', judgingPastor: '',
    guilty: 'Inocente', witnesses: 'No', suspended: 'No', suspensionTime: '',
    churchChanged: 'No', admonished: 'No',
};

export const initialFormData: FormData = {
    minister: { ...initialPersonInfo },
    wife: { ...initialPersonInfo, singleOrMarried: 'Casada' },
    childrenCount: 0,
    maleChildrenCount: 0,
    femaleChildrenCount: 0,
    children: [],
    ministry: { ...initialMinistryInfo },
    discipline: { ...initialDisciplineInfo },
    churchRecordsCount: 0,
    churchRecords: [],
};