import { Button } from "@/components/ui/button";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Plus } from "lucide-react";
import ActionMenu, { iconMap } from "../components/ActionMenu";
import useSequenceConfig from "../queries/use-sequence-config";

export default function AddNode({ id, data: { onAddNode } }) {
  const instance = useReactFlow();

  console.log("instance", instance);

  const {data: conf} = useSequenceConfig();

  const actionItems = conf.sequence.initial.actionsAllowed.map((action) => {
    const ac = conf.sequence[action];
    return {
      id: action,
      label: ac.label,
      icon: ac.icon,
      type: ac.type,
    };
  });

  const edges = instance.getEdges();

  // const focusOnNodes = useCallback(
  //   (nodeIds: string[]) => {
  //     const parentIds: string[] = [];
  //     const grandparentIds: string[] = [];

  //     nodeIds.forEach((nodeId) => {
  //       const parentEdges = edges.filter((e) => e.target === nodeId);
  //       const parents = parentEdges.map((e) => e.source);
  //       parentIds.push(...parents);

  //       parents.forEach((parentId) => {
  //         const grandparentEdges = edges.filter((e) => e.target === parentId);
  //         grandparentIds.push(...grandparentEdges.map((e) => e.source));
  //       });
  //     });

  //     const allNodesToShow = [
  //       ...new Set([...nodeIds, ...parentIds, ...grandparentIds]),
  //     ];

  //     // setTimeout(() => {
  //     //   instance.fitView({
  //     //     padding: 0.5,
  //     //     duration: 800,
  //     //     nodes:
  //     //       allNodesToShow.length > 0
  //     //         ? allNodesToShow.map((id) => ({ id }))
  //     //         : undefined,
  //     //   });
  //     // }, 50);
  //   },
  //   [instance, edges]
  // );

  return (
    <div key={id}>
      <Handle
        type="target"
        position={Position.Top}
        className="invisible w-1 h-1 bg-slate-400 border-1 border-white"
      />
      <ActionMenu
        onSelectAction={(actionId) => {
          const node = instance.getNode(id);

          if (conf.sequence[actionId].outcomeType === "single") {
            /// For single
            instance.updateNode(id, () => ({
              data: {
                type:
                  conf.sequence[actionId].outcomeType ??
                  conf.sequence[actionId].type,
                actionType: actionId,
              },
              type: "action",
            }));
            instance.addNodes([
              {
                id: id + "c",
                position: node.position,
                data: {},
                type: "add-end",
                selected: false,
              },
            ]);
            // Deselect all nodes after adding
            setTimeout(() => {
              const allNodes = instance.getNodes();
              instance.setNodes(allNodes.map(n => ({ ...n, selected: false })));
            }, 0);
            instance.addEdges([
              {
                id: ["e", id, id + "c"].join(""),
                source: id,
                target: id + "c",
              },
            ]);

            console.log("wegwe", instance.getNodes());

            return;
          } else if (conf.sequence[actionId].outcomeType === "multiple") {
            // For Multiple

            instance.updateNode(id, () => ({
              data: {
                type:
                  conf.sequence[actionId].outcomeType ??
                  conf.sequence[actionId].type,
                actionType: actionId,
              },
              type: "action",
            }));

            if (
              conf.sequence[actionId].outcomes.find(({type}) => type === "positive").actionsAllowed &&
              conf.sequence[actionId].outcomes.find(({type}) => type === "positive").actionsAllowed.length === 0
            ) {
            instance.addNodes([
              {
                id: id + "l",
                type: "end",
                position: node.position,
                data: {
                  allowDeletion: false,
                },
                selected: false,
              },
            ]);
            } else {
              instance.addNodes([
                {
                  id: id + "l",
                  type: "add-end",
                  position: node.position,
                  data: {
                    delay: 180,
                  },
                  selected: false,
                },
              ]);
            }

            instance.addNodes([
              {
                id: id + "r",
                type: "delay",
                position: node.position,
                data: {
                  delay: 180,
                },
                selected: false,
              },
              {
                id: id + "rc",
                type: "add-end",
                position: node.position,
                data: {},
                selected: false,
              },
            ]);
            // Deselect all nodes after adding
            setTimeout(() => {
              const allNodes = instance.getNodes();
              instance.setNodes(allNodes.map(n => ({ ...n, selected: false })));
            }, 0);

            instance.addEdges([
              {
                id: ["e", id, id + "l"].join(""),
                source: id,
                target: id + "l",
                label: conf.sequence[actionId].outcomes.find(({type}) => type === "positive").label,
                data: {
                  outcome: "positive",
                  canHaveActions:
                    conf.sequence[actionId].outcomes.find(({type}) => type === "positive")?.actionsAllowed &&
                    conf.sequence[actionId].outcomes.find(({type}) => type === "positive")?.actionsAllowed.length >
                      0,
                },
              },
              {
                id: ["e", id, id + "r"].join(""),
                source: id,
                target: id + "r",
              },
              {
                id: ["e", id + "r", id + "rc"].join(""),
                source: id + "r",
                target: id + "rc",
                label: conf.sequence[actionId].outcomes.find(({type}) => type === "negative").label,
                data: {
                  outcome: "negative",
                },
              },
            ]);
          } else {
            instance.updateNode(id, () => ({
              data: {
                type:
                  conf.sequence[actionId].outcomeType ??
                  conf.sequence[actionId].type,
                actionType: actionId,
              },
              type: "action",
            }));

            instance.addNodes([
              {
                id: id + "l",
                type: "add-end",
                position: node.position,
                data: {
                  delay: 180,
                },
                selected: false,
              },
              {
                id: id + "r",
                type: "add-end",
                position: node.position,
                data: {
                  delay: 180,
                },
                selected: false,
              },
            ]);
            // Deselect all nodes after adding
            setTimeout(() => {
              const allNodes = instance.getNodes();
              instance.setNodes(allNodes.map(n => ({ ...n, selected: false })));
            }, 0);

            instance.addEdges([
              {
                id: ["e", id, id + "l"].join(""),
                source: id,
                target: id + "l",
                label: "Yes",
                
                 labelBgStyle: {
                      fill: "#62ff62",
                      stroke: "white"
                    },
                    labelStyle: {
                      fill: "#007400",
                      fontWeight: 800,
                    },
                    labelBgBorderRadius: 10,
                    labelBgPadding: [6, 4],
                data: {
                  outcome: "positive",
                },
              },
              {
                id: ["e", id, id + "r"].join(""),
                source: id,
                target: id + "r",
                label: "No",
                labelBgStyle: {
                      fill: "#ff6262",
                      stroke: "white"
                    },
                    labelStyle: {
                      fill: "#740000",
                      fontWeight: 800,
                    },
                    labelBgBorderRadius: 10,
                    labelBgPadding: [8, 4],
                data: {
                  outcome: "negative",
                },
              },
            ]);
          }
        }}
        actions={actionItems}
      >
        <Button className="flex gap-2">
          <Plus /> Add Action
        </Button>
      </ActionMenu>
    </div>
  );
}
