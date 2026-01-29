import { on, showUI } from "@create-figma-plugin/utilities";
import { findMappingForFrame, getAllMappings } from "./componentData";
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

    const replacement = await replaceFrameWithComponent(frame, matchResult.mapping);
    if (replacement === null) {
      skipped += 1;
      continue;
    }

    replacements.push(replacement);
  }

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

  // Check if this is a tab-bar mapping
  if (mapping.tabItemComponentKey && mapping.tabListMatcher) {
    return replaceTabBarFrame(frame, mapping);
  }

  // 1. Extract content from the source frame
  const content = extractFrameContent(frame);

  // 2. Import the DS component
  const node = await getComponentNodeByKey(mapping.componentKey);
  if (node === null) {
    return null;
  }

  // 3. Create an instance (use default variant for component sets)
  const component =
    node.type === "COMPONENT_SET" ? node.defaultVariant : node;
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

  // 6. Remove the original frame
  frame.remove();

  return instance;
}

/**
 * Replaces a Tab frame with a tab-bar-outlined component, 
 * dynamically creating tab items to match the source count.
 */
async function replaceTabBarFrame(
  frame: FrameNode,
  mapping: ComponentMapping
): Promise<InstanceNode | null> {
  const parent = frame.parent;
  if (parent === null) {
    return null;
  }

  // 1. Extract tab items from the source frame
  const content = extractFrameContent(frame, mapping);
  const tabItems = content.tabItems ?? [];

  if (tabItems.length === 0) {
    console.error("No tab items found in source frame");
    return null;
  }

  // 2. Import the tab-bar component
  const tabBarNode = await getComponentNodeByKey(mapping.componentKey);
  if (tabBarNode === null) {
    return null;
  }

  // 3. Create the tab-bar instance
  const tabBarComponent =
    tabBarNode.type === "COMPONENT_SET" ? tabBarNode.defaultVariant : tabBarNode;
  if (tabBarComponent === null) {
    console.error("Tab bar component set has no default variant");
    return null;
  }

  const tabBarInstance = tabBarComponent.createInstance();

  // 4. Find existing tab instances inside the tab-bar
  const existingTabInstances: InstanceNode[] = [];
  for (const child of tabBarInstance.children) {
    if (child.type === "INSTANCE") {
      existingTabInstances.push(child);
    }
  }

  if (existingTabInstances.length === 0) {
    console.error("No tab instances found in tab-bar-outlined component");
    return null;
  }

  // Use the first existing tab as template for cloning
  const templateTab = existingTabInstances[0];

  // 5. Apply labels to existing tabs, clone if we need more, hide if we have excess
  const finalTabInstances: InstanceNode[] = [];
  
  for (let i = 0; i < tabItems.length; i++) {
    const tabItem = tabItems[i];
    
    let tabInstance: InstanceNode;
    if (i < existingTabInstances.length) {
      // Reuse existing instance and ensure it's visible
      tabInstance = existingTabInstances[i];
      tabInstance.visible = true;
    } else {
      // Clone the template tab
      tabInstance = templateTab.clone();
      tabBarInstance.appendChild(tabInstance);
    }

    // Apply the label to the tab item
    try {
      tabInstance.setProperties({
        "✏️ tab title#192:69": tabItem.label,
      });
    } catch (error) {
      console.error(`Failed to set tab label for tab ${i}:`, error);
    }

    // Hide icon and count by default
    try {
      tabInstance.setProperties({
        "icon#192:57": false,
        "count#2735:0": false,
      });
    } catch {
      // Properties may not exist on this component
    }

    finalTabInstances.push(tabInstance);
  }

  // 6. Hide excess existing tab instances (can't remove from component instance)
  for (let i = tabItems.length; i < existingTabInstances.length; i++) {
    existingTabInstances[i].visible = false;
  }

  // 7. Position the tab-bar where the frame was
  const insertIndex = parent.children.indexOf(frame);
  parent.insertChild(insertIndex + 1, tabBarInstance);
  applyFrameGeometry(frame, tabBarInstance);

  // 8. Remove the original frame
  frame.remove();

  return tabBarInstance;
}

/**
 * Imports a component by key, caching the result.
 */
async function getComponentNodeByKey(
  key: string
): Promise<ComponentSetNode | ComponentNode | null> {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }

  // Try importing as component set first (e.g., "Buttons" with variants)
  try {
    const componentSet = await figma.importComponentSetByKeyAsync(key);
    componentCache.set(key, componentSet);
    return componentSet;
  } catch {
    // Not a component set, try as regular component
  }

  // Fallback to regular component
  try {
    const component = await figma.importComponentByKeyAsync(key);
    componentCache.set(key, component);
    return component;
  } catch (error) {
    console.error(`Failed to import component with key ${key}`, error);
    return null;
  }
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

  // Copy rotation if any
  if (source.rotation !== 0) {
    target.rotation = source.rotation;
  }
}
