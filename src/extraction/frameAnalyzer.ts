import type { ExtractedContent } from "../types";

/**
 * Extracts content from a frame for property transfer to a DS component.
 * Identifies text content and icon positions (left/right relative to text).
 */
export function extractFrameContent(frame: FrameNode): ExtractedContent {
  const textNodes = findAllTextNodes(frame);
  const visualNodes = findNonTextVisualNodes(frame);

  // Find primary text (largest font size, or longest if same size)
  const primaryText = findPrimaryText(textNodes);

  // If no text, we can't determine left/right - treat all visuals as potential icons
  if (primaryText === null) {
    const hasIcons = visualNodes.length > 0;
    const firstIcon = visualNodes[0];
    return {
      text: null,
      hasLeftIcon: hasIcons,
      hasRightIcon: false,
      leftIconKey: firstIcon ? getInstanceKey(firstIcon) : null,
      rightIconKey: null,
    };
  }

  // Get text center X position for left/right classification
  const textCenterX = getNodeCenterX(primaryText);

  // Classify visual nodes as left or right icons
  const leftIcons: SceneNode[] = [];
  const rightIcons: SceneNode[] = [];

  for (const node of visualNodes) {
    const nodeCenterX = getNodeCenterX(node);
    if (nodeCenterX < textCenterX) {
      leftIcons.push(node);
    } else {
      rightIcons.push(node);
    }
  }

  // Pick the closest icon to the text on each side
  const leftIcon =
    leftIcons.length > 0 ? findClosestToX(leftIcons, textCenterX) : null;
  const rightIcon =
    rightIcons.length > 0 ? findClosestToX(rightIcons, textCenterX) : null;

  return {
    text: primaryText.characters,
    hasLeftIcon: leftIcon !== null,
    hasRightIcon: rightIcon !== null,
    leftIconKey: leftIcon ? getInstanceKey(leftIcon) : null,
    rightIconKey: rightIcon ? getInstanceKey(rightIcon) : null,
  };
}

/**
 * Recursively finds all TEXT nodes within a frame.
 */
function findAllTextNodes(node: SceneNode): TextNode[] {
  const textNodes: TextNode[] = [];

  if (node.type === "TEXT") {
    textNodes.push(node);
  }

  if ("children" in node) {
    for (const child of node.children) {
      textNodes.push(...findAllTextNodes(child));
    }
  }

  return textNodes;
}

/**
 * Finds visual nodes that are likely icons (not text).
 * Includes: INSTANCE, FRAME, GROUP, VECTOR, RECTANGLE, ELLIPSE, etc.
 */
function findNonTextVisualNodes(node: SceneNode): SceneNode[] {
  const visualNodes: SceneNode[] = [];

  if ("children" in node) {
    for (const child of node.children) {
      if (child.type === "TEXT") {
        continue;
      }

      // Check if this is likely an icon (small-ish, visual element)
      if (isLikelyIcon(child)) {
        visualNodes.push(child);
      } else if ("children" in child) {
        // Recurse into containers that aren't icons themselves
        visualNodes.push(...findNonTextVisualNodes(child));
      }
    }
  }

  return visualNodes;
}

/**
 * Determines if a node is likely an icon based on type and size.
 */
function isLikelyIcon(node: SceneNode): boolean {
  // Instance nodes are very likely icons
  if (node.type === "INSTANCE") {
    return true;
  }

  // Small frames/groups might be icon containers
  if (node.type === "FRAME" || node.type === "GROUP") {
    const maxDimension = Math.max(node.width, node.height);
    // Icons are typically 64px or smaller
    if (maxDimension <= 64) {
      return true;
    }
  }

  // Vector shapes are often icons
  if (
    node.type === "VECTOR" ||
    node.type === "STAR" ||
    node.type === "POLYGON" ||
    node.type === "ELLIPSE" ||
    node.type === "RECTANGLE"
  ) {
    const maxDimension = Math.max(node.width, node.height);
    if (maxDimension <= 64) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the primary text node (largest font, or longest text if same font).
 */
function findPrimaryText(textNodes: TextNode[]): TextNode | null {
  if (textNodes.length === 0) {
    return null;
  }

  return textNodes.reduce((best, current) => {
    const bestSize = getTextFontSize(best);
    const currentSize = getTextFontSize(current);

    if (currentSize > bestSize) {
      return current;
    }
    if (
      currentSize === bestSize &&
      current.characters.length > best.characters.length
    ) {
      return current;
    }
    return best;
  });
}

/**
 * Gets the font size of a text node (handles mixed fonts).
 */
function getTextFontSize(textNode: TextNode): number {
  const fontSize = textNode.fontSize;
  if (typeof fontSize === "number") {
    return fontSize;
  }
  // Mixed font sizes - return 0 to deprioritize
  return 0;
}

/**
 * Gets the center X position of a node in absolute coordinates.
 */
function getNodeCenterX(node: SceneNode): number {
  if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    return node.absoluteBoundingBox.x + node.absoluteBoundingBox.width / 2;
  }
  // Fallback to relative position
  return node.x + node.width / 2;
}

/**
 * Finds the node closest to a given X position.
 */
function findClosestToX(nodes: SceneNode[], targetX: number): SceneNode {
  return nodes.reduce((closest, current) => {
    const closestDist = Math.abs(getNodeCenterX(closest) - targetX);
    const currentDist = Math.abs(getNodeCenterX(current) - targetX);
    return currentDist < closestDist ? current : closest;
  });
}

/**
 * Gets the component key if the node is an instance.
 */
function getInstanceKey(node: SceneNode): string | null {
  if (node.type === "INSTANCE" && node.mainComponent) {
    return node.mainComponent.key;
  }
  return null;
}
