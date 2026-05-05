export type Term = {
  kind: "var" | "atom";
  value: string;
};

export type Predicate = {
  name: string;
  terms: Term[];
};

export type Rule = {
  head: Predicate;
  body: Predicate[];
  source: string;
};

export type Fact = {
  predicate: string;
  args: string[];
  derivedBy?: string;
};

export type Binding = Record<string, string>;

export type QueryResult = {
  bindings: Binding[];
  facts: Fact[];
};

export type ReasoningResult = {
  baseFacts: Fact[];
  inferredFacts: Fact[];
  allFacts: Fact[];
  rules: Rule[];
  errors: string[];
  iterations: number;
};

const predicatePattern = /^([a-z][a-zA-Z0-9_-]*)\((.*)\)$/;
const numericTermPattern = /^-?\d+(?:\.\d+)?$/;
const naturalUnaryFactPattern = /^([a-z0-9][a-zA-Z0-9_-]*) is ([a-z][a-zA-Z0-9_-]*)$/;
const naturalBinaryFactPattern =
  /^([a-z0-9][a-zA-Z0-9_-]*) has ([a-z][a-zA-Z0-9_-]*) (-?\d+(?:\.\d+)?|[a-z0-9][a-zA-Z0-9_-]*)$/;
const naturalRulePattern = /^recommend ([a-z][a-zA-Z0-9_-]*) for ([A-Z][a-zA-Z0-9_-]*) when (.+)$/;
const naturalUnaryConditionPattern = /^([A-Z][a-zA-Z0-9_-]*) is ([a-z][a-zA-Z0-9_-]*)$/;
const naturalBinaryConditionPattern =
  /^([A-Z][a-zA-Z0-9_-]*) has ([a-z][a-zA-Z0-9_-]*) ([a-z0-9][a-zA-Z0-9_-]*)$/;
const naturalThresholdConditionPattern =
  /^([A-Z][a-zA-Z0-9_-]*) has ([a-z][a-zA-Z0-9_-]*) (below|above|at least|at most) (-?\d+(?:\.\d+)?)$/;
const naturalClassificationRulePattern =
  /^([A-Z][a-zA-Z0-9_-]*) is ([a-z][a-zA-Z0-9_-]*) when (.+)$/;
const naturalStateQueryPattern = /^(?:[Ww]hat|[Ww]ho) is ([a-z][a-zA-Z0-9_-]*)$/;
const naturalTypedStateQueryPattern =
  /^[Ww]hich ([a-z][a-zA-Z0-9_-]*)s are ([a-z][a-zA-Z0-9_-]*)$/;
const naturalBinaryQueryPattern =
  /^(?:[Ww]hat|[Ww]ho) has ([a-z][a-zA-Z0-9_-]*) ([a-z0-9][a-zA-Z0-9_-]*)$/;
const naturalTypedBinaryQueryPattern =
  /^[Ww]hich ([a-z][a-zA-Z0-9_-]*)s have ([a-z][a-zA-Z0-9_-]*) ([a-z0-9][a-zA-Z0-9_-]*)$/;
const naturalThresholdQueryPattern =
  /^(?:[Ww]hat|[Ww]ho) has ([a-z][a-zA-Z0-9_-]*) (below|above|at least|at most) (-?\d+(?:\.\d+)?)$/;
const naturalTypedThresholdQueryPattern =
  /^[Ww]hich ([a-z][a-zA-Z0-9_-]*)s have ([a-z][a-zA-Z0-9_-]*) (below|above|at least|at most) (-?\d+(?:\.\d+)?)$/;

export function runReasoner(input: string): ReasoningResult {
  const facts = new Map<string, Fact>();
  const rules: Rule[] = [];
  const errors: string[] = [];

  for (const { text, lineNumber } of meaningfulLines(input)) {
    if (!text.endsWith(".")) {
      errors.push(`Line ${lineNumber}: expected a trailing "."`);
      continue;
    }

    const statement = text.slice(0, -1).trim();
    try {
      const compiledStatement = compileStatement(statement);
      if (compiledStatement.includes(":-")) {
        rules.push(parseRule(compiledStatement, text));
      } else {
        const predicate = parsePredicate(compiledStatement);
        if (predicate.terms.some((term) => term.kind === "var")) {
          errors.push(`Line ${lineNumber}: facts cannot contain variables`);
          continue;
        }
        const fact = {
          predicate: predicate.name,
          args: predicate.terms.map((term) => term.value),
        };
        facts.set(factKey(fact), fact);
      }
    } catch (error) {
      errors.push(`Line ${lineNumber}: ${(error as Error).message}`);
    }
  }

  const baseFactCount = facts.size;
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 100) {
    changed = false;
    iterations += 1;

    for (const rule of rules) {
      for (const binding of satisfyAll(rule.body, Array.from(facts.values()), [{}])) {
        const resolved = instantiate(rule.head, binding);
        if (!resolved) {
          continue;
        }

        const key = factKey(resolved);
        if (!facts.has(key)) {
          facts.set(key, {
            ...resolved,
            derivedBy: rule.source,
          });
          changed = true;
        }
      }
    }
  }

  if (iterations === 100) {
    errors.push("Reasoning stopped after 100 iterations.");
  }

  const allFacts = Array.from(facts.values()).sort(compareFacts);

  return {
    baseFacts: allFacts.slice(0, baseFactCount),
    inferredFacts: allFacts.filter((fact) => fact.derivedBy),
    allFacts,
    rules,
    errors,
    iterations,
  };
}

export function runQuery(query: string, facts: Fact[]): QueryResult {
  const normalized = query.trim().replace(/[.?]$/, "");
  if (!normalized) {
    return { bindings: [], facts: [] };
  }

  const predicates = compileQuery(normalized).map(parsePredicate);
  const bindings = satisfyAll(predicates, facts, [{}]);
  const matchingFacts =
    predicates.length === 1 ? facts.filter((fact) => canUnify(predicates[0], fact, {})) : [];

  return {
    bindings: dedupeBindings(bindings),
    facts: matchingFacts,
  };
}

export function formatFact(fact: Fact): string {
  return `${fact.predicate}(${fact.args.join(", ")}).`;
}

function* meaningfulLines(input: string): Generator<{ text: string; lineNumber: number }> {
  const lines = input.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index].replace(/#.*/, "").trim();
    if (text) {
      yield { text, lineNumber: index + 1 };
    }
  }
}

function parseRule(statement: string, source: string): Rule {
  const [headText, bodyText] = statement.split(":-").map((part) => part.trim());
  if (!headText || !bodyText) {
    throw new Error("invalid rule syntax");
  }

  return {
    head: parsePredicate(headText),
    body: splitPredicates(bodyText).map(parsePredicate),
    source,
  };
}

function compileStatement(statement: string): string {
  if (statement.includes(":-") || predicatePattern.test(statement)) {
    return statement;
  }

  const unaryFactMatch = statement.match(naturalUnaryFactPattern);
  if (unaryFactMatch) {
    return `${unaryFactMatch[2]}(${unaryFactMatch[1]})`;
  }

  const binaryFactMatch = statement.match(naturalBinaryFactPattern);
  if (binaryFactMatch) {
    return `${binaryFactMatch[2]}(${binaryFactMatch[1]}, ${binaryFactMatch[3]})`;
  }

  const ruleMatch = statement.match(naturalRulePattern);
  if (ruleMatch) {
    const [, action, subject, conditionText] = ruleMatch;
    const conditions = conditionText.split(" and ").map(compileNaturalCondition);
    return `recommendedAction(${subject}, ${action}) :- ${conditions.join(", ")}`;
  }

  const classificationRuleMatch = statement.match(naturalClassificationRulePattern);
  if (classificationRuleMatch) {
    const [, subject, state, conditionText] = classificationRuleMatch;
    const conditions = conditionText.split(" and ").map(compileNaturalCondition);
    return `${state}(${subject}) :- ${conditions.join(", ")}`;
  }

  return statement;
}

function compileQuery(query: string): string[] {
  if (predicatePattern.test(query)) {
    return [query];
  }

  const recommendationMatch = query.match(/^[Ww]hat is recommended for ([A-Z][a-zA-Z0-9_-]*)$/);
  if (recommendationMatch) {
    return [`recommendedAction(${recommendationMatch[1]}, Action)`];
  }

  const typedStateMatch = query.match(naturalTypedStateQueryPattern);
  if (typedStateMatch) {
    const [, typeName, state] = typedStateMatch;
    return [`${state}(${toVariableName(typeName)})`];
  }

  const stateMatch = query.match(naturalStateQueryPattern);
  if (stateMatch) {
    return [`${stateMatch[1]}(Item)`];
  }

  const typedThresholdMatch = query.match(naturalTypedThresholdQueryPattern);
  if (typedThresholdMatch) {
    const [, typeName, measurement, operator, limit] = typedThresholdMatch;
    return compileThresholdQuery(toVariableName(typeName), measurement, operator, limit);
  }

  const thresholdMatch = query.match(naturalThresholdQueryPattern);
  if (thresholdMatch) {
    const [, measurement, operator, limit] = thresholdMatch;
    return compileThresholdQuery("Item", measurement, operator, limit);
  }

  const typedBinaryMatch = query.match(naturalTypedBinaryQueryPattern);
  if (typedBinaryMatch) {
    const [, typeName, property, value] = typedBinaryMatch;
    return [`${property}(${toVariableName(typeName)}, ${value})`];
  }

  const binaryMatch = query.match(naturalBinaryQueryPattern);
  if (binaryMatch) {
    const [, property, value] = binaryMatch;
    return [`${property}(Item, ${value})`];
  }

  return [compileStatement(query)];
}

function compileNaturalCondition(condition: string): string {
  const thresholdMatch = condition.match(naturalThresholdConditionPattern);
  if (thresholdMatch) {
    const [, subject, measurement, operator, limit] = thresholdMatch;
    const value = toVariableName(`${measurement}Value`);
    return `${measurement}(${subject}, ${value}), ${comparisonPredicate(operator)}(${value}, ${limit})`;
  }

  const unaryMatch = condition.match(naturalUnaryConditionPattern);
  if (unaryMatch) {
    return `${unaryMatch[2]}(${unaryMatch[1]})`;
  }

  const binaryMatch = condition.match(naturalBinaryConditionPattern);
  if (binaryMatch) {
    return `${binaryMatch[2]}(${binaryMatch[1]}, ${binaryMatch[3]})`;
  }

  throw new Error(`invalid natural condition "${condition}"`);
}

function comparisonPredicate(operator: string): string {
  switch (operator) {
    case "below":
      return "below";
    case "above":
      return "above";
    case "at least":
      return "atLeast";
    case "at most":
      return "atMost";
    default:
      throw new Error(`invalid comparison "${operator}"`);
  }
}

function compileThresholdQuery(
  subject: string,
  measurement: string,
  operator: string,
  limit: string,
): string[] {
  const value = toVariableName(`${measurement}Value`);
  return [`${measurement}(${subject}, ${value})`, `${comparisonPredicate(operator)}(${value}, ${limit})`];
}

function toVariableName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parsePredicate(text: string): Predicate {
  const match = text.match(predicatePattern);
  if (!match) {
    throw new Error(`invalid predicate "${text}"`);
  }

  const terms = match[2]
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean)
    .map(parseTerm);

  if (terms.length === 0) {
    throw new Error("predicates need at least one term");
  }

  return {
    name: match[1],
    terms,
  };
}

function splitPredicates(text: string): string[] {
  const predicates: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      predicates.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }

  predicates.push(text.slice(start).trim());
  return predicates.filter(Boolean);
}

function parseTerm(term: string): Term {
  if (/^[A-Z_][a-zA-Z0-9_-]*$/.test(term)) {
    return { kind: "var", value: term };
  }

  if (numericTermPattern.test(term) || /^[a-z0-9][a-zA-Z0-9_-]*$/.test(term)) {
    return { kind: "atom", value: term };
  }

  throw new Error(`invalid term "${term}"`);
}

function satisfyAll(predicates: Predicate[], facts: Fact[], bindings: Binding[]): Binding[] {
  return predicates.reduce<Binding[]>((current, predicate) => {
    return current.flatMap((binding) => satisfy(predicate, facts, binding));
  }, bindings);
}

function satisfy(predicate: Predicate, facts: Fact[], binding: Binding): Binding[] {
  const builtInResult = satisfyBuiltIn(predicate, binding);
  if (builtInResult) {
    return builtInResult;
  }

  return facts.reduce<Binding[]>((matches, fact) => {
    const next = canUnify(predicate, fact, binding);
    return next ? [...matches, next] : matches;
  }, []);
}

function satisfyBuiltIn(predicate: Predicate, binding: Binding): Binding[] | null {
  const comparisons: Record<string, (left: number, right: number) => boolean> = {
    below: (left, right) => left < right,
    above: (left, right) => left > right,
    atLeast: (left, right) => left >= right,
    atMost: (left, right) => left <= right,
  };
  const compare = comparisons[predicate.name];
  if (!compare) {
    return null;
  }

  if (predicate.terms.length !== 2) {
    return [];
  }

  const left = resolveNumericTerm(predicate.terms[0], binding);
  const right = resolveNumericTerm(predicate.terms[1], binding);
  if (left === null || right === null) {
    return [];
  }

  return compare(left, right) ? [binding] : [];
}

function resolveNumericTerm(term: Term, binding: Binding): number | null {
  const value = term.kind === "var" ? binding[term.value] : term.value;
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function canUnify(predicate: Predicate, fact: Fact, binding: Binding): Binding | null {
  if (predicate.name !== fact.predicate || predicate.terms.length !== fact.args.length) {
    return null;
  }

  const next = { ...binding };

  for (let index = 0; index < predicate.terms.length; index += 1) {
    const term = predicate.terms[index];
    const value = fact.args[index];

    if (term.kind === "atom" && term.value !== value) {
      return null;
    }

    if (term.kind === "var") {
      const current = next[term.value];
      if (current && current !== value) {
        return null;
      }
      next[term.value] = value;
    }
  }

  return next;
}

function instantiate(predicate: Predicate, binding: Binding): Fact | null {
  const args: string[] = [];

  for (const term of predicate.terms) {
    if (term.kind === "atom") {
      args.push(term.value);
    } else if (binding[term.value]) {
      args.push(binding[term.value]);
    } else {
      return null;
    }
  }

  return {
    predicate: predicate.name,
    args,
  };
}

function factKey(fact: Fact): string {
  return `${fact.predicate}/${fact.args.length}:${fact.args.join("\u0000")}`;
}

function compareFacts(left: Fact, right: Fact): number {
  return formatFact(left).localeCompare(formatFact(right));
}

function dedupeBindings(bindings: Binding[]): Binding[] {
  const seen = new Set<string>();
  return bindings.filter((binding) => {
    const key = JSON.stringify(Object.entries(binding).sort());
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
