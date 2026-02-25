'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Trash2, Plus } from 'lucide-react';
import { getLocationById, saveLocation, deleteLocation, getClients, getTypesVehicule } from '@/lib/store';
import { locationRules } from '@/lib/validation';
import useForm from '@/hooks/useForm';
import { LocationStatusBadge } from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormField';
import DataList from '@/components/ui/DataList';
import { formatDate, formatDateTime, formatMontant, generateId } from '@/lib/utils';
import { getClientDisplayFromLocation, formatClientLabel } from '@/lib/clients';
import type { Location, StatutLocation } from '@/lib/types';
import { STATUTS_LOCATION } from '@/lib/types';
import toast from 'react-hot-toast';

const FIELDS: { name: keyof Omit<Location, 'id' | 'dateCreation' | 'dateModification' | 'clientId' | 'typeCamion' | 'nomClient' | 'prenomClient' | 'telephoneClient'>; label: string; required?: boolean }[] = [
  { name: 'referenceCamion', label: 'Référence camion', required: true },
  { name: 'dateDebut', label: 'Date début', required: true },
  { name: 'dateFin', label: 'Date fin', required: true },
  { name: 'montantTotal', label: 'Montant total', required: true },
];

export default function LocationDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [location, setLocation] = useState<Location | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [depensesLignes, setDepensesLignes] = useState<Array<{ id: string; libelle: string; montant: string }>>([]);

  const form = useForm({
    initial: {
      referenceCamion: '', typeCamion: '', clientId: '',
      dateDebut: '', dateFin: '', montantTotal: '', statut: 'En_cours' as StatutLocation, notes: '',
    },
    rules: locationRules(),
    onSubmit(vals) {
      if (!location) return;
      const lignesNettoyees = depensesLignes
        .map((d) => ({ ...d, libelle: d.libelle.trim(), montant: parseFloat(d.montant) || 0 }))
        .filter((d) => d.libelle || d.montant > 0);
      const totalDepenses = lignesNettoyees.reduce((sum, d) => sum + d.montant, 0);
      const updated: Location = {
        ...location,
        referenceCamion: vals.referenceCamion.trim(),
        typeCamion: vals.typeCamion.trim(),
        clientId: vals.clientId,
        dateDebut: vals.dateDebut,
        dateFin: vals.dateFin,
        montantTotal: parseFloat(vals.montantTotal),
        depensesLignes: lignesNettoyees,
        depenses: totalDepenses,
        statut: vals.statut,
        notes: vals.notes.trim(),
      };
      saveLocation(updated);
      setLocation(getLocationById(id)!);
      setEditing(false);
      toast.success('Location mise à jour');
    },
  });

  useEffect(() => {
    const l = getLocationById(id);
    if (!l) { router.push('/locations'); return; }
    setLocation(l);
    setClientOptions(getClients().map((c) => ({ value: c.id, label: formatClientLabel({ nom: c.nom, prenom: c.prenom, telephone: c.telephone }) })));
    setTypeOptions(getTypesVehicule().map((t) => ({ value: t.label, label: t.label })));
    form.reset({
      referenceCamion: l.referenceCamion, typeCamion: l.typeCamion,
      clientId: l.clientId ?? '',
      dateDebut: l.dateDebut, dateFin: l.dateFin, montantTotal: String(l.montantTotal),
      statut: l.statut, notes: l.notes,
    });
    const existingLignes = (l.depensesLignes && l.depensesLignes.length > 0)
      ? l.depensesLignes
      : ((l.depenses ?? 0) > 0 ? [{ id: generateId(), libelle: 'Dépenses diverses', montant: l.depenses }] : []);
    setDepensesLignes(existingLignes.map((d) => ({ id: d.id || generateId(), libelle: d.libelle || '', montant: String(d.montant || 0) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function handleDelete() {
    deleteLocation(id);
    toast.success('Location supprimée');
    router.push('/locations');
  }

  if (!location) return <FullPageSpinner />;
  const totalDepenses = (location.depensesLignes && location.depensesLignes.length > 0)
    ? location.depensesLignes.reduce((sum, d) => sum + (d.montant || 0), 0)
    : (location.depenses ?? 0);
  const benefice = location.montantTotal - totalDepenses;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Location ${location.referenceCamion}`}
        subtitle={location.dateModification ? `Créée le ${formatDate(location.dateCreation)} · Modifiée le ${formatDateTime(location.dateModification)}` : `Créée le ${formatDate(location.dateCreation)}`}
        backHref="/locations"
        actions={
          <Button variant="secondary" size="icon" onClick={() => setShowDelete(true)} className="text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Montant location</p>
            <p className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{formatMontant(location.montantTotal)}</p>
          </div>
          <LocationStatusBadge statut={location.statut} />
        </div>
        <p className="mt-4 border-t border-edge-soft pt-3 text-xs text-ink-dim">
          M = Million, Md = Milliard (1 000 millions). Devise : FCFA.
        </p>
      </Card>

      <Card padding={false}>
        <CardHeader
          title="Informations de la location"
          actions={!editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
          )}
        />

        {editing ? (
          <form onSubmit={form.handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Référence camion" required {...form.getFieldProps('referenceCamion')} />
              <FormSelect label="Type de camion" options={typeOptions} placeholder="Sélectionner..." {...form.getFieldProps('typeCamion')} />
              <FormSelect label="Client" required options={clientOptions} placeholder="Sélectionner..." {...form.getFieldProps('clientId')} />
              {FIELDS.map((field) => (
                <FormInput
                  key={field.name}
                  label={field.label}
                  required={field.required}
                  type={['dateDebut', 'dateFin'].includes(field.name) ? 'date' : ['montantTotal'].includes(field.name) ? 'number' : 'text'}
                  {...form.getFieldProps(field.name)}
                />
              ))}
              <FormSelect label="Statut" options={STATUTS_LOCATION} {...form.getFieldProps('statut')} />
            </div>
            <div className="space-y-3 rounded-lg bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Dépenses</p>
              {depensesLignes.length === 0 && (
                <p className="text-sm text-ink-dim">Aucune dépense enregistrée.</p>
              )}
              {depensesLignes.map((depense) => (
                <div key={depense.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <FormInput
                    label="Libellé"
                    placeholder="Carburant, Frais de route..."
                    value={depense.libelle}
                    onChange={(e) => setDepensesLignes((prev) => prev.map((d) => (d.id === depense.id ? { ...d, libelle: e.target.value } : d)))}
                  />
                  <FormInput
                    label="Montant (FCFA)"
                    type="number"
                    min="0"
                    step="1"
                    value={depense.montant}
                    onChange={(e) => setDepensesLignes((prev) => prev.map((d) => (d.id === depense.id ? { ...d, montant: e.target.value } : d)))}
                  />
                  <button
                    type="button"
                    onClick={() => setDepensesLignes((prev) => prev.filter((d) => d.id !== depense.id))}
                    className="mt-6 rounded p-2 text-ink-dim hover:bg-red-50 hover:text-red-600"
                    title="Supprimer la dépense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-edge-soft">
                <span className="text-ink-secondary">
                  Total dépenses: {formatMontant(depensesLignes.reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0))}
                </span>
                <button
                  type="button"
                  onClick={() => setDepensesLignes((prev) => [...prev, { id: generateId(), libelle: '', montant: '' }])}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-edge-soft px-2 py-1 text-xs text-ink-secondary hover:border-blue-300 hover:text-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
              </div>
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
              { label: 'Référence camion', value: location.referenceCamion },
              { label: 'Type de camion', value: location.typeCamion || '-' },
              { label: 'Client', value: formatClientLabel(getClientDisplayFromLocation(location)) },
              ...FIELDS.filter((f) => f.name !== 'referenceCamion').map(({ name, label }) => ({
                label,
                value: name === 'montantTotal' ? formatMontant(location[name]) : location[name],
              })),
              { label: 'Total dépenses', value: formatMontant(totalDepenses) },
              { label: 'Bénéfice', value: formatMontant(benefice) },
            ]} />
            {location.depensesLignes && location.depensesLignes.length > 0 && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-xs font-medium uppercase text-ink-muted">Détails des dépenses</p>
                <div className="mt-2 space-y-1">
                  {location.depensesLignes.map((d) => (
                    <p key={d.id} className="text-sm text-ink-secondary">
                      {d.libelle || 'Dépense'}: {formatMontant(d.montant || 0)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {location.notes && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-xs font-medium uppercase text-ink-muted">Notes</p>
                <p className="mt-1 text-sm text-ink-secondary">{location.notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={showDelete}
        title="Supprimer la location"
        message={`Êtes-vous sûr de vouloir supprimer la location ${location.referenceCamion} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
