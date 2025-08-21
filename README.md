# Kokoroji – Application Mobile (PFE RNCP 39583)

Projet de fin d’études – Ynov Lyon  
Titre RNCP : Expert en Développement Logiciel  
Auteur : Thomas Dietrich  
Contact : thomas.dietrich@ynov.com  
Année : 2024-2025

---

## Présentation

**Kokoroji** est une application mobile qui vise à renforcer le lien parent-enfant à travers des rituels ludiques, des défis interactifs et la création de souvenirs familiaux.  
Développée dans le cadre du PFE (Bloc 2) du titre RNCP 39583, l’application place la sobriété numérique, la vie privée et l’accessibilité au cœur de sa conception.

L’application adopte une approche **offline-first** : toutes les données sont stockées localement en SQLite.  
➡️ Bénéfices : **confidentialité** (données familiales non envoyées par défaut) + **résilience réseau** (usage même sans connexion).  
Le chiffrement natif n’est pas activé actuellement, mais figure dans la feuille de route (sqlcipher/expo-sqlite-crypto en évaluation).  

---

## Fonctionnalités principales

- **Sessions et rituels familiaux** : création et gestion de sessions parent–enfant (durée, participants, suivi historique).  
- **Défis ludiques** : bibliothèque filtrée (âge, lieu, durée), création de défis personnalisés, suivi de complétion.  
- **Système de récompenses** : attribution de Koro-Coins lors de la réussite de défis, consultation du solde, échange contre des récompenses.  
- **Mémoires & souvenirs** : association de photos/vidéos aux sessions, stockage local des médias (pas d’upload cloud).  
- **Logs & traçabilité** : journalisation structurée des événements métier + erreurs avec purge auto >30 jours.

---

## Stack technique

- **React Native (Expo, TypeScript)**
- **Supabase** (backend, authentification, synchronisation partielle)
- **SQLite** (stockage local – chiffrement prévu, lib en évaluation)
- **Sentry (sentry-expo 7.2.0 épinglée)** : instrumentation minimale, crash Hermes précédent contourné via upgrade + fallback `__extends` (suppression planifiée) ; capture fonctionnelle démo après 3 emails invalides.  
- **EAS Build** (build & déploiement mobile)
- **CI/CD Azure DevOps** (tests, lint, build, SonarCloud)
- **Tests unitaires avec Jest** (React Native Testing Library)

---

## Prérequis

- Node.js >= 18.x  
- Expo CLI (`npm install -g expo-cli`) ou usage via `npx`  
- Un smartphone Android/iOS avec **Expo Go** installé  
- (Optionnel) Compte Supabase  
- (Optionnel) Android Studio ou Xcode pour tests émulateur/simulateur

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

3. **Configurer l’environnement**
   Créez un fichier `.env.development` (ou `.env.production`) à partir de l’exemple `.env.example` :
   ```env
   EXPO_PUBLIC_SUPABASE_URL=<url Supabase>
   EXPO_PUBLIC_SUPABASE_KEY=<clé API Supabase>
   EXPO_PUBLIC_SENTRY_DSN=<dsn optionnel>
   EXPO_PUBLIC_ENV=development
   ```
   > Aucune clé sensible n’est commitée dans le dépôt.

4. **Lancer l’application en développement**
   ```bash
   npm start
   # ou
   npx expo start
   ```
   > Scannez le QR code avec Expo Go pour ouvrir l’app.

---

## Scripts utiles

- `npm start` : démarre Expo en mode développement  
- `npm run android` : lance sur émulateur Android  
- `npm run ios` : lance sur simulateur iOS (Mac requis)  
- `npm run test` : exécute les tests unitaires  
- `npm run lint` : vérifie la qualité du code

---

## Structure du projet

```
kokoroji-app/
├── __mocks__/          # mocks pour tests
├── __tests__/          # tests unitaires (Jest)
├── coverage/           # rapport de couverture
├── src/
│   ├── assets/         # images et polices
│   ├── components/     # UI réutilisable
│   ├── database/       # gestion SQLite
│   ├── hooks/          # hooks personnalisés
│   ├── models/         # définitions types / entités
│   ├── navigation/     # configuration navigation
│   ├── screens/        # écrans principaux (features, session, reward…)
│   ├── services/       # logique métier (auth, session, défi, reward, logs…)
│   ├── styles/         # thèmes & couleurs
│   └── utils/          # fonctions utilitaires
├── test-results/       # sorties JUnit / CI
├── App.tsx             # bootstrap app (init DB, auth, logs, navigation)
├── package.json
└── ...
```

---

## Synchronisation (état actuel)

- **Partielle et opt-in**, limitée à la table `app_logs`.  
- **Déclencheurs** : automatique (focus Home, max 1 fois/h si logs en attente) + manuel (depuis Settings).  
- Logs non synchronisés envoyés en batch vers Supabase puis marqués localement.  
- Purge auto des logs locaux >30j avant toute sync éventuelle.  
- **Pattern réutilisable** : sélection `is_synced=0` → batch insert → marquage.  
- **Infrastructure prête** pour extension aux autres entités (sessions, défis, récompenses, médias…).  

Feuille de route : extension progressive du mécanisme aux entités métier après validation de la robustesse sur les logs.

---

## Bonnes pratiques & qualité

- Logs structurés `{timestamp, type, niveau, contexte, détails JSON}`.  
- Séparation UI / logique métier (services).  
- Convention de branches : `main`, `develop`, `feature/<fonctionnalité>`.  
- Commits unitaires et descriptifs.  
- Respect ESLint (flat config).  
- Tests unitaires automatisés.  
- Indicateurs qualité intégrés à la CI/CD (SonarCloud, lint, coverage). Snapshot du 20/08/2025 : couverture ~56 %, duplications 1,7 %, 0 vulnérabilités.  
➡️ Capture détaillée intégrée au dossier Bloc 2.

---

## Sécurité

- Stockage local prioritaire (offline-first).  
- Limites actuelles : DB non chiffrée, pas de sync active hors logs, bypass dev réservé au mode développement.  
- Aucune donnée enfant envoyée sans activation sync.  
- Emails invalides : capturés temporairement pour démo (suppression/hachage planifiée avant diffusion publique).  
- Journalisation via Sentry (sentry-expo 7.2.0, instrumentation minimale).  

---

## Accessibilité

- Objectif WCAG 2.1 AA : contraste, focus, tailles tactiles, feedback immédiat.  
- Audit contrastes / navigation lecteur d’écran planifié (VoiceOver / TalkBack).  

---

## Déploiement & CI/CD

- Builds mobiles via **Expo EAS** (dev/staging/prod).  
- Pipeline CI/CD avec Azure DevOps : tests, lint, expo-doctor, build, SonarCloud.  
- Tableaux de bord qualité disponibles via SonarCloud.

---

## Feuille de route

- **Court terme** :
  - Finaliser couverture tests unitaires (>70 %).  
  - Intégrer chiffrement SQLite (`sqlcipher`/`expo-sqlite-crypto`).  
  - Étendre la synchronisation aux entités métier (sessions, défis, récompenses).  
  - Retirer fallback `__extends` une fois Sentry stable sans lui.  
  - Masquage/hachage PII dans événements Sentry.  
- **Moyen terme** :
  - Ajout de tests end-to-end.  
  - Audit accessibilité complet (WCAG 2.1 AA).  
  - Gestion multi-famille / multi-profil.  
- **Long terme** :
  - Supervision enrichie (dashboards, alertes en temps réel).  
  - Internationalisation (français/anglais).  
  - Publication en store (bêta fermée).  

---

## Contribution & licence

Le projet est développé dans le cadre d’un PFE individuel.  
Suggestions/corrections étudiées mais seules les PR validées sont mergées.  

Licence interne académique – non OSS.  

---

## Documentation complémentaire

📄 La documentation complète du projet est disponible dans le **dossier Bloc 2** (rapport PDF/Canvas).
