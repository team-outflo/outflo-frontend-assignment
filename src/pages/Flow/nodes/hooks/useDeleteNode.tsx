import {
  Edge,
  Node,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  useReactFlow
} from "@xyflow/react";
import { createAddEndNode } from "../factories/createAddEndNode";
import { createAddNode } from "../factories/createAddNode";

export const deleteNode = (nodeId, nodes: Node[], edges: Edge[]) => {
  return {
    nodes: nodes.filter(({ id }) => id !== nodeId),
    edges: edges.filter(({ source }) => source !== nodeId),
  };
};

export function deleteSubtree(rootId, nodes, edges) {
  // Step 1: BFS/DFS to collect all descendant node IDs
  const toDelete = new Set([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();

    // All edges where current is the parent/source
    const childrenEdges = edges.filter((e) => e.source === current);

    // Each edge target is a child node
    for (const edge of childrenEdges) {
      if (!toDelete.has(edge.target)) {
        toDelete.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  // Step 2: filter nodes and edges
  const remainingNodes = nodes.filter((n) => !toDelete.has(n.id));

  const remainingEdges = edges.filter(
    (e) => !toDelete.has(e.source) && !toDelete.has(e.target)
  );

  // Step 3: Apply updates in one batch -> no dangling edges
  return {
    nodes: remainingNodes,
    edges: remainingEdges,
  };
}

export default function useDeleteNode() {
  const { getNodes, getEdges, getNode } =
    useReactFlow();

  return (deleteNodeId: string) => {
    let nodes = getNodes();
    let edges = getEdges();

    const deletions = []

    const nodesToShow = [];

    const getParent = (id) => getIncomers({ id }, nodes, edges)[0];
    const getChildren = (id) => getOutgoers({ id }, nodes, edges);

    const nodeToDelete = getNode(deleteNodeId);
    const parent = getParent(deleteNodeId);
    const grandParent = parent ? getParent(parent.id) : null;

    const children = getChildren(deleteNodeId);

    let targetParent = parent;
    ({ nodes, edges } = deleteNode(deleteNodeId, nodes, edges));

    if (parent && parent.type === "delay") {
      // do not delete delay if its edge has a label
      const edge = edges.find(({ source }) => source === parent.id);
      nodesToShow.push(parent.id)

      if (!edge.label) {
        ({ nodes, edges } = deleteNode(parent.id, nodes, edges));
        targetParent = grandParent; // should attach to grandparent
      }
    }

    if (children.length === 1) {
      const child = children[0];
      nodesToShow.push(child.id);

      ({ nodes, edges } = handleSingleChildCase(
        { nodeToDelete, child, children, parent, grandParent, targetParent },
        nodes,
        edges,
        deleteNode,
        deleteSubtree,
        getChildren,
        createAddNode,
        createAddEndNode
      ));
    } else if (
      children.length === 2 &&
      nodeToDelete.data.type === "conditional"
    ) {
      const [leftChild, rightChild] = children;

      if (leftChild.type === "add-end" && rightChild.type === "add-end") {
        if (grandParent && targetParent.id === grandParent.id) {
          const edgeAt = edges.findIndex(({ target }) => parent.id === target);
          edges[edgeAt].target = leftChild.id;
          const childAt = nodes.findIndex(({ id }) => id === leftChild.id);
          nodes[childAt].position = parent.position;
          nodesToShow.push(leftChild.id);
          ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));
          // TODO Delete right child
        } else if (targetParent.id === parent.id && parent.id !== "root") {
          const edgeAt = edges.findIndex(
            ({ target }) => nodeToDelete.id === target
          );
          edges[edgeAt].target = leftChild.id;
          const childAt = nodes.findIndex(({ id }) => id === leftChild.id);
          nodes[childAt].position = nodeToDelete.position;
          nodesToShow.push(leftChild.id);
          ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));
        } else if (targetParent.id === parent.id && parent.id === "root") {
          ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));

          const edgeAt = edges.findIndex(({ source }) => source === "root");
          const node = createAddNode(nodeToDelete.position, true);
          nodes.push(node);
          nodesToShow.push(node.id);
          edges[edgeAt].target = node.id;
        }
      } else if (leftChild.type === "end" && rightChild.type === "end") {
        ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
        ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));

        if (grandParent && targetParent.id === grandParent.id) {
          const edgeAt = edges.findIndex(({ target }) => parent.id === target);
          const nodeToAdd = createAddEndNode(parent.position, true);
          nodes.push(nodeToAdd);
          nodesToShow.push(nodeToAdd.id);
          edges[edgeAt].target = nodeToAdd.id;
        } else if (targetParent.id === parent.id && parent.id !== "root") {
          const edgeAt = edges.findIndex(
            ({ target }) => nodeToDelete.id === target
          );
          const nodeToAdd = createAddEndNode(nodeToDelete.position, true);
          nodes.push(nodeToAdd);
          nodesToShow.push(nodeToAdd.id);
          edges[edgeAt].target = nodeToAdd.id;
        } else if (targetParent.id === parent.id && parent.id === "root") {
          const edgeAt = edges.findIndex(({ source }) => source === "root");
          const node = createAddNode(nodeToDelete.position, true);
          nodes.push(node);
          nodesToShow.push(node.id);
          edges[edgeAt].target = node.id;
        }
      } else if (
        ["add-end", "end"].includes(leftChild.type) &&
        ["add-end", "end"].includes(rightChild.type)
      ) {
        if (grandParent && targetParent.id === grandParent.id) {
          const edgeAt = edges.findIndex(({ target }) => parent.id === target);
          const childToAdd =
            leftChild.type === "add-end" ? leftChild : rightChild;
          const childToRemove =
            leftChild.type === "end" ? leftChild : rightChild;

          edges[edgeAt].target = childToAdd.id;
          const childAt = nodes.findIndex(({ id }) => id === childToAdd.id);
          nodes[childAt].position = parent.position;
          nodesToShow.push(childToAdd.id);
          ({ nodes, edges } = deleteNode(childToRemove.id, nodes, edges));
        } else if (targetParent.id === parent.id && parent.id !== "root") {
          const edgeAt = edges.findIndex(
            ({ target }) => nodeToDelete.id === target
          );

          const childToAdd =
            leftChild.type === "add-end" ? leftChild : rightChild;
          const childToRemove =
            leftChild.type === "end" ? leftChild : rightChild;

          edges[edgeAt].target = childToAdd.id;
          const childAt = nodes.findIndex(({ id }) => id === childToAdd.id);
          nodes[childAt].position = parent.position;
          nodesToShow.push(childToAdd.id);
          ({ nodes, edges } = deleteNode(childToRemove.id, nodes, edges));
        } else if (targetParent.id === parent.id && parent.id === "root") {
          ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));

          const edgeAt = edges.findIndex(({ source }) => source === "root");
          const node = createAddNode(nodeToDelete.position, true);
          nodes.push(node);
          nodesToShow.push(node.id);
          edges[edgeAt].target = node.id;
        }
      } else if (leftChild.type === "delay" && rightChild.type === "delay") {
        const childOfLeftChild = getChildren(leftChild.id)[0];
        const childOfRightChild = getChildren(rightChild.id)[0];

        if (
          childOfLeftChild.type === "action" &&
          childOfRightChild.type === "action"
        ) {
          if (grandParent && grandParent.id === targetParent.id) {
            // TODO validate connection

            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );

            edges[edgeAt].target = leftChild.id;

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            if (edges[edgeAt].data?.outcome === "negative") {
              edges[edgeAt].target = childOfLeftChild.id;
              nodesToShow.push(childOfLeftChild.id);
              deletions.push("right-subtree");
              ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
              ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
            } else {
              edges[edgeAt].target = childOfLeftChild.id;
              nodesToShow.push(childOfLeftChild.id);
              deletions.push("right-subtree");
              ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
            }
          } else if (parent.id === targetParent.id && parent.id === "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = childOfLeftChild.id;
            nodesToShow.push(childOfLeftChild.id);

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
            ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          }
        }
      } else if (
        (leftChild.type === "delay" &&
          ["add-end", "end"].includes(rightChild.type)) ||
        (rightChild.type === "delay" &&
          ["add-end", "end"].includes(leftChild.type))
      ) {
        if (grandParent && targetParent.id === grandParent.id) {
          const edgeAt = edges.findIndex(({ target }) => parent.id === target);
          const childToAdd =
            leftChild.type === "delay" ? leftChild : rightChild;
          const childToRemove = ["add-end", "end"].includes(leftChild.type)
            ? leftChild
            : rightChild;

          edges[edgeAt].target = childToAdd.id;
          const childAt = nodes.findIndex(({ id }) => id === childToAdd.id);
          nodes[childAt].position = parent.position;
          nodesToShow.push(childToAdd.id);
          ({ nodes, edges } = deleteNode(childToRemove.id, nodes, edges));
        } else if (targetParent.id === parent.id && parent.id !== "root") {
          const edgeAt = edges.findIndex(
            ({ target }) => nodeToDelete.id === target
          );

          const childToAdd =
            leftChild.type === "delay" ? leftChild : rightChild;
          const childToRemove = ["add-end", "end"].includes(leftChild.type)
            ? leftChild
            : rightChild;

          edges[edgeAt].target = childToAdd.id;
          const childAt = nodes.findIndex(({ id }) => id === childToAdd.id);
          nodes[childAt].position = parent.position;
          nodesToShow.push(childToAdd.id);
          ({ nodes, edges } = deleteNode(childToRemove.id, nodes, edges));
        } else if (targetParent.id === parent.id && parent.id === "root") {
          // ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          // ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));

          const childToAdd =
            leftChild.type === "delay" ? leftChild : rightChild;
          const childToRemove = ["add-end", "end"].includes(leftChild.type)
            ? leftChild
            : rightChild;

          const childOfChild = getChildren(childToAdd.id)[0];

          const edgeAt = edges.findIndex(({ source }) => source === "root");
          edges[edgeAt].target = childOfChild.id;
          nodesToShow.push(childOfChild.id);

          ({ nodes, edges } = deleteNode(childToRemove.id, nodes, edges));
          ({ nodes, edges } = deleteNode(childToAdd.id, nodes, edges));
        }
      }
    } else if (children.length === 2 && nodeToDelete.data.type === "multiple") {
      const [leftChild, rightChild] = children;
      if (
        (["add-end", "end"].includes(leftChild.type) &&
          rightChild.type === "delay") ||
        (leftChild.type === "delay" &&
          ["add-end", "end"].includes(rightChild.type))
      ) {
        //

        const delayNode = leftChild.type === "delay" ? leftChild : rightChild;
        const terminatingNode =
          delayNode.id === leftChild.id ? rightChild : leftChild;

        if (terminatingNode.type === "end") {
          const nodeAt = nodes.findIndex(({ id }) => id === terminatingNode.id);
          nodes[nodeAt].type = "add-end";
        }

        const childOfDelayNode = getChildren(delayNode.id)[0];

        if (["add-end", "end"].includes(childOfDelayNode.type)) {
          // Both child are add end
          // remove delay Ndoe
          // joinn to of

          ({ nodes, edges } = deleteNode(delayNode.id, nodes, edges));
          ({ nodes, edges } = deleteNode(childOfDelayNode.id, nodes, edges));

          if (grandParent && targetParent.id === grandParent.id) {
            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );

            edges[edgeAt].target = terminatingNode.id;
            const childAt = nodes.findIndex(
              ({ id }) => id === terminatingNode.id
            );
            nodesToShow.push(parent.id);
            nodes[childAt].position = parent.position;
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = terminatingNode.id;
            const childAt = nodes.findIndex(
              ({ id }) => id === terminatingNode.id
            );

            nodes[childAt].position = parent.position;
          } else if (parent.id === targetParent.id && parent.id === "root") {
            ({ nodes, edges } = deleteNode(terminatingNode.id, nodes, edges));
            const edgeAt = edges.findIndex(({ source }) => source === "root");
            const node = createAddNode(nodeToDelete.position, true);
            nodes.push(node);
            nodesToShow.push(node.id);
            edges[edgeAt].target = node.id;
          }
        } else {
          ({ nodes, edges } = deleteNode(terminatingNode.id, nodes, edges));

          // TODO: check if valid connection
          if (grandParent && targetParent.id === grandParent.id) {
            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );
            edges[edgeAt].target = delayNode.id;
            const edgeFromDelay = edges.findIndex(
              ({ source }) => source === delayNode.id
            );
            nodesToShow.push(delayNode.id);

            if (edges[edgeFromDelay].data?.outcome) {
              edges[edgeFromDelay].label = undefined;
              delete edges[edgeFromDelay].data.outcome;
            }
          } else if (parent.id === targetParent.id && parent.id === "root") {
            const edgeAt = edges.findIndex(({ source }) => source === "root");
            edges[edgeAt].target = childOfDelayNode.id;
            nodesToShow.push(childOfDelayNode.id);
            ({ nodes, edges } = deleteNode(delayNode.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );
            edges[edgeAt].target = childOfDelayNode.id;
            nodesToShow.push(childOfDelayNode.id);

            ({ nodes, edges } = deleteNode(delayNode.id, nodes, edges));
          }
        }
      } else if (leftChild.type === "delay" && rightChild.type === "delay") {
        const childOfLeftChild = getChildren(leftChild.id)[0];
        const childOfRightChild = getChildren(rightChild.id)[0];

        if (
          childOfLeftChild.type === "action" &&
          childOfRightChild.type === "action"
        ) {
          if (grandParent && grandParent.id === targetParent.id) {
            // TODO validate connection

            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );

            edges[edgeAt].target = leftChild.id;

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            if (edges[edgeAt].data?.outcome === "negative") {
              edges[edgeAt].target = childOfLeftChild.id;

              deletions.push("right-subtree");
              ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
              ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
            } else {
              edges[edgeAt].target = childOfLeftChild.id;

              deletions.push("right-subtree");
              ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
            }
          } else if (parent.id === targetParent.id && parent.id === "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = childOfLeftChild.id;
            nodesToShow.push(childOfLeftChild.id);

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
            ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          }
        } else if (["add-end", "end"].includes(childOfLeftChild.type)) {
          if (grandParent && grandParent.id === targetParent.id) {
            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );

            edges[edgeAt].target = leftChild.id;
            nodesToShow.push(leftChild.id);

            deletions.push("left-subtree");
            ({ nodes, edges } = deleteSubtree(leftChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = rightChild.id;
            nodesToShow.push(leftChild.id);

            deletions.push("left-subtree");
            ({ nodes, edges } = deleteSubtree(leftChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id === "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = childOfRightChild.id;
            nodesToShow.push(childOfRightChild.id);


            deletions.push("left-subtree");
            ({ nodes, edges } = deleteNode(rightChild.id, nodes, edges));
            ({ nodes, edges } = deleteSubtree(leftChild.id, nodes, edges));
          }
        } else if (["add-end", "end"].includes(childOfRightChild.type)) {
          if (grandParent && grandParent.id === targetParent.id) {
            const edgeAt = edges.findIndex(
              ({ target }) => parent.id === target
            );

            edges[edgeAt].target = leftChild.id;
            nodesToShow.push(leftChild.id);

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id !== "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = leftChild.id;
            nodesToShow.push(leftChild.id);

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
          } else if (parent.id === targetParent.id && parent.id === "root") {
            const edgeAt = edges.findIndex(
              ({ target }) => nodeToDelete.id === target
            );

            edges[edgeAt].target = childOfLeftChild.id;
            nodesToShow.push(childOfLeftChild.id);

            deletions.push("right-subtree");
            ({ nodes, edges } = deleteSubtree(rightChild.id, nodes, edges));
            ({ nodes, edges } = deleteNode(leftChild.id, nodes, edges));
          }
        }
      }
    }

    const requiredEdges = getConnectedEdges(nodes, edges);

    return {
      nodes,
      edges: requiredEdges,
      deletions,
    }
  };
}

function handleSingleChildCase(
  params,
  nodes,
  edges,
  deleteNode,
  deleteSubtree,
  getChildren,
  createAddNode,
  createAddEndNode
) {
  const { nodeToDelete, child, parent, grandParent, targetParent } =
    params;

  if (child.type === "add-end") {
    if (grandParent && targetParent.id === grandParent.id) {
      const edgeAt = edges.findIndex(({ target }) => parent.id === target);
      edges[edgeAt].target = child.id;

      const childAt = nodes.findIndex(({ id }) => id === child.id);
      nodes[childAt].position = parent.position;
    } else if (targetParent.id === parent.id && parent.id === "root") {
      ({ nodes, edges } = deleteNode(child.id, nodes, edges));
      const edgeAt = edges.findIndex(({ source }) => source === "root");
      const node = createAddNode(nodeToDelete.position, true);
      nodes.push(node);
      edges[edgeAt].target = node.id;
    } else if (targetParent.id === parent.id && parent.id !== "root") {
      const edgeAt = edges.findIndex(({ source }) => source === parent.id);
      edges[edgeAt].target = child.id;
    }
  } else if (child.type === "end") {
    if (grandParent && targetParent.id === grandParent.id) {
      const node = createAddEndNode(nodeToDelete.position, true);
      nodes.push(node);
      const edgeAt = edges.findIndex(({ target }) => parent.id === target);
      edges[edgeAt].target = node.id;
      ({ nodes, edges } = deleteNode(child.id, nodes, edges));
    } else if (parent.id === targetParent.id && parent.id === "root") {
      const node = createAddNode(nodeToDelete.position, true);
      nodes.push(node);
      const edgeAt = edges.findIndex(({ source }) => source === "root");
      edges[edgeAt].target = node.id;
      ({ nodes, edges } = deleteNode(child.id, nodes, edges));
    } else if (parent.id === targetParent.id && parent.id !== "root") {
      const edgeAt = edges.findIndex(
        ({ target }) => target === nodeToDelete.id
      );
      edges[edgeAt].target = child.id;
      const nodeAt = nodes.findIndex(({ id }) => child.id === id);
      nodes[nodeAt].type = "add-end";
    }
  } else if (child.type === "delay") {
    if (grandParent && targetParent.id === grandParent.id) {
      const edgeAt = edges.findIndex(({ target }) => parent.id === target);
      edges[edgeAt].target = child.id;
    } else if (parent.id === targetParent.id && parent.id === "root") {
      const edgeAt = edges.findIndex(({ source }) => source === "root");
      const edgeFromDelay = edges.find(({ source }) => child.id === source);
      edges[edgeAt].target = edgeFromDelay.target;
      ({ nodes, edges } = deleteNode(child.id, nodes, edges));
    } else if (parent.id === targetParent.id && parent.id !== "root") {
      const edgeAt = edges.findIndex(
        ({ target }) => target === nodeToDelete.id
      );
      const childOfChild = getChildren(child.id)[0];
      edges[edgeAt].target = childOfChild.id;
      ({ nodes, edges } = deleteNode(child.id, nodes, edges));
    }
  }

  return { nodes, edges };
}
