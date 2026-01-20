import { Node, Edge } from "@xyflow/react";

export function buildJson(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
  config: Record<string, any>
) {
  if (nodes.length < 3) {
    return {};
  }

  if (!config) {
    return {}
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build children map
  const childrenMap = new Map();
  edges.forEach((e) => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source).push(e.target);
  });

  // ---------------------------------------------
  // BUILD CONDITION
  // ---------------------------------------------
  function buildCondition(parentId, childId) {
    const parent = nodeMap.get(parentId);
    const child = nodeMap.get(childId);

    const isParentConditional = parent?.data?.type === "conditional";
    const parentHasMultipleOutcome = parent?.data?.type === "multiple";


    const edgeFromParentToChild = edges.find(
      (edge) => edge.target === child.id
    );

    // ----------------------------------------------------------
    // END or ADD-END NODE
    // ----------------------------------------------------------
    if (child.type === "end" || child.type === "add-end") {
      const edgeToChild = edges.find(({ target }) => child.id === target);

      // If parent is conditional or multiple → rule + metadata inside condition
      if (isParentConditional) {
        const conditions = config.sequence[parent?.data?.actionType].conditions;
        const type = edgeFromParentToChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;
        return {
          rule,
          metadata: {
            isEnd: true,
            outcome: type,
            canHaveActions: edgeToChild.data?.canHaveActions ?? true,
          },
        }
      }

      if (parentHasMultipleOutcome && !edgeFromParentToChild.data?.outcome) {
        const conditions = config.sequence[parent?.data?.actionType].outcomes;
        const edgeFromChild = edges.find(({ source }) => source === child.id);
        const type = edgeFromChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;

        const rulesWithoutWait = rule.children.filter((r) => r.type !== "WAIT");

        return {
          rule: {
            type: "GROUP",
            op: "AND",
            children: rulesWithoutWait,
          },
          metadata: {
            isEnd: true,
            outcome: "negative",
            canHaveActions: edgeToChild.data?.canHaveActions ?? true,
          },
        };
      }

      if (parentHasMultipleOutcome && edgeFromParentToChild.data?.outcome === "positive") {
        const conditions = config.sequence[parent?.data?.actionType].outcomes;
        const type = edgeFromParentToChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;

        const rulesWithoutWait = rule.children.filter((r) => r.type !== "WAIT");

        return {
          rule: {
            type: "GROUP",
            op: "AND",
            children: rulesWithoutWait,
          },
          metadata: {
            isEnd: true,
            outcome: "positive",
            canHaveActions: edgeToChild.data?.canHaveActions ?? true,
          },
        };
      }

      // If parent is NOT conditional → handled in parent action
      return null;
    }

    // ----------------------------------------------------------
    // DELAY NODE
    // ----------------------------------------------------------
    if (child.type === "delay") {
      const nextIds = childrenMap.get(childId) || [];
      const nextAction = nextIds.length > 0 ? buildFromNode(nextIds[0]) : null;
      const nextChildNode = nextIds.length > 0 ? nodeMap.get(nextIds[0]) : null;

      const edgeFromParentToChild = edges.find(
        (edge) => edge.target === child.id
      );

      let conditionObj = {};
      if (isParentConditional) {
        const conditions = config.sequence[parent?.data?.actionType].conditions;
        const type = edgeFromParentToChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;

        rule.children.push({
          type: "WAIT",
          value: "WAIT",
          metadata: { wait: child.data?.delay ?? 60 },
        });

        conditionObj = {
          rule,
          metadata: {
            outcome: type,
          },
          ...(nextAction ? { action: nextAction.action } : {}),
        };
      } else if (
        parentHasMultipleOutcome &&
        !edgeFromParentToChild.data?.outcome
      ) {
        const conditions = config.sequence[parent?.data?.actionType].outcomes;
        const edgeFromChild = edges.find(({ source }) => source === child.id);
        const type = edgeFromChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;

        const idx = rule.children.findIndex((r) => r.type === "WAIT");

        rule.children[idx].metadata = {
          wait: child.data.delay
        };

        conditionObj = {
          rule,
          metadata: {
            outcome: "negative",
          },
          ...(nextAction ? { action: nextAction.action } : {}),
        };
      } else if (
        parentHasMultipleOutcome &&
        edgeFromParentToChild.data?.outcome === "positive"
      ) {
        const conditions = config.sequence[parent?.data?.actionType].outcomes;
        const type = edgeFromParentToChild.data.outcome;

        const rule = conditions.find(cond => cond.type === type).rule;

        const idx = rule.children.findIndex((r) => r.type === "WAIT");

        rule.children[idx].metadata = {
          wait: child.data.delay
        };

        conditionObj = {
          rule,
          metadata: {
            outcome: "positive",
          },
          ...(nextAction ? { action: nextAction.action } : {}),
        };
      } else {
        conditionObj = {
          rule: {
            type: "GROUP",
            op: "AND",
            children: [
              {
                type: "WAIT",
                value: "WAIT",
                metadata: { wait: child.data?.delay ?? 60 },
              },
            ],
          },
          ...(nextAction ? { action: nextAction.action } : {}),
        };
      }

      if (
        nextChildNode &&
        (nextChildNode.type === "end" || nextChildNode.type === "add-end")
      ) {
        const edgeToChild = edges.find(({ target }) => child.id === target);

        conditionObj.metadata = {
          ...conditionObj.metadata,
          isEnd: true,
          canHaveActions: edgeToChild.data?.canHaveActions ?? true,
        };
      }
      return conditionObj;
    }

    // ----------------------------------------------------------
    // NORMAL ACTION
    // ----------------------------------------------------------
    return buildFromNode(childId);
  }

  // ---------------------------------------------
  // BUILD A NODE → JSON ACTION OBJECT
  // ---------------------------------------------
  function buildFromNode(nodeId) {
    const node = nodeMap.get(nodeId);
    const children = childrenMap.get(nodeId) || [];

    // ROOT
    if (node.type === "start") {
      const firstChild = children[0];
      return {
        action: {
          type: "INITIATED",
          data: {},
          conditions: [
            {
              rule: { type: "TRANSITION", value: "TRANSITION" },
              ...(firstChild
                ? { action: buildFromNode(firstChild).action }
                : {}),
            },
          ],
        },
      };
    }

    // LINKEDIN ACTION NODE
    if (node.type === "action") {
      const conditions = children.map((childId) =>
        buildCondition(nodeId, childId)
      );

      const { icon, label, ...nodeData } = node.data;
      const actionObj = {
        type: node.data?.actionType,
        data: nodeData,
        conditions: conditions[0] ? conditions : undefined,
      };

      const hasEndChild = children.some((id) => {
        const c = nodeMap.get(id);
        return c.type === "end" || c.type === "add-end";
      });

      const isParentConditional =
        node.data?.type === "conditional" || node.data?.type === "multiple";

      // If parent is NOT conditional and has end child → add metadata here
      if (hasEndChild && !isParentConditional) {
        actionObj.metadata = { isEnd: true };
      }

      return {
        action: actionObj,
      };
    }

    // DELAY handled inside conditions (never a direct action)
    if (node.type === "delay") return null;

    // END handled inside buildCondition
    if (node.type === "end" || node.type === "add-end") return null;

    return null;
  }

  // Call root
  return buildFromNode(rootId);
}
