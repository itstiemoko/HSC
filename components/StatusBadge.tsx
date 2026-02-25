import { cn } from '@/lib/cn';
import type { StatutDossier, StatutFacture, StatutTranche, StatutLocation } from '@/lib/types';

type BadgeVariant = StatutDossier | StatutFacture | StatutTranche | StatutLocation;

const LABEL_MAP: Record<string, string> = {
  Lance: 'Lancé',
  Provisoire_Entree: 'Provisoire (Entrée)',
  Provisoire_Sortie: 'Provisoire (Sortie)',
  CarteGrise_Entree: 'Carte grise (Entrée)',
  CarteGrise_Sortie: 'Carte grise (Sortie)',
  En_attente: 'En attente',
  Partiellement_payee: 'Partiellement payée',
  Soldee: 'Soldée',
  Payee: 'Payée',
  En_retard: 'En retard',
  En_cours: 'En cours',
  Terminee: 'Terminée',
  Annulee: 'Annulée',
};

const COLOR_MAP: Record<string, string> = {
  Lance: 'bg-blue-100 text-blue-800 border-blue-200',
  Provisoire_Entree: 'bg-amber-100 text-amber-800 border-amber-200',
  Provisoire_Sortie: 'bg-orange-100 text-orange-800 border-orange-200',
  CarteGrise_Entree: 'bg-purple-100 text-purple-800 border-purple-200',
  CarteGrise_Sortie: 'bg-green-100 text-green-800 border-green-200',
  En_attente: 'bg-muted text-ink border-edge',
  Partiellement_payee: 'bg-amber-100 text-amber-800 border-amber-200',
  Soldee: 'bg-green-100 text-green-800 border-green-200',
  Payee: 'bg-green-100 text-green-800 border-green-200',
  En_retard: 'bg-red-100 text-red-800 border-red-200',
  En_cours: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  Terminee: 'bg-green-100 text-green-800 border-green-200',
  Annulee: 'bg-muted text-ink-muted border-edge-soft',
};

interface StatusBadgeProps {
  statut: BadgeVariant;
  className?: string;
}

export default function StatusBadge({ statut, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      COLOR_MAP[statut] ?? 'bg-muted text-ink border-edge',
      className,
    )}>
      {LABEL_MAP[statut] ?? statut}
    </span>
  );
}

export function DossierStatusBadge({ statut }: { statut: StatutDossier }) {
  return <StatusBadge statut={statut} />;
}

export function FactureStatusBadge({ statut }: { statut: StatutFacture }) {
  return <StatusBadge statut={statut} />;
}

export function TrancheStatusBadge({ statut }: { statut: StatutTranche }) {
  return <StatusBadge statut={statut} />;
}

export function LocationStatusBadge({ statut }: { statut: StatutLocation }) {
  return <StatusBadge statut={statut} />;
}
