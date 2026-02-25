'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Save, Trash2, FileText, ChevronRight } from 'lucide-react';
import { getDossierById, saveDossier, deleteDossier, getFacturesByDossier, dossierHasFactures, getClients, getTypesVehicule } from '@/lib/store';
import { formatDate, formatDateTime, formatMontant, statutDossierLabel } from '@/lib/utils';
import { getClientDisplayFromDossier, formatClientLabel } from '@/lib/clients';
import { dossierRules } from '@/lib/validation';
import useForm from '@/hooks/useForm';
import { DossierStatusBadge } from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormField';
import DataList from '@/components/ui/DataList';
import type { Dossier, StatutDossier, Facture } from '@/lib/types';
import { STATUTS_DOSSIER, WORKFLOW_ORDRE } from '@/lib/types';
import toast from 'react-hot-toast';

const FIELDS: { name: keyof Omit<Dossier, 'id' | 'dateCreation' | 'dateModification' | 'statut' | 'notes' | 'clientId' | 'typeVehicule' | 'nomClient' | 'prenomClient' | 'telephoneClient'>; label: string; required?: boolean }[] = [
  { name: 'numeroCH', label: 'Numéro CH', required: true },
  { name: 'chassisCH', label: 'Châssis CH' },
  { name: 'annee', label: 'Année' },
  { name: 'referenceVehicule', label: 'Référence Véhicule', required: true },
];

export default function DossierDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);

  const form = useForm({
    initial: {
      numeroCH: '', chassisCH: '', annee: '',
      referenceVehicule: '', typeVehicule: '',
      clientId: '',
      statut: 'Lance' as StatutDossier, notes: '',
    },
    rules: dossierRules(id),
    onSubmit(vals) {
      if (!dossier) return;
      const updated: Dossier = {
        ...dossier,
        numeroCH: vals.numeroCH.trim(),
        chassisCH: vals.chassisCH.trim(),
        annee: vals.annee.trim(),
        referenceVehicule: vals.referenceVehicule.trim(),
        typeVehicule: vals.typeVehicule.trim(),
        clientId: vals.clientId,
        statut: vals.statut,
        notes: vals.notes.trim(),
      };
      saveDossier(updated);
      setDossier(getDossierById(id)!);
      setEditing(false);
      toast.success('Dossier mis à jour');
    },
  });

  useEffect(() => {
    const d = getDossierById(id);
    if (!d) { router.push('/dossiers'); return; }
    setDossier(d);
    setFactures(getFacturesByDossier(id));
    setClientOptions(getClients().map((c) => ({ value: c.id, label: formatClientLabel({ nom: c.nom, prenom: c.prenom, telephone: c.telephone }) })));
    setTypeOptions(getTypesVehicule().map((t) => ({ value: t.label, label: t.label })));
    form.reset({
      numeroCH: d.numeroCH,
      chassisCH: d.chassisCH ?? '',
      annee: d.annee ?? '',
      referenceVehicule: d.referenceVehicule, typeVehicule: d.typeVehicule,
      clientId: d.clientId ?? '',
      statut: d.statut, notes: d.notes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function handleStatusChange(newStatut: StatutDossier) {
    if (!dossier) return;
    const updated = { ...dossier, statut: newStatut };
    saveDossier(updated);
    setDossier(getDossierById(id)!);
    form.setValue('statut', newStatut);
    toast.success(`Statut changé: ${statutDossierLabel(newStatut)}`);
  }

  function tryDelete() {
    if (dossierHasFactures(id)) {
      toast.error('Ce dossier est lié à une ou plusieurs factures et ne peut pas être supprimé.');
      return;
    }
    setShowDelete(true);
  }

  function handleDelete() {
    deleteDossier(id);
    toast.success('Dossier supprimé');
    router.push('/dossiers');
  }

  if (!dossier) return <FullPageSpinner />;

  const currentIdx = WORKFLOW_ORDRE.indexOf(dossier.statut);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Dossier ${dossier.numeroCH}`}
        subtitle={dossier.dateModification ? `Créé le ${formatDate(dossier.dateCreation)} · Modifié le ${formatDateTime(dossier.dateModification)}` : `Créé le ${formatDate(dossier.dateCreation)}`}
        backHref="/dossiers"
        actions={
          <Button variant="secondary" size="icon" onClick={tryDelete} className="text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      {/* Workflow */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-ink">Progression du statut</h2>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUTS_DOSSIER.map((s, i) => {
            const isActive = s.value === dossier.statut;
            const isPast = i < currentIdx;
            return (
              <div key={s.value} className="flex items-center">
                {i > 0 && <ChevronRight className={`mx-1 h-4 w-4 flex-shrink-0 ${isPast ? 'text-green-400' : 'text-ink-dim'}`} />}
                <button
                  onClick={() => handleStatusChange(s.value)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-sm'
                    : isPast ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-emphasis text-ink-muted hover:bg-emphasis'
                  }`}
                >
                  {s.label}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Details / Edit */}
      <Card padding={false}>
        <CardHeader
          title="Informations du dossier"
          actions={!editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
          )}
        />

        {editing ? (
          <form onSubmit={form.handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <FormInput key={field.name} label={field.label} required={field.required} {...form.getFieldProps(field.name)} />
              ))}
              <FormSelect label="Type de véhicule" options={typeOptions} placeholder="Sélectionner..." {...form.getFieldProps('typeVehicule')} />
              <FormSelect label="Client" required options={clientOptions} placeholder="Sélectionner..." {...form.getFieldProps('clientId')} />
              <FormSelect label="Statut" options={STATUTS_DOSSIER} {...form.getFieldProps('statut')} />
            </div>
            <FormTextarea label="Notes" rows={3} {...form.getFieldProps('notes')} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Annuler</Button>
              <Button type="submit" icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <DataList items={[
              ...FIELDS.map(({ name, label }) => ({ label, value: dossier[name] })),
              { label: 'Type de véhicule', value: dossier.typeVehicule || '-' },
              { label: 'Client', value: formatClientLabel(getClientDisplayFromDossier(dossier)) },
            ]} />
            {dossier.notes && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-xs font-medium uppercase text-ink-muted">Notes</p>
                <p className="mt-1 text-sm text-ink-secondary">{dossier.notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Factures */}
      <Card padding={false}>
        <CardHeader
          title="Factures associées"
          actions={
            <LinkButton href={`/factures/nouvelle?dossierId=${id}`} size="sm" icon={<FileText className="h-4 w-4" />}>
              Nouvelle facture
            </LinkButton>
          }
        />
        {factures.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-dim">Aucune facture associée à ce dossier</p>
        ) : (
          <div className="divide-y divide-edge-soft">
            {factures.map((f) => (
              <Link key={f.id} href={`/factures/${f.id}`} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted">
                <div>
                  <p className="text-sm font-medium text-ink">{f.id}</p>
                  <p className="text-xs text-ink-muted">{formatDate(f.dateFacture)}</p>
                </div>
                <p className="text-sm font-semibold text-ink">{formatMontant(f.prixTotalTTC)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={showDelete}
        title="Supprimer le dossier"
        message={`Êtes-vous sûr de vouloir supprimer le dossier ${dossier.numeroCH} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
