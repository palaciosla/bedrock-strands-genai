export type TestCaseKey =
  | "promptInjection"
  | "sexualContent"
  | "outOfContext"
  | "piiOutput";

export type TestCaseDefinition = {
  caseKey: TestCaseKey;
  promptKey: TestCaseKey;
};

export type TestGroupDefinition = {
  groupKey: "guardrails";
  cases: TestCaseDefinition[];
};

export const TEST_MENU: TestGroupDefinition[] = [
  {
    groupKey: "guardrails",
    cases: [
      { caseKey: "promptInjection", promptKey: "promptInjection" },
      { caseKey: "sexualContent", promptKey: "sexualContent" },
      { caseKey: "outOfContext", promptKey: "outOfContext" },
      { caseKey: "piiOutput", promptKey: "piiOutput" },
    ],
  },
];
