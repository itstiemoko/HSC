import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { StatutDossier, StatutFacture, StatutTranche, StatutLocation } from './types';

// ── ID Generation ───────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateFactureId(): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  return `Facture_INV-${dateStr}-${uuid}`;
}

export function generateTrancheId(factureId: string, numero: number): string {
  return `${factureId}_T${String(numero).padStart(2, '0')}`;
}

// ── Formatting ──────────────────────────────────────────────

/** Format lisible pour les non-techniques : "20 janv. 2026" */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

/** Format lisible avec heure : "20 janv. 2026 à 14h30" */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), "d MMM yyyy 'à' HH'h'mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

/** Format court pour tableaux/export : "20/01/2026" */
export function formatDateCourt(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function compactNum(value: number): string {
  const s = value.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s.replace('.', ',');
}

/** Bénéfice = ventes - (prix achat + dépenses) */
export function calculerBenefice(prixTotalTTC: number, prixAchat: number, depenses: number): number {
  return prixTotalTTC - prixAchat - depenses;
}

export function formatMontant(montant: number): string {
  const abs = Math.abs(montant);
  const sign = montant < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return sign + compactNum(abs / 1_000_000_000) + ' Md FCFA';
  if (abs >= 1_000_000) return sign + compactNum(abs / 1_000_000) + ' M FCFA';

  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant) + ' FCFA';
  return formatted.replace(/\u00A0/g, '\u0020');
}

/** Format montant pour PDF : uniquement caractères ASCII pour éviter les artefacts (ex. "/" à la place des espaces). */
export function formatMontantForPDF(montant: number): string {
  const abs = Math.abs(montant);
  const sign = montant < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return sign + compactNum(abs / 1_000_000_000) + ' Md FCFA';
  if (abs >= 1_000_000) return sign + compactNum(abs / 1_000_000) + ' M FCFA';

  const s = Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return sign + s + ' FCFA';
}

// ── Validation ──────────────────────────────────────────────

export function validateTelephone(tel: string): boolean {
  if (!tel) return true;
  const cleaned = tel.replace(/[\s\-\.\(\)]/g, '');
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}

// ── Label Maps (single source of truth) ─────────────────────

const DOSSIER_LABELS: Record<StatutDossier, string> = {
  Lance: 'Lancé',
  Provisoire_Entree: 'Provisoire (Entrée)',
  Provisoire_Sortie: 'Provisoire (Sortie)',
  CarteGrise_Entree: 'Carte grise (Entrée)',
  CarteGrise_Sortie: 'Carte grise (Sortie)',
};

const FACTURE_LABELS: Record<StatutFacture, string> = {
  En_attente: 'En attente',
  Partiellement_payee: 'Partiellement payée',
  Soldee: 'Soldée',
};

const TRANCHE_LABELS: Record<StatutTranche, string> = {
  En_attente: 'En attente',
  Payee: 'Payée',
  En_retard: 'En retard',
};

const LOCATION_LABELS: Record<StatutLocation, string> = {
  En_cours: 'En cours',
  Terminee: 'Terminée',
  Annulee: 'Annulée',
};

const PAIEMENT_LABELS: Record<string, string> = {
  Especes: 'Espèces',
  Virement: 'Virement bancaire',
  MobileMoney: 'Mobile Money',
  Cheque: 'Chèque',
};

export function statutDossierLabel(statut: StatutDossier): string {
  return DOSSIER_LABELS[statut] ?? statut;
}

export function statutFactureLabel(statut: StatutFacture): string {
  return FACTURE_LABELS[statut] ?? statut;
}

export function statutTrancheLabel(statut: StatutTranche): string {
  return TRANCHE_LABELS[statut] ?? statut;
}

export function statutLocationLabel(statut: StatutLocation): string {
  return LOCATION_LABELS[statut] ?? statut;
}

export function modePaiementLabel(mode: string | null): string {
  if (!mode) return '-';
  return PAIEMENT_LABELS[mode] ?? mode;
}
