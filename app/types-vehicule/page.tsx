'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Truck } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import SearchBar from '@/components/ui/SearchBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { getTypesVehicule, deleteTypeVehicule, typeVehiculeInUse } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import type { TypeVehicule } from '@/lib/types';
import toast from 'react-hot-toast';

export default function TypesVehiculePage() {
  const [types, setTypes] = useState<TypeVehicule[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setTypes(getTypesVehicule()); }, []);

  const filtered = useMemo(() => {
    let result = types;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.label.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const tA = Math.max(new Date(a.dateCreation || 0).getTime(), new Date(a.dateModification || 0).getTime());
      const tB = Math.max(new Date(b.dateCreation || 0).getTime(), new Date(b.dateModification || 0).getTime());
      return tB - tA;
    });
    return result;
  }, [types, search]);

  function handleDelete() {
    if (!deleteId) return;
    const type = types.find((t) => t.id === deleteId);
    if (type && typeVehiculeInUse(type.label)) {
      toast.error('Ce type est utilisé par des dossiers, factures ou locations.');
      setDeleteId(null);
      return;
    }
    deleteTypeVehicule(deleteId);
    setTypes(getTypesVehicule());
    setDeleteId(null);
    toast.success('Type supprimé');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Types de véhicule"
        subtitle={`${types.length} type(s) au total`}
        actions={
          <LinkButton href="/types-vehicule/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau type</LinkButton>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par libellé..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="Aucun type trouvé"
          description={types.length === 0 ? "Créez votre premier type de véhicule pour l'utiliser dans les dossiers et locations." : "Aucun résultat ne correspond à votre recherche."}
          action={types.length === 0 ? <LinkButton href="/types-vehicule/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau type</LinkButton> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <table className="min-w-full divide-y divide-edge-soft">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Libellé</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Créé le</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Modifié le</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft">
              {filtered.map((t) => (
                <tr key={t.id} className="table-row-hover transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">{t.label}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{t.dateCreation ? formatDate(t.dateCreation) : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{t.dateModification ? formatDate(t.dateModification) : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/types-vehicule/${t.id}`} className="rounded p-1.5 text-ink-dim hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setDeleteId(t.id)} className="rounded p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600" title="Supprimer">
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

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer le type"
        message="Êtes-vous sûr de vouloir supprimer ce type de véhicule ? Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
