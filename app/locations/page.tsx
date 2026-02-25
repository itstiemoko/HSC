'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Download, Trash2, Eye, Truck, ArrowUpDown } from 'lucide-react';
import { LocationStatusBadge } from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import SearchBar from '@/components/ui/SearchBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getLocations, deleteLocation } from '@/lib/store';
import { exportLocationsToExcel } from '@/lib/excel';
import { formatDate, formatMontant } from '@/lib/utils';
import { getClientDisplayFromLocation, formatClientLabel } from '@/lib/clients';
import type { Location } from '@/lib/types';
import { STATUTS_LOCATION } from '@/lib/types';
import toast from 'react-hot-toast';

type SortKey = 'dateCreation' | 'statut' | 'nomClient' | 'referenceCamion' | 'montantTotal' | 'benefice';

const TH_BASE = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted';
const TH_SORT = `${TH_BASE} cursor-pointer hover:text-ink-secondary`;

function LocationsContent() {
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>(
    searchParams.get('statut') || 'all',
  );
  const [sortKey, setSortKey] = useState<SortKey>('dateCreation');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setLocations(getLocations()); }, []);

  const filtered = useMemo(() => {
    let result = [...locations];
    if (statutFilter !== 'all') result = result.filter((l) => l.statut === statutFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const c = getClientDisplayFromLocation(l);
        const clientStr = `${c.nom} ${c.prenom} ${c.telephone}`.toLowerCase();
        return l.referenceCamion.toLowerCase().includes(q) || clientStr.includes(q) || (l.typeCamion ?? '').toLowerCase().includes(q);
      });
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'dateCreation') {
        const tA = Math.max(new Date(a.dateCreation).getTime(), new Date(a.dateModification || 0).getTime());
        const tB = Math.max(new Date(b.dateCreation).getTime(), new Date(b.dateModification || 0).getTime());
        cmp = tA - tB;
      } else if (sortKey === 'montantTotal') cmp = a.montantTotal - b.montantTotal;
      else if (sortKey === 'benefice') {
        const depA = a.depenses ?? a.depensesLignes?.reduce((sum, d) => sum + (d.montant || 0), 0) ?? 0;
        const depB = b.depenses ?? b.depensesLignes?.reduce((sum, d) => sum + (d.montant || 0), 0) ?? 0;
        cmp = (a.montantTotal - depA) - (b.montantTotal - depB);
      }
      else if (sortKey === 'nomClient') cmp = formatClientLabel(getClientDisplayFromLocation(a)).localeCompare(formatClientLabel(getClientDisplayFromLocation(b)));
      else cmp = (a[sortKey] as string).localeCompare((b[sortKey] as string) ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [locations, search, statutFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteLocation(deleteId);
    setLocations(getLocations());
    setDeleteId(null);
    toast.success('Location supprimée');
  }

  function SortTh({ sortKey: sk, label }: { sortKey: SortKey; label: string }) {
    return (
      <th className={TH_SORT} onClick={() => toggleSort(sk)}>
        <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Location de camions"
        subtitle={`${locations.length} location(s) au total`}
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => {
            if (filtered.length === 0) { toast.error('Aucune location à exporter'); return; }
            exportLocationsToExcel(filtered, `locations_export_${Date.now()}.xlsx`); toast.success('Export Excel terminé');
          }}>
            Exporter
          </Button>
          <LinkButton href="/locations/nouvelle" icon={<Plus className="h-4 w-4" />}>Nouvelle location</LinkButton>
        </>}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par référence, client, type..."
        filterValue={statutFilter}
        onFilterChange={setStatutFilter}
        filterOptions={STATUTS_LOCATION}
        filterAllLabel="Tous les statuts"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="Aucune location trouvée"
          description={locations.length === 0 ? "Créez votre première location de camion." : "Aucun résultat ne correspond à votre recherche."}
          action={locations.length === 0 ? <LinkButton href="/locations/nouvelle" icon={<Plus className="h-4 w-4" />}>Nouvelle location</LinkButton> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <table className="min-w-full divide-y divide-edge-soft">
            <thead className="bg-muted">
              <tr>
                <SortTh sortKey="referenceCamion" label="Référence" />
                <SortTh sortKey="nomClient" label="Client" />
                <th className={TH_BASE}>Type</th>
                <th className={TH_BASE}>Période</th>
                <SortTh sortKey="montantTotal" label="Montant location" />
                <SortTh sortKey="benefice" label="Bénéfice" />
                <SortTh sortKey="statut" label="Statut" />
                <th className={`${TH_BASE} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft">
              {filtered.map((l) => (
                <tr key={l.id} className="table-row-hover transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                    <Link href={`/locations/${l.id}`} className="hover:underline">
                      {l.referenceCamion}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">{formatClientLabel(getClientDisplayFromLocation(l))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{l.typeCamion || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{formatDate(l.dateDebut)} → {formatDate(l.dateFin)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-ink">{formatMontant(l.montantTotal)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums ${
                    (l.montantTotal - (l.depenses ?? l.depensesLignes?.reduce((sum, d) => sum + (d.montant || 0), 0) ?? 0)) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatMontant(l.montantTotal - (l.depenses ?? l.depensesLignes?.reduce((sum, d) => sum + (d.montant || 0), 0) ?? 0))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3"><LocationStatusBadge statut={l.statut} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/locations/${l.id}`} className="rounded p-1.5 text-ink-dim hover:bg-blue-50 hover:text-blue-600" title="Voir / Modifier">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setDeleteId(l.id)} className="rounded p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-edge-soft px-4 py-2 text-xs text-ink-dim">
            M = Million, Md = Milliard (1 000 millions). Devise : FCFA.
          </p>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Supprimer la location" message="Êtes-vous sûr de vouloir supprimer cette location ? Cette action est irréversible." confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LocationsContent />
    </Suspense>
  );
}
