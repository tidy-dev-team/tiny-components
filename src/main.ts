import { on, showUI } from "@create-figma-plugin/utilities";
import { componentRegistry } from "./componentData";
import {
  ComponentInfo,
  FIND_COMPONENTS_EVENT,
  FindComponentsEventHandler,
  REPLACE_COMPONENTS_EVENT,
  ReplaceComponentsEventHandler,
} from "./types";

type ComponentMatcher = {
  componentName: string;
  test: (normalizedName: string) => boolean;
};

const componentCache = new Map<string, ComponentNode>();
const componentMatchers: ComponentMatcher[] = [
  {
    componentName: "Buttons",
    test: (name) => name.includes("button"),
  },
];

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

function handleFindComponents() {
  const buttonFrames = findButtonFrames();

  if (buttonFrames.length === 0) {
    figma.currentPage.selection = [];
    figma.notify("No button frames found on this page.");
    return;
  }

  figma.currentPage.selection = buttonFrames;
  figma.viewport.scrollAndZoomIntoView(buttonFrames);
  const suffix = buttonFrames.length === 1 ? "frame" : "frames";
  figma.notify(`Selected ${buttonFrames.length} button ${suffix}`);
}

async function handleReplaceComponents() {
  const buttonFrames = findButtonFrames();

  if (buttonFrames.length === 0) {
    figma.notify("No button frames found on this page.");
    return;
  }

  const replacements: InstanceNode[] = [];
  let skipped = 0;

  for (const frame of buttonFrames) {
    const match = getComponentMatch(frame.name);
    if (match === null) {
      skipped += 1;
      continue;
    }

    const replacement = await replaceFrameWithComponent(frame, match);
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
    figma.notify(`Replaced ${replacements.length} button ${replacedSuffix}`);
    return;
  }

  const skippedSuffix = skipped === 1 ? "frame" : "frames";
  figma.notify(
    `Replaced ${replacements.length} button ${replacedSuffix}, skipped ${skipped} ${skippedSuffix}`
  );
}

function findButtonFrames(): FrameNode[] {
  return figma.currentPage.findAll((node) => isButtonFrame(node)) as FrameNode[];
}

function isButtonFrame(node: SceneNode): node is FrameNode {
  if (node.type !== "FRAME") {
    return false;
  }
  const normalized = normalizeName(node.name);
  return normalized.includes("button");
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getComponentMatch(frameName: string): ComponentInfo | null {
  const normalized = normalizeName(frameName);
  for (const matcher of componentMatchers) {
    if (matcher.test(normalized) === false) {
      continue;
    }
    const componentInfo = componentRegistry[matcher.componentName];
    if (componentInfo !== undefined) {
      return componentInfo;
    }
  }
  return null;
}

async function replaceFrameWithComponent(
  frame: FrameNode,
  componentInfo: ComponentInfo
): Promise<InstanceNode | null> {
  const parent = frame.parent;
  if (parent === null) {
    return null;
  }

  const component = await getComponentNodeByKey(componentInfo.key);
  if (component === null) {
    return null;
  }

  const instance = component.createInstance();
  const insertIndex = parent.children.indexOf(frame);
  parent.insertChild(insertIndex + 1, instance);
  applyFrameGeometry(frame, instance);
  frame.remove();
  return instance;
}

async function getComponentNodeByKey(key: string) {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }
  try {
    const component = await figma.importComponentByKeyAsync(key);
    componentCache.set(key, component);
    return component;
  } catch (error) {
    console.error(`Failed to import component with key ${key}`, error);
    return null;
  }
}

function applyFrameGeometry(source: FrameNode, target: InstanceNode) {
  target.locked = source.locked;
  target.visible = source.visible;
  target.constraints = { ...source.constraints };
  target.layoutAlign = source.layoutAlign;
  target.layoutGrow = source.layoutGrow;
  target.x = source.x;
  target.y = source.y;
  target.rotation = source.rotation;
  target.resizeWithoutConstraints(source.width, source.height);
}
