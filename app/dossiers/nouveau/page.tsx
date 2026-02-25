'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Plus } from 'lucide-react';
import { saveDossier, getClients, getTypesVehicule } from '@/lib/store';
import { generateId } from '@/lib/utils';
import { dossierRules } from '@/lib/validation';
import { formatClientLabel } from '@/lib/clients';
import type { Dossier, StatutDossier } from '@/lib/types';
import { STATUTS_DOSSIER } from '@/lib/types';
import useForm from '@/hooks/useForm';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { FormInput, FormSelect, FormTextarea, FormFieldset } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const INITIAL = {
  numeroCH: '',
  chassisCH: '',
  annee: '',
  referenceVehicule: '',
  typeVehicule: '',
  clientId: '',
  statut: 'Lance' as StatutDossier,
  notes: '',
};

export default function NouveauDossierPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    setClientOptions(getClients().map((c) => ({ value: c.id, label: formatClientLabel({ nom: c.nom, prenom: c.prenom, telephone: c.telephone }) })));
    setTypeOptions(getTypesVehicule().map((t) => ({ value: t.label, label: t.label })));
    setMounted(true);
  }, []);

  const form = useForm({
    initial: INITIAL,
    rules: dossierRules(),
    onSubmit(vals) {
      const dossier: Dossier = {
        id: generateId(),
        numeroCH: vals.numeroCH.trim(),
        chassisCH: vals.chassisCH.trim(),
        annee: vals.annee.trim(),
        referenceVehicule: vals.referenceVehicule.trim(),
        typeVehicule: vals.typeVehicule.trim(),
        clientId: vals.clientId,
        statut: vals.statut,
        dateCreation: new Date().toISOString(),
        notes: vals.notes.trim(),
      };
      saveDossier(dossier);
      toast.success('Dossier créé avec succès');
      router.push('/dossiers');
    },
  });

  if (!mounted) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Nouveau dossier" subtitle="Créer un nouveau dossier de dédouanement" backHref="/dossiers" />

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormFieldset legend="Numéros administratifs">
            <FormInput label="Numéro CH" required placeholder="CH-001" {...form.getFieldProps('numeroCH')} />
            <FormInput label="Châssis CH" placeholder="Châssis du véhicule" {...form.getFieldProps('chassisCH')} />
            <FormInput label="Année" placeholder="Année" {...form.getFieldProps('annee')} />
          </FormFieldset>

          <FormFieldset legend="Véhicule">
            <FormInput label="Référence" required placeholder="REF-001" {...form.getFieldProps('referenceVehicule')} />
            <FormSelect label="Type de véhicule" options={typeOptions} placeholder="Sélectionner..." {...form.getFieldProps('typeVehicule')} />
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

          <FormFieldset legend="Statut & Observations">
            <FormSelect label="Statut" options={STATUTS_DOSSIER} {...form.getFieldProps('statut')} />
          </FormFieldset>
          <FormTextarea label="Notes / Observations" rows={3} placeholder="Observations éventuelles..." {...form.getFieldProps('notes')} />

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/dossiers" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Créer le dossier</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
