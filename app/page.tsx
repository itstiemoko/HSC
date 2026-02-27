'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Truck,
  TrendingUp,
  Wallet,
  Clock,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { DossierStatusBadge, FactureStatusBadge, LocationStatusBadge } from '@/components/StatusBadge';
import { getDashboardStats } from '@/lib/store';
import { formatDate, formatMontant, statutDossierLabel } from '@/lib/utils';
import { getClientDisplayFromDossier, getClientDisplayFromLocation, getClientDisplayFromFacture, formatClientLabel } from '@/lib/clients';
import type { DashboardStats, StatutDossier } from '@/lib/types';
import { STATUTS_DOSSIER } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    setStats(getDashboardStats());
  }, []);

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tableau de bord</h1>
        <p className="mt-1 text-sm text-ink-muted">Vue d&apos;ensemble de votre activité douanière</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Dossiers"
          value={stats.totalDossiers}
          icon={<FolderOpen className="h-6 w-6" />}
          color="blue"
        />
        <StatsCard
          title="Total Factures"
          value={stats.totalFactures}
          icon={<FileText className="h-6 w-6" />}
          color="indigo"
        />
        <StatsCard
          title="Total Ventes"
          value={formatMontant(stats.totalVentes)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          title="Total Encaissé"
          value={formatMontant(stats.totalEncaisse)}
          icon={<Wallet className="h-6 w-6" />}
          color="purple"
        />
        <StatsCard
          title="Restant à encaisser"
          value={formatMontant(stats.totalRestant)}
          icon={<Banknote className="h-6 w-6" />}
          color={stats.totalRestant > 0 ? 'amber' : 'green'}
        />
        <StatsCard
          title="Locations"
          value={stats.totalLocations}
          icon={<Truck className="h-6 w-6" />}
          color="orange"
        />
      </div>

      <div className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-edge-soft">
        <h2 className="text-lg font-semibold text-ink">Répartition par statut</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATUTS_DOSSIER.map((s) => (
            <Link
              key={s.value}
              href={`/dossiers?statut=${s.value}`}
              className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 transition-colors hover:bg-emphasis"
            >
              <span className="text-sm font-medium text-ink-secondary">{s.label}</span>
              <span className="text-lg font-bold text-ink">
                {stats.parStatut[s.value as StatutDossier]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <div className="flex items-center justify-between border-b border-edge-soft px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Clock className="h-5 w-5 text-ink-dim" />
              Dossiers récents
            </h2>
            <Link href="/dossiers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Voir tout <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.dossiersRecents.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-dim">Aucun dossier</p>
          ) : (
            <div className="divide-y divide-edge-soft">
              {stats.dossiersRecents.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-6 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{d.numeroCH}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatClientLabel(getClientDisplayFromDossier(d))} — {formatDate(d.dateCreation)}
                    </p>
                  </div>
                  <span className="flex-shrink-0">
                    <DossierStatusBadge statut={d.statut} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <div className="flex items-center justify-between border-b border-edge-soft px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Truck className="h-5 w-5 text-ink-dim" />
              Locations récentes
            </h2>
            <Link href="/locations" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Voir tout <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.locationsRecentes.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-dim">Aucune location</p>
          ) : (
            <div className="divide-y divide-edge-soft">
              {stats.locationsRecentes.map((l) => (
                <Link
                  key={l.id}
                  href={`/locations/${l.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-6 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{l.referenceCamion}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatClientLabel(getClientDisplayFromLocation(l))} — {formatMontant(l.montantTotal)}
                    </p>
                  </div>
                  <span className="flex-shrink-0">
                    <LocationStatusBadge statut={l.statut} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <div className="flex items-center justify-between border-b border-edge-soft px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <FileText className="h-5 w-5 text-ink-dim" />
              Factures récentes
            </h2>
            <Link href="/factures" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Voir tout <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.facturesRecentes.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-dim">Aucune facture</p>
          ) : (
            <div className="divide-y divide-edge-soft">
              {stats.facturesRecentes.map((f) => (
                <Link
                  key={f.id}
                  href={`/factures/${f.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-6 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.id}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatClientLabel(getClientDisplayFromFacture(f))} — {formatMontant(f.prixTotalTTC)}
                    </p>
                  </div>
                  <span className="flex-shrink-0">
                    <FactureStatusBadge statut={f.statut} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
