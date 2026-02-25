'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Building2, Download, Trash2, Truck, ArrowRight } from 'lucide-react';
import { getEntreprise, saveEntreprise, getDossiers, getFactures, getLocations } from '@/lib/store';
import { exportFullReport } from '@/lib/excel';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormInput } from '@/components/ui/FormField';
import useForm from '@/hooks/useForm';
import type { EntrepriseInfo } from '@/lib/types';
import toast from 'react-hot-toast';

const ENTREPRISE_FIELDS: { name: keyof EntrepriseInfo; label: string; placeholder: string; type?: string }[] = [
  { name: 'nom', label: "Nom de l'entreprise", placeholder: 'Ma Société SARL' },
  { name: 'adresse', label: 'Adresse', placeholder: 'Bamako, Mali' },
  { name: 'telephone', label: 'Téléphone', placeholder: '+223 XX XX XX XX' },
  { name: 'email', label: 'Email', placeholder: 'contact@entreprise.com', type: 'email' },
];

export default function ParametresPage() {
  const [showClear, setShowClear] = useState(false);

  const form = useForm<EntrepriseInfo>({
    initial: { nom: '', adresse: '', telephone: '', email: '' },
    onSubmit(vals) {
      saveEntreprise(vals);
      toast.success('Paramètres enregistrés');
    },
  });

  useEffect(() => { form.reset(getEntreprise()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Paramètres" subtitle="Configurez les informations de votre entreprise" />

      <form onSubmit={form.handleSubmit}>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Informations entreprise</h2>
              <p className="text-xs text-ink-muted">Ces informations apparaissent sur les factures PDF</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ENTREPRISE_FIELDS.map((field) => (
              <FormInput key={field.name} label={field.label} placeholder={field.placeholder} type={field.type || 'text'} {...form.getFieldProps(field.name)} />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </Card>
      </form>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Truck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Types de véhicule</h2>
              <p className="text-xs text-ink-muted">Créez et gérez les types utilisés dans les dossiers et locations</p>
            </div>
          </div>
          <Link
            href="/types-vehicule"
            className="flex items-center gap-1 rounded-lg border border-edge-soft px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-muted"
          >
            Gérer les types <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink">Export complet</h2>
        <p className="mt-1 text-sm text-ink-muted">Exportez l&apos;ensemble de vos données dans un fichier Excel</p>
        <Button variant="secondary" className="mt-4" icon={<Download className="h-4 w-4" />} onClick={() => {
          const d = getDossiers(); const f = getFactures(); const l = getLocations();
          if (d.length === 0 && f.length === 0 && l.length === 0) { toast.error('Aucune donnée à exporter'); return; }
          exportFullReport(d, f, l); toast.success('Rapport complet exporté');
        }}>
          Exporter le rapport complet
        </Button>
      </Card>

      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">Zone de danger</h2>
        <p className="mt-1 text-sm text-red-700">Supprimez toutes les données locales. Cette action est irréversible.</p>
        <Button variant="danger" className="mt-4" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowClear(true)}>
          Supprimer toutes les données
        </Button>
      </div>

      <ConfirmDialog
        open={showClear}
        title="Supprimer toutes les données"
        message="Êtes-vous absolument sûr ? Toutes les données seront définitivement supprimées."
        confirmLabel="Tout supprimer"
        danger
        onConfirm={() => {
          localStorage.removeItem('douanapp_dossiers');
          localStorage.removeItem('douanapp_factures');
          localStorage.removeItem('douanapp_locations');
          localStorage.removeItem('douanapp_clients');
          localStorage.removeItem('douanapp_types_vehicule');
          setShowClear(false);
          toast.success('Toutes les données ont été supprimées');
        }}
        onCancel={() => setShowClear(false)}
      />
    </div>
  );
}
