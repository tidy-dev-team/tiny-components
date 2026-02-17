import type {
  ExtractedContent,
  ComponentMapping,
  PropertyMappingRule,
  SourceExtractor,
} from "../types";

/**
 * Applies extracted content to a DS component instance using property mappings.
 */
const TAG_COMPONENT_KEY = "940898c8325eb5e3737f8a76a8a57d03f7d7f243";

export async function applyProperties(
  instance: InstanceNode,
  content: ExtractedContent,
  mapping: ComponentMapping
): Promise<void> {
  const properties: Record<string, string | boolean> = {};
  const instanceSwaps: Array<{ target: string; componentKey: string }> = [];

  for (const rule of mapping.properties) {
    const value = extractValue(content, rule.source);

    if (value === null) {
      // No value extracted - leave default (don't apply)
      continue;
    }

    // Instance swaps need special handling
    if (
      rule.source.type === "leftIconInstance" ||
      rule.source.type === "rightIconInstance"
    ) {
      if (typeof value === "string") {
        instanceSwaps.push({ target: rule.target, componentKey: value });
      }
      continue;
    }

    // Text and boolean properties can be set directly
    properties[rule.target] = value;
  }

  maybeApplyTagTextProperty(instance, content, mapping, properties);

  // Apply text and boolean properties
  if (Object.keys(properties).length > 0) {
    try {
      instance.setProperties(properties);
    } catch (error) {
      console.error("Failed to set properties:", error);
      console.error("Properties attempted:", properties);
    }
  }

  // Apply instance swaps
  for (const swap of instanceSwaps) {
    await applyInstanceSwap(instance, swap.target, swap.componentKey);
  }
}

function maybeApplyTagTextProperty(
  instance: InstanceNode,
  content: ExtractedContent,
  mapping: ComponentMapping,
  properties: Record<string, string | boolean>
): void {
  if (mapping.componentKey !== TAG_COMPONENT_KEY) {
    return;
  }

  if (content.text === null) {
    return;
  }

  const target = findAvailableTextProperty(instance, properties);
  if (target) {
    properties[target] = content.text;
  }
}

function findAvailableTextProperty(
  instance: InstanceNode,
  properties: Record<string, string | boolean>
): string | null {
  const componentProperties = instance.componentProperties;
  if (!componentProperties) {
    return null;
  }

  const existing = new Set(Object.keys(properties));
  const textProps = Object.entries(componentProperties).filter(
    ([name, prop]) => !existing.has(name) && prop.type === "TEXT"
  );

  if (textProps.length === 0) {
    return null;
  }

  if (textProps.length === 1) {
    return textProps[0][0];
  }

  const preferred = textProps.find(([name]) => /text|label/i.test(name));
  return preferred ? preferred[0] : null;
}

/**
 * Extracts a value from the content based on the source extractor type.
 */
function extractValue(
  content: ExtractedContent,
  source: SourceExtractor
): string | boolean | null {
  switch (source.type) {
    case "text":
      return content.text;

    case "hasLeftIcon":
      return content.hasLeftIcon;

    case "hasRightIcon":
      return content.hasRightIcon;

    case "leftIconInstance":
      return content.leftIconKey;

    case "rightIconInstance":
      return content.rightIconKey;

    case "static":
      return source.value;

    default:
      return null;
  }
}

/**
 * Applies an instance swap to a nested instance within the component.
 * The target property name is used to find the nested instance.
 */
async function applyInstanceSwap(
  instance: InstanceNode,
  targetPropertyName: string,
  componentKey: string
): Promise<void> {
  try {
    // Import the component to swap in
    const newComponent = await figma.importComponentByKeyAsync(componentKey);

    // Find the nested instance that corresponds to this property
    // The property name format is like "🔁 icon L#102:0"
    // We need to find the instance that this property controls

    // Try to set via componentProperties (for exposed instances)
    const componentProperties = instance.componentProperties;

    if (componentProperties && targetPropertyName in componentProperties) {
      const prop = componentProperties[targetPropertyName];
      if (prop.type === "INSTANCE_SWAP") {
        // Use setProperties with the component's node ID
        instance.setProperties({
          [targetPropertyName]: newComponent.id,
        });
        return;
      }
    }

    // Fallback: try to find the nested instance by traversing children
    // and matching by name pattern extracted from the property name
    const instanceNameHint = extractNameHint(targetPropertyName);
    if (instanceNameHint) {
      const nestedInstance = findNestedInstanceByName(
        instance,
        instanceNameHint
      );
      if (nestedInstance) {
        nestedInstance.swapComponent(newComponent);
      }
    }
  } catch (error) {
    console.error(
      `Failed to apply instance swap for ${targetPropertyName}:`,
      error
    );
  }
}

/**
 * Extracts a name hint from a property name like "🔁 icon L#102:0" -> "icon L"
 */
function extractNameHint(propertyName: string): string | null {
  // Remove emoji prefix
  let cleaned = propertyName.replace(/^[^\w\s]+\s*/, "");
  // Remove the #id:id suffix
  cleaned = cleaned.replace(/#[\d:]+$/, "").trim();
  return cleaned || null;
}

/**
 * Finds a nested instance by name pattern (case-insensitive partial match).
 */
function findNestedInstanceByName(
  parent: SceneNode,
  namePattern: string
): InstanceNode | null {
  const lowerPattern = namePattern.toLowerCase();

  if ("children" in parent) {
    for (const child of parent.children) {
      if (child.type === "INSTANCE") {
        const childName = child.name.toLowerCase();
        if (childName.includes(lowerPattern)) {
          return child;
        }
      }

      // Recurse into child containers
      if ("children" in child) {
        const found = findNestedInstanceByName(child, namePattern);
        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}
