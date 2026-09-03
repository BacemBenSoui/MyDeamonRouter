import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Clock3,
  Copy,
  Download,
  FileCode2,
  FileText,
  FolderOpen,
  Gauge,
  Hash,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  List,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  TerminalSquare,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const initialProviders = [
  {
    id: "openai",
    name: "OpenAI Production",
    shortName: "OpenAI",
    model: "gpt-4o",
    icon: "O",
    tone: "blue",
    mode: "Chat",
    context: "128k",
    latency: "320 ms",
    status: "Opérationnel",
    active: true,
    fullResponse:
      "Pour une application critique, je privilégierais une architecture en cascade : OpenAI en primaire pour sa régularité, Anthropic en fallback contextuel, et Gemini pour les entrées multimodales.\n\nLe point important est de conserver le contexte complet côté routeur afin que le basculement reste transparent. MDR suit précisément cette logique avec un circuit breaker et des métriques par fournisseur.\n\nJe recommande aussi d’isoler les réponses complètes de toute synthèse comparative : la synthèse aide à décider, mais elle ne doit jamais remplacer la sortie originale du modèle.",
    summary:
      "Architecture en cascade recommandée, avec transfert intégral du contexte et séparation nette entre réponse originale et synthèse.",
  },
  {
    id: "anthropic",
    name: "Anthropic Main",
    shortName: "Anthropic",
    model: "claude-3-5-sonnet",
    icon: "A",
    tone: "orange",
    mode: "Chat",
    context: "200k",
    latency: "410 ms",
    status: "Opérationnel",
    active: true,
    fullResponse:
      "Anthropic est excellent sur la sûreté, la nuance et la continuité du contexte long.\n\nPour ce cas, je placerais Claude comme fallback principal : il peut reprendre l’historique complet, les pièces jointes et le dernier état du raisonnement sans que l’utilisateur ait à reformuler son besoin.\n\nDans l’interface, chaque sortie doit rester consultable dans son intégralité. Un résumé peut apparaître dans un panneau de comparaison, mais le texte complet doit rester la référence, copiable et exportable.",
    summary:
      "Claude est proposé comme fallback de confiance grâce à sa continuité de contexte et ses réponses nuancées.",
  },
  {
    id: "google",
    name: "Google Workspace",
    shortName: "Google",
    model: "gemini-1.5-pro",
    icon: "G",
    tone: "purple",
    mode: "Vision",
    context: "1M",
    latency: "280 ms",
    status: "Opérationnel",
    active: true,
    fullResponse:
      "Gemini complète l’analyse avec une lecture multimodale et une fenêtre de contexte très large.\n\nIl est particulièrement adapté lorsque le prompt est accompagné d’un dossier documentaire, d’une capture d’écran ou d’un tableau. Le routeur peut transmettre la même session à plusieurs voies tout en affichant les métriques séparément.\n\nLa comparaison doit rester lisible : les réponses sont donc présentées côte à côte, chacune avec son fournisseur, son modèle exact, ses métriques et son contenu complet.",
    summary:
      "Gemini complète la couverture sur les documents, images et contextes volumineux.",
  },
  {
    id: "mistral",
    name: "Mistral Backup",
    shortName: "Mistral",
    model: "mistral-large",
    icon: "M",
    tone: "amber",
    mode: "Chat",
    context: "128k",
    latency: "—",
    status: "Désactivé",
    active: false,
    fullResponse: "",
    summary: "",
  },
];

const sessions = [
  { title: "Comparer les modèles pour un projet", meta: "6 messages · 10:42", active: true },
  { title: "Architecture RAG locale", meta: "8 messages · Hier", active: false },
  { title: "Refactor du pipeline données", meta: "12 messages · 10:28", active: false },
];

const Icon = ({ name, size = 16, strokeWidth = 1.8 }) => {
  const icons = {
    chat: MessageSquare,
    providers: SlidersHorizontal,
    export: Download,
    sessions: Archive,
    settings: Settings2,
  };
  const Component = icons[name] || CircleHelp;
  return <Component size={size} strokeWidth={strokeWidth} />;
};

function StatusDot({ color = "green" }) {
  return <span className={`status-dot ${color}`} />;
}

function ProviderMark({ provider, small = false }) {
  return (
    <span className={`provider-mark ${provider.tone} ${small ? "small" : ""}`}>
      {provider.icon}
    </span>
  );
}

function Metric({ icon: MetricIcon, label, value }) {
  return (
    <span className="metric">
      <MetricIcon size={12} />
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function Sidebar({ page, setPage, onNewSession, query, setQuery }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <div className="brand-name">MyDeamonRouter</div>
          <div className="brand-subtitle">ROUTAGE INTELLIGENT · LOCAL</div>
        </div>
      </div>

      <button className="new-session" onClick={onNewSession}>
        <Plus size={16} /> Nouvelle session
      </button>

      <label className="session-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une session..."
          aria-label="Rechercher une session"
        />
        {query && <X size={13} onClick={() => setQuery("")} className="clickable" />}
      </label>

      <div className="sidebar-section-label">AUJOURD’HUI</div>
      <div className="session-list">
        {sessions
          .filter((session) => session.title.toLowerCase().includes(query.toLowerCase()))
          .map((session) => (
            <button
              key={session.title}
              className={`session-item ${session.active && page === "conversation" ? "selected" : ""}`}
              onClick={() => setPage("conversation")}
            >
              <MessageSquare size={13} />
              <span>
                <b>{session.title}</b>
                <small>{session.meta}</small>
              </span>
            </button>
          ))}
      </div>
      <div className="sidebar-section-label history-label">HIER</div>
      <div className="session-list">
        {sessions
          .filter((session) => !session.active)
          .filter((session) => session.title.toLowerCase().includes(query.toLowerCase()))
          .map((session) => (
            <button key={session.title} className="session-item" onClick={() => setPage("conversation")}>
              <MessageSquare size={13} />
              <span>
                <b>{session.title}</b>
                <small>{session.meta}</small>
              </span>
            </button>
          ))}
      </div>

      <div className="sidebar-bottom">
        <nav className="sidebar-nav">
          <button className={page === "conversation" ? "active" : ""} onClick={() => setPage("conversation")}>
            <Icon name="chat" /> Conversations
          </button>
          <button className={page === "providers" ? "active" : ""} onClick={() => setPage("providers")}>
            <Icon name="providers" /> Fournisseurs LLM
          </button>
          <button className={page === "export" ? "active" : ""} onClick={() => setPage("export")}>
            <Icon name="export" /> Exporter la session
          </button>
        </nav>
        <div className="system-card">
          <div className="system-top">
            <span><StatusDot /> Système local</span>
            <b>OK</b>
          </div>
          <small>3 fournisseurs actifs · stockage local</small>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ page, mode, setMode, onMenu }) {
  const title = page === "providers" ? "Fournisseurs" : page === "export" ? "Exporter" : "Conversations";
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Ouvrir le menu"><Menu size={19} /></button>
      <div className="breadcrumbs">
        <span>Workspace local</span>
        <span>/</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <span className="local-mode"><StatusDot /> Mode local</span>
        <button className="icon-button" aria-label="Aide"><CircleHelp size={15} /></button>
        <button className="icon-button" aria-label="Réglages"><Settings2 size={15} /></button>
      </div>
    </header>
  );
}

function ModeSwitcher({ mode, setMode }) {
  return (
    <div className="mode-switcher" role="tablist" aria-label="Mode de routage">
      <button className={mode === "series" ? "selected" : ""} onClick={() => setMode("series")}>
        <List size={13} /> Série
      </button>
      <button className={mode === "parallel" ? "selected" : ""} onClick={() => setMode("parallel")}>
        <LayoutGrid size={13} /> Parallèle
      </button>
      <button className="icon-button more" aria-label="Plus d'options"><MoreHorizontal size={15} /></button>
    </div>
  );
}

function UserMessage({ text, time }) {
  return (
    <div className="user-row">
      <div className="user-message">
        <div>{text}</div>
        <span>{time}</span>
      </div>
      <div className="user-avatar">Vous</div>
    </div>
  );
}

function ResponseCard({ provider, response, streaming, onStop, onCopy }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    onCopy(response.fullResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <article className={`response-card ${streaming ? "streaming" : ""}`}>
      <div className="response-header">
        <div className="response-provider">
          <ProviderMark provider={provider} />
          <div>
            <div className="provider-line">
              <strong>{provider.shortName}</strong>
              <span className="model-name">{provider.model}</span>
            </div>
            <div className={`response-status ${streaming ? "loading" : "done"}`}>
              {streaming ? <><span className="loading-pulse" /> Génération en cours</> : <><Check size={12} /> Réponse complète</>}
            </div>
          </div>
        </div>
        <div className="response-actions">
          {streaming ? (
            <button className="stop-button" onClick={onStop}><Square size={11} fill="currentColor" /> Arrêter</button>
          ) : (
            <>
              <button onClick={copy} title="Copier la réponse complète">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copié" : "Copier"}</button>
              <button title="Régénérer"><RefreshCw size={14} /></button>
              <button title="Plus d'actions"><MoreHorizontal size={14} /></button>
            </>
          )}
        </div>
      </div>
      <div className="response-body">
        <div className="full-response-label"><ShieldCheck size={13} /> Sortie intégrale du modèle</div>
        <div className="response-copy">
          {response.fullResponse ? response.fullResponse.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph || <>&nbsp;</>}</p>
          )) : (
            <div className="response-skeleton"><span /><span /><span /></div>
          )}
          {streaming && <span className="cursor" />}
        </div>
      </div>
      <div className="response-footer">
        <Metric icon={Clock3} label="TTFB" value={streaming ? "—" : provider.id === "google" ? "280 ms" : provider.id === "anthropic" ? "410 ms" : "320 ms"} />
        <Metric icon={Zap} label="Durée" value={streaming ? "en cours" : "2.1 s"} />
        <Metric icon={Hash} label="Tokens" value={streaming ? "—" : "312 out"} />
        <Metric icon={Gauge} label="Coût" value={streaming ? "—" : "$0.0042"} />
      </div>
    </article>
  );
}

function SummaryStrip({ responses }) {
  return (
    <div className="summary-strip">
      <div className="summary-icon"><BarChart3 size={16} /></div>
      <div className="summary-content">
        <div className="summary-heading"><strong>Synthèse comparative</strong><span>Optionnelle · ne remplace pas les sorties intégrales</span></div>
        <p>Les trois modèles convergent vers une architecture en cascade, avec transfert du contexte complet et conservation de chaque réponse originale.</p>
      </div>
      <button className="summary-button"><Clipboard size={14} /> Comparer</button>
    </div>
  );
}

function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [attached, setAttached] = useState(false);
  const inputRef = useRef(null);
  const send = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      send();
    }
  };
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Écrivez votre prompt… (Ctrl + Entrée pour envoyer)"
          rows={2}
          aria-label="Écrire un prompt"
        />
        <div className="composer-bottom">
          <div className="composer-tools">
            <button onClick={() => setAttached(!attached)} className={attached ? "tool-active" : ""} title="Joindre un fichier">
              <Paperclip size={14} />
            </button>
            <button title="Ajouter une instruction système"><Sparkles size={14} /></button>
            {attached && <span className="attachment-chip"><FileText size={12} /> dossier_projet.md <X size={11} onClick={() => setAttached(false)} /></span>}
            <span className="composer-hint">Les réponses restent complètes dans l’historique</span>
          </div>
          <button className="send-button" disabled={!value.trim() || disabled} onClick={send} aria-label="Envoyer">
            <Send size={15} />
          </button>
        </div>
      </div>
      <div className="composer-note"><ShieldCheck size={12} /> Données conservées localement · les appels API sont déclenchés uniquement à l’envoi</div>
    </div>
  );
}

function ConversationPage({ providers, setProviders, mode, setMode, onToast }) {
  const [responses, setResponses] = useState(providers.filter((provider) => provider.active).slice(0, 3).map((provider) => ({ ...provider, fullResponse: provider.fullResponse })));
  const [streamingIds, setStreamingIds] = useState([]);
  const [prompt, setPrompt] = useState("Compare la robustesse de ces trois modèles pour une application critique.");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const activeProviders = providers.filter((provider) => provider.active && provider.id !== "mistral");
  const sendPrompt = (value) => {
    setPrompt(value);
    const selected = mode === "series" ? activeProviders.slice(0, 1) : activeProviders;
    setResponses(selected.map((provider) => ({ ...provider, fullResponse: "" })));
    setStreamingIds(selected.map((provider) => provider.id));
    selected.forEach((provider, index) => {
      let current = 0;
      const source = provider.fullResponse;
      const timer = setInterval(() => {
        current += Math.max(8, Math.round(source.length / 34));
        if (current >= source.length) {
          clearInterval(timer);
          setResponses((previous) => previous.map((item) => item.id === provider.id ? { ...item, fullResponse: source } : item));
          setStreamingIds((previous) => previous.filter((id) => id !== provider.id));
          return;
        }
        setResponses((previous) => previous.map((item) => item.id === provider.id ? { ...item, fullResponse: source.slice(0, current) } : item));
      }, 26 + index * 12);
      timers.current.push(timer);
    });
  };

  const stopProvider = (id) => {
    setStreamingIds((previous) => previous.filter((item) => item !== id));
    setResponses((previous) => previous.map((item) => item.id === id ? { ...item, fullResponse: item.fullResponse + "\n\n[Génération interrompue par l’utilisateur]" } : item));
    onToast("Stream interrompu pour ce fournisseur");
  };

  const toggleProvider = (id) => {
    setProviders((current) => current.map((provider) => provider.id === id ? { ...provider, active: !provider.active } : provider));
  };

  return (
    <main className="page conversation-page">
      <div className="page-heading">
        <div>
          <h1>Comparer les modèles pour un projet <Pencil size={14} /></h1>
          <p className="heading-meta"><span className="live-dot" /> Session active · sauvegarde automatique</p>
        </div>
        <ModeSwitcher mode={mode} setMode={setMode} />
      </div>
      <div className="routing-banner">
        <div className="routing-banner-icon"><Activity size={15} /></div>
        <div><strong>{mode === "parallel" ? "Routage parallèle actif" : "Routage série actif"}</strong><span>{mode === "parallel" ? "Chaque fournisseur reçoit le prompt en simultané." : "Le prochain fournisseur reprend le contexte complet en cas d’échec."}</span></div>
        <button onClick={() => onToast("Configuration du routage ouverte")}><Settings2 size={13} /> Configurer</button>
      </div>

      <section className="thread">
        <UserMessage text={prompt} time="10:42" />
        <div className="assistant-label"><ProviderMark provider={providers[0]} small /><span>Routage MDR</span><span className="message-time">10:43</span></div>
        <div className={`response-grid ${responses.length > 1 ? "multi" : ""} ${responses.length === 3 ? "three" : ""}`}>
          {responses.map((response) => (
            <ResponseCard
              key={response.id}
              provider={response}
              response={response}
              streaming={streamingIds.includes(response.id)}
              onStop={() => stopProvider(response.id)}
              onCopy={(text) => { navigator.clipboard?.writeText(text); onToast("Réponse complète copiée"); }}
            />
          ))}
        </div>
        <SummaryStrip responses={responses} />
      </section>
      <Composer onSend={sendPrompt} disabled={streamingIds.length > 0} />
      <div className="provider-mini-list">
        <span>Fournisseurs actifs</span>
        {providers.map((provider) => (
          <button key={provider.id} className={!provider.active ? "off" : ""} onClick={() => toggleProvider(provider.id)} title={provider.active ? "Désactiver" : "Activer"}>
            <ProviderMark provider={provider} small /> {provider.shortName} <span className="mini-toggle"><i /></span>
          </button>
        ))}
      </div>
    </main>
  );
}

function ProviderCard({ provider, onToggle, onTest, testing }) {
  return (
    <article className={`provider-card ${!provider.active ? "disabled" : ""}`}>
      <div className="provider-card-top">
        <div className="provider-card-identity">
          <ProviderMark provider={provider} />
          <div>
            <h3>{provider.name}</h3>
            <p>{provider.model}</p>
          </div>
        </div>
        <button className={`toggle ${provider.active ? "on" : ""}`} onClick={() => onToggle(provider.id)} aria-label={`${provider.active ? "Désactiver" : "Activer"} ${provider.name}`}>
          <span />
        </button>
      </div>
      <div className="provider-tags">
        <span>Mode <b>{provider.mode}</b></span>
        <span>Contexte <b>{provider.context}</b></span>
        <span>Latence <b>{provider.latency}</b></span>
      </div>
      <div className="provider-card-bottom">
        <span className={provider.active ? "operational" : "disabled-status"}><StatusDot color={provider.active ? "green" : "gray"} /> {provider.active ? "Opérationnel" : "Désactivé"}</span>
        <button className="test-link" onClick={() => onTest(provider.id)} disabled={testing === provider.id}>
          {testing === provider.id ? <><RefreshCw size={12} className="spin" /> Test en cours…</> : "Tester la connexion"}
        </button>
      </div>
    </article>
  );
}

function ProvidersPage({ providers, setProviders, onToast }) {
  const [testing, setTesting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const test = (id) => {
    setTesting(id);
    setTimeout(() => {
      setTesting(null);
      onToast("Connexion validée · latence 320 ms");
    }, 900);
  };
  return (
    <main className="page providers-page">
      <div className="page-heading">
        <div>
          <h1>Fournisseurs LLM</h1>
          <p className="heading-description">Configurez, testez et ordonnez vos connexions API.</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Ajouter un fournisseur</button>
      </div>
      {showForm && (
        <div className="provider-form">
          <div className="form-heading"><div><strong>Ajouter un fournisseur</strong><span>La clé reste dans le stockage sécurisé local.</span></div><button onClick={() => setShowForm(false)}><X size={16} /></button></div>
          <div className="form-grid">
            <label>Nom de la connexion<input placeholder="Ex. OpenAI Production" /></label>
            <label>Fournisseur<select defaultValue="openai"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="google">Google</option><option value="mistral">Mistral</option></select></label>
            <label>Modèle par défaut<input placeholder="gpt-4o" /></label>
            <label>Endpoint URL<input placeholder="https://api.provider.com/v1" /></label>
          </div>
          <div className="form-actions"><button className="secondary-button" onClick={() => onToast("Détection des capacités lancée")}><Sparkles size={13} /> Détecter les capacités</button><button className="primary-button" onClick={() => { setShowForm(false); onToast("Fournisseur ajouté"); }}><Check size={13} /> Enregistrer</button></div>
        </div>
      )}
      <div className="provider-grid">
        {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} onToggle={(id) => setProviders((current) => current.map((item) => item.id === id ? { ...item, active: !item.active } : item))} onTest={test} testing={testing} />)}
      </div>
      <div className="provider-info"><Info size={14} /><span><strong>Routage Série actif.</strong> Les fournisseurs actifs sont utilisés dans l’ordre défini. En cas d’erreur récupérable, MDR transfère le contexte complet au suivant.</span><button onClick={() => onToast("Ordre de priorité : OpenAI → Anthropic → Google")}>Gérer l’ordre</button></div>
      <section className="security-panel">
        <div className="security-icon"><ShieldCheck size={17} /></div>
        <div><strong>Vos données restent locales</strong><p>Les sessions et métadonnées sont enregistrées sur cet appareil. Seuls les prompts envoyés explicitement quittent la machine vers les endpoints configurés.</p></div>
        <span className="security-badge">LOCAL FIRST</span>
      </section>
    </main>
  );
}

function ExportPage({ onToast }) {
  return (
    <main className="page export-page">
      <div className="page-heading">
        <div><h1>Exporter la session</h1><p className="heading-description">Conservez les prompts, les réponses complètes et les métriques dans un rapport.</p></div>
      </div>
      <div className="export-layout">
        <section className="export-preview">
          <div className="export-preview-top"><span className="file-icon"><FileText size={18} /></span><div><strong>Comparer les modèles pour un projet</strong><span>Session MDR · 6 messages</span></div><span className="export-status">Prêt</span></div>
          <div className="preview-paper">
            <div className="paper-kicker">RAPPORT DE SESSION · 03 SEPTEMBRE 2026</div>
            <h2>Comparer les modèles pour un projet</h2>
            <div className="paper-line" />
            <h4>Prompt utilisateur</h4>
            <p>Compare la robustesse de ces trois modèles pour une application critique.</p>
            <h4>Réponses LLM</h4>
            <div className="paper-response"><b>OpenAI Production · gpt-4o</b><p>Réponse complète conservée dans son intégralité, avec contexte et métriques associés…</p></div>
            <div className="paper-response"><b>Anthropic Main · claude-3-5-sonnet</b><p>Réponse complète conservée dans son intégralité, avec contexte et métriques associés…</p></div>
          </div>
        </section>
        <aside className="export-options">
          <h3>Format d’export</h3>
          <button className="export-option selected"><FileText size={17} /><span><b>Markdown</b><small>Texte structuré, facile à versionner</small></span><Check size={15} /></button>
          <button className="export-option"><Archive size={17} /><span><b>PDF</b><small>Rapport prêt à partager</small></span></button>
          <div className="export-includes"><strong>Le rapport inclura</strong><label><Check size={13} /> Prompt original</label><label><Check size={13} /> Réponse complète de chaque LLM</label><label><Check size={13} /> Métriques TTFB, durée et tokens</label><label><Check size={13} /> Synthèse comparative séparée</label></div>
          <button className="primary-button export-button" onClick={() => onToast("Export Markdown généré") }><Download size={14} /> Télécharger le rapport</button>
        </aside>
      </div>
    </main>
  );
}

function App() {
  const [page, setPage] = useState("conversation");
  const [mode, setMode] = useState("parallel");
  const [providers, setProviders] = useState(initialProviders);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message) => setToast(message);
  const newSession = () => {
    setPage("conversation");
    notify("Nouvelle session créée");
  };

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={sidebarOpen ? "sidebar-mobile-open" : ""}>
        <Sidebar page={page} setPage={(value) => { setPage(value); setSidebarOpen(false); }} onNewSession={newSession} query={query} setQuery={setQuery} />
      </div>
      <div className="main-shell">
        <Topbar page={page} mode={mode} setMode={setMode} onMenu={() => setSidebarOpen(true)} />
        {page === "conversation" && <ConversationPage providers={providers} setProviders={setProviders} mode={mode} setMode={setMode} onToast={notify} />}
        {page === "providers" && <ProvidersPage providers={providers} setProviders={setProviders} onToast={notify} />}
        {page === "export" && <ExportPage onToast={notify} />}
      </div>
      {toast && <div className="toast"><Check size={14} /> {toast}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);