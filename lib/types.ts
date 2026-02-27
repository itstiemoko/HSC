export type StatutDossier =
  | 'Lance'
  | 'Provisoire_Entree'
  | 'Provisoire_Sortie'
  | 'CarteGrise_Entree'
  | 'CarteGrise_Sortie';

export const STATUTS_DOSSIER: { value: StatutDossier; label: string }[] = [
  { value: 'Lance', label: 'Lancé' },
  { value: 'Provisoire_Entree', label: 'Provisoire (Entrée)' },
  { value: 'Provisoire_Sortie', label: 'Provisoire (Sortie)' },
  { value: 'CarteGrise_Entree', label: 'Carte grise (Entrée)' },
  { value: 'CarteGrise_Sortie', label: 'Carte grise (Sortie)' },
];

export const WORKFLOW_ORDRE: StatutDossier[] = [
  'Lance',
  'Provisoire_Entree',
  'Provisoire_Sortie',
  'CarteGrise_Entree',
  'CarteGrise_Sortie',
];

export type ModePaiement = 'Especes' | 'Virement' | 'MobileMoney' | 'Cheque';

export const MODES_PAIEMENT: { value: ModePaiement; label: string }[] = [
  { value: 'Especes', label: 'Espèces' },
  { value: 'Virement', label: 'Virement bancaire' },
  { value: 'MobileMoney', label: 'Mobile Money' },
  { value: 'Cheque', label: 'Chèque' },
];

export type StatutFacture = 'En_attente' | 'Partiellement_payee' | 'Soldee';

export const STATUTS_FACTURE: { value: StatutFacture; label: string }[] = [
  { value: 'En_attente', label: 'En attente' },
  { value: 'Partiellement_payee', label: 'Partiellement payée' },
  { value: 'Soldee', label: 'Soldée' },
];

export type StatutTranche = 'En_attente' | 'Payee' | 'En_retard';

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface TypeVehicule {
  id: string;
  label: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface Dossier {
  id: string;
  numeroCH: string;
  chassisCH?: string;
  annee?: string;
  referenceVehicule: string;
  typeVehicule: string;
  clientId?: string;
  statut: StatutDossier;
  dateCreation: string;
  dateModification?: string;
  notes: string;
  /** @deprecated Utiliser clientId. Conservé pour rétrocompatibilité. */
  nomClient?: string;
  prenomClient?: string;
  telephoneClient?: string;
}

export interface Tranche {
  id: string;
  factureId: string;
  numeroTranche: number;
  montant: number;
  dateEcheance: string;
  datePaiement: string | null;
  statut: StatutTranche;
  modePaiement: ModePaiement | null;
}

export interface Paiement {
  id: string;
  factureId: string;
  trancheId: string | null;
  montant: number;
  date: string;
  modePaiement: ModePaiement;
  dateCreation?: string;
}

export interface Facture {
  id: string;
  dossierId: string;
  clientId?: string;
  nomClient?: string;
  prenomClient?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  referenceVehicule: string;
  typeVehicule: string;
  vin: string;
  dateFacture: string;
  prixTotalTTC: number;
  prixAchat?: number;
  dedouanement?: number;
  /**
   * Dépenses diverses supplémentaires (hors dédouanement).
   * Pour compatibilité, peut contenir un total agrégé si `depensesLignes` n'est pas rempli.
   */
  depenses?: number;
  depensesLignes?: Array<{
    id: string;
    libelle: string;
    montant: number;
  }>;
  montantPaye: number;
  montantRestant: number;
  modePaiement: ModePaiement;
  paysDestination: string;
  statut: StatutFacture;
  tranches: Tranche[];
  paiements: Paiement[];
  dateCreation?: string;
  dateModification?: string;
}

export type StatutLocation = 'En_cours' | 'Terminee' | 'Annulee';

export const STATUTS_LOCATION: { value: StatutLocation; label: string }[] = [
  { value: 'En_cours', label: 'En cours' },
  { value: 'Terminee', label: 'Terminée' },
  { value: 'Annulee', label: 'Annulée' },
];

export interface Location {
  id: string;
  referenceCamion: string;
  typeCamion: string;
  clientId?: string;
  nomClient?: string;
  prenomClient?: string;
  telephoneClient?: string;
  dateDebut: string;
  dateFin: string;
  montantTotal: number;
  depensesLignes?: Array<{
    id: string;
    libelle: string;
    montant: number;
  }>;
  depenses?: number;
  statut: StatutLocation;
  dateCreation: string;
  dateModification?: string;
  notes: string;
}

export interface EntrepriseInfo {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  logo?: string;
}

export interface DashboardStats {
  totalDossiers: number;
  totalFactures: number;
  parStatut: Record<StatutDossier, number>;
  totalVentes: number;
  totalEncaisse: number;
  totalRestant: number;
  totalLocations: number;
  locationsRecentes: Location[];
  dossiersRecents: Dossier[];
  facturesRecentes: Facture[];
}
