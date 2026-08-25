# Asphalte

Site vitrine et backoffice atelier pour **Asphalte**, spécialiste du dépannage
2 roues au 31 bis route de la Reine à Boulogne-Billancourt, en activité depuis
2002, toutes marques.

Cible de déploiement : **https://asphalte.wazzz.fr**

---

## Ce que contient ce MVP

### Page publique (mobile first)

- Bandeau d'accueil avec la **photo du garage**, le logo, l'accroche
  « dépannage 2 roues » et le rappel « depuis 2002, toutes marques ».
- Prestations, présentation de l'atelier, infos pratiques (adresse, téléphone,
  itinéraire, horaires).
- **Widget de contact** : barre d'action fixe en bas d'écran sur mobile
  (« Appeler l'atelier » / « Message »), bouton flottant sur grand écran, et
  formulaire en feuille glissante. Les demandes arrivent dans le backoffice.
- Charte reprise du logo : or métallisé sur noir bitume, rouge de la devanture
  en accent.
- Tout le texte et la photo sont pilotés par la base : **Backoffice → Page
  publique** les modifie sans redéploiement.

### Backoffice atelier (`/admin`)

| Module | Ce qu'il fait |
| --- | --- |
| Tableau de bord | Compteurs, dernières interventions, stock sous seuil, messages non lus |
| Recherche multi-critères | Une seule saisie interroge plaque, nom, téléphone, e-mail, ville, marque, modèle, VIN, référence d'intervention, SKU, code-barres, emplacement |
| Vue 360 client | Coordonnées, véhicules, historique complet des dépannages et interventions, accessoires et produits achetés, totaux |
| Interventions | Dépannage / réparation / entretien / diagnostic, statuts, main-d'œuvre, pièces montées (sortie de stock automatique) |
| Produits & stock | Catalogue, photos, prix, emplacement, seuils d'alerte, ajustements motivés |
| Réceptions de colis | Saisie d'un colis puis **entrée en stock de tout son contenu en une seule validation**, avec traçabilité |
| Messages | Demandes envoyées depuis le site, avec suivi lu / traité |
| Page publique | Édition des textes et de la photo du garage |

### Traçabilité du stock

Chaque mouvement est journalisé dans `StockMovement` : type, quantité signée,
**stock avant / stock après**, motif, opérateur, date, et le lien vers son
origine (réception, intervention, vente). Le stock du produit et sa ligne de
journal sont écrits dans la même transaction, ils ne peuvent pas diverger.

La validation d'une réception applique toutes les lignes d'un coup et fige le
colis : les corrections ultérieures passent par un ajustement motivé, ce qui
laisse une trace au lieu de réécrire l'historique.

---

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript**, **Tailwind CSS v4**
- **Prisma 6** sur **PostgreSQL 16**
- Authentification maison : mot de passe `scrypt`, cookie de session signé
  HMAC-SHA256, sans dépendance externe

Le backoffice fonctionne quasiment sans JavaScript côté client : formulaires
HTML natifs + Server Actions. C'est volontaire — l'atelier est utilisé au
téléphone, en 4G, parfois avec des gants.

---

## Démarrage en local

```bash
cp .env.example .env      # puis renseigner DATABASE_URL et AUTH_SECRET
npm install
npx prisma migrate dev    # crée le schéma
npm run db:seed           # compte admin + jeu de démonstration
npm run dev               # http://localhost:3000
```

Générer un secret : `openssl rand -hex 32`.

Le seed crée le compte défini par `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(par défaut `contact@asphalte.fr` / `asphalte2002` — **à changer**), plus un jeu
de démonstration (clients, véhicules, dépannages, produits, deux colis en
attente). `SEED_DEMO=false` ne crée que le compte administrateur.

### Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | `prisma generate` + build de production |
| `npm run start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:migrate` | Nouvelle migration en développement |
| `npm run db:deploy` | Applique les migrations (production) |
| `npm run db:seed` | Seed |
| `npm run db:studio` | Prisma Studio |

---

## Déploiement sur asphalte.wazzz.fr

### 1. Variables d'environnement

Sur le serveur, créer un `.env` à côté du `docker-compose.yml` :

```dotenv
POSTGRES_PASSWORD=...              # openssl rand -hex 24
AUTH_SECRET=...                    # openssl rand -hex 32
SEED_ADMIN_EMAIL=contact@asphalte.fr
SEED_ADMIN_PASSWORD=...            # mot de passe du compte atelier
NEXT_PUBLIC_SITE_URL=https://asphalte.wazzz.fr
RUN_SEED=true
SEED_DEMO=false
```

### 2. Lancement

```bash
docker compose up -d --build
```

Le conteneur applique les migrations Prisma au démarrage, crée le compte
administrateur au premier lancement, puis sert l'application sur
`127.0.0.1:3000`. Les photos envoyées depuis le backoffice sont stockées dans
le volume `uploads` : elles survivent aux mises à jour.

Une fois le premier démarrage réussi, passer `RUN_SEED=false` pour ne plus
rejouer le seed à chaque redéploiement.

### 3. Reverse proxy et TLS

Exemple avec Caddy, qui gère le certificat automatiquement :

```caddyfile
asphalte.wazzz.fr {
    encode gzip zstd
    reverse_proxy 127.0.0.1:3000
}
```

Avec nginx, proxifier vers `http://127.0.0.1:3000` et laisser certbot gérer le
certificat. Penser à autoriser un corps de requête d'au moins 8 Mo
(`client_max_body_size 8m;`) pour l'envoi des photos.

### 4. Mise à jour

```bash
git pull && docker compose up -d --build
```

---

## Photo du garage

La page d'accueil affiche `public/images/garage.svg`, une **illustration
provisoire** dessinée d'après la devanture réelle (enseigne rouge, présentoir
de pneus, marche rouge). Deux façons de mettre la vraie photo :

1. **Depuis le backoffice** — Page publique → « Remplacer la photo ». C'est la
   méthode recommandée : le fichier va dans le volume persistant et la page se
   met à jour immédiatement.
2. **Dans le dépôt** — déposer le fichier dans `public/images/` puis renseigner
   son chemin (ex. `/images/garage.jpg`) dans le champ « Bandeau — photo du
   garage » du backoffice.

Format conseillé : photo 4/3 en paysage, 1600 px de large minimum.

Le logo suit la même logique : `public/images/logo.svg` est une reprise
simplifiée du logo doré, à remplacer par le fichier d'origine (même nom, ou
PNG en adaptant les balises `img`).

---

## Structure

```
prisma/
  schema.prisma          Modèle de données
  migrations/            Migrations SQL versionnées
  seed.ts                Compte admin + jeu de démonstration
src/
  app/
    page.tsx             Page publique
    api/contact/         Réception des messages du widget
    login/               Connexion atelier
    admin/               Backoffice (dashboard, clients, interventions,
                         produits, réceptions, messages, contenu)
  components/
    public/              Bandeau, prestations, infos, widget de contact
    admin/               Navigation, formulaires partagés
    ui.tsx               Briques d'interface communes
  lib/
    db.ts                Client Prisma
    auth.ts              Mots de passe et sessions
    stock.ts             Application et journalisation des mouvements
    search.ts            Recherche multi-critères
    site-content.ts      Contenu éditorial de la page publique
    actions/             Server Actions par domaine
```

---

## Pistes pour la suite

- Devis et facturation PDF à partir des interventions
- Notification par e-mail ou SMS à l'arrivée d'un message
- Rattachement d'un message de contact à une fiche client existante en un clic
- Comptes par mécanicien (le rôle `MECANICIEN` existe déjà en base)
- Galerie de réalisations sur la page publique (modèle `MediaAsset` déjà prêt)
- Inventaire tournant et export comptable des mouvements de stock
