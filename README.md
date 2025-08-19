# Kokoroji – Application Mobile (PFE RNCP 39583)

Projet de fin d’études – Ynov Lyon
Titre RNCP : Expert en Développement Logiciel
Auteur : Thomas Dietrich
Année : 2024-2025

---

## Présentation

**Kokoroji** est une application mobile qui vise à renforcer le lien parent-enfant à travers des rituels ludiques, des défis interactifs et la création de souvenirs familiaux. Développée dans le cadre du PFE (Bloc 2) du titre RNCP 39583, l’application place la sobriété numérique, la vie privée et l’accessibilité au cœur de sa conception.

---

## Stack technique

- React Native (Expo, TypeScript)
- Supabase (backend, authentification, synchronisation)
- SQLite chiffré (stockage offline)
- Sentry (supervision et journalisation)
- EAS Build (build & déploiement mobile)
- CI/CD (Azure DevOps)
- Tests unitaires (Jest, à compléter)

---

## Prérequis

- Node.js >= 18.x
- Expo CLI (`npm install -g expo-cli`) ou usage via `npx`
- Un smartphone Android/iOS avec l’application **Expo Go** installée
- (Optionnel) Compte Supabase
- (Optionnel) Android Studio ou Xcode (pour tests sur émulateur, non obligatoire)

---

## Installation du projet

1. **Cloner le dépôt**

   ```bash
   git clone https://github.com/<à_ajouter>/kokoroji-app.git
   cd kokoroji-app
   ```

2. **Installer les dépendances**

   ```bash
   npm install
   ```

3. **Lancer l’application en développement**

   ```bash
   npm start
   # ou
   npx expo start
   ```

   > Scannez le QR code affiché dans le terminal ou le navigateur avec Expo Go pour ouvrir l’application sur votre smartphone.

---

## Scripts utiles

- `npm start` ou `npx expo start` : Démarre le serveur de développement Expo
- `npm run android` : Lance l’application sur un émulateur Android (si Android Studio installé)
- `npm run ios` : Lance sur un simulateur iOS (Mac/Xcode requis)
- `npm run test` : Lance les tests unitaires (à compléter)
- `npm run lint` : Lint du code (à compléter)

---

## Structure du projet

```
kokoroji-app/
├── app/           # Navigation et écrans principaux
├── src/           # Modules métier, logique, services, helpers
├── assets/        # Images, polices, sons
├── .gitignore
├── app.json
├── package.json
├── README.md      # Ce fichier
└── ...
```

---

## Configuration environnement

- Les variables d’environnement sensibles (ex : clés Supabase) seront à placer dans un fichier `.env` non versionné. Un exemple sera fourni sous le nom `.env.example`.
- **Aucun secret ne doit être commit dans le dépôt public**.

---

## Bonnes pratiques et qualité

- Convention de branches : `main`, `develop`, `feature/<fonctionnalité>`
- Utilisation de PR (Pull Requests) avec revue de code obligatoire avant merge
- Respect des conventions de nommage, docstring et commentaires professionnels
- Traçabilité des commits (commits unitaires et descriptifs)
- Tests unitaires à compléter au fur et à mesure du développement

---

## Supervision & sécurité

- Journalisation des erreurs critiques avec Sentry
- Stockage local chiffré (RGPD-ready, pas d’export cloud par défaut)
- Synchronisation cloud opt-in via Supabase (stockage EU, RLS activé)

---

## Déploiement & CI/CD

- Les builds mobiles sont réalisés via Expo EAS Build (profil development, staging, production)
- Un pipeline CI/CD est prévu pour automatiser les tests, le lint, le build (Azure DevOps)
- Les instructions de build et de déploiement seront documentées dans le Wiki technique

---

## Contribution & support

Le projet est développé dans le cadre d’un PFE individuel. Les suggestions/corrections sont étudiées, mais seules les PR validées sont mergées.

Pour toute question : contacter Thomas (\<thomas.dietrich@ynov.com>).

---

## Licence

Projet initié dans un cadre académique, non destiné à un usage commercial ou à la diffusion en production.
L’utilisation du code source est réservée à un usage pédagogique et personnel. Toute utilisation commerciale ou redistribution doit être approuvée par l’auteur.

---

## Historique des évolutions

Consultez le Wiki ou le journal de versions pour suivre l’évolution du projet.

---
