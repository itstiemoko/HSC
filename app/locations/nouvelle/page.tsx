'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Plus, Trash2 } from 'lucide-react';
import { saveLocation, getClients, getTypesVehicule } from '@/lib/store';
import { generateId, formatMontant } from '@/lib/utils';
import { locationRules } from '@/lib/validation';
import { formatClientLabel } from '@/lib/clients';
import type { Location, StatutLocation } from '@/lib/types';
import { STATUTS_LOCATION } from '@/lib/types';
import useForm from '@/hooks/useForm';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormInput, FormSelect, FormTextarea, FormFieldset } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { FullPageSpinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function NouvelleLocationPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [depensesLignes, setDepensesLignes] = useState<Array<{ id: string; libelle: string; montant: string }>>([
    { id: generateId(), libelle: '', montant: '' },
  ]);

  useEffect(() => {
    setClientOptions(getClients().map((c) => ({ value: c.id, label: formatClientLabel({ nom: c.nom, prenom: c.prenom, telephone: c.telephone }) })));
    setTypeOptions(getTypesVehicule().map((t) => ({ value: t.label, label: t.label })));
    setMounted(true);
  }, []);

  const form = useForm({
    initial: {
      referenceCamion: '',
      typeCamion: '',
      clientId: '',
      dateDebut: '',
      dateFin: '',
      montantTotal: '',
      statut: 'En_cours' as StatutLocation,
      notes: '',
    },
    rules: locationRules(),
    onSubmit(vals) {
      const lignesNettoyees = depensesLignes
        .map((d) => ({ ...d, libelle: d.libelle.trim(), montant: parseFloat(d.montant) || 0 }))
        .filter((d) => d.libelle || d.montant > 0);
      const totalDepenses = lignesNettoyees.reduce((sum, d) => sum + d.montant, 0);

      const location: Location = {
        id: generateId(),
        referenceCamion: vals.referenceCamion.trim(),
        typeCamion: vals.typeCamion.trim(),
        clientId: vals.clientId,
        dateDebut: vals.dateDebut,
        dateFin: vals.dateFin || vals.dateDebut,
        montantTotal: parseFloat(vals.montantTotal),
        depensesLignes: lignesNettoyees,
        depenses: totalDepenses,
        statut: vals.statut,
        dateCreation: new Date().toISOString(),
        notes: vals.notes.trim(),
      };
      saveLocation(location);
      toast.success('Location créée avec succès');
      router.push('/locations');
    },
  });

  useEffect(() => {
    if (mounted && !form.values.dateDebut) {
      form.setValue('dateDebut', new Date().toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return <FullPageSpinner />;

  const totalDepenses = depensesLignes.reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);
  const montantTotal = parseFloat(form.values.montantTotal) || 0;
  const benefice = montantTotal - totalDepenses;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Nouvelle location" subtitle="Créer une location de camion" backHref="/locations" />

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormFieldset legend="Camion">
            <FormInput label="Référence camion" required placeholder="CAM-001" {...form.getFieldProps('referenceCamion')} />
            <FormSelect label="Type de camion" options={typeOptions} placeholder="Sélectionner..." {...form.getFieldProps('typeCamion')} />
          </FormFieldset>

          <FormFieldset legend="Client">
            <div className="flex gap-2">
              <FormSelect
                label="Client"
                required
                options={clientOptions}
                placeholder="Sélectionner un client..."
                className="flex-1"
                {...form.getFieldProps('clientId')}
              />
              <Link
                href="/clients/nouveau"
                className="mt-6 flex items-center gap-1 self-start rounded-lg border border-edge-soft px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Nouveau
              </Link>
            </div>
          </FormFieldset>

          <FormFieldset legend="Période & Montant">
            <FormInput label="Date début" required type="date" {...form.getFieldProps('dateDebut')} />
            <FormInput label="Date fin" type="date" {...form.getFieldProps('dateFin')} />
            <FormInput label="Montant total (FCFA)" required type="number" min="0" step="1" placeholder="0" {...form.getFieldProps('montantTotal')} />
          </FormFieldset>

          <FormFieldset legend="Dépenses">
            {depensesLignes.map((depense) => (
              <div key={depense.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]">
                <FormInput
                  name={`depense_libelle_${depense.id}`}
                  label="Libellé"
                  placeholder="Carburant, Frais de route..."
                  value={depense.libelle}
                  onChange={(e) => setDepensesLignes((prev) => prev.map((d) => (d.id === depense.id ? { ...d, libelle: e.target.value } : d)))}
                />
                <FormInput
                  name={`depense_montant_${depense.id}`}
                  label="Montant (FCFA)"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={depense.montant}
                  onChange={(e) => setDepensesLignes((prev) => prev.map((d) => (d.id === depense.id ? { ...d, montant: e.target.value } : d)))}
                />
                <button
                  type="button"
                  onClick={() => setDepensesLignes((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== depense.id) : prev))}
                  className="mt-6 rounded p-2 text-ink-dim hover:bg-red-50 hover:text-red-600"
                  title="Supprimer la dépense"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-ink-secondary">Total dépenses: {formatMontant(totalDepenses)}</span>
              <span className={benefice >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                Bénéfice: {formatMontant(benefice)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDepensesLignes((prev) => [...prev, { id: generateId(), libelle: '', montant: '' }])}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-edge-soft px-3 py-2 text-sm text-ink-secondary hover:border-blue-300 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" /> Ajouter une dépense
            </button>
          </FormFieldset>

          <FormFieldset legend="Statut & Observations">
            <FormSelect label="Statut" options={STATUTS_LOCATION} {...form.getFieldProps('statut')} />
          </FormFieldset>
          <FormTextarea label="Notes" rows={3} placeholder="Observations éventuelles..." {...form.getFieldProps('notes')} />

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/locations" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Créer la location</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
