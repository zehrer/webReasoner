import { useMemo, useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  Check,
  Database,
  GitBranch,
  Home,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import { formatFact, runQuery, runReasoner } from "./reasoner";

type Example = {
  name: string;
  icon: "web" | "home";
  query: string;
  knowledgeBase: string;
};

const examples: Example[] = [
  {
    name: "Web graph",
    icon: "web",
    query: "trustedDestination(X)",
    knowledgeBase: `# Facts
link(home, docs).
link(docs, api).
link(api, examples).
link(home, blog).
link(blog, examples).
trust(home).

# Rules
reachable(X, Y) :- link(X, Y).
reachable(X, Z) :- link(X, Y), reachable(Y, Z).
trustedDestination(Y) :- trust(X), reachable(X, Y).`,
  },
  {
    name: "House Automation",
    icon: "home",
    query: "what is recommended for Room",
    knowledgeBase: `# Natural facts
livingroom is occupied.
hallway is occupied.
livingroom is dark.
hallway is dark.
bedroom has temperature 16.
office has temperature 17.
bedroom has window closed.
office has window open.
bathroom is leaking.
washer is idle.

# Natural rules
Room is cold when Room has temperature below 18.
recommend turnOnLight for Room when Room is occupied and Room is dark.
recommend heatRoom for Room when Room is cold and Room has window closed.
recommend notifyLeak for Room when Room is leaking.`,
  },
];

const defaultExample = examples[0];

function App() {
  const [knowledgeBase, setKnowledgeBase] = useState(defaultExample.knowledgeBase);
  const [query, setQuery] = useState(defaultExample.query);
  const reasoning = useMemo(() => runReasoner(knowledgeBase), [knowledgeBase]);
  const queryResult = useMemo(() => {
    try {
      return runQuery(query, reasoning.allFacts);
    } catch {
      return null;
    }
  }, [query, reasoning.allFacts]);

  const queryVariables = queryResult?.bindings[0] ? Object.keys(queryResult.bindings[0]) : [];

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div className="hero-copy">
          <div className="eyebrow">
            <BrainCircuit size={18} />
            Browser-native reasoning
          </div>
          <h1>Web Reasoner</h1>
          <p>
            A client-side logic workspace for facts, rules, inference, and
            queries, inspired by{" "}
            <a href="https://en.wikipedia.org/wiki/Datalog" target="_blank" rel="noreferrer">
              Datalog
            </a>
            . Everything runs in the browser.
          </p>
        </div>
        <div className="signal-panel" aria-label="Reasoning summary">
          <div>
            <span>Facts</span>
            <strong>{reasoning.allFacts.length}</strong>
          </div>
          <div>
            <span>Rules</span>
            <strong>{reasoning.rules.length}</strong>
          </div>
          <div>
            <span>Iterations</span>
            <strong>{reasoning.iterations}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="editor-pane">
          <div className="pane-header">
            <div>
              <Database size={19} />
              <h2>Knowledge Base</h2>
            </div>
            <div className="example-actions" aria-label="Example knowledge bases">
              {examples.map((example) => (
                <button
                  key={example.name}
                  type="button"
                  onClick={() => {
                    setKnowledgeBase(example.knowledgeBase);
                    setQuery(example.query);
                  }}
                >
                  {example.icon === "home" ? <Home size={17} /> : <Sparkles size={17} />}
                  {example.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            spellCheck={false}
            value={knowledgeBase}
            onChange={(event) => setKnowledgeBase(event.target.value)}
            aria-label="Knowledge base editor"
          />
        </div>

        <div className="results-pane">
          <div className="pane-header">
            <div>
              <GitBranch size={19} />
              <h2>Inferred Model</h2>
            </div>
            <span className={reasoning.errors.length ? "status error" : "status ok"}>
              {reasoning.errors.length ? <AlertCircle size={16} /> : <Check size={16} />}
              {reasoning.errors.length ? "Needs attention" : "Consistent"}
            </span>
          </div>

          {reasoning.errors.length > 0 ? (
            <div className="error-list">
              {reasoning.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : (
            <div className="fact-list">
              {reasoning.allFacts.map((fact) => (
                <article key={formatFact(fact)} className={fact.derivedBy ? "derived" : ""}>
                  <code>{formatFact(fact)}</code>
                  <span>{fact.derivedBy ? "inferred" : "given"}</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="query-band">
        <div className="query-column">
          <div className="query-input">
            <label htmlFor="query">Query</label>
            <div>
              <Search size={18} />
              <input
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="what is recommended for Room"
              />
              <Play size={18} />
            </div>
          </div>

          <div className="language-help" aria-label="Supported language help">
            <h2>Supported Language</h2>
            <div className="help-grid">
              <section>
                <h3>Facts</h3>
                <code>bedroom is cold.</code>
                <code>bedroom has temperature 16.</code>
                <code>bedroom has window closed.</code>
              </section>
              <section>
                <h3>Rules</h3>
                <code>Room is cold when Room has temperature below 18.</code>
                <code>recommend heatRoom for Room when Room is cold.</code>
              </section>
              <section>
                <h3>Questions</h3>
                <code>what is recommended for Room?</code>
                <code>what is cold?</code>
                <code>which rooms are cold?</code>
                <code>what has temperature below 18?</code>
                <code>recommendedAction(Room, Action)</code>
                <code>cold(Room)</code>
              </section>
              <section>
                <h3>Keywords</h3>
                <div className="keyword-list">
                  <span>is</span>
                  <span>has</span>
                  <span>when</span>
                  <span>and</span>
                  <span>recommend</span>
                  <span>for</span>
                  <span>below</span>
                  <span>above</span>
                  <span>at least</span>
                  <span>at most</span>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="query-results">
          {!queryResult ? (
            <p className="muted">Enter a predicate such as reachable(home, X).</p>
          ) : queryVariables.length > 0 ? (
            <table>
              <thead>
                <tr>
                  {queryVariables.map((variable) => (
                    <th key={variable}>{variable}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.bindings.map((binding, index) => (
                  <tr key={JSON.stringify(binding) + index}>
                    {queryVariables.map((variable) => (
                      <td key={variable}>{binding[variable]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">
              {queryResult.facts.length > 0 ? "The query is true." : "No matching facts found."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
