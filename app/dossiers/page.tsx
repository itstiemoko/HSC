'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Download, Trash2, Eye, FolderOpen, ArrowUpDown } from 'lucide-react';
import { DossierStatusBadge } from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import SearchBar from '@/components/ui/SearchBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getDossiers, deleteDossier, dossierHasFactures } from '@/lib/store';
import { exportDossiersToExcel } from '@/lib/excel';
import { formatDate } from '@/lib/utils';
import { getClientDisplayFromDossier, formatClientLabel } from '@/lib/clients';
import type { Dossier, StatutDossier } from '@/lib/types';
import { STATUTS_DOSSIER } from '@/lib/types';
import toast from 'react-hot-toast';

type SortKey = 'dateCreation' | 'statut' | 'nomClient' | 'numeroCH';

const TH_BASE = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted';
const TH_SORT = `${TH_BASE} cursor-pointer hover:text-ink-secondary`;

function DossiersContent() {
  const searchParams = useSearchParams();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>(
    searchParams.get('statut') || 'all',
  );
  const [sortKey, setSortKey] = useState<SortKey>('dateCreation');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setDossiers(getDossiers()); }, []);

  const filtered = useMemo(() => {
    let result = [...dossiers];
    if (statutFilter !== 'all') result = result.filter((d) => d.statut === statutFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => {
        const c = getClientDisplayFromDossier(d);
        const clientStr = `${c.nom} ${c.prenom} ${c.telephone}`.toLowerCase();
        return d.numeroCH.toLowerCase().includes(q) || clientStr.includes(q) || d.referenceVehicule.toLowerCase().includes(q);
      });
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'dateCreation') {
        const tA = Math.max(new Date(a.dateCreation).getTime(), new Date(a.dateModification || 0).getTime());
        const tB = Math.max(new Date(b.dateCreation).getTime(), new Date(b.dateModification || 0).getTime());
        cmp = tA - tB;
      } else if (sortKey === 'nomClient') cmp = formatClientLabel(getClientDisplayFromDossier(a)).localeCompare(formatClientLabel(getClientDisplayFromDossier(b)));
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [dossiers, search, statutFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function tryDelete(id: string) {
    if (dossierHasFactures(id)) {
      toast.error('Ce dossier est lié à une ou plusieurs factures et ne peut pas être supprimé.');
      return;
    }
    setDeleteId(id);
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteDossier(deleteId);
    setDossiers(getDossiers());
    setDeleteId(null);
    toast.success('Dossier supprimé');
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
        title="Dossiers"
        subtitle={`${dossiers.length} dossier(s) au total`}
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => {
            if (filtered.length === 0) { toast.error('Aucun dossier à exporter'); return; }
            exportDossiersToExcel(filtered, `dossiers_export_${Date.now()}.xlsx`); toast.success('Export Excel terminé');
          }}>
            Exporter
          </Button>
          <LinkButton href="/dossiers/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau dossier</LinkButton>
        </>}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par N° CH, nom, référence, téléphone..."
        filterValue={statutFilter}
        onFilterChange={setStatutFilter}
        filterOptions={STATUTS_DOSSIER}
        filterAllLabel="Tous les statuts"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Aucun dossier trouvé"
          description={dossiers.length === 0 ? "Commencez par créer un dossier ou importez un fichier Excel." : "Aucun résultat ne correspond à votre recherche."}
          action={dossiers.length === 0 ? <LinkButton href="/dossiers/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau dossier</LinkButton> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
          <table className="min-w-full divide-y divide-edge-soft">
            <thead className="bg-muted">
              <tr>
                <SortTh sortKey="numeroCH" label="N° CH" />
                <SortTh sortKey="nomClient" label="Client" />
                <th className={TH_BASE}>Véhicule</th>
                <th className={TH_BASE}>Téléphone</th>
                <SortTh sortKey="statut" label="Statut" />
                <SortTh sortKey="dateCreation" label="Date" />
                <th className={`${TH_BASE} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft">
              {filtered.map((d) => (
                <tr key={d.id} className="table-row-hover transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                    <Link href={`/dossiers/${d.id}`} className="hover:underline">
                      {d.numeroCH}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">{formatClientLabel(getClientDisplayFromDossier(d))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">
                    {d.referenceVehicule}
                    {d.typeVehicule && <span className="ml-1 text-ink-dim">({d.typeVehicule})</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{getClientDisplayFromDossier(d).telephone || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3"><DossierStatusBadge statut={d.statut} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{formatDate(d.dateCreation)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dossiers/${d.id}`} className="rounded p-1.5 text-ink-dim hover:bg-blue-50 hover:text-blue-600" title="Voir / Modifier">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => tryDelete(d.id)} className="rounded p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Supprimer le dossier" message="Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible." confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

export default function DossiersPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DossiersContent />
    </Suspense>
  );
}
