// ---------------------------------------------------------------
// Automation JSON → React Flow Nodes + Edges (FINAL VERSION)
// ---------------------------------------------------------------
export function jsonToNodesAndEdges(json, conf, checkEndType = true) {
  let nodes = [];
  let edges = [];

  // ----------------------------------------
  // HELPERS
  // ----------------------------------------
  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 10);
  }

  function addNode(type, data = {}) {
    const id = type === "start" ? "root" : uid(type);
    nodes.push({
      id,
      type,
      data,
      position: { x: 0, y: 0 }, // layout is external
    });
    return id;
  }

  function addEdge(source, target) {
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
    });
  }

  // ----------------------------------------
  // RECURSIVE BUILDERS
  // ----------------------------------------
  function processAction(parentNodeId, actionObj, conditionObj = null, parentActionType = null) {
    console.log({ parentNodeId, actionObj });
    const { type, data, conditions, metadata } = actionObj;
    console.log("DATA", data, actionObj);

    const actionNodeId = addNode("action", {
      ...data,
      actionType: type,
      actionId: actionObj.id,
      ...(metadata || {}),
    });

    if (parentNodeId) {
      if (!conditionObj) {
        addEdge(parentNodeId, actionNodeId);
      } else {
        edges.push({
          id: `e-${parentNodeId}-${actionNodeId}`,
          source: parentNodeId,
          target: actionNodeId,
          label: conf.sequence[parentActionType].outcomes.find(
              (condition) => condition.type === "negative"
            ).label,
          data: {
            outcome: "negative",
          },
        });
      }
    }

    if (metadata?.isEnd) {
      let endNodeType = metadata?.canHaveActions === false ? "end" : "add-end";
      if (!checkEndType) {
        endNodeType = "end";
      }

      const endNodeId = addNode(endNodeType, {});
      addEdge(actionNodeId, endNodeId);

      // Do NOT process any nested conditions, because this action terminates
      return actionNodeId;
    }

    if (Array.isArray(conditions)) {
      conditions.forEach((cond) =>
        processCondition(actionNodeId, cond, data.actionType)
      );
    }

    return actionNodeId;
  }

  function processCondition(
    parentActionNodeId,
    conditionObj,
    parentActionType
  ) {
    const { rule, action, metadata } = conditionObj;

    const hasEnd = metadata?.isEnd === true;
    const isAddEnd = metadata?.isAddEnd === true;

    console.log(
      "geihoeog",
      conf,
      parentActionType,
      conf.sequence[parentActionType]
    );

    const isConditional =
      conf.sequence[parentActionType].type === "conditional";
    const isMultiOutcome =
      conf.sequence[parentActionType].outcomeType === "multiple";

    const hasRule = !!rule;
    // const isDelayRule =
    //   hasRule &&
    //   rule.type === "GROUP" &&
    //   Array.isArray(rule.children) &&
    //   rule.children.length > 0 &&
    //   rule.children[0].type === "WAIT";   // <-- IMPORTANT

    const firstLevelWaitChild =
      hasRule && rule.type === "GROUP" && Array.isArray(rule.children)
        ? rule.children.find((ch) => ch.type === "WAIT")
        : null;

    const isDelayRule = !!firstLevelWaitChild;

    // -------------------------------------------------------
    // NEW RULE:
    // If condition has BOTH metadata.isEnd AND WAIT rule.children
    // -------------------------------------------------------
    if (hasEnd && isDelayRule) {
      const waitChild = firstLevelWaitChild;
      const wait = waitChild?.metadata?.wait ?? 0;

      // 1. Create delay node
      const delayId = addNode("delay", { delay: wait });
      addEdge(parentActionNodeId, delayId);

      // 2. Create end node
      let endNodeType = metadata?.canHaveActions === false ? "end" : "add-end";
      if (!checkEndType) {
        endNodeType = "end";
      }
      const endNodeId = addNode(endNodeType, {});

      // 3. Connect delay → end with outcome negative
      edges.push({
        id: `e-${delayId}-${endNodeId}`,
        source: delayId,
        target: endNodeId,
        label: isConditional
          ? conf.sequence[parentActionType].conditions.find(
              (condition) => condition.type === metadata.outcome
            ).label
          : isMultiOutcome
          ? conf.sequence[parentActionType].outcomes.find(
              (condition) => condition.type === metadata.outcome
            ).label
          : metadata.outcome,
        data: {
          outcome: metadata.outcome,
        },
      });

      return; // done
    }

    // -------------------------------------------------------
    // EXISTING END / ADD-END (fallback behavior)
    // -------------------------------------------------------
    if (hasEnd && !isDelayRule) {
      let endNodeType = metadata?.canHaveActions === false ? "end" : "add-end";
      if (!checkEndType) {
        endNodeType = "end";
      }

      const endNodeId = addNode(endNodeType, {});

      // if (isConditional) {
      edges.push({
        id: `e-${parentActionNodeId}-${endNodeId}`,
        source: parentActionNodeId,
        target: endNodeId,
        label: isConditional
          ? conf.sequence[parentActionType].conditions.find(
              (condition) => condition.type === metadata.outcome
            ).label
          : isMultiOutcome
          ? conf.sequence[parentActionType].outcomes.find(
              (condition) => condition.type === metadata.outcome
            ).label
          : metadata.outcome,
        data: {
          outcome: metadata.outcome,
        },
      });
      // }
      return;
    }

    // -------------------------------------------------------
    // DELAY CONDITION (normal)
    // -------------------------------------------------------
    if (rule && rule.type === "GROUP") {
      const waitChild = rule.children?.find((ch) => ch.type === "WAIT");

      if (waitChild) {
        const wait = waitChild.metadata?.wait ?? 0;

        const delayId = addNode("delay", { delay: wait });

        if (!isConditional && !isMultiOutcome) {
          addEdge(parentActionNodeId, delayId);
        } else if (isConditional) {
          addEdge(parentActionNodeId, delayId);
          edges[edges.length - 1].label = conf.sequence[
            parentActionType
          ].conditions.find(
            (condition) => condition.type === metadata.outcome
          ).label;
          edges[edges.length - 1].data = { outcome: metadata.outcome };
        } else if (isMultiOutcome && metadata.outcome === "positive") {
          addEdge(parentActionNodeId, delayId);
          edges[edges.length - 1].label = conf.sequence[
            parentActionType
          ].outcomes.find(
            (condition) => condition.type === metadata.outcome
          ).label;
          edges[edges.length - 1].data = { outcome: metadata.outcome };
        } else if (isMultiOutcome && metadata.outcome === "negative") {
          addEdge(parentActionNodeId, delayId);
        }

        // If ends here
        if (metadata?.isEnd) {
          const endNodeId = addNode("end", {});
          edges.push({
            id: `e-${delayId}-${endNodeId}`,
            source: delayId,
            endNodeId,
            label: isConditional
              ? conf.sequence[parentActionType].conditions.find(
                  (condition) => condition.type === metadata.outcome
                ).label
              : isMultiOutcome
              ? conf.sequence[parentActionType].outcomes.find(
                  (condition) => condition.type === metadata.outcome
                ).label
              : metadata.outcome,
            data: {
              outcome: metadata.outcome,
            },
          });
          return;
        }

        // normal chain
        if (action)
          processAction(
            delayId,
            action,
            isMultiOutcome && metadata.outcome === "negative"
              ? conditionObj
              : null,
              parentActionType
          );
        return;
      }
    }

    // -------------------------------------------------------
    // ROOT TRANSITION
    // -------------------------------------------------------
    if (rule && rule.type === "TRANSITION") {
      if (action) processAction(parentActionNodeId, action);
      return;
    }

    // -------------------------------------------------------
    // NORMAL ACTION
    // -------------------------------------------------------
    if (action) processAction(parentActionNodeId, action);
  }

  // ----------------------------------------
  // ROOT HANDLER
  // ----------------------------------------
  function processRoot(json) {
    const rootNodeId = addNode("start", { label: "Start Campaign" });

    const rootAction = json.action;
    const cond = rootAction?.conditions?.[0];

    if (!cond) return { nodes, edges };

    // TRANSITION → child action
    if (cond.action) {
      processAction(rootNodeId, cond.action);
    }

    return { nodes, edges };
  }

  // ----------------------------------------
  return processRoot(json);
}
