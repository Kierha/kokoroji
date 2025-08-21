# Changelog – Kokoroji

Toutes les modifications notables de ce projet seront documentées dans ce fichier.  
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet suit le versionnage sémantique.

---

## [1.0.0] – 22/08/2025
### Ajouté
- Intégration **Sentry (sentry-expo 7.2.0)** avec instrumentation minimale :
  - capture d’événement fonctionnel (3 emails invalides).
  - gestion crash Hermes via fallback `__extends`.
- **SonarCloud** intégré au pipeline Azure (snapshot qualité au 20/08/2025).
- Documentation finale : README.md, CHANGELOG.md, dossiers Bloc 2 & Bloc 4.

### Modifié
- Optimisation qualité (lint, tests Jest).
- Stabilisation de la CI/CD (Azure DevOps).

---

## [0.3.0] – 16/08/2025
### Ajouté
- **Écrans Profil & Settings** (édition du profil, activation sync opt-in, contact support).
- **Gestion des défis** (catalogue, création personnalisée, filtrage).
- **Gestion des récompenses** (solde de Koro-Coins, ajout et historique).
- **Sessions familiales** (lancement, suivi, fin de session avec logs).
- **Logs applicatifs structurés** (événements + purge auto >30j).

---

## [0.2.0] – 10/07/2025
### Ajouté
- **Pipeline CI/CD Azure DevOps** (lint, tests, build).
- **Écran d’accueil** avec navigation principale.
- **Authentification** via Supabase (email/password + Magic Link).
- **Synchronisation partielle** (opt-in) des logs `app_logs`.

### Modifié
- Structuration initiale des services (`authService`, `logService`, etc.).

---

## [0.1.0] – 15/06/2025
### Ajouté
- Initialisation du projet React Native (Expo + TypeScript).
- Création et intégration des premières BDD SQLite.
- Mise en place du squelette applicatif et d’un premier README.
- Configuration ESLint et scripts de base.
