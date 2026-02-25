import { getDossierByNumeroCH } from './store';
import { validateTelephone } from './utils';

export function requiredString(label: string) {
  return (value: unknown) => {
    if (!value || !(value as string).trim()) return `${label} est obligatoire`;
    return undefined;
  };
}

export function uniqueNumeroCH(excludeId?: string) {
  return (value: unknown) => {
    const ch = (value as string)?.trim();
    if (!ch) return 'Le numéro CH est obligatoire';
    const existing = getDossierByNumeroCH(ch);
    if (existing && existing.id !== excludeId) return 'Ce numéro CH existe déjà';
    return undefined;
  };
}

export function optionalTelephone() {
  return (value: unknown) => {
    const tel = value as string;
    if (tel && !validateTelephone(tel)) return 'Format de téléphone invalide';
    return undefined;
  };
}

export function positiveNumber(label: string) {
  return (value: unknown) => {
    const n = parseFloat(value as string);
    if (isNaN(n) || n <= 0) return `${label} invalide`;
    return undefined;
  };
}

export function optionalNonNegativeNumber(label: string) {
  return (value: unknown) => {
    const s = (value as string)?.trim();
    if (!s) return undefined;
    const n = parseFloat(s);
    if (isNaN(n) || n < 0) return `${label} invalide`;
    return undefined;
  };
}

export function requiredClientId() {
  return (value: unknown) => {
    if (!value || !(value as string).trim()) return 'Le client est obligatoire';
    return undefined;
  };
}

export function dossierRules(excludeId?: string) {
  return {
    numeroCH: uniqueNumeroCH(excludeId),
    referenceVehicule: requiredString('La référence véhicule'),
    clientId: requiredClientId(),
  };
}

export function locationRules() {
  return {
    referenceCamion: requiredString('La référence camion'),
    clientId: requiredClientId(),
    montantTotal: positiveNumber('Le montant'),
  };
}
