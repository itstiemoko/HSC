'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Download, Trash2, Eye, FileText, ArrowUpDown } from 'lucide-react';
import { FactureStatusBadge } from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import SearchBar from '@/components/ui/SearchBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { getFactures, deleteFacture } from '@/lib/store';
import { exportFacturesToExcel } from '@/lib/excel';
import { formatDate, formatMontant } from '@/lib/utils';
import { getClientDisplayFromFacture, formatClientLabel } from '@/lib/clients';
import type { Facture, StatutFacture } from '@/lib/types';
import { STATUTS_FACTURE } from '@/lib/types';
import toast from 'react-hot-toast';

type SortKey = 'dateCreation' | 'dateFacture' | 'prixTotalTTC' | 'nomClient';

const TH_BASE = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted';
const TH_SORT = `${TH_BASE} cursor-pointer hover:text-ink-secondary`;

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('dateCreation');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { setFactures(getFactures()); }, []);

  const filtered = useMemo(() => {
    let result = [...factures];
    if (statutFilter !== 'all') result = result.filter((f) => f.statut === statutFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => {
        const c = getClientDisplayFromFacture(f);
        const clientStr = `${c.nom} ${c.prenom} ${c.telephone}`.toLowerCase();
        return f.id.toLowerCase().includes(q) || clientStr.includes(q) || f.referenceVehicule.toLowerCase().includes(q);
      });
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'dateCreation') {
        const tA = Math.max(
          new Date(a.dateCreation || 0).getTime(),
          new Date(a.dateModification || 0).getTime(),
          new Date(a.dateFacture).getTime()
        );
        const tB = Math.max(
          new Date(b.dateCreation || 0).getTime(),
          new Date(b.dateModification || 0).getTime(),
          new Date(b.dateFacture).getTime()
        );
        cmp = tA - tB;
      } else if (sortKey === 'dateFacture') cmp = new Date(a.dateFacture).getTime() - new Date(b.dateFacture).getTime();
      else if (sortKey === 'prixTotalTTC') cmp = a.prixTotalTTC - b.prixTotalTTC;
      else cmp = formatClientLabel(getClientDisplayFromFacture(a)).localeCompare(formatClientLabel(getClientDisplayFromFacture(b)));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [factures, search, statutFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteFacture(deleteId);
    setFactures(getFactures());
    setDeleteId(null);
    toast.success('Facture supprimée');
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
        title="Factures"
        subtitle={`${factures.length} facture(s) au total`}
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => {
            if (filtered.length === 0) { toast.error('Aucune facture à exporter'); return; }
            exportFacturesToExcel(filtered, `factures_export_${Date.now()}.xlsx`); toast.success('Export Excel terminé');
          }}>
            Exporter
          </Button>
          <LinkButton href="/factures/nouvelle" icon={<Plus className="h-4 w-4" />}>Nouvelle facture</LinkButton>
        </>}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par N° facture, nom, référence..."
        filterValue={statutFilter}
        onFilterChange={setStatutFilter}
        filterOptions={STATUTS_FACTURE}
        filterAllLabel="Tous les statuts"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Aucune facture trouvée"
          description={factures.length === 0 ? "Créez votre première facture depuis un dossier existant." : "Aucun résultat ne correspond à votre recherche."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <table className="min-w-full divide-y divide-edge-soft">
            <thead className="bg-muted">
              <tr>
                <th className={TH_BASE}>N° Facture</th>
                <SortTh sortKey="nomClient" label="Client" />
                <SortTh sortKey="prixTotalTTC" label="Montant" />
                <th className={`${TH_BASE} text-right`}>Payé</th>
                <th className={`${TH_BASE} text-right`}>Restant</th>
                <th className={TH_BASE}>Statut</th>
                <SortTh sortKey="dateCreation" label="Date" />
                <th className={`${TH_BASE} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft">
              {filtered.map((f) => (
                <tr key={f.id} className="table-row-hover transition-colors">
                  <td className="max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                    <Link href={`/factures/${f.id}`} className="hover:underline">{f.id}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">{formatClientLabel(getClientDisplayFromFacture(f))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-ink">{formatMontant(f.prixTotalTTC)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-green-600 dark:text-green-400">{formatMontant(f.montantPaye)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-amber-600 dark:text-amber-400">{formatMontant(f.montantRestant)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><FactureStatusBadge statut={f.statut} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{formatDate(f.dateCreation || f.dateModification || f.dateFacture)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/factures/${f.id}`} className="rounded p-1.5 text-ink-dim hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></Link>
                      <button onClick={() => setDeleteId(f.id)} className="rounded p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

      <ConfirmDialog open={!!deleteId} title="Supprimer la facture" message="Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible." confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
