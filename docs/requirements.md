# Requirements

This document describes the current requirements for Web Reasoner. Keep it in
sync with product and language changes.

## Product Goal

Web Reasoner is a browser-based reasoning tool for home automation scenarios.
It helps users describe facts, rules, and questions, then inspect inferred
knowledge and recommendations without running a backend service.

The tool uses a small Datalog-inspired rule model internally. Users may write
either predicate syntax or a constrained natural language that compiles to that
model.

## Target Users

- Home automation users who want understandable rules.
- Developers who want to inspect the underlying predicate model.
- Experimenters who want a client-side reasoning playground.

## Core Requirements

- The application must run entirely in the browser.
- The default scenario must be House Automation.
- The application must not require a backend or hosted API.
- Users must be able to edit the knowledge base directly.
- Users must be able to run queries against given and inferred facts.
- The reasoner must infer new facts from rules using forward chaining.
- The UI must show parse and consistency errors clearly.
- The UI must show inferred model facts as a list.
- The UI must also offer a graph view of relationships.
- The graph view must use an automatic force layout and support dragging nodes.
- GitHub Pages deployment must publish the static build to `gh-pages`.

## Reasoning Model

The internal model is predicate-based.

Examples:

```prolog
currentTime(1335).
temperature(bedroom, 16).
window(bedroom, closed).
door(frontdoor).
cold(Room) :- temperature(Room, TemperatureValue), below(TemperatureValue, 18).
recommendedAction(Room, heatRoom) :- cold(Room), window(Room, closed).
recommendedAction(Door, lock) :- door(Door), unlocked(Door), currentTime(CurrentTime), atLeast(CurrentTime, 1320).
```

Variables start with an uppercase letter. Atoms start with a lowercase letter
or number. Numeric atoms are allowed for sensor values and thresholds.

## Controlled Natural Language

The controlled natural language must stay predictable. It is not intended to be
a general English parser.

Supported fact forms:

```text
current time is 22:15.
frontdoor is a door.
livingroom is occupied.
bedroom has temperature 16.
bedroom has window closed.
bathroom is leaking.
```

Supported rule forms:

```text
Room is cold when Room has temperature below 18.
recommend turnOnLight for Room when Room is occupied and Room is dark.
recommend heatRoom for Room when Room is cold and Room has window closed.
recommend notifyLeak for Room when Room is leaking.
recommend lock for Door when Door is a door and Door is unlocked and current time is at least 22:00.
recommend turnOff for Light when Light is a light and Light is on and current time is at least 08:00.
```

Supported comparison keywords:

```text
below
above
at least
at most
before
after
at
exactly
```

Supported time forms:

```text
current time is 22:15.
current time is before 08:00
current time is after 18:30
current time is at least 22:00
current time is at most 23:00
current time is at 08:00
current time is exactly 08:00
```

Supported query forms:

```text
what is recommended for Item?
what is cold?
which rooms are cold?
what has temperature below 18?
which rooms have temperature below 18?
what has window closed?
which rooms have window closed?
```

Predicate queries must also remain supported:

```prolog
cold(Room)
temperature(Room, TemperatureValue)
recommendedAction(Room, Action)
recommendedAction(Room, heatRoom)
```

## House Automation Example

The default knowledge base must demonstrate:

- occupancy facts
- dark rooms
- temperature sensor values
- window state facts
- leak detection
- current time facts
- door and light type facts
- inferred `cold(Room)` state from temperature thresholds
- recommended actions for lights, heating, leak notifications, door locking,
  and time-based light switching

The current default query is:

```text
what is recommended for Item
```

## Inferred Model Views

The list view must show all facts and identify whether each fact is given or
inferred.

The graph view must:

- render unary facts as `subject -> predicate` relationships labeled `is`
- render binary facts as `subject -> object` relationships labeled by predicate
- distinguish given and inferred relationships visually
- avoid severe node overlap through force collision
- allow users to drag nodes
- remain dependency-light and work in the static GitHub Pages build

## Current Limitations

- Typed entities are not yet modeled. For example, `which rooms are cold?`
  currently uses `Room` as a variable name but does not verify that each result
  has an explicit `room` type.
- Natural language plural handling is intentionally simple.
- Queries can express basic state, binary property, recommendation, and numeric
- threshold forms, but not arbitrary English.
- Time comparisons do not yet model recurring schedules or midnight-spanning
  windows. They reason over the current time fact only.
- The graph layout is force-directed but not a full graph exploration system.

## Near-Term Requirements

- Allow typed queries to filter by type once type facts exist.
- Add recurring schedule concepts for actual automation triggers.
- Keep the natural language examples aligned with real home automation concepts.
- Keep query help in the UI synchronized with this document.
