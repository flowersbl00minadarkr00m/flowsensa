import type { WorkEventCollection } from "./types";

const BPMN_TASK_TAGS = ["task", "userTask", "serviceTask", "manualTask", "scriptTask", "businessRuleTask", "sendTask", "receiveTask"];

function cleanId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bpmn-step";
}

function parseAttributes(input: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(input.matchAll(/([\w:-]+)="([^"]*)"/g)).map((match) => [match[1]!, match[2]!]),
  );
}

function readBpmnTasks(xml: string): Array<{ id: string; label: string }> {
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("BPMN XML could not be parsed.");
    const elements = BPMN_TASK_TAGS.flatMap((tag) => Array.from(doc.getElementsByTagNameNS("*", tag)));
    return elements.map((element, index) => {
      const rawId = element.getAttribute("id") || `bpmn-task-${index + 1}`;
      return {
        id: rawId,
        label: element.getAttribute("name") || rawId,
      };
    });
  }

  const tagPattern = BPMN_TASK_TAGS.join("|");
  return Array.from(xml.matchAll(new RegExp(`<(?:\\w+:)?(${tagPattern})\\b([^>]*)`, "gi"))).map((match, index) => {
    const attrs = parseAttributes(match[2] ?? "");
    const rawId = attrs.id || `bpmn-task-${index + 1}`;
    return {
      id: rawId,
      label: attrs.name || rawId,
    };
  });
}

export function importBpmnAsEvents(xml: string, sourceRef: string): WorkEventCollection {
  const tasks = readBpmnTasks(xml);
  if (!tasks.length) throw new Error("No BPMN tasks were found.");
  const ingestedAt = new Date().toISOString();
  return {
    schemaVersion: "1.0.0",
    exportedAt: ingestedAt,
    events: tasks.map((task, index) => {
      const rawId = task.id;
      const label = task.label;
      return {
        eventId: `bpmn-${cleanId(rawId)}-${index + 1}`,
        caseId: "bpmn-import",
        timestamp: new Date(Date.now() + index * 1000).toISOString(),
        sequence: index + 1,
        activity: { id: cleanId(rawId), label, type: "other", primitiveVersion: "1.0.0" },
        actor: { id: "bpmn-model", label: "BPMN model", type: "system" },
        result: { status: "success" },
        truthState: "inferred",
        confidence: 0.65,
        provenance: {
          sourceType: "file-import",
          sourceRef,
          ingestedAt,
          transformation: "bpmn-structure-to-candidate-events",
        },
        tags: ["bpmn-import", "candidate-map"],
      };
    }),
  };
}
