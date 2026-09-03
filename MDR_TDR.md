# TDR – MyDeamonRouter_MDR (MDR)
## Termes de Référence & Cahier des Charges Fonctionnelles

**Version** : 1.0  
**Date** : 03 Septembre 2026  
**Projet** : MyDeamonRouter_MDR – Routeur Intelligent Multi-LLM Local  
**Classification** : Document de conception et de référencement

---

## 1. Contexte & Vision Produit

### 1.1 Problématique
Les utilisateurs avancés de LLM (développeurs, chercheurs, power-users) font face à trois frustrations récurrentes :
1. **Indisponibilité / épuisement des quotas** : une API tierce devient soudainement inaccessible (rate-limit, crédits épuisés, outage).
2. **Absence de comparabilité** : tester un même prompt sur plusieurs modèles est manuel, fastidieux et non traçable.
3. **Fragmentation du contexte** : lors d'un changement de modèle, l'historique conversationnel et les documents uploadés sont perdus.

### 1.2 Vision
MDR est une **application desktop locale** (Python) servant de **couche d'abstraction et de routage intelligente** entre l'utilisateur et un pool d'API LLM distantes. Elle garantit la continuité de service (mode Série), offre une capacité d'évaluation comparative (mode Parallèle), et assure la persistance illimitée du contexte conversationnel sur disque local.

### 1.3 Objectifs SMART
- **Disponibilité** : garantir une réponse utilisateur dans >99 % des cas grâce au fallback automatique sur 3+ fournisseurs.
- **Transparence** : fournir une métrologie temps réel (latence, tokens, modèle utilisé) pour chaque interaction.
- **Souveraineté des données** : aucune donnée conversationnelle ne quitte la machine (sauf appels API volontaires vers les LLM distants).
- **Ergonomie** : interface chat conforme aux standards 2026 (streaming, upload multimodal, historique persistant, accessibilité WCAG 2.1 AA).

---

## 2. Périmètre Fonctionnel

### 2.1 In-Scope (Livrables MVP)
| ID | Domaine | Description |
|---|---|---|
| F-01 | Routage Série | Fallback automatique LLM₁ → LLM₂ → … sur épuisement token / timeout / 5xx |
| F-02 | Routage Parallèle | Dispatch simultané vers N LLM avec tableau de bord comparatif temps réel |
| F-03 | Administration API | CRUD complet des configurations LLM (endpoint, clé, modèle, mode, activation) |
| F-04 | Health-Check | Test de connectivité et validation des credentials par fournisseur |
| F-05 | Auto-Discovery | Détection automatique des capacités (contexte max, modes supportés, types d'entrée) |
| F-06 | Interface Chat | Zone de prompt, zone de réponse, upload documentaire (PDF, image, TXT, code) |
| F-07 | Affichage Multi-Réponses | Split-view / onglets adaptatifs selon le nombre de réponses (1 à N) |
| F-08 | Gestion des Sessions | Création, sauvegarde, chargement, suppression de sessions conversationnelles sur disque |
| F-09 | Transfert de Contexte | Portage intégral de l'historique + fichiers lors d'un basculement Série |
| F-10 | Persistance Locale | Stockage JSONL/SQLite sur disque dur, sans limite de volume théorique |

### 2.2 Out-of-Scope (V2 ou hors périmètre)
- Hébergement cloud / SaaS multi-utilisateurs.
- Authentification utilisateur avancée (RBAC) – l'app est single-user locale.
- Modèles locaux (Ollama, llama.cpp) – focus API distantes uniquement pour le MVP.
- Paiement intégré / gestion de crédits fournisseurs.
- Plugins tiers / marketplace d'extensions.

### 2.3 Fonctionnalités à Valeur Ajoutée (Propositions)
| ID | Fonctionnalité | Valeur Métier | Priorité |
|---|---|---|---|
| VA-01 | **Circuit Breaker Intelligent** | Détection des pannes transitoires vs. structurelles ; cooldown exponentiel avant réintégration d'un fournisseur défaillant | Haute |
| VA-02 | **Cost-Tracking & Budget Alert** | Suivi en temps réel des coûts estimés par fournisseur/session ; alerte si seuil dépassé | Haute |
| VA-03 | **Prompt Templates & System Prompts** | Bibliothèque de templates sauvegardables ; system prompt spécifique par fournisseur | Moyenne |
| VA-04 | **Export Session (PDF/Markdown)** | Génération d'un rapport de session incluant métriques et réponses pour archivage ou partage | Moyenne |
| VA-05 | **Diff Viewer Inter-Réponses** | En mode Parallèle, mise en évidence des divergences sémantiques entre réponses de LLM différents | Moyenne |
| VA-06 | **Context Compression Auto** | Résumé automatique de l'historique lorsque la fenêtre de contexte du LLM cible est inférieure à la session active | Haute |
| VA-07 | **Mode Hybride Série/Parallèle** | Lancer d'abord en parallèle sur un sous-ensemble rapide, puis fallback série sur les modèles lourds si insatisfaction | Basse |
| VA-08 | **Annotation & Favoris** | Possibilité d'annoter une réponse ou de la marquer comme référence dans l'historique | Basse |

---

## 3. Spécifications Fonctionnelles Détaillées

### 3.1 SF-01 : Mode Série (Resilience Routing)
**Acteur** : Système (automatique)  
**Déclencheur** : Échec d'un appel LLM ou épuisement des tokens disponibles.

**Règles métier** :
1. L'utilisateur définit une **priorité ordonnée** de fournisseurs actifs (ex: GPT-4o → Claude-3.5 → Gemini-Pro).
2. L'appel est tenté sur le fournisseur de rang N.
3. Si l'erreur est **récupérable** (429, 503, timeout, quota exceeded, context window exceeded), le système bascule sur N+1.
4. Si l'erreur est **terminale** (400 bad request, content-filter rejection, 401 auth), le fallback est inhibé pour cette requête et l'erreur est remontée.
5. Le **contexte complet** (historique messages + fichiers uploadés dans la session) est retransmis au fournisseur N+1.
6. Une **notification UI non-bloquante** indique le basculement (toast : "Basculement sur Claude-3.5 – épuisement quota OpenAI").
7. Le fournisseur défaillant est marqué "suspect" ; après 3 échecs consécutifs, le **Circuit Breaker** l'isole pendant 5 min.

**Critères d'acceptation** :
- [ ] Un fallback s'exécute en < 500 ms après détection d'échec.
- [ ] Le contexte de session > 50 messages est transféré sans perte.
- [ ] L'utilisateur est informé visuellement de chaque basculement.

### 3.2 SF-02 : Mode Parallèle (Benchmark Routing)
**Acteur** : Utilisateur  
**Déclencheur** : Sélection du mode "Parallèle" + envoi d'un prompt.

**Règles métier** :
1. Le prompt est dispatché **asynchrone et simultané** à tous les fournisseurs actifs.
2. Chaque réponse est collectée dans un **conteneur dédié** (onglet ou voie de split-view).
3. Des **métriques temps réel** sont affichées : TTFB (Time To First Byte), durée totale, tokens input/output, modèle exact, fournisseur, coût estimé.
4. Un indicateur de progression par voie montre l'état (en cours, terminé, échec).
5. L'utilisateur peut **interrompre individuellement** un stream sans affecter les autres.
6. À la fin, un **résumé comparatif** est proposé (tableau récapitulatif exportable).

**Critères d'acceptation** :
- [ ] 5 LLM peuvent être sollicités en parallèle sans blocage UI.
- [ ] Les métriques s'actualisent à la fréquence du stream (≥ 5 Hz).
- [ ] Le layout s'adapte : 1→2 réponses = split vertical ; 3→4 = grille 2×2 ; 5+ = onglets + vue grille sélectionnable.

### 3.3 SF-03 : Panneau d'Administration (Configuration)
**Acteur** : Administrateur (utilisateur local)

**Règles métier** :
1. **Formulaire d'ajout** : Nom, Fournisseur (OpenAI, Anthropic, Google, Mistral, Groq, Azure…), Endpoint URL, Clé API, Modèle par défaut, Mode d'usage (Chat / Agent / Vision / Completion), Taille de contexte connue, Coût input/output par 1M tokens.
2. **Test de connectivité** : Bouton "Tester" effectuant un appel ping (modèle léger ou endpoint /models) et retournant latence + statut.
3. **Activation / Désactivation** : Toggle immédiat sans perte de configuration.
4. **Détection auto** : Bouton "Détecter les capacités" interrogeant l'API (liste des modèles disponibles, context window, modes supportés) et pré-remplissant le formulaire.
5. **Mode par fournisseur** : L'admin peut verrouiller un mode (ex: GPT-4o en "Agent", Claude en "Chat"). Ce mode est injecté dans le paramètre `system` ou équivalent de l'API.

### 3.4 SF-04 : Interface Chat & Upload
**Règles métier** :
1. **Zone de saisie** : textarea auto-expandable avec support Markdown preview, mentions de fichiers uploadés, et raccourcis clavier (Ctrl+Enter envoi, Shift+Enter nouvelle ligne).
2. **Upload** : Drag & drop ou bouton ; formats acceptés initiaux : `.txt`, `.md`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.py`, `.js`, `.json`, `.csv`. Taille max 20 Mo par fichier.
3. **Traitement fichier** : images → encodage base64 pour APIs vision ; texte/code → extraction et injection dans le contexte ; PDF → extraction texte (PyPDF2 / pdfplumber) ou transmission URL si l'API le supporte.
4. **Streaming** : Affichage token par token avec buffering Markdown (pas de rendu intermédiaire cassé).
5. **Contrôles de message** : Copier, Régénérer, Éditer le prompt et resoumettre (fork de conversation).

### 3.5 SF-05 : Gestion des Sessions
**Règles métier** :
1. **Auto-save** : À chaque message terminé, la session est sérialisée sur disque (JSONL append-only).
2. **Structure de stockage** : `~/.mdr/sessions/{session_id}/{session_id}.jsonl` + `~/.mdr/sessions/{session_id}/uploads/`.
3. **Session list** : Sidebar avec titre (auto-généré à partir des 5 premiers mots du premier prompt ou éditable), date, preview, nombre de messages.
4. **Recherche** : Full-text search sur l'ensemble des sessions (via SQLite FTS5 indexant les messages).
5. **Transfert de contexte** : Lors d'un basculement Série, le fichier de session est relu et réémis intégralement au nouveau LLM, avec compression si nécessaire (VA-06).

---

## 4. Spécifications Non-Fonctionnelles (SLA & Qualité)

### 4.1 Performance
| Indicateur | Objectif |
|---|---|
| Temps de démarrage app | < 3 secondes |
| Latence ajout UI message | < 50 ms |
| Latence basculement Série | < 500 ms |
| Throughput mode Parallèle | ≥ 5 streams simultanés sans dégradation UI |
| Taille max session persistante | Illimitée (pagination mémoire si > 1000 messages) |

### 4.2 Sécurité
- **Chiffrement des clés API** : stockage via `keyring` (macOS Keychain / Windows Credential Manager / Linux Secret Service) ou chiffrement AES-256-GCM avec clé dérivée du hardware ID.
- **Sanitization** : Les fichiers uploadés sont scannés (type MIME vérifié, pas seulement extension).
- **No phone-home** : L'application ne contacte aucun serveur autre que les endpoints LLM configurés.

### 4.3 Fiabilité
- **Circuit Breaker** : Seuil 5 erreurs / cooldown 60 s / half-open après 120 s.
- **Retry policy** : Jittered exponential backoff sur 429 (max 3 retries avant fallback).
- **Atomicité** : Écriture session en mode append-only ; corruption impossible par crash mid-write.

### 4.4 UI/UX & Accessibilité
- **Responsive** : Adaptation 1080p → 4K ; sidebar repliable.
- **Thèmes** : Clair / Système / Sombre (OLED-friendly).
- **Accessibilité** : WCAG 2.1 AA (contraste 4.5:1, navigation clavier, ARIA live regions pour streaming).
- **I18n** : Fr (default) + En pour le MVP.

---

## 5. Livrables Attendus

| Livrable | Format | Échéance |
|---|---|---|
| Code source complet | Python + TS/React | T0 + 8 semaines |
| Exécutable binaire local | PyInstaller (.exe / .app / ELF) | T0 + 9 semaines |
| Documentation utilisateur | PDF + Markdown inline | T0 + 9 semaines |
| Suite de tests unitaires | pytest + coverage > 80 % | T0 + 8 semaines |
| Tests E2E | Playwright | T0 + 9 semaines |

---

## 6. Planning Indicatif (8 semaines)

| Sprint | Focus |
|---|---|
| S1 | Architecture, setup projet, modèle de données, couche API LLM (adapters) |
| S2 | Mode Série + Circuit Breaker + Context Transfer |
| S3 | Mode Parallèle + Métriques temps réel |
| S4 | UI Chat (React) + Streaming + Upload |
| S5 | Panneau Admin + Auto-Discovery + Health-Check |
| S6 | Gestion Sessions + Persistance + Recherche FTS |
| S7 | UI/UX avancée (split-view, onglets, thèmes, responsive) |
| S8 | Tests, packaging, documentation, polish |

---

*Document rédigé par l'équipe d'architecture MDR – Version 1.0*
