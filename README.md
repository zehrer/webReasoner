# Web Reasoner

Web Reasoner is a browser-native reasoning workspace. It parses a small
Datalog-style language, derives new facts from rules, and evaluates queries
entirely on the client.

Live page: [https://zehrer.github.io/webReasoner/](https://zehrer.github.io/webReasoner/)

## Features

- In-browser fact and rule editor
- Forward-chaining inference with recursive rules
- Query runner with variable bindings
- Parse and consistency feedback
- No backend or hosted service required

## Syntax

Facts:

```prolog
link(home, docs).
trust(home).
```

Rules:

```prolog
reachable(X, Y) :- link(X, Y).
reachable(X, Z) :- link(X, Y), reachable(Y, Z).
```

Queries:

```prolog
reachable(home, X)
trustedDestination(X)
```

Variables start with an uppercase letter. Atoms start with a lowercase letter
or number.

## Natural Style

For less technical users, the editor also accepts a controlled natural style.
These lines are compiled into the same predicates before reasoning runs.

Facts:

```text
bedroom is cold.
bedroom has window closed.
bathroom is leaking.
```

Rules:

```text
recommend heatRoom for Room when Room is cold and Room has window closed.
recommend notifyLeak for Room when Room is leaking.
```

Queries:

```text
what is recommended for Room
```

This style is intentionally constrained. It is meant to be readable and
predictable, not a general English parser.

## Examples

The app includes a `House Automation` example using the natural style. It models
sensor facts such as
motion, darkness, temperature, open windows, water leaks, and energy mode.
Rules then derive recommended actions:

```text
livingroom is occupied.
livingroom is dark.
bedroom is cold.
bedroom has window closed.

recommend turnOnLight for Room when Room is occupied and Room is dark.
recommend heatRoom for Room when Room is cold and Room has window closed.
```

Try this query:

```text
what is recommended for Room
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

GitHub Pages deployment is documented in
[docs/deployment.md](docs/deployment.md).
