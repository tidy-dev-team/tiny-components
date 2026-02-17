// Component data wrapper - imports from JSON files
import componentDataJson from "./newComponentData.json";
import propertyMappingsJson from "./propertyMappings.json";
import type {
  ComponentDataFile,
  ComponentDefinition,
  ComponentMapping,
  PropertyMappingsFile,
  FrameMatcher,
} from "./types";

// Type assertions for JSON imports
export const componentData = componentDataJson as ComponentDataFile;
export const propertyMappings = propertyMappingsJson as PropertyMappingsFile;

// Build lookup by component key for fast access
export const componentsByKey = new Map<string, ComponentDefinition>(
  componentData.components.map((c) => [c.key, c])
);

// Build lookup by component name (lowercase for case-insensitive matching)
export const componentsByName = new Map<string, ComponentDefinition>(
  componentData.components.map((c) => [c.name.toLowerCase(), c])
);

// Get all mappings as an array for iteration
export function getAllMappings(): Array<{
  id: string;
  mapping: ComponentMapping;
}> {
  return Object.entries(propertyMappings.mappings).map(([id, mapping]) => ({
    id,
    mapping,
  }));
}

// Find mapping that matches a given frame name
export function findMappingForFrame(
  frameName: string
): { id: string; mapping: ComponentMapping } | null {
  const normalizedName = frameName.toLowerCase().trim();

  for (const [id, mapping] of Object.entries(propertyMappings.mappings)) {
    if (matchesFrame(normalizedName, mapping.frameMatcher)) {
      return { id, mapping };
    }
  }

  return null;
}

/**
 * Strips all hyphens, underscores, and spaces from a string.
 * e.g. "Card-Insurance-Coverage" → "cardinsurancecoverage"
 */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[-_\s]+/g, "");
}

// Check if a frame name matches a matcher
function matchesFrame(normalizedName: string, matcher: FrameMatcher): boolean {
  const matchValue = matcher.value.toLowerCase();

  switch (matcher.type) {
    case "nameContains":
      return normalizedName.includes(matchValue);
    case "nameEquals":
      return normalizedName === matchValue;
    case "nameStartsWith":
      return normalizedName.startsWith(matchValue);
    case "nameFuzzy":
      return normalize(normalizedName) === normalize(matchValue);
    default:
      return false;
  }
}

// Get component definition by key
export function getComponentByKey(
  key: string
): ComponentDefinition | undefined {
  return componentsByKey.get(key);
}

// Get component definition by name
export function getComponentByName(
  name: string
): ComponentDefinition | undefined {
  return componentsByName.get(name.toLowerCase());
}

// Get all component names
export function getAllComponentNames(): string[] {
  return componentData.components.map((c) => c.name);
}

// Get mapping by ID (for manual mapping lookups)
export function getMappingById(
  mappingId: string
): ComponentMapping | undefined {
  return propertyMappings.mappings[mappingId];
}

// Get all mapping IDs for dropdown
export function getAllMappingIds(): string[] {
  return Object.keys(propertyMappings.mappings);
}
