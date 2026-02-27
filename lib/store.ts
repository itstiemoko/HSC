import type { Dossier, Facture, Location, Client, TypeVehicule, EntrepriseInfo, DashboardStats, StatutDossier } from './types';

const KEYS = {
  DOSSIERS: 'douanapp_dossiers',
  FACTURES: 'douanapp_factures',
  LOCATIONS: 'douanapp_locations',
  CLIENTS: 'douanapp_clients',
  TYPES_VEHICULE: 'douanapp_types_vehicule',
  ENTREPRISE: 'douanapp_entreprise',
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function now(): string {
  return new Date().toISOString();
}

// ── Dossiers ────────────────────────────────────────────────

export function getDossiers(): Dossier[] {
  return getItem<Dossier[]>(KEYS.DOSSIERS, []);
}

export function getDossierById(id: string): Dossier | undefined {
  return getDossiers().find((d) => d.id === id);
}

export function getDossierByNumeroCH(numeroCH: string): Dossier | undefined {
  return getDossiers().find((d) => d.numeroCH === numeroCH);
}

export function saveDossier(dossier: Dossier): void {
  const list = getDossiers();
  const idx = list.findIndex((d) => d.id === dossier.id);
  const toSave = { ...dossier, dateModification: now() };
  if (idx >= 0) {
    list[idx] = toSave;
  } else {
    list.push({ ...toSave, dateCreation: dossier.dateCreation || now() });
  }
  setItem(KEYS.DOSSIERS, list);
}

export function dossierHasFactures(dossierId: string): boolean {
  return getFactures().some((f) => f.dossierId === dossierId);
}

export function deleteDossier(id: string): void {
  if (dossierHasFactures(id)) {
    throw new Error('Impossible de supprimer un dossier lié à des factures');
  }
  setItem(
    KEYS.DOSSIERS,
    getDossiers().filter((d) => d.id !== id),
  );
}

export function importDossiers(dossiers: Dossier[], replace: boolean = false): number {
  if (replace) {
    setItem(KEYS.DOSSIERS, dossiers);
    return dossiers.length;
  }
  const existing = getDossiers();
  const existingCHs = new Set(existing.map((d) => d.numeroCH));
  let added = 0;
  for (const d of dossiers) {
    if (!existingCHs.has(d.numeroCH)) {
      existing.push(d);
      existingCHs.add(d.numeroCH);
      added++;
    }
  }
  setItem(KEYS.DOSSIERS, existing);
  return added;
}

// ── Factures ────────────────────────────────────────────────

export function getFactures(): Facture[] {
  return getItem<Facture[]>(KEYS.FACTURES, []);
}

export function getFactureById(id: string): Facture | undefined {
  return getFactures().find((f) => f.id === id);
}

export function getFacturesByDossier(dossierId: string): Facture[] {
  return getFactures().filter((f) => f.dossierId === dossierId);
}

export function saveFacture(facture: Facture): void {
  const list = getFactures();
  const idx = list.findIndex((f) => f.id === facture.id);
  const toSave = { ...facture, dateModification: now() };
  if (idx >= 0) {
    list[idx] = toSave;
  } else {
    list.push({ ...toSave, dateCreation: facture.dateCreation || now() });
  }
  setItem(KEYS.FACTURES, list);
}

export function deleteFacture(id: string): void {
  setItem(
    KEYS.FACTURES,
    getFactures().filter((f) => f.id !== id),
  );
}

// ── Locations (camions) ──────────────────────────────────────

export function getLocations(): Location[] {
  return getItem<Location[]>(KEYS.LOCATIONS, []);
}

export function getLocationById(id: string): Location | undefined {
  return getLocations().find((l) => l.id === id);
}

export function saveLocation(location: Location): void {
  const list = getLocations();
  const idx = list.findIndex((l) => l.id === location.id);
  const toSave = { ...location, dateModification: now() };
  if (idx >= 0) {
    list[idx] = toSave;
  } else {
    list.push({ ...toSave, dateCreation: location.dateCreation || now() });
  }
  setItem(KEYS.LOCATIONS, list);
}

export function deleteLocation(id: string): void {
  setItem(
    KEYS.LOCATIONS,
    getLocations().filter((l) => l.id !== id),
  );
}

// ── Clients ────────────────────────────────────────────────

export function getClients(): Client[] {
  return getItem<Client[]>(KEYS.CLIENTS, []);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function saveClient(client: Client): void {
  const list = getClients();
  const idx = list.findIndex((c) => c.id === client.id);
  const toSave = { ...client, dateModification: now() };
  if (idx >= 0) {
    list[idx] = toSave;
  } else {
    list.push({ ...toSave, dateCreation: client.dateCreation || now() });
  }
  setItem(KEYS.CLIENTS, list);
}

export function deleteClient(id: string): void {
  setItem(
    KEYS.CLIENTS,
    getClients().filter((c) => c.id !== id),
  );
}

export function clientInUse(clientId: string): boolean {
  return (
    getDossiers().some((d) => d.clientId === clientId) ||
    getFactures().some((f) => f.clientId === clientId) ||
    getLocations().some((l) => l.clientId === clientId)
  );
}

// ── Types de véhicule ──────────────────────────────────────

const DEFAULT_LABELS = ['Berline', 'SUV', 'Pick-up', 'Porteur', 'Semi-remorque', 'Camion-citerne'];

function migrateTypesVehicule(raw: unknown): TypeVehicule[] {
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (typeof first === 'string') {
      return (raw as string[]).map((label, i) => ({ id: `tv_${i}_${label}`, label }));
    }
    if (first && typeof first === 'object' && 'id' in first && 'label' in first) {
      return raw as TypeVehicule[];
    }
  }
  return [];
}

export function getTypesVehicule(): TypeVehicule[] {
  const raw = getItem<unknown>(KEYS.TYPES_VEHICULE, null);
  const migrated = migrateTypesVehicule(raw);
  if (migrated.length > 0) return migrated;
  return DEFAULT_LABELS.map((label, i) => ({ id: `tv_default_${i}`, label }));
}

export function getTypeVehiculeById(id: string): TypeVehicule | undefined {
  return getTypesVehicule().find((t) => t.id === id);
}

export function saveTypeVehicule(type: TypeVehicule): void {
  const list = getTypesVehicule();
  const idx = list.findIndex((t) => t.id === type.id);
  const toSave = { ...type, dateModification: now() };
  const next = idx >= 0 ? list.map((t) => (t.id === type.id ? toSave : t)) : [...list, { ...toSave, dateCreation: type.dateCreation || now() }];
  setItem(KEYS.TYPES_VEHICULE, next);
}

export function deleteTypeVehicule(id: string): void {
  setItem(KEYS.TYPES_VEHICULE, getTypesVehicule().filter((t) => t.id !== id));
}

export function typeVehiculeInUse(label: string): boolean {
  return (
    getDossiers().some((d) => d.typeVehicule === label) ||
    getLocations().some((l) => l.typeCamion === label) ||
    getFactures().some((f) => f.typeVehicule === label)
  );
}

// ── Entreprise ──────────────────────────────────────────────

const DEFAULT_ENTREPRISE: EntrepriseInfo = {
  nom: 'Haidara Service Commercial (HSC)',
  adresse: '',
  telephone: '',
  email: '',
};

export function getEntreprise(): EntrepriseInfo {
  return getItem<EntrepriseInfo>(KEYS.ENTREPRISE, DEFAULT_ENTREPRISE);
}

export function saveEntreprise(info: EntrepriseInfo): void {
  setItem(KEYS.ENTREPRISE, info);
}

// ── Dashboard Stats ─────────────────────────────────────────

export function getDashboardStats(): DashboardStats {
  const dossiers = getDossiers();
  const factures = getFactures();
  const locations = getLocations();

  const parStatut: Record<StatutDossier, number> = {
    Lance: 0,
    Provisoire_Entree: 0,
    Provisoire_Sortie: 0,
    CarteGrise_Entree: 0,
    CarteGrise_Sortie: 0,
  };

  for (const d of dossiers) {
    if (parStatut[d.statut] !== undefined) {
      parStatut[d.statut]++;
    }
  }

  const totalVentes = factures.reduce((sum, f) => sum + f.prixTotalTTC, 0);
  const totalEncaisse = factures.reduce((sum, f) => sum + f.montantPaye, 0);
  const totalRestant = factures.reduce((sum, f) => sum + f.montantRestant, 0);

  const dossiersRecents = [...dossiers]
    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
    .slice(0, 5);

  const facturesRecentes = [...factures]
    .sort((a, b) => new Date(b.dateCreation || b.dateFacture).getTime() - new Date(a.dateCreation || a.dateFacture).getTime())
    .slice(0, 5);

  const locationsRecentes = [...locations]
    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
    .slice(0, 5);

  return {
    totalDossiers: dossiers.length,
    totalFactures: factures.length,
    parStatut,
    totalVentes,
    totalEncaisse,
    totalRestant,
    totalLocations: locations.length,
    locationsRecentes,
    dossiersRecents,
    facturesRecentes,
  };
}
