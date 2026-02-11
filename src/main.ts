import { on, showUI } from "@create-figma-plugin/utilities";
import {
  findMappingForFrame,
  getAllMappings,
  getComponentByKey,
} from "./componentData";
import { extractFrameContent } from "./extraction/frameAnalyzer";
import { applyProperties } from "./replacement/propertyApplicator";
import type { ComponentMapping } from "./types";
import {
  FIND_COMPONENTS_EVENT,
  FindComponentsEventHandler,
  REPLACE_COMPONENTS_EVENT,
  ReplaceComponentsEventHandler,
} from "./types";

// Cache for imported components
const componentCache = new Map<string, ComponentSetNode | ComponentNode>();

export default function () {
  showUI({
    height: 280,
    width: 280,
  });

  on<FindComponentsEventHandler>(FIND_COMPONENTS_EVENT, handleFindComponents);
  on<ReplaceComponentsEventHandler>(
    REPLACE_COMPONENTS_EVENT,
    handleReplaceComponents
  );
}

/**
 * Finds all frames that match any component mapping and selects them.
 */
function handleFindComponents() {
  const matchingFrames = findMatchingFrames();

  if (matchingFrames.length === 0) {
    figma.currentPage.selection = [];
    figma.notify("No matching frames found on this page.");
    return;
  }

  figma.currentPage.selection = matchingFrames;
  figma.viewport.scrollAndZoomIntoView(matchingFrames);
  const suffix = matchingFrames.length === 1 ? "frame" : "frames";
  figma.notify(`Selected ${matchingFrames.length} ${suffix}`);
}

/**
 * Replaces all matching frames with their corresponding DS components.
 */
async function handleReplaceComponents() {
  const matchingFrames = findMatchingFrames();

  if (matchingFrames.length === 0) {
    figma.notify("No matching frames found on this page.");
    return;
  }

  const replacements: InstanceNode[] = [];
  let skipped = 0;

  for (const frame of matchingFrames) {
    const matchResult = findMappingForFrame(frame.name);
    if (matchResult === null) {
      skipped += 1;
      continue;
    }

    const replacement = await replaceFrameWithComponent(
      frame,
      matchResult.mapping
    );
    if (replacement === null) {
      console.warn(`Skipped frame "${frame.name}" — component import failed`);
      skipped += 1;
      continue;
    }

    replacements.push(replacement);
  }

  // Update "Container" wrapper frames to use HUG sizing
  updateContainerWrappersToHug(replacements);

  if (replacements.length === 0) {
    figma.notify("No replacements were applied.");
    return;
  }

  figma.currentPage.selection = replacements;
  figma.viewport.scrollAndZoomIntoView(replacements);

  const replacedSuffix = replacements.length === 1 ? "frame" : "frames";
  if (skipped === 0) {
    figma.notify(`Replaced ${replacements.length} ${replacedSuffix}`);
    return;
  }

  const skippedSuffix = skipped === 1 ? "frame" : "frames";
  figma.notify(
    `Replaced ${replacements.length} ${replacedSuffix}, skipped ${skipped} ${skippedSuffix}`
  );
}

/**
 * Finds all FRAME nodes that match any component mapping.
 * Excludes frames that are descendants of other matching frames to avoid
 * processing children that will be removed when their parent is replaced.
 */
function findMatchingFrames(): FrameNode[] {
  const allMatching = figma.currentPage.findAll((node) => {
    if (node.type !== "FRAME") {
      return false;
    }
    const matchResult = findMappingForFrame(node.name);
    return matchResult !== null;
  }) as FrameNode[];

  // Filter out frames that are descendants of other matching frames
  const matchingSet = new Set(allMatching.map((f) => f.id));

  return allMatching.filter((frame) => {
    // Walk up the tree to check if any ancestor is also in the matching set
    let current: BaseNode | null = frame.parent;
    while (current !== null) {
      if ("id" in current && matchingSet.has(current.id)) {
        // This frame is a descendant of another matching frame - exclude it
        return false;
      }
      current = current.parent;
    }
    return true;
  });
}

/**
 * Replaces a frame with a DS component instance, transferring content.
 */
async function replaceFrameWithComponent(
  frame: FrameNode,
  mapping: ComponentMapping
): Promise<InstanceNode | null> {
  const parent = frame.parent;
  if (parent === null) {
    return null;
  }

  // 1. Extract content from the source frame
  const content = extractFrameContent(frame);

  // 2. Import the DS component
  const node = await getComponentNodeByKey(mapping.componentKey);
  if (node === null) {
    return null;
  }

  // 3. Create an instance (use default variant for component sets)
  const component = node.type === "COMPONENT_SET" ? node.defaultVariant : node;
  if (component === null) {
    console.error("Component set has no default variant");
    return null;
  }

  const instance = component.createInstance();

  // 4. Position the instance where the frame was
  const insertIndex = parent.children.indexOf(frame);
  parent.insertChild(insertIndex + 1, instance);
  applyFrameGeometry(frame, instance);

  // 5. Apply extracted content to the instance
  await applyProperties(instance, content, mapping);

  // 6. Apply instance sizing overrides if specified
  if (mapping.instanceSizing) {
    try {
      if (mapping.instanceSizing.horizontal) {
        instance.layoutSizingHorizontal = mapping.instanceSizing.horizontal;
      }
      if (mapping.instanceSizing.vertical) {
        instance.layoutSizingVertical = mapping.instanceSizing.vertical;
      }
    } catch {
      // May fail depending on parent layout
    }
  }

  // 7. Remove the original frame
  frame.remove();

  return instance;
}

/**
 * Imports a component by key, caching the result.
 * Falls back to finding the component by ID in the current document.
 */
async function getComponentNodeByKey(
  key: string
): Promise<ComponentSetNode | ComponentNode | null> {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }

  // Try importing as regular component first
  try {
    const component = await figma.importComponentByKeyAsync(key);
    componentCache.set(key, component);
    return component;
  } catch {
    // Not a regular component, try as component set
  }

  // Try importing as component set (e.g., components with variants)
  try {
    const componentSet = await figma.importComponentSetByKeyAsync(key);
    componentCache.set(key, componentSet);
    return componentSet;
  } catch {
    // Import by key failed
  }

  // Fallback: find component by its Figma node ID from our component data
  const componentDef = getComponentByKey(key);
  if (componentDef) {
    try {
      const node = figma.getNodeById(componentDef.id);
      if (
        node &&
        (node.type === "COMPONENT" || node.type === "COMPONENT_SET")
      ) {
        componentCache.set(key, node as ComponentNode | ComponentSetNode);
        return node as ComponentNode | ComponentSetNode;
      }
    } catch {
      // Node not found in current document
    }
    figma.notify(
      `⚠️ Could not import "${componentDef.name}" — key may be invalid`,
      { error: true }
    );
  } else {
    figma.notify(`⚠️ Could not import component with key ${key}`, {
      error: true,
    });
  }

  return null;
}

/**
 * Copies geometry/layout properties from source frame to target instance.
 */
function applyFrameGeometry(source: FrameNode, target: InstanceNode) {
  target.x = source.x;
  target.y = source.y;
  target.locked = source.locked;
  target.visible = source.visible;

  // Copy layout constraints if in auto-layout parent
  try {
    target.constraints = { ...source.constraints };
    target.layoutAlign = source.layoutAlign;
    target.layoutGrow = source.layoutGrow;
  } catch {
    // Some properties may not be settable depending on parent
  }
}

/**
 * Finds parent frames named "Container" that directly wrap replaced instances
 * and sets their horizontal and vertical sizing to HUG.
 */
function updateContainerWrappersToHug(instances: InstanceNode[]) {
  const processed = new Set<string>();

  for (const instance of instances) {
    // Walk up the entire ancestor chain from each replaced instance
    let current: BaseNode | null = instance.parent;
    while (current !== null) {
      if (current.type !== "FRAME") {
        current = current.parent;
        continue;
      }

      if (processed.has(current.id)) {
        current = current.parent;
        continue;
      }

      const name = current.name.toLowerCase();
      if (name !== "container" && name !== "main content") {
        current = current.parent;
        continue;
      }

      // Set sizing to HUG on both axes, enabling auto-layout if needed
      try {
        if (current.layoutMode === "NONE") {
          current.layoutMode = "VERTICAL";
        }
        if (current.itemSpacing === 0) {
          current.itemSpacing = 16;
        }
        current.layoutSizingHorizontal = "HUG";
        current.layoutSizingVertical = "HUG";

        // Reset children's layout properties that conflict with HUG parent
        for (const child of current.children) {
          if ("layoutAlign" in child) {
            child.layoutAlign = "INHERIT";
          }
          if ("layoutGrow" in child) {
            child.layoutGrow = 0;
          }
        }
      } catch {
        // May fail if the frame doesn't support these properties
      }

      processed.add(current.id);
      current = current.parent;
    }
  }
}
