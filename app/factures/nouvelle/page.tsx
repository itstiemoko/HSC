'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Plus, Trash2 } from 'lucide-react';
import { getDossiers, getDossierById, saveFacture, getClients } from '@/lib/store';
import { generateFactureId, generateTrancheId } from '@/lib/utils';
import { requiredString, positiveNumber, optionalNonNegativeNumber, requiredClientId } from '@/lib/validation';
import { formatClientLabel, getClientDisplayFromDossier } from '@/lib/clients';
import useForm from '@/hooks/useForm';
import PageHeader from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardSection } from '@/components/ui/Card';
import { FormInput, FormSelect } from '@/components/ui/FormField';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { Dossier, ModePaiement, Tranche } from '@/lib/types';
import { MODES_PAIEMENT } from '@/lib/types';
import toast from 'react-hot-toast';

interface TrancheRow { montant: string; dateEcheance: string; }

function NouvelleFactureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierId = searchParams.get('dossierId');

  const [mounted, setMounted] = useState(false);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [useTranches, setUseTranches] = useState(false);
  const [tranches, setTranches] = useState<TrancheRow[]>([]);
  const [trancheErrors, setTrancheErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDossiers(getDossiers());
    setClientOptions(getClients().map((c) => ({ value: c.id, label: formatClientLabel({ nom: c.nom, prenom: c.prenom, telephone: c.telephone }) })));
    setMounted(true);
  }, []);

  const form = useForm({
    initial: {
      dossierId: dossierId || '',
      clientId: '',
      prixTotalTTC: '',
      prixAchat: '',
      dedouanement: '',
      modePaiement: 'Especes' as ModePaiement,
    },
    rules: {
      dossierId: requiredString('Le dossier'),
      clientId: requiredClientId(),
      prixTotalTTC: positiveNumber('Le montant'),
      prixAchat: optionalNonNegativeNumber("Le prix d'achat"),
      dedouanement: optionalNonNegativeNumber('Le dédouanement'),
    },
    onSubmit(vals) {
      if (useTranches && !validateTranches(vals.prixTotalTTC)) return;

      const prix = parseFloat(vals.prixTotalTTC);
      const factureId = generateFactureId();
      const tranchesData: Tranche[] = useTranches
        ? tranches.map((t, i) => ({
            id: generateTrancheId(factureId, i + 1), factureId, numeroTranche: i + 1,
            montant: parseFloat(t.montant), dateEcheance: t.dateEcheance,
            datePaiement: null, statut: 'En_attente' as const, modePaiement: null,
          }))
        : [];

      const selectedDossier = getDossierById(vals.dossierId);
      if (!selectedDossier) {
        toast.error('Dossier introuvable');
        return;
      }

      const prixAchat = parseFloat(vals.prixAchat) || 0;
      const dedouanement = parseFloat(vals.dedouanement) || 0;

      saveFacture({
        id: factureId, dossierId: vals.dossierId, clientId: vals.clientId,
        referenceVehicule: selectedDossier.referenceVehicule, typeVehicule: selectedDossier.typeVehicule, vin: selectedDossier.chassisCH ?? '',
        dateFacture: new Date().toISOString(), prixTotalTTC: prix, prixAchat, dedouanement,
        montantPaye: 0, montantRestant: prix,
        modePaiement: vals.modePaiement, paysDestination: '',
        statut: 'En_attente', tranches: tranchesData, paiements: [],
      });
      toast.success('Facture créée avec succès');
      router.push(`/factures/${factureId}`);
    },
  });

  useEffect(() => {
    if (form.values.dossierId) {
      const d = getDossierById(form.values.dossierId);
      if (d) {
        form.setValues((prev) => ({
          ...prev,
          clientId: d.clientId ?? prev.clientId,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.dossierId]);

  function validateTranches(prixStr: string): boolean {
    const errs: Record<string, string> = {};
    const prix = parseFloat(prixStr);
    if (tranches.length === 0) { errs.global = 'Ajoutez au moins une tranche'; setTrancheErrors(errs); return false; }
    let total = 0;
    tranches.forEach((t, i) => {
      const m = parseFloat(t.montant);
      if (isNaN(m) || m <= 0) errs[`${i}_montant`] = 'Montant invalide'; else total += m;
      if (!t.dateEcheance) errs[`${i}_date`] = 'Date obligatoire';
    });
    if (!isNaN(prix) && Math.abs(total - prix) > 0.01)
      errs.global = `Somme des tranches (${total.toLocaleString('fr-FR')}) ≠ prix total (${prix.toLocaleString('fr-FR')})`;
    setTrancheErrors(errs);
    return Object.keys(errs).length === 0;
  }

  if (!mounted) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Nouvelle facture" subtitle="Créer une facture de vente" backHref="/factures" />

      <form onSubmit={form.handleSubmit} className="space-y-6">
        <CardSection title="Dossier associé">
          <FormSelect
            label="Dossier"
            required
            placeholder="-- Sélectionner un dossier --"
            options={dossiers.map((d) => ({
              value: d.id,
              label: `${d.numeroCH} — ${formatClientLabel(getClientDisplayFromDossier(d))} (${d.referenceVehicule})`,
            }))}
            {...form.getFieldProps('dossierId')}
          />
        </CardSection>

        <CardSection title="Client">
          <FormSelect
            label="Client"
            required
            placeholder="Sélectionner un client..."
            options={clientOptions}
            {...form.getFieldProps('clientId')}
          />
        </CardSection>

        <CardSection title="Montant & Paiement">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput label="Prix de vente (FCFA)" required type="number" min="0" step="1" placeholder="0" {...form.getFieldProps('prixTotalTTC')} />
            <FormInput label="Prix d'achat (FCFA)" type="number" min="0" step="1" placeholder="0" {...form.getFieldProps('prixAchat')} />
            <FormInput label="Dédouanement (FCFA)" type="number" min="0" step="1" placeholder="0" {...form.getFieldProps('dedouanement')} />
            <FormSelect label="Mode de paiement" options={MODES_PAIEMENT} {...form.getFieldProps('modePaiement')} />
          </div>
        </CardSection>

        {/* Tranches */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Paiement échelonné (tranches)</h2>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={useTranches} onChange={(e) => { setUseTranches(e.target.checked); if (!e.target.checked) { setTranches([]); setTrancheErrors({}); } }} className="h-4 w-4 rounded border-edge text-blue-600" />
              <span className="text-sm text-ink-secondary">Activer</span>
            </label>
          </div>
          {useTranches && (
            <div className="mt-4 space-y-3">
              {trancheErrors.global && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{trancheErrors.global}</p>}
              {tranches.map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-muted p-3">
                  <span className="mt-2 text-xs font-medium text-ink-muted">T{i + 1}</span>
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <input type="number" min="0" step="1" value={t.montant} onChange={(e) => setTranches((prev) => prev.map((r, j) => j === i ? { ...r, montant: e.target.value } : r))} placeholder="Montant (FCFA)" className={`block w-full rounded-lg px-3 py-2 text-sm ring-1 ${trancheErrors[`${i}_montant`] ? 'ring-red-300 bg-red-50' : 'ring-edge-soft'}`} />
                    <input type="date" value={t.dateEcheance} onChange={(e) => setTranches((prev) => prev.map((r, j) => j === i ? { ...r, dateEcheance: e.target.value } : r))} className={`block w-full rounded-lg px-3 py-2 text-sm ring-1 ${trancheErrors[`${i}_date`] ? 'ring-red-300 bg-red-50' : 'ring-edge-soft'}`} />
                  </div>
                  <button type="button" onClick={() => setTranches((prev) => prev.filter((_, j) => j !== i))} className="mt-1 rounded p-1 text-ink-dim hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setTranches((prev) => [...prev, { montant: '', dateEcheance: '' }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-edge-soft px-3 py-2 text-sm text-ink-secondary hover:border-blue-300 hover:text-blue-600">
                <Plus className="h-4 w-4" /> Ajouter une tranche
              </button>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <LinkButton href="/factures" variant="secondary">Annuler</LinkButton>
          <Button type="submit" icon={<Save className="h-4 w-4" />}>Créer la facture</Button>
        </div>
      </form>
    </div>
  );
}

export default function NouvelleFacturePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <NouvelleFactureForm />
    </Suspense>
  );
}
