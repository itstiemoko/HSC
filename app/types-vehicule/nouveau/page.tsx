'use client';

import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { saveTypeVehicule } from '@/lib/store';
import { generateId } from '@/lib/utils';
import { requiredString } from '@/lib/validation';
import type { TypeVehicule } from '@/lib/types';
import useForm from '@/hooks/useForm';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

export default function NouveauTypeVehiculePage() {
  const router = useRouter();

  const form = useForm({
    initial: { label: '' },
    rules: { label: requiredString('Le libellé') },
    onSubmit(vals) {
      const type: TypeVehicule = {
        id: generateId(),
        label: vals.label.trim(),
      };
      saveTypeVehicule(type);
      toast.success('Type créé avec succès');
      router.push('/types-vehicule');
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Nouveau type de véhicule" subtitle="Créer un type réutilisable dans les dossiers et locations" backHref="/types-vehicule" />

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormInput label="Libellé" required placeholder="Ex: Berline, SUV, Pick-up..." {...form.getFieldProps('label')} />

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/types-vehicule" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Créer le type</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
