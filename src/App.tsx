import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  AlertCircle,
  BrainCircuit,
  Check,
  Database,
  GitBranch,
  List,
  Home,
  Play,
  Share2,
  Search,
} from "lucide-react";
import { Fact, formatFact, runQuery, runReasoner } from "./reasoner";

type Example = {
  name: string;
  query: string;
  knowledgeBase: string;
};

type ResultsView = "list" | "graph";

type GraphNode = {
  id: string;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  derived: boolean;
};

type SimulatedNode = SimulationNodeDatum & {
  id: string;
};

type SimulatedEdge = SimulationLinkDatum<SimulatedNode> & {
  id: string;
  label: string;
  derived: boolean;
};

type RenderEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  derived: boolean;
};

const houseAutomationExample: Example = {
  name: "House Automation",
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
};

function App() {
  const [knowledgeBase, setKnowledgeBase] = useState(houseAutomationExample.knowledgeBase);
  const [query, setQuery] = useState(houseAutomationExample.query);
  const [resultsView, setResultsView] = useState<ResultsView>("list");
  const reasoning = useMemo(() => runReasoner(knowledgeBase), [knowledgeBase]);
  const graphModel = useMemo(() => createGraphModel(reasoning.allFacts), [reasoning.allFacts]);
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
            <button
              className="example-button"
              type="button"
              onClick={() => {
                setKnowledgeBase(houseAutomationExample.knowledgeBase);
                setQuery(houseAutomationExample.query);
              }}
            >
              <Home size={17} />
              Reset example
            </button>
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
            <div className="results-controls">
              {!reasoning.errors.length && (
                <div className="view-tabs" role="tablist" aria-label="Inferred model view">
                  <button
                    type="button"
                    className={resultsView === "list" ? "active" : ""}
                    onClick={() => setResultsView("list")}
                  >
                    <List size={16} />
                    List
                  </button>
                  <button
                    type="button"
                    className={resultsView === "graph" ? "active" : ""}
                    onClick={() => setResultsView("graph")}
                  >
                    <Share2 size={16} />
                    Graph
                  </button>
                </div>
              )}
              <span className={reasoning.errors.length ? "status error" : "status ok"}>
                {reasoning.errors.length ? <AlertCircle size={16} /> : <Check size={16} />}
                {reasoning.errors.length ? "Needs attention" : "Consistent"}
              </span>
            </div>
          </div>

          {reasoning.errors.length > 0 ? (
            <div className="error-list">
              {reasoning.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : resultsView === "list" ? (
            <div className="fact-list">
              {reasoning.allFacts.map((fact) => (
                <article key={formatFact(fact)} className={fact.derivedBy ? "derived" : ""}>
                  <code>{formatFact(fact)}</code>
                  <span>{fact.derivedBy ? "inferred" : "given"}</span>
                </article>
              ))}
            </div>
          ) : (
            <GraphView nodes={graphModel.nodes} edges={graphModel.edges} />
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

function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const width = 720;
  const height = 480;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<Simulation<SimulatedNode, SimulatedEdge> | null>(null);
  const dragNodeId = useRef<string | null>(null);
  const [layout, setLayout] = useState<{ nodes: SimulatedNode[]; edges: RenderEdge[] }>({
    nodes: [],
    edges: [],
  });

  useEffect(() => {
    const simulatedNodes = nodes.map<SimulatedNode>((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: node.id,
        x: width / 2 + Math.cos(angle) * 170,
        y: height / 2 + Math.sin(angle) * 120,
      };
    });
    const simulatedEdges = edges.map<SimulatedEdge>((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      derived: edge.derived,
    }));

    const simulation = forceSimulation<SimulatedNode, SimulatedEdge>(simulatedNodes)
      .force(
        "link",
        forceLink<SimulatedNode, SimulatedEdge>(simulatedEdges)
          .id((node) => node.id)
          .distance(120)
          .strength(0.38),
      )
      .force("charge", forceManyBody<SimulatedNode>().strength(-420))
      .force("collide", forceCollide<SimulatedNode>().radius((node) => nodeWidth(node.id) / 2 + 26))
      .force("center", forceCenter(width / 2, height / 2))
      .force("x", forceX<SimulatedNode>(width / 2).strength(0.04))
      .force("y", forceY<SimulatedNode>(height / 2).strength(0.05))
      .on("tick", () => {
        for (const node of simulatedNodes) {
          node.x = clamp(node.x ?? width / 2, 54, width - 54);
          node.y = clamp(node.y ?? height / 2, 34, height - 34);
        }

        setLayout({
          nodes: simulatedNodes.map((node) => ({ ...node })),
          edges: simulatedEdges.map((edge) => ({
            id: edge.id,
            from: endpointId(edge.source),
            to: endpointId(edge.target),
            label: edge.label,
            derived: edge.derived,
          })),
        });
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      if (simulationRef.current === simulation) {
        simulationRef.current = null;
      }
    };
  }, [edges, nodes]);

  if (!nodes.length) {
    return <p className="empty-graph">No graphable relationships yet.</p>;
  }

  const nodeLookup = new Map(layout.nodes.map((node) => [node.id, node]));

  function beginDrag(nodeId: string, event: React.PointerEvent<SVGGElement>) {
    const simulationNode = simulationRef.current?.nodes().find((node) => node.id === nodeId);
    if (!simulationNode) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragNodeId.current = nodeId;
    simulationNode.fx = simulationNode.x;
    simulationNode.fy = simulationNode.y;
    simulationRef.current?.alphaTarget(0.3).restart();
  }

  function drag(event: React.PointerEvent<SVGGElement>) {
    if (!dragNodeId.current) {
      return;
    }

    const position = svgPoint(event);
    const simulationNode = simulationRef.current?.nodes().find((node) => node.id === dragNodeId.current);
    if (!simulationNode || !position) {
      return;
    }

    simulationNode.fx = clamp(position.x, 54, width - 54);
    simulationNode.fy = clamp(position.y, 34, height - 34);
  }

  function endDrag(event: React.PointerEvent<SVGGElement>) {
    if (!dragNodeId.current) {
      return;
    }

    const simulationNode = simulationRef.current?.nodes().find((node) => node.id === dragNodeId.current);
    if (simulationNode) {
      simulationNode.fx = null;
      simulationNode.fy = null;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragNodeId.current = null;
    simulationRef.current?.alphaTarget(0);
  }

  function svgPoint(event: React.PointerEvent<SVGGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  return (
    <div className="graph-view">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Relationship graph">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        {layout.edges.map((edge) => {
          const from = nodeLookup.get(edge.from);
          const to = nodeLookup.get(edge.to);
          if (!from || !to) {
            return null;
          }

          const fromX = from.x ?? width / 2;
          const fromY = from.y ?? height / 2;
          const toX = to.x ?? width / 2;
          const toY = to.y ?? height / 2;
          const labelX = (fromX + toX) / 2;
          const labelY = (fromY + toY) / 2;

          return (
            <g key={edge.id} className={edge.derived ? "graph-edge derived" : "graph-edge"}>
              <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                markerEnd="url(#arrowhead)"
              />
              <text x={labelX} y={labelY}>
                {edge.label}
              </text>
            </g>
          );
        })}

        {layout.nodes.map((node) => (
          <g
            key={node.id}
            className="graph-node"
            transform={`translate(${node.x ?? width / 2}, ${node.y ?? height / 2})`}
            onPointerDown={(event) => beginDrag(node.id, event)}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <rect x={-nodeWidth(node.id) / 2} y="-20" width={nodeWidth(node.id)} height="40" rx="8" />
            <text>{node.id}</text>
          </g>
        ))}
      </svg>
      <div className="graph-legend">
        <span>solid: given</span>
        <span>dashed: inferred</span>
      </div>
    </div>
  );
}

function createGraphModel(facts: Fact[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeIds = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const fact of facts) {
    if (fact.args.length === 1) {
      nodeIds.add(fact.args[0]);
      nodeIds.add(fact.predicate);
      edges.push({
        id: formatFact(fact),
        from: fact.args[0],
        to: fact.predicate,
        label: "is",
        derived: Boolean(fact.derivedBy),
      });
    } else if (fact.args.length === 2) {
      nodeIds.add(fact.args[0]);
      nodeIds.add(fact.args[1]);
      edges.push({
        id: formatFact(fact),
        from: fact.args[0],
        to: fact.args[1],
        label: fact.predicate,
        derived: Boolean(fact.derivedBy),
      });
    }
  }

  const ids = Array.from(nodeIds).sort();
  const nodes = ids.map<GraphNode>((id) => ({ id }));

  return { nodes, edges };
}

function endpointId(endpoint: string | number | SimulatedNode | undefined): string {
  if (typeof endpoint === "object" && endpoint) {
    return endpoint.id;
  }
  return String(endpoint ?? "");
}

function nodeWidth(id: string): number {
  return Math.max(74, Math.min(150, id.length * 8 + 28));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default App;
