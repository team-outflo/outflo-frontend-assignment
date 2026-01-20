"use client";

import { Button } from "@/components/ui/button";
import {
  getIncomers,
  getOutgoers,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { Plus, StopCircle } from "lucide-react";
import { useCallback } from "react";
import ActionMenu, { iconMap } from "../components/ActionMenu";
import { arrange } from "../utils/arrange";
import useSequenceConfig from "../queries/use-sequence-config";

function isAncestor(nodeA, nodeB, edges) {
  const childrenMap = {};
  edges.forEach(({ source, target }) => {
    if (!childrenMap[source]) childrenMap[source] = [];
    childrenMap[source].push(target);
  });

  const visited = new Set();
  const stack = [nodeA];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === nodeB) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    (childrenMap[current] || []).forEach((child) => stack.push(child));
  }

  return false;
}

export default function AddAndEndNode({
  data,
  id,
}: {
  id: string;
  data: {
    onAddAction?: () => void;
    onEnd?: () => void;
  };
}) {
  const instance = useReactFlow();
  const { source = "root", edgeId } =
    instance.getNodeConnections({ type: "target", nodeId: id })?.[0] ?? {};

  const {data: conf} = useSequenceConfig();

  // Guard against missing config
  if (!conf?.sequence) {
    return null;
  }

  const parent = getIncomers(
    { id },
    instance.getNodes(),
    instance.getEdges()
  )[0];

  let getActionsFromParent = true;

  if (["delay", "start"].includes(parent?.type)) {
    getActionsFromParent = false;
  }

  const parentOfParent = getIncomers(
    { id: parent?.id },
    instance.getNodes(),
    instance.getEdges()
  )[0];

  console.log({ parentOfParent });

  let actions = conf.sequence.initial?.actionsAllowed ?? [];
  let gotActionsFrom = null;

  if (
    getActionsFromParent &&
    conf.sequence[parent.data.actionType]?.changesActionsAllowed === false
  ) {
    console.log(parent, "weofjwoej");
    let p = getIncomers(
      { id: parent.id },
      instance.getNodes(),
      instance.getEdges()
    )[0];
    while (p.type !== "start") {
      console.log(p.type, id, "aiowejgo");
      if (p.type === "action") {
        const a = conf.sequence[p.data.actionType];
        if (a.changesActionsAllowed === false) {
          p = getIncomers(
            { id: p.id },
            instance.getNodes(),
            instance.getEdges()
          )[0];
          console.log("continue", "weofjwoej");
          continue;
        }
        console.log({ a });
        if (a.type === "action" && a.outcomeType === "single") {
          actions = a.actionsAllowed ?? actions;
        } else if (a.type === "action" && a.outcomeType === "multiple") {
          actions = a.outcomes?.[0]?.actionsAllowed ?? actions;
        } else {
          actions = a.conditions?.[0]?.actionsAllowed ?? actions;
        }

        gotActionsFrom = p.id;
        break;
      }

      if (p.type === "delay") {
        const pp = getIncomers(
          { id: p.id },
          instance.getNodes(),
          instance.getEdges()
        )[0];
        const a = conf.sequence[pp.data.actionType];
        if (a.changesActionsAllowed === false) {
          p = getIncomers(
            { id: p.id },
            instance.getNodes(),
            instance.getEdges()
          )[0];
          console.log("continue", "weofjwoej");
          continue;
        }
        const edge = instance.getEdges().find(({ source }) => source === p.id);
        console.log(p.type, pp, a, "aiowejgo", edge);
        if (!edge?.label) {
          actions = a.actionsAllowed ?? actions;
        } else if (edge.label) {
          // Check if outcomes array exists and has index 1
          actions = a.outcomes?.[1]?.actionsAllowed ?? a.outcomes?.[0]?.actionsAllowed ?? actions;
        }

        gotActionsFrom = pp.id;

        break;
      }

      p = getIncomers(
        { id: p.id },
        instance.getNodes(),
        instance.getEdges()
      )[0];
    }
  } else if (getActionsFromParent) {
    const a = conf.sequence[parent?.data?.actionType];
    if (a) {
      console.log({ a });
      if (a.type === "action" && a.outcomeType === "single") {
        actions = a.actionsAllowed ?? actions;
      } else if (a.type === "action" && a.outcomeType === "multiple") {
        actions = a.outcomes?.[0]?.actionsAllowed ?? actions;
      } else {
        actions = a.conditions?.[0]?.actionsAllowed ?? actions;
      }
      gotActionsFrom = parent.id;
    }
  } else {
    const a = conf.sequence[parentOfParent?.data?.actionType];
    if (a) {
      console.log({ a });
      if (a.type === "action" && a.outcomeType === "single") {
        actions = a.actionsAllowed ?? actions;
      } else if (a.type === "action" && a.outcomeType === "multiple") {
        actions = a.outcomes?.[1]?.actionsAllowed ?? a.outcomes?.[0]?.actionsAllowed ?? actions;
      } else {
        actions = a.conditions?.[0]?.actionsAllowed ?? actions;
      }
      gotActionsFrom = parentOfParent.id;
    }
  }

  // console.log({ actions, gotActionsFrom });

  let prevActions = actions;
  if (gotActionsFrom) {
    let p = getIncomers(
      { id: gotActionsFrom },
      instance.getNodes(),
      instance.getEdges()
    )?.[0];
    console.log({ actions, gotActionsFrom, p });

    let ad = null;

    while (
      p &&
      !(
        p.type === "action" &&
        conf.sequence[p.data.actionType].changesActionsAllowed !== false
      )
    ) {
      if (p.type === "delay") {
        ad = p;
      }
      p = getIncomers(
        { id: p.id },
        instance.getNodes(),
        instance.getEdges()
      )?.[0];
    }

    if (p) {
      const a = conf.sequence[p.data?.actionType];
      if (a) {
        if (a.outcomeType === "single") {
          prevActions = a.actionsAllowed ?? prevActions;
        } else if (a.outcomeType === "multiple") {
          const children = getOutgoers(
            { id: p.id },
            instance.getNodes(),
            instance.getEdges()
          );

          if (children?.[0] && isAncestor(children[0].id, gotActionsFrom, instance.getEdges())) {
            prevActions = a.outcomes?.[0]?.actionsAllowed ?? prevActions;
          } else {
            prevActions = a.outcomes?.[1]?.actionsAllowed ?? a.outcomes?.[0]?.actionsAllowed ?? prevActions;
          }
        } else {
          const children = getOutgoers(
            { id: p.id },
            instance.getNodes(),
            instance.getEdges()
          );

          if (children?.[0] && isAncestor(children[0].id, gotActionsFrom, instance.getEdges())) {
            prevActions = a.conditions?.[0]?.actionsAllowed ?? prevActions;
          } else {
            prevActions = a.conditions?.[1]?.actionsAllowed ?? a.conditions?.[0]?.actionsAllowed ?? prevActions;
          }
        }
        console.log("wiofjeow", prevActions);
      }
    }
  }

  const union = (a, b) => [...new Set([...a, ...b])];

  // Ensure we always have at least initial actions as fallback
  const initialActions = conf?.sequence?.initial?.actionsAllowed ?? [];
  const safeActions = Array.isArray(actions) && actions.length > 0 ? actions : initialActions;
  const safePrevActions = Array.isArray(prevActions) && prevActions.length > 0 ? prevActions : initialActions;

  // Safely map actions, filtering out any that don't exist in config
  const allActions = union(safeActions, safePrevActions);
  
  // If union results in empty array, fallback to initial actions
  const finalActions = allActions.length > 0 ? allActions : initialActions;

  const actionItems = finalActions
    .map((action) => {
      const ac = conf?.sequence?.[action];
      // Only include actions that exist in the config
      if (!ac) {
        console.warn(`Action type "${action}" not found in sequence config`);
        return null;
      }
      return {
        id: action,
        label: ac.label,
        icon: ac.icon,
        type: ac.type
      };
    })
    .filter((item) => item !== null); // Remove null entries

  // // Final safeguard: if no valid actions found, use initial actions
  // const finalActionItems = actionItems.length > 0 
  //   ? actionItems 
  //   : initialActions
  const finalActionItems = initialActions
        .map((action) => {
          const ac = conf?.sequence?.[action];
          return ac ? {
            id: action,
            label: ac.label,
            icon: ac.icon,
            type: ac.type
          } : null;
        })
        .filter((item) => item !== null);

  const edges = instance.getEdges();

  const focusOnNodes = useCallback(
    (nodeIds: string[], pad: number = 0.8) => {
      const parentIds: string[] = [];
      const grandparentIds: string[] = [];

      nodeIds.forEach((nodeId) => {
        const parentEdges = edges.filter((e) => e.target === nodeId);
        const parents = parentEdges.map((e) => e.source);
        parentIds.push(...parents);

        parents.forEach((parentId) => {
          const grandparentEdges = edges.filter((e) => e.target === parentId);
          grandparentIds.push(...grandparentEdges.map((e) => e.source));
        });
      });

      const allNodesToShow = [...new Set([...nodeIds])];

      // setTimeout(() => {
      //   instance.fitView({
      //     padding: pad,
      //     duration: 800,
      //     nodes:
      //       allNodesToShow.length > 0
      //         ? allNodesToShow.map((id) => ({ id }))
      //         : undefined,
      //   });
      // }, 50);
    },
    [instance, edges]
  );

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="invisible w-1 h-1 bg-slate-400 border-1 border-white"
      />
      <div>
        <div className="grid grid-cols-2">
          <ActionMenu
            onSelectAction={(actionId) => {
              const node = instance.getNode(id);

              console.log({ actionId });
              if (conf.sequence[actionId].outcomeType === "single") {
                /// For single
                const parent = getIncomers(
                  { id },
                  instance.getNodes(),
                  instance.getEdges()
                )[0];

                console.log({ parent });

                if (parent.type !== "delay") {
                  instance.updateNode(id, () => ({
                    type: "delay",
                    data: {
                      delay: 180,
                    },
                  }));

                  instance.addEdges([
                    {
                      id: ["e", id, id + "c"].join(""),
                      source: id,
                      target: id + "c",
                    },
                  ]);
                } else {
                  instance.deleteElements({ nodes: [{ id }] });
                  const { edgeId } = instance.getNodeConnections({
                    type: "source",
                    nodeId: parent.id,
                  })[0];

                  // instance.addEdges(edgeId, () => ({
                  //   target: id + "c",
                  // }));

                  console.log("ewfewf", instance.getEdge(edgeId));
                  instance.addEdges([
                    {
                      id: ["e", parent.id, id + "c"].join(""),
                      source: parent.id,
                      target: id + "c",
                      data: instance.getEdge(edgeId).data,
                      label: instance.getEdge(edgeId).label,
                    },
                  ]);
                }
                instance.addNodes([
                  {
                    id: id + "c",
                    position: node.position,
                    data: {
                      icon: iconMap[conf.sequence[actionId].icon],
                      label: conf.sequence[actionId].label,
                      type:
                        conf.sequence[actionId].outcomeType ??
                        conf.sequence[actionId].type,
                      actionType: actionId,
                    },
                    type: "action",
                  },
                  {
                    id: id + "cc",
                    position: node.position,
                    data: {},
                    type: "add-end",
                  },
                ]);
                instance.addEdges([
                  {
                    id: ["e", id + "c", id + "cc"].join(""),
                    source: id + "c",
                    target: id + "cc",
                  },
                ]);

                focusOnNodes([id + "c", id + "cc"]);

                return;
              } else if (conf.sequence[actionId].outcomeType === "multiple") {
                // For Multiple

                // instance.updateNode(id, () => ({
                //   type: "delay",
                //   data: { delay: 100 },
                // }));

                const parent = getIncomers(
                  { id },
                  instance.getNodes(),
                  instance.getEdges()
                )[0];

                if (parent.type !== "delay") {
                  instance.updateNode(id, () => ({
                    type: "delay",
                    data: {
                      delay: 180,
                    },
                  }));

                  // instance.addEdges([
                  //   {
                  //     id: ["e", id, id + "c"].join(""),
                  //     source: id,
                  //     target: id + "c",
                  //   },
                  // ]);
                } else {
                  instance.deleteElements({ nodes: [{ id }] });
                  const { edgeId } = instance.getNodeConnections({
                    type: "source",
                    nodeId: parent.id,
                  })[0];

                  // instance.addEdges(edgeId, () => ({
                  //   target: id + "c",
                  // }));

                  console.log("ewfewf", instance.getEdge(edgeId));
                  instance.addEdges([
                    {
                      id: ["e", parent.id, id + "c"].join(""),
                      source: parent.id,
                      target: id + "c",
                      label: instance.getEdge(edgeId).label,
                      data: instance.getEdge(edgeId).data,
                    },
                  ]);
                }

                let nod = null;
                if (
                  conf.sequence[actionId].outcomes?.find(({type}) => type === "positive").actionsAllowed &&
                  conf.sequence[actionId].outcomes?.find(({type}) => type === "positive").actionsAllowed.length ===
                  0
                ) {
                  nod = {
                    id: id + "cl",
                    type: "end",
                    position: node.position,
                    data: {
                      allowDeletion: false,
                    },
                  };
                } else {
                  nod = {
                    id: id + "cl",
                    type: "add-end",
                    position: node.position,
                    data: {
                      delay: 200,
                    },
                  };
                }

                instance.addNodes([
                  {
                    id: id + "c",
                    position: node.position,
                    data: {
                      icon: iconMap[conf.sequence[actionId].icon],
                      label: conf.sequence[actionId].label,
                      type:
                        conf.sequence[actionId].outcomeType ??
                        conf.sequence[actionId].type,
                      actionType: actionId,
                    },
                    type: "action",
                  },
                  nod,
                  {
                    id: id + "cr",
                    type: "delay",
                    position: node.position,
                    data: {
                      delay: 180,
                    },
                  },
                  {
                    id: id + "crc",
                    type: "add-end",
                    position: node.position,
                    data: {},
                  },
                ]);

                focusOnNodes([id + "cr", id + "cl", id + "crc"], 0.6);

                instance.addEdges([
                  {
                    id: ["e", id, id + "c"].join(""),
                    source: id,
                    target: id + "c",
                  },
                  {
                    id: ["e", id + "c", id + "cl"].join(""),
                    source: id + "c",
                    target: id + "cl",
                    label: conf.sequence[actionId].outcomes.find(({type}) => type === "positive").label,
                    data: {
                      outcome: "positive",
                      canHaveActions:
                        conf.sequence[actionId].outcomes.find(({type}) => type === "positive")?.actionsAllowed &&
                        conf.sequence[actionId].outcomes.find(({type}) => type === "positive")?.actionsAllowed
                          .length > 0,
                    },
                  },
                  {
                    id: ["e", id + "c", id + "cr"].join(""),
                    source: id + "c",
                    target: id + "cr",
                  },
                  {
                    id: ["e", id + "cr", id + "crc"].join(""),
                    source: id + "cr",
                    target: id + "crc",
                    label: conf.sequence[actionId].outcomes.find(({type}) => type === "negative").label,
                    data: {
                      outcome: "negative",
                    },
                  },
                ]);
              } else {
                const parent = getIncomers(
                  { id },
                  instance.getNodes(),
                  instance.getEdges()
                )[0];

                console.log({ parent }, "aweogjge");

                if (parent.type !== "delay") {
                  console.log("change node to delay", "aweogj");
                  instance.updateNode(id, () => ({
                    type: "delay",
                    data: {
                      delay: 180,
                    },
                  }));

                  instance.addEdges([
                    {
                      id: ["e", id, id + "c"].join(""),
                      source: id,
                      target: id + "c",
                    },
                  ]);
                } else {
                  instance.deleteElements({ nodes: [{ id }] });
                  const { edgeId } = instance.getNodeConnections({
                    type: "source",
                    nodeId: parent.id,
                  })[0];

                  // instance.addEdges(edgeId, () => ({
                  //   target: id + "c",
                  // }));

                  console.log("ewfewf", instance.getEdge(edgeId));
                  instance.addEdges([
                    {
                      id: ["e", parent.id, id + "c"].join(""),
                      source: parent.id,
                      target: id + "c",
                      label: instance.getEdge(edgeId).label,
                      data: instance.getEdge(edgeId).data,
                    },
                  ]);
                }

                const nod = {
                  id: id + "c",
                  data: {
                    icon: iconMap[conf.sequence[actionId].icon],
                    label: conf.sequence[actionId].label,
                    type:
                      conf.sequence[actionId].outcomeType ??
                      conf.sequence[actionId].type,
                    actionType: actionId,
                  },
                  position: node.position,
                  type: "action",
                };

                instance.updateNode(id, () => ({}));

                instance.addNodes([
                  nod,
                  {
                    id: id + "cl",
                    type: "add-end",
                    position: node.position,
                    data: {
                      delay: 200,
                    },
                  },
                  {
                    id: id + "cr",
                    type: "add-end",
                    position: node.position,
                    data: {
                      delay: 200,
                    },
                  },
                ]);

                focusOnNodes([id + "c", id + "cl", id + "cr"]);

                instance.addEdges([
                  {
                    id: ["e", id + "c", id + "cl"].join(""),
                    source: id + "c",
                    target: id + "cl",
                    label: "Yes",
                   
                    data: {
                      outcome: "positive",
                    },
                  },
                  {
                    id: ["e", id + "c", id + "cr"].join(""),
                    source: id + "c",
                    target: id + "cr",
                    label: "No",
                   
                    data: {
                      outcome: "negative",
                    },
                  },
                ]);
              }
            }}
            actions={finalActionItems}
          >
            <Button
              size="sm"
              variant="outline"
              className="text-primary hover:text-primary flex-1 border-slate-300  hover:bg-primary/10 text-xs font-medium h-8 px-3 gap-1.5 rounded bg-transparent rounded-r-none border-r-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Action
            </Button>
          </ActionMenu>
          <Button
            onClick={() => {
              instance.updateNode(id, () => ({
                type: "end",
                data: {
                  allowDeletion: true,
                },
              }));
              setTimeout(() => {
                const nodes = arrange(instance.getNodes(), instance.getEdges(), "root")
                instance.setNodes(nodes)
              }, 0)
            }}
            variant="outline"
            size="sm"
            className="flex-1   border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium h-8 px-3 gap-1.5 rounded bg-transparent rounded-l-none border-l-0"
          >
            <StopCircle className="w-3.5 h-3.5" />
            End
          </Button>
        </div>
      </div>
    </div>
  );
}

export function getCommonByKey(arr1, arr2, key = "id") {
  const values = new Set(arr2.map((item) => item[key]));
  return arr1.filter((item) => values.has(item[key]));
}
