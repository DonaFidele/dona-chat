# Dona-Chat — Assistant d’étude IA

Dona-Chat est un assistant d’étude fondé sur les documents de l’étudiant. Il aide à organiser les cours, retrouver une information, comprendre un chapitre et créer des fiches de révision sauvegardées.

## Fonctionnalités

- Création de matières / cours personnels
- Ajout et indexation de PDF, DOCX, TXT, CSV, JSON, Markdown et MDX
- Recherche RAG isolée à la matière sélectionnée
- Réponses en streaming, fondées sur les documents pertinents
- Indication du nombre de documents utilisés sous chaque réponse, avec leurs noms au survol
- Fiches de révision structurées, éditables et sauvegardées dans la sidebar
- Historique des conversations et rattachement automatique d’un chat à sa matière
- Authentification avec Auth.js, base PostgreSQL Neon et fichiers stockés dans Vercel Blob

## Parcours utilisateur

1. Créer une matière dans la sidebar.
2. Utiliser le bouton `+` du cours pour ajouter un ou plusieurs documents.
3. Ouvrir le cours : Dona-Chat affiche ou crée la conversation associée.
4. Poser une question sur le contenu ; l’assistant recherche dans les documents du cours.
5. Demander « Génère une fiche de révision » pour créer une fiche sauvegardée et éditable.

La vue **Tous les documents** reste disponible pour retrouver les sources non classées dans une matière.

## Stack technique

- [Next.js](https://nextjs.org) 16, App Router et Turbopack
- [Vercel AI SDK](https://sdk.vercel.ai) pour le chat en streaming et les tools
- [Neon](https://neon.tech), PostgreSQL, [Drizzle ORM](https://orm.drizzle.team) et pgvector pour le RAG
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) pour les fichiers téléversés
- [Auth.js](https://authjs.dev) pour l’authentification
- Tailwind CSS, shadcn/ui et Radix UI pour l’interface

## Installation locale

### Prérequis

- Node.js 20 ou supérieur
- pnpm
- Un projet Vercel avec Neon Postgres et Blob configurés
- Une clé Vercel AI Gateway (`AI_GATEWAY_API_KEY`) ou un fournisseur compatible

### Démarrage

```bash
git clone https://github.com/DonaFidele/dona-chat.git
cd dona-chat/rag-ai-chatbot
pnpm install
```

Crée `rag-ai-chatbot/.env.local` avec les variables du projet. Les variables essentielles sont :

```bash
POSTGRES_URL=
AUTH_SECRET=
AI_GATEWAY_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

Applique ensuite les migrations et démarre l’application :

```bash
NODE_OPTIONS=--dns-result-order=ipv4first pnpm db:migrate
pnpm dev
```

L’application est alors disponible sur [http://localhost:3000](http://localhost:3000).

## Documents pris en charge

| Format | Indexation |
| --- | --- |
| PDF avec texte sélectionnable | Oui |
| DOCX | Oui |
| TXT, CSV, JSON, MD, MDX | Oui |
| PDF scanné / image | OCR requis (non inclus actuellement) |

Un PDF corrompu ou mal formé peut produire une erreur `bad XRef entry`. Dans ce cas, ouvre-le dans un lecteur PDF puis réexporte-le ou imprime-le en PDF avant de le téléverser.

## Scripts utiles

```bash
pnpm dev          # Développement local
pnpm build        # Migration + build de production
pnpm db:generate  # Génère une migration Drizzle après une modification du schéma
pnpm db:migrate   # Applique les migrations à Neon
pnpm db:studio    # Ouvre Drizzle Studio
```

## Déploiement

Chaque push sur `main` déclenche le déploiement Vercel du projet. Configure les mêmes variables d’environnement dans Vercel pour l’environnement Production.

## Licence

Ce projet est basé sur le Chat SDK de Vercel et sur le fork `emertechie/rag-ai-chatbot`. Consulte [LICENSE](./LICENSE) pour les conditions de licence.
