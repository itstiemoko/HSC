# Plan de migration vers PostgreSQL en ligne

## 1. Architecture cible

```
┌────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│   Frontend     │────▶│  API Next.js      │────▶│  PostgreSQL (Cloud)   │
│   (Next.js)    │     │  (Route Handlers) │     │  Supabase / Neon /    │
│                │     │  ou Server Actions│     │  Railway / Render     │
└────────────────┘     └──────────────────┘     └──────────────────────┘
```

### Hébergeurs PostgreSQL recommandés

| Service | Gratuit | Avantages |
|---------|---------|-----------|
| **Supabase** | 500 Mo | SDK JS natif, auth intégrée, dashboard |
| **Neon** | 512 Mo | Serverless, branching, autoscaling |
| **Railway** | 1 Go | Simple, déploiement en 1 clic |
| **Render** | 256 Mo (90j) | Intégré à l'hébergement web |

**Recommandation** : Supabase pour la combinaison base de données + authentification + API temps réel.

---

## 2. Schéma de base de données

### Entités actuelles (localStorage)

| Clé | Entités |
|-----|---------|
| `douanapp_clients` | Clients (nom, prénom, téléphone, email, adresse) |
| `douanapp_types_vehicule` | Types de véhicule (id, label) |
| `douanapp_dossiers` | Dossiers de dédouanement |
| `douanapp_factures` | Factures de vente |
| `douanapp_locations` | Locations de camions |
| `douanapp_entreprise` | Paramètres entreprise (singleton) |

### Tables SQL

```sql
-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════
-- Table : clients (entité centralisée)
-- ════════════════════════════════════════════
CREATE TABLE clients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    telephone           VARCHAR(30) NOT NULL DEFAULT '',
    email               VARCHAR(100) DEFAULT '',
    adresse             TEXT DEFAULT '',
    date_creation       TIMESTAMPTZ DEFAULT NOW(),
    date_modification   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_nom ON clients(nom, prenom);

-- ════════════════════════════════════════════
-- Table : types_vehicule
-- ════════════════════════════════════════════
CREATE TABLE types_vehicule (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label               VARCHAR(100) NOT NULL,
    date_creation       TIMESTAMPTZ DEFAULT NOW(),
    date_modification   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_types_vehicule_label ON types_vehicule(label);

-- ════════════════════════════════════════════
-- Table : dossiers
-- ════════════════════════════════════════════
CREATE TABLE dossiers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ch           VARCHAR(50) NOT NULL UNIQUE,
    numero_2            VARCHAR(50) DEFAULT '',
    numero_3            VARCHAR(50) DEFAULT '',
    numero_4            VARCHAR(50) DEFAULT '',
    reference_vehicule  VARCHAR(100) NOT NULL,
    type_vehicule       VARCHAR(100) DEFAULT '',
    client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
    statut              VARCHAR(30) NOT NULL DEFAULT 'Lance'
                        CHECK (statut IN (
                            'Lance', 'Provisoire_Entree', 'Provisoire_Sortie',
                            'CarteGrise_Entree', 'CarteGrise_Sortie'
                        )),
    notes               TEXT DEFAULT '',
    date_creation       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_modification   TIMESTAMPTZ DEFAULT NOW(),
    -- Champs dépréciés (rétrocompatibilité import Excel)
    nom_client          VARCHAR(100) DEFAULT '',
    prenom_client       VARCHAR(100) DEFAULT '',
    telephone_client    VARCHAR(30) DEFAULT ''
);

CREATE INDEX idx_dossiers_statut ON dossiers(statut);
CREATE INDEX idx_dossiers_numero_ch ON dossiers(numero_ch);
CREATE INDEX idx_dossiers_client ON dossiers(client_id);

-- ════════════════════════════════════════════
-- Table : locations (camions)
-- ════════════════════════════════════════════
CREATE TABLE locations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_camion    VARCHAR(100) NOT NULL,
    type_camion         VARCHAR(100) DEFAULT '',
    client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
    date_debut          DATE NOT NULL,
    date_fin            DATE NOT NULL,
    montant_total       BIGINT NOT NULL CHECK (montant_total >= 0),
    statut              VARCHAR(20) NOT NULL DEFAULT 'En_cours'
                        CHECK (statut IN ('En_cours', 'Terminee', 'Annulee')),
    notes               TEXT DEFAULT '',
    date_creation       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_modification   TIMESTAMPTZ DEFAULT NOW(),
    nom_client          VARCHAR(100) DEFAULT '',
    prenom_client       VARCHAR(100) DEFAULT '',
    telephone_client    VARCHAR(30) DEFAULT ''
);

CREATE INDEX idx_locations_statut ON locations(statut);
CREATE INDEX idx_locations_client ON locations(client_id);

-- ════════════════════════════════════════════
-- Table : factures
-- ════════════════════════════════════════════
CREATE TABLE factures (
    id                  VARCHAR(60) PRIMARY KEY,
    dossier_id          UUID NOT NULL REFERENCES dossiers(id) ON DELETE RESTRICT,
    client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
    nom_client          VARCHAR(100) DEFAULT '',
    prenom_client       VARCHAR(100) DEFAULT '',
    telephone           VARCHAR(30) DEFAULT '',
    adresse             TEXT DEFAULT '',
    email               VARCHAR(100) DEFAULT '',
    reference_vehicule  VARCHAR(100) NOT NULL,
    type_vehicule       VARCHAR(100) DEFAULT '',
    vin                 VARCHAR(50) DEFAULT '',
    date_facture        DATE NOT NULL,
    prix_total_ttc      BIGINT NOT NULL CHECK (prix_total_ttc >= 0),
    prix_achat          BIGINT DEFAULT 0,
    depenses            BIGINT DEFAULT 0,
    montant_paye        BIGINT NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
    montant_restant     BIGINT NOT NULL DEFAULT 0,
    mode_paiement       VARCHAR(20) NOT NULL DEFAULT 'Especes'
                        CHECK (mode_paiement IN ('Especes', 'Virement', 'MobileMoney', 'Cheque')),
    pays_destination    VARCHAR(100) DEFAULT '',
    statut              VARCHAR(30) NOT NULL DEFAULT 'En_attente'
                        CHECK (statut IN ('En_attente', 'Partiellement_payee', 'Soldee')),
    date_creation       TIMESTAMPTZ DEFAULT NOW(),
    date_modification   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_factures_dossier ON factures(dossier_id);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_statut ON factures(statut);
CREATE INDEX idx_factures_date ON factures(date_facture);

-- ════════════════════════════════════════════
-- Table : tranches
-- ════════════════════════════════════════════
CREATE TABLE tranches (
    id                  VARCHAR(80) PRIMARY KEY,
    facture_id          VARCHAR(60) NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    numero_tranche      INT NOT NULL CHECK (numero_tranche > 0),
    montant             BIGINT NOT NULL CHECK (montant > 0),
    date_echeance       DATE NOT NULL,
    date_paiement       DATE,
    statut              VARCHAR(20) NOT NULL DEFAULT 'En_attente'
                        CHECK (statut IN ('En_attente', 'Payee', 'En_retard')),
    mode_paiement       VARCHAR(20)
                        CHECK (mode_paiement IS NULL OR mode_paiement IN ('Especes', 'Virement', 'MobileMoney', 'Cheque'))
);

CREATE INDEX idx_tranches_facture ON tranches(facture_id);

-- ════════════════════════════════════════════
-- Table : paiements
-- ════════════════════════════════════════════
CREATE TABLE paiements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facture_id      VARCHAR(60) NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    tranche_id      VARCHAR(80) REFERENCES tranches(id) ON DELETE SET NULL,
    montant         BIGINT NOT NULL CHECK (montant > 0),
    date            DATE NOT NULL,
    mode_paiement   VARCHAR(20) NOT NULL
                    CHECK (mode_paiement IN ('Especes', 'Virement', 'MobileMoney', 'Cheque')),
    date_creation   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paiements_facture ON paiements(facture_id);

-- ════════════════════════════════════════════
-- Table : entreprise (paramètres globaux)
-- ════════════════════════════════════════════
CREATE TABLE entreprise (
    id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nom         VARCHAR(200) NOT NULL DEFAULT '',
    adresse     TEXT DEFAULT '',
    telephone   VARCHAR(30) DEFAULT '',
    email       VARCHAR(100) DEFAULT '',
    logo_url    TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO entreprise (nom) VALUES ('DouanApp Entreprise') ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════
-- Triggers : date_modification / updated_at automatique
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_entreprise_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated
    BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trg_types_vehicule_updated
    BEFORE UPDATE ON types_vehicule FOR EACH ROW EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trg_dossiers_updated
    BEFORE UPDATE ON dossiers FOR EACH ROW EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trg_locations_updated
    BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trg_factures_updated
    BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trg_entreprise_updated
    BEFORE UPDATE ON entreprise FOR EACH ROW EXECUTE FUNCTION update_entreprise_timestamp();
```

> **Note** : Sur PostgreSQL &lt; 11, remplacer `EXECUTE FUNCTION` par `EXECUTE PROCEDURE`.

---

## 3. Plan de migration étape par étape

### Phase 1 — Préparation (1-2 jours)

1. **Créer une base PostgreSQL** sur le service choisi (Supabase recommandé)
2. **Exécuter le script SQL** ci-dessus pour créer les tables
3. **Installer les dépendances ORM** :

```bash
npm install prisma @prisma/client
# OU pour Supabase :
npm install @supabase/supabase-js
```

4. **Configurer les variables d'environnement** :

```env
# .env.local
DATABASE_URL="postgresql://user:password@host:5432/douanapp?sslmode=require"
# OU Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxxxxxxxx"
```

### Phase 2 — Couche d'accès aux données (2-3 jours)

Créer un fichier `lib/db.ts` qui remplace `lib/store.ts` tout en gardant la même interface :

```typescript
// lib/db.ts — Exemple avec Prisma
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Interface identique à store.ts
export async function getClients() {
  return prisma.client.findMany({ orderBy: { dateCreation: 'desc' } });
}

export async function getTypesVehicule() {
  return prisma.typeVehicule.findMany({ orderBy: { label: 'asc' } });
}

export async function getDossiers() {
  return prisma.dossier.findMany({
    include: { client: true },
    orderBy: { dateCreation: 'desc' },
  });
}

export async function getLocations() {
  return prisma.location.findMany({
    include: { client: true },
    orderBy: { dateCreation: 'desc' },
  });
}

export async function getFactures() {
  return prisma.facture.findMany({
    include: { tranches: true, paiements: true, client: true },
    orderBy: { dateFacture: 'desc' },
  });
}

// ... saveClient, saveTypeVehicule, saveDossier, saveLocation, saveFacture, etc.
```

**Stratégie clé** : L'interface publique des fonctions reste identique à `store.ts`, seule l'implémentation change (localStorage → PostgreSQL). Les composants React appellent les mêmes fonctions.

### Phase 3 — Migration des données existantes (1 jour)

Script de migration pour transférer les données localStorage vers PostgreSQL. **Ordre d'insertion** : clients → types_vehicule → dossiers → locations → factures → tranches → paiements.

```typescript
// scripts/migrate-to-postgres.ts
// Ordre : clients, types_vehicule, dossiers, locations, factures, tranches, paiements

const KEYS = [
  'douanapp_clients',
  'douanapp_types_vehicule',
  'douanapp_dossiers',
  'douanapp_locations',
  'douanapp_factures',
  'douanapp_entreprise',
];

async function migrate() {
  const clients = JSON.parse(localStorage.getItem('douanapp_clients') || '[]');
  const typesVehicule = JSON.parse(localStorage.getItem('douanapp_types_vehicule') || '[]');
  const dossiers = JSON.parse(localStorage.getItem('douanapp_dossiers') || '[]');
  const locations = JSON.parse(localStorage.getItem('douanapp_locations') || '[]');
  const factures = JSON.parse(localStorage.getItem('douanapp_factures') || '[]');

  // 1. Clients
  for (const c of clients) {
    await fetch('/api/migration/clients', { method: 'POST', body: JSON.stringify(c) });
  }

  // 2. Types véhicule (filtrer les objets, ignorer les strings pour migration legacy)
  const types = Array.isArray(typesVehicule) && typeof typesVehicule[0] === 'object'
    ? typesVehicule
    : typesVehicule.map((label: string, i: number) => ({ id: `tv_${i}`, label }));
  for (const t of types) {
    await fetch('/api/migration/types-vehicule', { method: 'POST', body: JSON.stringify(t) });
  }

  // 3. Dossiers
  for (const d of dossiers) {
    await fetch('/api/migration/dossiers', { method: 'POST', body: JSON.stringify(d) });
  }

  // 4. Locations
  for (const l of locations) {
    await fetch('/api/migration/locations', { method: 'POST', body: JSON.stringify(l) });
  }

  // 5. Factures (avec tranches et paiements imbriqués)
  for (const f of factures) {
    await fetch('/api/migration/factures', { method: 'POST', body: JSON.stringify(f) });
  }
}
```

Créer une page `/migration` temporaire dans l'app pour que l'utilisateur puisse déclencher la migration depuis son navigateur.

### Phase 4 — Remplacement progressif (2-3 jours)

1. **Convertir les appels synchrones en asynchrones** :
   - `getClients()` → `await getClients()`
   - `getTypesVehicule()` → `await getTypesVehicule()`
   - `getDossiers()` → `await getDossiers()`
   - `getLocations()` → `await getLocations()`
   - `getFactures()` → `await getFactures()`
   - Passer les composants clients en Server Components quand possible
   - Utiliser les Server Actions Next.js pour les mutations

2. **Utiliser des Server Actions** pour les écritures :

```typescript
// app/actions/dossiers.ts
'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createDossier(data: FormData) {
  await prisma.dossier.create({ data: { ... } });
  revalidatePath('/dossiers');
}
```

3. **Convertir les pages en Server Components** pour les lectures :

```typescript
// app/dossiers/page.tsx (Server Component)
import { prisma } from '@/lib/db';

export default async function DossiersPage() {
  const dossiers = await prisma.dossier.findMany({
    include: { client: true },
    orderBy: { dateCreation: 'desc' },
  });
  return <DossiersClient dossiers={dossiers} />;
}
```

### Phase 5 — Nettoyage et sécurité (1 jour)

1. Supprimer `lib/store.ts` et toutes les références à localStorage
2. Ajouter la validation côté serveur (Zod recommandé)
3. Configurer les politiques RLS (Row Level Security) sur Supabase
4. Tester en production

---

## 4. Mapping des entités

| Entité app (TypeScript) | Table PostgreSQL | Notes |
|-------------------------|------------------|-------|
| `Client` | `clients` | Référencé par dossiers, factures, locations |
| `TypeVehicule` | `types_vehicule` | Libellés pour dossiers/locations |
| `Dossier` | `dossiers` | `client_id` FK, `nom_client` etc. pour import Excel |
| `Location` | `locations` | `client_id` FK |
| `Facture` | `factures` | `client_id` FK, `prix_achat`, `depenses` |
| `Tranche` | `tranches` | Lié à facture |
| `Paiement` | `paiements` | `date_creation` pour traçabilité |
| `EntrepriseInfo` | `entreprise` | Singleton |

---

## 5. Ajouts recommandés lors de la migration

### Authentification (Supabase Auth)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

await supabase.auth.signInWithPassword({ email, password });
```

### Row Level Security

```sql
ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE dossiers ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE locations ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE factures ADD COLUMN user_id UUID REFERENCES auth.users(id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own clients" ON clients FOR ALL USING (auth.uid() = user_id);
-- Idem pour dossiers, locations, factures...
```

### Temps réel (optionnel)

```typescript
supabase
  .channel('dossiers')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers' },
    (payload) => console.log('Change:', payload))
  .subscribe();
```

---

## 6. Estimation du temps

| Phase | Durée estimée |
|-------|---------------|
| Phase 1 — Préparation | 1-2 jours |
| Phase 2 — Couche d'accès | 2-3 jours |
| Phase 3 — Migration données | 1 jour |
| Phase 4 — Remplacement | 2-3 jours |
| Phase 5 — Nettoyage | 1 jour |
| **Total** | **7-10 jours** |

---

## 7. Checklist de basculation

- [ ] Base PostgreSQL créée et accessible
- [ ] Script SQL exécuté, tables créées (clients, types_vehicule, dossiers, locations, factures, tranches, paiements, entreprise)
- [ ] Variables d'environnement configurées
- [ ] ORM installé et configuré (Prisma ou Supabase JS)
- [ ] `lib/db.ts` créé avec la même interface que `store.ts`
- [ ] Page de migration temporaire créée
- [ ] Données localStorage transférées (clients, types_vehicule, dossiers, locations, factures, entreprise)
- [ ] Toutes les pages converties (async/Server Components)
- [ ] `lib/store.ts` supprimé
- [ ] Validation serveur ajoutée (Zod)
- [ ] Tests de non-régression passés
- [ ] Authentification configurée (si multi-utilisateurs)
- [ ] RLS activé sur toutes les tables
- [ ] Sauvegarde automatique configurée
- [ ] Déploiement production vérifié
