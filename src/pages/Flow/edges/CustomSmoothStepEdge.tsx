import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { useMemo } from "react";
import { Check, X } from "lucide-react";

export default function CustomSmoothStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  labelStyle,
  labelBgStyle,
  labelBgBorderRadius,
  labelBgPadding,
  data,
  markerEnd,
}: EdgeProps) {
  // Calculate label position - for positive edges, position just above target node
  const isPositive = data?.outcome === "positive";

  // Use getSmoothStepPath with borderRadius for smooth curves
  // Note: We can't directly control bend position with this function,
  // but we can use borderRadius to make the curves smoother
  const [edgePath, defaultLabelX, defaultLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4, // Smoothness of the curve corners
    stepPosition: 0,
    offset: 35,
  });

  // Calculate position: for positive edges, place label just above target node
  const labelPosition = useMemo(() => {
    // if (!isPositive) {
    // return { x: defaultLabelX, y: defaultLabelY };
    // }

    // Position label just above the target node (wait node)
    // Use targetX for horizontal position and targetY - offset for vertical position
    const verticalOffset = 50; // Distance above target node in pixels
    return { x: targetX - 7, y: targetY - verticalOffset };
  }, [isPositive, defaultLabelX, defaultLabelY, targetX, targetY]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
            }}
            className="nodrag nopan absolute pointer-events-all"
          >
            {labelBgStyle && (
              <div
                className={`${isPositive ? "bg-white" : "bg-white"} inline-block ${isPositive ? "min-h-0 leading-6" : "min-h-auto leading-normal"}`}
                style={{
                  ...labelBgStyle,
                  padding: labelBgPadding
                    ? isPositive
                      ? `1px 10px` // Increase vertical padding for positive edges
                      : `${labelBgPadding[0]}px ${labelBgPadding[1]}px`
                    : isPositive
                      ? "0px" // Increased vertical padding for positive edges
                      : "0px",
                  borderRadius: labelBgBorderRadius || 4,
                }}
              >
                <div
                  className="flex items-center gap-1.5 whitespace-nowrap font-medium "
                  style={labelStyle}
                >
                  {isPositive ? (
                    <Check
                      size={16}
                      className="shrink-0 text-green-500"
                    />
                  ) : (
                    <div className="shrink-0 text-red-500">
                      <X size={16} />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-600">
                    {label}
                  </span>
                </div>
              </div>
            )}
            {!labelBgStyle && (
              <div
                className="flex items-center gap-1.5"
                style={labelStyle}
              >
                {isPositive && (
                  <Check
                    size={16}
                    className="shrink-0"
                  />
                )}
                {label}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

