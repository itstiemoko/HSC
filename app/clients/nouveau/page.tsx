'use client';

import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { saveClient } from '@/lib/store';
import { generateId } from '@/lib/utils';
import { requiredString, optionalTelephone } from '@/lib/validation';
import type { Client } from '@/lib/types';
import useForm from '@/hooks/useForm';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormInput, FormFieldset } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

const INITIAL = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresse: '',
};

export default function NouveauClientPage() {
  const router = useRouter();

  const form = useForm({
    initial: INITIAL,
    rules: {
      nom: requiredString('Le nom'),
      prenom: requiredString('Le prénom'),
      telephone: optionalTelephone(),
    },
    onSubmit(vals) {
      const client: Client = {
        id: generateId(),
        nom: vals.nom.trim(),
        prenom: vals.prenom.trim(),
        telephone: vals.telephone.trim(),
        email: vals.email?.trim() || undefined,
        adresse: vals.adresse?.trim() || undefined,
      };
      saveClient(client);
      toast.success('Client créé avec succès');
      router.push('/clients');
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Nouveau client" subtitle="Créer un client réutilisable" backHref="/clients" />

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormFieldset legend="Identité">
            <FormInput label="Nom" required {...form.getFieldProps('nom')} />
            <FormInput label="Prénom" required {...form.getFieldProps('prenom')} />
          </FormFieldset>

          <FormFieldset legend="Contact">
            <FormInput label="Téléphone" placeholder="+223 70 00 00 00" {...form.getFieldProps('telephone')} />
            <FormInput label="Email" type="email" placeholder="client@email.com" {...form.getFieldProps('email')} />
            <FormInput label="Adresse" placeholder="Bamako, Mali" {...form.getFieldProps('adresse')} />
          </FormFieldset>

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/clients" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Créer le client</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
