'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';
import { getClientById, saveClient, deleteClient, clientInUse } from '@/lib/store';
import { formatDate, formatDateTime } from '@/lib/utils';
import { requiredString, optionalTelephone } from '@/lib/validation';
import useForm from '@/hooks/useForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormInput, FormFieldset } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import type { Client } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [client, setClient] = useState<Client | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const form = useForm({
    initial: { nom: '', prenom: '', telephone: '', email: '', adresse: '' },
    rules: {
      nom: requiredString('Le nom'),
      prenom: requiredString('Le prénom'),
      telephone: optionalTelephone(),
    },
    onSubmit(vals) {
      if (!client) return;
      const updated: Client = {
        ...client,
        nom: vals.nom.trim(),
        prenom: vals.prenom.trim(),
        telephone: vals.telephone.trim(),
        email: vals.email?.trim() || undefined,
        adresse: vals.adresse?.trim() || undefined,
      };
      saveClient(updated);
      setClient(getClientById(id)!);
      toast.success('Client mis à jour');
    },
  });

  useEffect(() => {
    const c = getClientById(id);
    if (!c) { router.push('/clients'); return; }
    setClient(c);
    form.reset({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, email: c.email ?? '', adresse: c.adresse ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function handleDelete() {
    if (clientInUse(id)) {
      toast.error('Ce client est utilisé par des dossiers, factures ou locations.');
      setShowDelete(false);
      return;
    }
    deleteClient(id);
    toast.success('Client supprimé');
    router.push('/clients');
  }

  if (!client) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`${client.prenom} ${client.nom}`}
        subtitle="Modifier les informations du client"
        backHref="/clients"
        actions={
          <Button variant="secondary" size="icon" onClick={() => setShowDelete(true)} className="text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      {(client.dateCreation || client.dateModification) && (
        <Card className="text-sm text-ink-muted">
          {client.dateCreation && <p>Créé le {formatDateTime(client.dateCreation)}</p>}
          {client.dateModification && <p>Modifié le {formatDateTime(client.dateModification)}</p>}
        </Card>
      )}

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormFieldset legend="Identité">
            <FormInput label="Nom" required {...form.getFieldProps('nom')} />
            <FormInput label="Prénom" required {...form.getFieldProps('prenom')} />
          </FormFieldset>

          <FormFieldset legend="Contact">
            <FormInput label="Téléphone" placeholder="+223 70 00 00 00" {...form.getFieldProps('telephone')} />
            <FormInput label="Email" type="email" {...form.getFieldProps('email')} />
            <FormInput label="Adresse" {...form.getFieldProps('adresse')} />
          </FormFieldset>

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/clients" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </Card>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
