import { DrugItem, Patient, Prescription, SaleTransaction, ControlledLogEntry } from '../types';
import { INITIAL_DRUGS, INITIAL_PATIENTS, INITIAL_PRESCRIPTIONS, INITIAL_SALES, INITIAL_CONTROLLED_LOGS } from '../data/mockData';

const KEYS = {
  DRUGS: 'pharmacare_drugs_v1',
  PATIENTS: 'pharmacare_patients_v1',
  PRESCRIPTIONS: 'pharmacare_prescriptions_v1',
  SALES: 'pharmacare_sales_v1',
  CONTROLLED_LOGS: 'pharmacare_controlled_logs_v1',
};

export function getStoredDrugs(): DrugItem[] {
  try {
    const raw = localStorage.getItem(KEYS.DRUGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored drugs', e);
  }
  saveStoredDrugs(INITIAL_DRUGS);
  return INITIAL_DRUGS;
}

export function saveStoredDrugs(drugs: DrugItem[]): void {
  localStorage.setItem(KEYS.DRUGS, JSON.stringify(drugs));
}

export function getStoredPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(KEYS.PATIENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored patients', e);
  }
  saveStoredPatients(INITIAL_PATIENTS);
  return INITIAL_PATIENTS;
}

export function saveStoredPatients(patients: Patient[]): void {
  localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
}

export function getStoredPrescriptions(): Prescription[] {
  try {
    const raw = localStorage.getItem(KEYS.PRESCRIPTIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored prescriptions', e);
  }
  saveStoredPrescriptions(INITIAL_PRESCRIPTIONS);
  return INITIAL_PRESCRIPTIONS;
}

export function saveStoredPrescriptions(rxs: Prescription[]): void {
  localStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(rxs));
}

export function getStoredSales(): SaleTransaction[] {
  try {
    const raw = localStorage.getItem(KEYS.SALES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored sales', e);
  }
  saveStoredSales(INITIAL_SALES);
  return INITIAL_SALES;
}

export function saveStoredSales(sales: SaleTransaction[]): void {
  localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
}

export function getStoredControlledLogs(): ControlledLogEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.CONTROLLED_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored controlled logs', e);
  }
  saveStoredControlledLogs(INITIAL_CONTROLLED_LOGS);
  return INITIAL_CONTROLLED_LOGS;
}

export function saveStoredControlledLogs(logs: ControlledLogEntry[]): void {
  localStorage.setItem(KEYS.CONTROLLED_LOGS, JSON.stringify(logs));
}

export function resetToDefaultData(): void {
  saveStoredDrugs(INITIAL_DRUGS);
  saveStoredPatients(INITIAL_PATIENTS);
  saveStoredPrescriptions(INITIAL_PRESCRIPTIONS);
  saveStoredSales(INITIAL_SALES);
  saveStoredControlledLogs(INITIAL_CONTROLLED_LOGS);
}
