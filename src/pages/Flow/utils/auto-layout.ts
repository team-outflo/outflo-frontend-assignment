import { Position, Node, Edge } from "@xyflow/react";
import dagre from "dagre";

// /**
//  * Auto-layout React Flow nodes using Dagre with real node sizes and centered single-child alignment
//  * @param {Array} nodes - React Flow nodes
//  * @param {Array} edges - React Flow edges
//  * @param {"TB" | "LR"} direction - Layout direction
//  * @param {Map<string, {width: number, height: number}>} nodeSizes - Measured node dimensions
//  * @returns {{nodes: Array, edges: Array}}
//  */
// export function getLayoutedElements(nodes, edges, direction = "TB", nodeSizes = new Map()) {
//   const dagreGraph = new dagre.graphlib.Graph();
//   dagreGraph.setDefaultEdgeLabel(() => ({}));
//   dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 200, });

//   const isHorizontal = direction === "LR";

//   // Add nodes with real measured sizes
//   nodes.forEach((node) => {
//     const size = nodeSizes.get(node.id) || { width: 180, height: 40 };
//     dagreGraph.setNode(node.id, { width: size.width, height: size.height });
//   });

//   // Add edges
//   edges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   // Compute layout
//   dagre.layout(dagreGraph);

//   // Build adjacency map to check child counts
//   const childMap = new Map();
//   edges.forEach((edge) => {
//     if (!childMap.has(edge.source)) childMap.set(edge.source, []);
//     childMap.get(edge.source).push(edge.target);
//   });

//   // Adjust single-child vertical centering
//   const layoutedNodes = nodes.map((node) => {
//     const { x, y } = dagreGraph.node(node.id);
//     const size = nodeSizes.get(node.id) || { width: 180, height: 40 };

//     const newX = x;
//     const newY = y;

//   //   // If node has exactly one child, vertically center child to parent
//   //   // const children = childMap.get(node.id);
//   //   // if (children?.length === 1) {
//   //   //   const childId = children[0];
//   //   //   const parentNode = dagreGraph.node(node.id);
//   //   //   const childNode = dagreGraph.node(childId);
//   //   //   if (parentNode && childNode) {
//   //   //     if (!isHorizontal) {
//   //   //       // top-bottom layout
//   //   //       console.log(parentNode.width)
//   //   //       const dx = parentNode.width / 2 - childNode.width / 2;
//   //   //       dagreGraph.node(childId).x = parentNode.x + dx/2


//   //   //     } else {
//   //   //       // left-right layout
//   //   //       const dy = parentNode.height / 2 - childNode.height / 2;
//   //   //       // dagreGraph.node(childId).x = parentNode.x + parentNode.width + 60 - dx;
//   //   //     }
//   //   //   }
//   //   // }

//     return {
//       ...node,
//       position: {
//         x: newX - size.width / 2,
//         y: newY - size.height / 2,
//       },
//       targetPosition: Position.Left,
//       sourcePosition: Position.Right
//     };
//   });

//   return { nodes: layoutedNodes, edges };
// }


// export function getLayoutedElements(nodes: Node[], edges: Edge[], nodeSizes = new Map()) {
//   const dagreGraph = new dagre.graphlib.Graph();
//   dagreGraph.setDefaultEdgeLabel(() => ({}));
//   dagreGraph.setGraph({ rankdir: "horizontal", nodesep: 256, ranksep: 64 });


//   nodes.forEach((node) => {
//     dagreGraph.setNode(node.id, nodeSizes.get(node.id) ?? { width: 100, height: 50 });
//   });

//   edges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   const childrenCount = {}
//   const parent = {}

//   edges.forEach((edge) => {
//     parent[edge.target] = edge.source;
//     if (!childrenCount[edge.source]) {
//       childrenCount[edge.source] = 1;
//     } else {
//       childrenCount[edge.source]++;
//     }
//   })


//   dagre.layout(dagreGraph, {});

//   const newNodes = nodes.map((node) => {
//     const nodeWithPosition = dagreGraph.node(node.id);
//     const p = parent[node.id]

//     if (p && childrenCount[p] === 1) {
//       const parentWithPos = dagreGraph.node(p);
//       console.log({
//         "esf": node.id, p: parentWithPos, aa: {
//           x: nodeWithPosition.x + 150 + (parentWithPos.width - nodeWithPosition.width) / 2,
//           y: nodeWithPosition.y - nodeWithPosition.height / 2
//         }
//       })

//       const newNodes = {
//         ...node,
//         position: {
//           x: nodeWithPosition.x - (parentWithPos.width - nodeWithPosition.width) / 2,
//           y: nodeWithPosition.y - nodeWithPosition.height / 2
//         }
//       }
//     }

//     // console.log({nodeWithPosition, parentPos: dagreGraph.node(parentPos[0])
//     // })

//     const newNode = {
//       ...node,
//       targetPosition: Position.Left,
//       sourcePosition: Position.Right,
//       position: {
//         x: nodeWithPosition.x - nodeWithPosition.width / 2,
//         y: nodeWithPosition.y - nodeWithPosition.height / 2,
//       },
//     };

//     return newNode;
//   });

//   return { nodes: newNodes, edges };
// }




export const getLayoutedElements = (nodes: Node[], edges: Edge[], nodeSizes = new Map()) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, nodeSizes[node.id]);
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  console.log({nodes, nodeSizes, nn: dagreGraph.node('root')})

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    console.log({nodeWithPosition, node})
    const { width = 0, height = 0 } = nodeSizes[node.id] ?? {}
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
