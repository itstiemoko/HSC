'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';
import { getTypeVehiculeById, saveTypeVehicule, deleteTypeVehicule, typeVehiculeInUse } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import { requiredString } from '@/lib/validation';
import useForm from '@/hooks/useForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import type { TypeVehicule } from '@/lib/types';
import toast from 'react-hot-toast';

export default function TypeVehiculeDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [type, setType] = useState<TypeVehicule | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const form = useForm({
    initial: { label: '' },
    rules: { label: requiredString('Le libellé') },
    onSubmit(vals) {
      if (!type) return;
      const updated: TypeVehicule = { ...type, label: vals.label.trim() };
      saveTypeVehicule(updated);
      toast.success('Type mis à jour');
      router.push('/types-vehicule');
    },
  });

  useEffect(() => {
    const t = getTypeVehiculeById(id);
    if (!t) { router.push('/types-vehicule'); return; }
    setType(t);
    form.reset({ label: t.label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function handleDelete() {
    if (!type) return;
    if (typeVehiculeInUse(type.label)) {
      toast.error('Ce type est utilisé par des dossiers, factures ou locations.');
      setShowDelete(false);
      return;
    }
    deleteTypeVehicule(id);
    toast.success('Type supprimé');
    router.push('/types-vehicule');
  }

  if (!type) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={type.label}
        subtitle="Modifier le type de véhicule"
        backHref="/types-vehicule"
        actions={
          <Button variant="secondary" size="icon" onClick={() => setShowDelete(true)} className="text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />

      {(type.dateCreation || type.dateModification) && (
        <Card className="text-sm text-ink-muted">
          {type.dateCreation && <p>Créé le {formatDateTime(type.dateCreation)}</p>}
          {type.dateModification && <p>Modifié le {formatDateTime(type.dateModification)}</p>}
        </Card>
      )}

      <form onSubmit={form.handleSubmit}>
        <Card className="space-y-6">
          <FormInput label="Libellé" required {...form.getFieldProps('label')} />

          <div className="flex justify-end gap-3 border-t border-edge-soft pt-4">
            <LinkButton href="/types-vehicule" variant="secondary">Annuler</LinkButton>
            <Button type="submit" icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
          </div>
        </Card>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Supprimer le type"
        message="Êtes-vous sûr de vouloir supprimer ce type de véhicule ? Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
