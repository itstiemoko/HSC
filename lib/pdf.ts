import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Facture, EntrepriseInfo } from './types';
import { formatDate, formatMontantForPDF, statutFactureLabel, statutTrancheLabel, modePaiementLabel, calculerBenefice } from './utils';
import { getClientDisplayFromFacture } from './clients';

export function generateFacturePDF(facture: Facture, entreprise: EntrepriseInfo): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth / 2, 25, { align: 'center' });

  // Entreprise info (left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let y = 40;
  doc.text(entreprise.nom || 'Entreprise', 14, y);
  doc.setFont('helvetica', 'normal');
  if (entreprise.adresse) { y += 5; doc.text(entreprise.adresse, 14, y); }
  if (entreprise.telephone) { y += 5; doc.text(`Tél: ${entreprise.telephone}`, 14, y); }
  if (entreprise.email) { y += 5; doc.text(`Email: ${entreprise.email}`, 14, y); }

  // Facture info (right)
  const rightX = pageWidth - 14;
  doc.setFont('helvetica', 'bold');
  doc.text(facture.id, rightX, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(facture.dateFacture)}`, rightX, 46, { align: 'right' });
  doc.text(`Statut: ${statutFactureLabel(facture.statut)}`, rightX, 52, { align: 'right' });

  // Separator
  const sepY = Math.max(y + 10, 62);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, sepY, pageWidth - 14, sepY);

  // Client info
  let clientY = sepY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client', 14, clientY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  clientY += 6;
  const client = getClientDisplayFromFacture(facture);
  doc.text(`${client.prenom} ${client.nom}`.trim() || '-', 14, clientY);
  if (client.telephone) { clientY += 5; doc.text(`Tél: ${client.telephone}`, 14, clientY); }
  if (client.email) { clientY += 5; doc.text(`Email: ${client.email}`, 14, clientY); }
  if (client.adresse) { clientY += 5; doc.text(`Adresse: ${client.adresse}`, 14, clientY); }

  // Véhicule info
  let vehY = sepY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Véhicule', pageWidth / 2 + 10, vehY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  vehY += 6;
  doc.text(`Référence: ${facture.referenceVehicule}`, pageWidth / 2 + 10, vehY);
  if (facture.typeVehicule) { vehY += 5; doc.text(`Type: ${facture.typeVehicule}`, pageWidth / 2 + 10, vehY); }
  if (facture.vin) { vehY += 5; doc.text(`VIN: ${facture.vin}`, pageWidth / 2 + 10, vehY); }
  if (facture.paysDestination) { vehY += 5; doc.text(`Destination: ${facture.paysDestination}`, pageWidth / 2 + 10, vehY); }

  // Montants table
  const tableY = Math.max(clientY, vehY) + 12;

  const prixAchat = facture.prixAchat ?? 0;
  const dedouanement = facture.dedouanement ?? facture.depenses ?? 0;
  const benefice = calculerBenefice(facture.prixTotalTTC, prixAchat, dedouanement);

  const bodyRows: [string, string][] = [
    ['Prix de vente', formatMontantForPDF(facture.prixTotalTTC)],
    ['Montant Payé', formatMontantForPDF(facture.montantPaye)],
    ['Montant Restant', formatMontantForPDF(facture.montantRestant)],
  ];
  if (prixAchat > 0) bodyRows.push(['Prix d\'achat', formatMontantForPDF(prixAchat)]);
  if (dedouanement > 0) bodyRows.push(['Dédouanement', formatMontantForPDF(dedouanement)]);
  bodyRows.push(['Bénéfice', formatMontantForPDF(benefice)]);

  const tableWidth = pageWidth - 28;
  autoTable(doc, {
    startY: tableY,
    head: [['Description', 'Montant']],
    body: bodyRows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.55 },
      1: { cellWidth: tableWidth * 0.45, halign: 'right', overflow: 'ellipsize' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column?.index === 1) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Mode de paiement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let afterTable = (doc as any).lastAutoTable?.finalY ?? tableY + 40;
  afterTable += 8;
  doc.setFontSize(10);
  doc.text(`Mode de paiement: ${modePaiementLabel(facture.modePaiement)}`, 14, afterTable);

  // Tranches (if any)
  if (facture.tranches.length > 0) {
    afterTable += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Échéancier des tranches', 14, afterTable);
    afterTable += 4;

    autoTable(doc, {
      startY: afterTable,
      head: [['ID', 'Tranche', 'Montant', 'Échéance', 'Paiement', 'Statut', 'Mode']],
      body: facture.tranches.map((t) => [
        t.id,
        `Tranche ${t.numeroTranche}`,
        formatMontantForPDF(t.montant),
        formatDate(t.dateEcheance),
        t.datePaiement ? formatDate(t.datePaiement) : '-',
        statutTrancheLabel(t.statut),
        t.modePaiement ? modePaiementLabel(t.modePaiement) : '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: {
        2: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column?.index === 2) {
          data.cell.styles.halign = 'right';
        }
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Document généré le ${formatDate(new Date().toISOString())} — ${facture.id}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`${facture.id}.pdf`);
}
