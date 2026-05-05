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

## Examples

The app includes a `Haus Automation` example. It models sensor facts such as
motion, darkness, temperature, open windows, water leaks, and energy mode.
Rules then derive recommended actions:

```prolog
shouldTurnOnLight(Room) :- occupied(home), dark(Room), motion(Room).
shouldHeat(Room) :- occupied(home), cold(Room), windowClosed(Room).
shouldNotify(Room) :- waterLeak(Room).

recommendedAction(Room, turnOnLight) :- shouldTurnOnLight(Room).
recommendedAction(Room, heatRoom) :- shouldHeat(Room).
recommendedAction(Room, notifyLeak) :- shouldNotify(Room).
```

Try this query:

```prolog
recommendedAction(Room, Action)
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
