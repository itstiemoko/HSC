'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Eye, Users, Pencil, Download } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import SearchBar from '@/components/ui/SearchBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { getClients, deleteClient, clientInUse } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { exportClientsToExcel } from '@/lib/excel';
import type { Client } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setClients(getClients()); }, []);

  const filtered = useMemo(() => {
    let result = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q) ||
        c.telephone.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const tA = Math.max(new Date(a.dateCreation || 0).getTime(), new Date(a.dateModification || 0).getTime());
      const tB = Math.max(new Date(b.dateCreation || 0).getTime(), new Date(b.dateModification || 0).getTime());
      return tB - tA;
    });
    return result;
  }, [clients, search]);

  function handleDelete() {
    if (!deleteId) return;
    if (clientInUse(deleteId)) {
      toast.error('Ce client est utilisé par des dossiers, factures ou locations.');
      setDeleteId(null);
      return;
    }
    deleteClient(deleteId);
    setClients(getClients());
    setDeleteId(null);
    toast.success('Client supprimé');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s) au total`}
        actions={
          <>
            {clients.length > 0 && (
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => {
                  exportClientsToExcel(filtered, `clients_export_${Date.now()}.xlsx`);
                  toast.success('Export Excel terminé');
                }}
              >
                Exporter
              </Button>
            )}
            <LinkButton href="/clients/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau client</LinkButton>
          </>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par nom, prénom, téléphone, email..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Aucun client trouvé"
          description={clients.length === 0 ? "Créez votre premier client pour l'utiliser dans les dossiers, factures et locations." : "Aucun résultat ne correspond à votre recherche."}
          action={clients.length === 0 ? <LinkButton href="/clients/nouveau" icon={<Plus className="h-4 w-4" />}>Nouveau client</LinkButton> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
          <table className="min-w-full divide-y divide-edge-soft">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Créé le</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Modifié le</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft">
              {filtered.map((c) => (
                <tr key={c.id} className="table-row-hover transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">{c.prenom} {c.nom}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">{c.telephone || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{c.email || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{c.dateCreation ? formatDate(c.dateCreation) : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{c.dateModification ? formatDate(c.dateModification) : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/clients/${c.id}`} className="rounded p-1.5 text-ink-dim hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setDeleteId(c.id)} className="rounded p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600" title="Supprimer">
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

      <ConfirmDialog open={!!deleteId} title="Supprimer le client" message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible." confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
