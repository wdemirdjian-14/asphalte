# Asphalte

Site vitrine et backoffice atelier pour **Asphalte**, spécialiste du dépannage
2 roues au 31 bis route de la Reine à Boulogne-Billancourt, en activité depuis
2002, toutes marques.

Cible de déploiement : **https://asphalte.walautao.fr**

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

## Déploiement sur asphalte.walautao.fr

Procédure pour un serveur Linux avec **Docker**, **docker compose** et
**nginx** déjà installés, l'enregistrement DNS de `asphalte.walautao.fr`
pointant sur l'IP du serveur.

### 1. Récupérer le code

```bash
sudo mkdir -p /opt/asphalte && sudo chown "$USER" /opt/asphalte
git clone -b claude/asphalte-mvp-setup-16zuyl \
  https://github.com/wdemirdjian-14/asphalte.git /opt/asphalte
cd /opt/asphalte
```

Une fois la branche fusionnée dans `main`, l'option `-b` n'est plus nécessaire.

### 2. Variables d'environnement

```bash
cd /opt/asphalte
cat > .env <<'EOF'
POSTGRES_PASSWORD=REMPLACER
AUTH_SECRET=REMPLACER
SEED_ADMIN_EMAIL=contact@asphalte.fr
SEED_ADMIN_PASSWORD=REMPLACER
SEED_ADMIN_NAME=Atelier Asphalte
NEXT_PUBLIC_SITE_URL=https://asphalte.walautao.fr
RUN_SEED=true
SEED_DEMO=false
EOF
chmod 600 .env
```

Générer les deux secrets et les coller dans le fichier :

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # AUTH_SECRET
```

`SEED_ADMIN_PASSWORD` est le mot de passe du compte atelier : choisissez-le
vous-même, il servira à la première connexion.

### 3. Démarrer l'application

```bash
docker compose up -d --build
docker compose logs -f web     # Ctrl+C pour quitter le suivi
```

Le conteneur applique les migrations Prisma, crée le compte administrateur,
puis écoute sur `127.0.0.1:3000` — accessible uniquement depuis le serveur,
nginx s'occupe de l'exposition.

Vérification avant de toucher à nginx :

```bash
curl -I http://127.0.0.1:3000       # doit répondre HTTP/1.1 200 OK
```

### 4. nginx — configuration HTTP

Deux fichiers prêts à copier se trouvent dans `deploy/nginx/`.

```bash
sudo cp deploy/nginx/asphalte-http.conf \
        /etc/nginx/sites-available/asphalte.walautao.fr
sudo ln -s /etc/nginx/sites-available/asphalte.walautao.fr \
           /etc/nginx/sites-enabled/asphalte.walautao.fr
sudo nginx -t
sudo systemctl reload nginx
```

Sur une distribution sans `sites-available` (RHEL, Alma, Rocky), copier le
fichier dans `/etc/nginx/conf.d/asphalte.walautao.fr.conf` et sauter le
`ln -s`.

Vérification :

```bash
curl -I http://asphalte.walautao.fr    # HTTP/1.1 200 OK
```

### 5. Certificat TLS

```bash
sudo certbot --nginx -d asphalte.walautao.fr
```

Certbot ajoute le bloc HTTPS et la redirection dans le fichier créé à
l'étape 4. La version finale attendue est donnée à titre de référence dans
`deploy/nginx/asphalte-tls.conf`.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I https://asphalte.walautao.fr   # HTTP/2 200
```

Le renouvellement est automatique ; on peut le tester avec
`sudo certbot renew --dry-run`.

> Le cookie de session du backoffice est en `Secure` : la connexion à
> `/admin` ne fonctionne qu'en HTTPS. Faites cette étape avant de vous
> connecter.

### 6. Premiers réglages

1. Ouvrir `https://asphalte.walautao.fr/login` et se connecter avec
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. **Page publique** → « Remplacer la photo » : mettre la vraie photo de la
   devanture.
3. **Page publique** → renseigner les horaires (ils sont sur « À compléter »).
4. Repasser `RUN_SEED=false` dans `.env` pour ne plus rejouer le seed :

```bash
sed -i 's/^RUN_SEED=true/RUN_SEED=false/' .env
docker compose up -d
```

### 7. Mise à jour

```bash
cd /opt/asphalte
git pull
docker compose up -d --build
```

Les migrations sont appliquées automatiquement au redémarrage. Le volume
`uploads` (photos) et le volume `db-data` (base) ne sont pas touchés.

### Dépannage

| Symptôme | Piste |
| --- | --- |
| `502 Bad Gateway` | Le conteneur ne tourne pas : `docker compose ps`, `docker compose logs web` |
| `413 Request Entity Too Large` à l'envoi d'une photo | `client_max_body_size 8m;` absent du bloc `server` nginx |
| Déconnexion immédiate du backoffice | Site servi en HTTP : le cookie `Secure` est refusé, finir l'étape 5 |
| `certbot` échoue en validation | Le DNS ne pointe pas encore sur le serveur (`dig +short asphalte.walautao.fr`) ou le port 80 est fermé |
| Redémarrage en boucle du conteneur | Vérifier `AUTH_SECRET` (32 octets minimum) et l'accès à la base dans `docker compose logs web` |

### Sauvegarde

```bash
# Base de données
docker compose exec -T db pg_dump -U asphalte asphalte | gzip > asphalte-$(date +%F).sql.gz

# Photos
docker run --rm -v asphalte_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## Déploiement sans droits root

La procédure ci-dessus suppose un accès `sudo`. Sans lui, le déploiement se
sépare en deux moitiés :

| Ce qu'il faut | Droits nécessaires |
| --- | --- |
| Faire tourner l'application sur un port local (`127.0.0.1:3000`) | Aucun droit root **si** l'utilisateur est dans le groupe `docker` |
| Faire pointer `asphalte.walautao.fr` sur ce port | Root, **ou** un panneau d'hébergement, **ou** l'administrateur du serveur |

Commencer par établir ce qui est possible :

```bash
sh deploy/DIAGNOSTIC.sh
```

Le script ne modifie rien. Il indique notamment si `docker ps` fonctionne
sans `sudo`, si un panneau d'hébergement est présent, et quels ports sont
déjà occupés.

### 1. Installer l'application dans son répertoire personnel

```bash
git clone -b claude/asphalte-mvp-setup-16zuyl \
  https://github.com/wdemirdjian-14/asphalte.git ~/asphalte
cd ~/asphalte
```

Le `.env` est identique à celui de la procédure principale. Si le port 3000
est déjà pris (le diagnostic le dit), ajouter une ligne :

```dotenv
WEB_PORT=3010
```

Puis :

```bash
docker compose up -d --build
curl -I http://127.0.0.1:3000        # ou le port choisi
```

Si `docker ps` est refusé, voir « Sans Docker » plus bas.

### 2. Faire proxifier le sous-domaine

L'application écoute en local ; il reste à lui router le trafic du
sous-domaine. Trois cas.

**Panneau d'hébergement** (Plesk, CloudPanel, ISPConfig, Virtualmin…) :
ouvrir le sous-domaine `asphalte.walautao.fr`, chercher le champ
« directives nginx additionnelles » (ou « vhost editor »), y coller le
contenu de `deploy/nginx/asphalte-snippet.conf`. Sur Plesk, décocher aussi
« Proxy mode » pour qu'Apache ne s'intercale pas. Le certificat TLS se
demande depuis le panneau (Let's Encrypt en un clic).

**Administrateur du serveur** : lui transmettre le fichier
`deploy/nginx/asphalte-http.conf` (ou le fragment
`deploy/nginx/asphalte-snippet.conf` s'il a déjà un vhost pour ce
sous-domaine), en précisant le port local utilisé, et lui demander
d'émettre le certificat pour `asphalte.walautao.fr`.

**Hébergeur mutualisé sans accès nginx** : le proxy vers un port local n'est
en général pas possible. Il faut alors un VPS, ou un hébergement compatible
Node.js.

### Sans Docker

Si `docker ps` est refusé et que l'ajout au groupe `docker` n'est pas
envisageable, l'application tourne aussi directement avec Node, à condition
d'avoir Node 20+ et un accès à une base PostgreSQL (locale ou distante) :

```bash
cd ~/asphalte
cp .env.example .env      # renseigner DATABASE_URL et AUTH_SECRET
npm ci
npm run build
npm run db:deploy         # applique les migrations
npm run db:seed           # crée le compte administrateur
PORT=3000 npm run start
```

Pour que le processus survive à la déconnexion, sans root :

```bash
# systemd utilisateur (nécessite `loginctl enable-linger <utilisateur>`,
# à demander à l'administrateur une seule fois)
mkdir -p ~/.config/systemd/user
# … puis un service pointant sur `npm run start` dans ~/asphalte

# ou, plus simple, avec pm2 installé en local
npx pm2 start "npm run start" --name asphalte
npx pm2 save
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
