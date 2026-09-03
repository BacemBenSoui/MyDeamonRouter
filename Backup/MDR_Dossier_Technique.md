# Dossier Technique – MyDeamonRouter_MDR (MDR)
## Architecture, Stack & Implémentation

**Version** : 1.0  
**Date** : 03 Septembre 2026  
**Statut** : Document de conception technique (Technical Design Document)

---

## 1. Vue d'Ensemble Architecturale

MDR adopte une architecture **modulaire en couches** avec séparation stricte entre le moteur de routage (Python) et l'interface utilisateur (React/TypeScript). L'application s'exécute localement sous forme d'un **serveur web embarqué** (Uvicorn/FastAPI) servissant le frontend buildé en static files, le tout packagé via PyInstaller en exécutable natif.

### 1.1 Schéma C4 – Niveau 1 (Contexte)

```
┌─────────────────────────────────────────────────────────────┐
│                         Utilisateur                          │
│  (Interface Desktop MDR – React + FastAPI local)           │
└──────────────────────┬────────────────────────────────────────┘
                       │ HTTP/WebSocket localhost:8745
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MyDeamonRouter_MDR                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  UI Layer    │  │  Router      │  │  Session Manager │   │
│  │  (React)     │◄─┤  Engine      │◄─┤  & Persistence   │   │
│  └──────────────┘  │  (Python)    │  └──────────────────┘   │
│                    └──────┬───────┘                           │
│                           │                                  │
│              ┌────────────┼────────────┐                     │
│              ▼            ▼            ▼                     │
│         ┌────────┐  ┌────────┐  ┌────────┐                │
│         │ OpenAI │  │Anthropic│  │ Google │  ...           │
│         │  API   │  │  API   │  │  API   │                │
│         └────────┘  └────────┘  └────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Schéma C4 – Niveau 2 (Conteneurs)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PROCESSUS MDR (Python)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Application                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ API Router  │  │ WebSocket   │  │ Static Files        │  │   │
│  │  │ (REST)      │  │ Manager     │  │ (React build/)      │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │   │
│  │         │                │                                    │   │
│  │  ┌──────▼────────────────▼──────┐  ┌─────────────────────┐  │   │
│  │  │      Core Services            │  │ Provider Adapters   │  │   │
│  │  │  ┌─────────┐ ┌─────────────┐  │  │  ┌─────┬─────┬───┐  │  │   │
│  │  │  │ Session │ │ LLM Router  │  │  │  │OpenAI│Claude│Gemini│  │   │
│  │  │  │ Manager │ │ (Série/Par.)│  │  │  └─────┴─────┴───┘  │  │   │
│  │  │  └─────────┘ └─────────────┘  │  └─────────────────────┘  │   │
│  │  │  ┌─────────┐ ┌─────────────┐  │  ┌─────────────────────┐  │   │
│  │  │  │ Config  │ │ File Proc.  │  │  │ LiteLLM Gateway     │  │   │
│  │  │  │ Manager │ │ (Upload)    │  │  │ (Unified Interface) │  │   │
│  │  │  └─────────┘ └─────────────┘  │  └─────────────────────┘  │   │
│  │  └──────────────────────────────┘                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ SQLite (Config)    │  │ FileSystem (Sessions + Uploads)     │   │
│  │ - providers        │  │ ~/.mdr/sessions/{id}/               │   │
│  │ - api_keys (enc.)  │  │   ├── session.jsonl                 │   │
│  │ - settings         │  │   └── uploads/                      │   │
│  └────────────────────┘  └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Technique Détaillée

### 2.1 Backend – Moteur de Routage
| Composant | Technologie | Justification |
|---|---|---|
| Framework API | **FastAPI** (async) | Performance, auto-doc OpenAPI, natif async pour les appels LLM parallèles |
| Serveur | **Uvicorn** | ASGI performant, support WebSocket natif |
| Client HTTP LLM | **httpx** (async) + **LiteLLM** | LiteLLM fournit une interface unifiée OpenAI-compatible pour 100+ fournisseurs ; httpx gère le streaming |
| Persistence Config | **SQLite** + **SQLModel** | Zero-config, transactionnel, suffisant pour du local single-user |
| Persistence Sessions | **JSONL** append-only | Immunité face aux crashs, lecture séquentielle rapide, git-friendly |
| Chiffrement | **keyring** + **cryptography** | Intégration OS-native pour les secrets |
| Traitement PDF | **pdfplumber** / **PyMuPDF** | Extraction texte structurée avec préservation layout |
| Traitement Images | **Pillow** | Redimensionnement, conversion base64, vérification format |
| Tests | **pytest** + **pytest-asyncio** + **httpx** | Couverture async et mocking HTTP |

### 2.2 Frontend – Interface Utilisateur
| Composant | Technologie | Justification |
|---|---|---|
| Framework | **React 18** + **TypeScript** | Typage fort, écosystème mature, composants réutilisables |
| Build Tool | **Vite** | Démarrage rapide, HMR, bundling optimisé |
| Styling | **TailwindCSS** + **shadcn/ui** | Design system cohérent, accessibilité intégrée, dark mode natif |
| Éditeur Markdown | **@uiw/react-md-editor** ou **TipTap** | Preview WYSIWYG, support LaTeX, coloration syntaxique |
| Streaming | **@microsoft/fetch-event-source** | SSE robuste avec reconnexion auto |
| State Management | **Zustand** | Léger, sans boilerplate, persistance facile |
| Routing UI | **React Router v6** | Navigation Admin / Chat / Settings |
| Recherche FTS | **fuse.js** | Recherche fuzzy côté client sur l'index des sessions |
| Tests E2E | **Playwright** | Tests cross-browser, screenshots, CI-ready |

### 2.3 Packaging & Distribution
| Composant | Technologie |
|---|---|
| Packaging Backend | **PyInstaller** – single binary |
| Packaging Frontend | **Vite build** → copie dans `backend/static/` |
| Distribution | `.exe` (Windows), `.app` (macOS), AppImage (Linux) |
| Auto-update | **pyupdater** ou **tuf** (V2) |

---

## 3. Architecture Logicielle – Modules Métier

### 3.1 Module LLM Router (`core/router.py`)

```python
class LLMRouter:
    """
    Ordonnanceur principal des appels LLM.
    Supporte deux stratégies : SEQUENTIAL et PARALLEL.
    """
    
    async def route_sequential(
        self, 
        session_context: SessionContext,
        prompt: PromptPayload,
        provider_chain: List[ProviderConfig]
    ) -> RouterResponse:
        """
        Tente le prompt sur chaque fournisseur dans l'ordre.
        En cas d'échec récupérable, transfère le contexte complet au suivant.
        """
        pass
    
    async def route_parallel(
        self,
        session_context: SessionContext,
        prompt: PromptPayload,
        providers: List[ProviderConfig]
    ) -> AsyncIterator[PartialResponse]:
        """
        Dispatch simultané vers tous les fournisseurs actifs.
        Yields des métriques temps réel + fragments de réponse.
        """
        pass
```

**Composants internes** :
- **CircuitBreaker** : État (CLOSED / OPEN / HALF_OPEN), compteur d'erreurs, cooldown exponentiel.
- **RetryHandler** : Backoff jittered sur 429, timeout progressif.
- **ContextCompressor** : Résumé LLM-based de l'historique si taille > fenêtre cible (VA-06).
- **CostTracker** : Calcul temps réel basé sur les tarifs input/output stockés en base.

### 3.2 Module Session Manager (`core/session.py`)

```python
class SessionManager:
    """
    Gestion du cycle de vie des conversations.
    Persistance append-only JSONL + index SQLite FTS5.
    """
    
    def create_session(self, title: Optional[str] = None) -> Session:
        """Crée une nouvelle session avec UUID v4."""
        pass
    
    def append_turn(self, session_id: UUID, turn: ConversationTurn):
        """Écriture atomique append-only sur disque."""
        pass
    
    def load_context(self, session_id: UUID, max_tokens: int) -> SessionContext:
        """
        Charge l'historique complet.
        Si dépassement max_tokens, déclenche la compression contextuelle.
        """
        pass
    
    def export_session(self, session_id: UUID, format: ExportFormat) -> Path:
        """Export PDF ou Markdown."""
        pass
```

**Structure de fichier session** (`session.jsonl`) :
```jsonl
{"type": "system", "timestamp": "2026-09-03T10:15:00Z", "content": "..."}
{"type": "user", "timestamp": "2026-09-03T10:15:05Z", "content": "Explique moi...", "attachments": [{"name": "doc.pdf", "path": "uploads/doc.pdf", "mime": "application/pdf"}]}
{"type": "assistant", "timestamp": "2026-09-03T10:15:08Z", "content": "Voici l'explication...", "provider": "openai", "model": "gpt-4o", "metrics": {"ttft_ms": 320, "total_ms": 2450, "tokens_in": 45, "tokens_out": 312, "cost_usd": 0.0042}}
```

### 3.3 Module Provider Adapter (`adapters/`)

Architecture **Adapter Pattern** unifiée via LiteLLM :

```
adapters/
├── __init__.py
├── base.py          # Abstract Base Class (completion, stream, health_check)
├── litellm_proxy.py # Wrapper LiteLLM (gère 100+ fournisseurs)
├── file_encoder.py  # Encodage multimodal (base64 images, extraction PDF)
└── capabilities.py    # Détection auto (liste modèles, context window)
```

**Pourquoi LiteLLM ?** LiteLLM fournit une interface unifiée OpenAI-compatible pour accéder à des centaines de modèles sans code spécifique par fournisseur, réduisant la dette technique et accélérant l'intégration de nouveaux providers.

### 3.4 Module File Processor (`core/files.py`)

| Type | Traitement | Injection dans le prompt |
|---|---|---|
| Image (PNG/JPG/WEBP) | Redimensionnement max 2048px côté, encodage base64 | Format API vision (OpenAI/Claude/Gemini) |
| PDF | Extraction texte + structure (titres, paragraphes) | Texte brut injecté dans le contexte système |
| Code (PY/JS/JSON…) | Lecture texte + détection langage | Bloc code markdown avec coloration |
| CSV | Parsing header + preview 10 lignes | Tableau markdown ou description structurée |

---

## 4. Modèle de Données

### 4.1 Schéma SQLite (Configuration)

```sql
-- Fournisseurs LLM configurés
CREATE TABLE providers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- 'OpenAI Production'
    provider_type TEXT NOT NULL,         -- 'openai', 'anthropic', 'google'...
    api_base TEXT,                       -- Endpoint custom (optionnel)
    api_key_encrypted BLOB NOT NULL,     -- Clé chiffrée
    default_model TEXT NOT NULL,         -- 'gpt-4o'
    mode TEXT CHECK(mode IN ('chat','agent','vision','completion')),
    context_window INTEGER,              -- 128000
    max_tokens INTEGER DEFAULT 4096,
    input_cost_per_1m REAL,              -- 5.00
    output_cost_per_1m REAL,             -- 15.00
    is_active BOOLEAN DEFAULT 1,
    priority INTEGER DEFAULT 0,          -- Ordre mode Série
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paramètres globaux
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index FTS5 pour recherche full-text sessions
CREATE VIRTUAL TABLE session_search USING fts5(
    session_id UNINDEXED,
    content,
    tokenize='porter unicode61'
);
```

### 4.2 Schéma FileSystem (Sessions)

```
~/.mdr/
├── config/
│   └── mdr.db                    # SQLite configuration
├── sessions/
│   ├── index.json                # Index rapide (id, titre, date, msg_count)
│   └── {uuid}/
│       ├── session.jsonl         # Historique conversationnel
│       ├── uploads/
│       │   ├── img_001.png
│       │   └── doc.pdf
│       └── metadata.json         # Tags, notes utilisateur, export settings
└── logs/
    └── mdr_2026-09-03.log        # Logs rotation (10 Mo max)
```

---

## 5. Flux de Données Détaillés

### 5.1 Flux Mode Série avec Transfert de Contexte

```
Utilisateur
    │
    ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
│  Envoi      │────►│ SessionManager  │────►│ Chargement contexte complet │
│  Prompt     │     │  load_context() │     │ (messages + fichiers)     │
└─────────────┘     └─────────────────┘     └─────────────────────────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLM Router – Mode Série                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Provider 1   │───►│ Provider 2   │───►│ Provider N   │              │
│  │ (Priorité 1) │    │ (Fallback)   │    │ (Ultimate)   │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                        │
│    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐                │
│    │ Succès  │         │ Succès  │         │ Succès  │                │
│    │  ▲      │         │  ▲      │         │  ▲      │                │
│    │  │      │         │  │      │         │  │      │                │
│    │ Échec   │         │ Échec   │         │ Échec   │                │
│    │récupér. │         │récupér. │         │terminal │                │
│    └─────────┘         └─────────┘         └─────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Persistance & Notification                           │
│  - Sauvegarde réponse dans session.jsonl                                │
│  - Mise à jour index FTS5                                               │
│  - Toast UI : 'Réponse via {Provider} – fallback depuis {Previous}'       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Flux Mode Parallèle

```
Utilisateur ──► Router Parallel
                    │
        ┌───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Stream  │ │ Stream  │ │ Stream  │ │ Stream  │   ... N fournisseurs
   │  LLM 1  │ │  LLM 2  │ │  LLM 3  │ │  LLM 4  │
   └───┬─────┘ └────┬────┘ └────┬────┘ └────┬────┘
       │            │           │           │
       └────────────┴───────────┴───────────┘
                    │
                    ▼
        ┌─────────────────────┐
        │  Aggregator UI      │
        │  - Split View / Grid│
        │  - Métriques temps  │
        │    réel par voie    │
        └─────────────────────┘
```

---

## 6. Stratégies d'Affichage Multi-Réponses (UI/UX)

### 6.1 Règles de Layout Adaptatif

| Nombre de réponses | Layout par défaut | Actions utilisateur |
|---|---|---|
| 1 | Vue pleine hauteur classique | – |
| 2 | Split vertical 50/50 | Swap, resize drag, collapse un côté |
| 3 | Split vertical 33/33/33 OU grille 2+1 | Choix layout via toggle |
| 4 | Grille 2×2 | Expand cellule en plein écran |
| 5+ | Onglets horizontaux + vue grille réduite | Pin une réponse, comparer 2 côte à côte |

### 6.2 Composants UI Clés

- **`ResponsePane`** : Conteneur scrollable avec header fixe (badge modèle, badge fournisseur, métriques).
- **`MetricsBar`** : TTFB, Durée totale, Tokens I/O, Coût estimé, icône statut (✓ / ⚠ / ✕).
- **`StreamingBuffer`** : Rendu Markdown avec buffering des tokens partiels (pas de flash layout).
- **`DiffOverlay`** (VA-05) : Sur sélection de 2 réponses, surlignage des divergences sémantiques.

---

## 7. Sécurité & Conformité

### 7.1 Gestion des Secrets
```python
# Stratégie de stockage des clés API
import keyring
from cryptography.fernet import Fernet

class SecureKeyStore:
    def __init__(self):
        # Clé maître dérivée de l'identifiant matériel (optionnel) ou mot de passe utilisateur
        self._fernet = Fernet(self._derive_key())
    
    def store(self, provider_id: str, api_key: str):
        encrypted = self._fernet.encrypt(api_key.encode())
        keyring.set_password('MDR', f'provider_{provider_id}', encrypted.decode())
    
    def retrieve(self, provider_id: str) -> str:
        encrypted = keyring.get_password('MDR', f'provider_{provider_id}')
        return self._fernet.decrypt(encrypted.encode()).decode()
```

### 7.2 Sanitization Upload
- Vérification MIME-type via `python-magic` (pas seulement extension).
- Scan antivirus via `clamd` (optionnel, V2).
- Quarantaine des fichiers dans `uploads/.quarantine/` avant validation.

---

## 8. Performance & Optimisation

### 8.1 Gestion Mémoire
- **Pagination** : Les sessions > 100 messages ne chargent en mémoire que les 20 derniers turns ; scroll infini via chargement lazy.
- **Streaming** : Pas de buffering complet en mémoire ; écriture directe sur disque + yield au frontend.

### 8.2 Cache
- **Modèles disponibles** : Cache TTL 1h pour la liste des modèles d'un fournisseur (détection auto).
- **Embeddings** : Cache local des embeddings si usage RAG futur (V2).

---

## 9. Déploiement & Packaging

### 9.1 Structure du Projet

```
mydaemonrouter/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI factory
│   │   ├── api/
│   │   │   ├── chat.py          # Endpoints chat + WebSocket
│   │   │   ├── admin.py         # CRUD providers, settings
│   │   │   └── sessions.py      # Gestion sessions
│   │   ├── core/
│   │   │   ├── router.py        # Moteur Série/Parallèle
│   │   │   ├── session.py       # SessionManager
│   │   │   ├── config.py        # ConfigManager
│   │   │   ├── files.py         # FileProcessor
│   │   │   └── circuit.py       # CircuitBreaker
│   │   ├── adapters/
│   │   │   ├── base.py
│   │   │   └── litellm_proxy.py
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── database.py      # SQLModel definitions
│   │   └── static/              # React build (copié au build)
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Admin/
│   │   │   ├── SessionManager/
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── stores/              # Zustand
│   │   ├── lib/
│   │   │   ├── api.ts           # Client HTTP auto-généré (OpenAPI)
│   │   │   └── streaming.ts     # Gestion SSE/WebSocket
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── build.py                 # Orchestration PyInstaller + Vite
└── README.md
```

### 9.2 Commandes de Build

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Copie dans le backend
cp -r frontend/dist backend/app/static

# 3. Packaging PyInstaller
cd backend && pyinstaller \
    --name 'MyDeamonRouter' \
    --onefile \
    --add-data 'app/static:static' \
    --hidden-import 'tiktoken' \
    --hidden-import 'litellm' \
    app/main.py
```

---

## 10. Plan de Tests

### 10.1 Tests Unitaires (pytest)
| Module | Couverture cible | Scénarios clés |
|---|---|---|
| `router.py` | 90 % | Fallback sur 429, timeout, context window exceeded ; pas de fallback sur 400 |
| `circuit.py` | 95 % | Transition CLOSED→OPEN→HALF_OPEN, cooldown exponentiel |
| `session.py` | 85 % | Append atomique, chargement contexte, compression auto |
| `files.py` | 80 % | Extraction PDF, encodage image, rejet MIME invalide |

### 10.2 Tests E2E (Playwright)
- **Parcours critique** : Créer session → Envoyer prompt mode Série → Vérifier réponse → Basculer mode Parallèle → Comparer 3 LLM → Exporter session.
- **Résilience** : Couper la connexion réseau pendant un stream → vérifier fallback et notification.
- **Accessibilité** : Audit axe-core automatique sur chaque page.

### 10.3 Tests de Charge
- 5 streams parallèles pendant 10 min ; vérifier stabilité mémoire (< 500 Mo RSS).
- Session de 1000 messages ; vérifier temps de chargement < 2 s.

---

## 11. Roadmap Technique Post-MVP

| Version | Focus |
|---|---|
| v1.1 | Modèles locaux (Ollama, llama.cpp) ; RAG léger sur uploads |
| v1.2 | Mode Hybride Série/Parallèle ; Cost-optimization routing |
| v1.3 | Plugins / MCP (Model Context Protocol) ; tool-calling unifié |
| v2.0 | Multi-utilisateur local (profils) ; sync chiffrée cloud optionnelle |

---

*Document technique rédigé pour l'équipe de développement MDR – Version 1.0*