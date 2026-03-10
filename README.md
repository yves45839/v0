# v0-secure-point-dashboard-design

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_cdXi16FLPkhHJRdgxZsmlARB2lYB)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Adn225/v0-secure-point-dashboard-design" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>

## Integrer la collection Employees API au projet

### 1) Fichiers Postman inclus

- Collection: `postman/employees-create-person.postman_collection.json`
- Environment local: `postman/employees-local.postman_environment.json`

Importe ces deux fichiers dans Postman puis lance la requete `Auth - Get JWT Token` avant les requetes de creation.

### 2) Activer l'appel API depuis l'interface Employees

Le modal "Ajouter un Employe" peut appeler l'API reelle au lieu du mode mock.

Cree un fichier `.env.local`:

```bash
NEXT_PUBLIC_EMPLOYEE_API_ENABLED=true
NEXT_PUBLIC_EMPLOYEE_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_EMPLOYEE_API_USERNAME=emp-admin
NEXT_PUBLIC_EMPLOYEE_API_PASSWORD=pass
```

Puis relance l'app (`pnpm dev`).

### 3) Fonctionnement actuel dans l'UI

Quand `NEXT_PUBLIC_EMPLOYEE_API_ENABLED=true`:

1. le front recupere un token JWT (`POST /api/auth/token/`)
2. il cree la personne (`POST /api/employees/`)
3. il met a jour la liste locale de l'interface

Si l'API retourne une erreur, un message d'erreur est affiche dans le modal.
