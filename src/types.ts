// ============================================
// Component Data Types (from componentData.json)
// ============================================

export interface ComponentDataFile {
  $schema: string;
  version: string;
  generatedAt: string;
  source: {
    fileKey: string;
    fileName: string;
  };
  components: ComponentDefinition[];
}

export interface ComponentDefinition {
  name: string;
  key: string;
  type: "component" | "componentSet";
  id: string;
  description?: string;
  documentationLinks?: string[];
  path: string[];
  anatomy: AnatomyNode;
  props: PropDefinition[];
  defaultStyles: Record<string, unknown>;
}

export interface AnatomyNode {
  name: string;
  type: "root" | "container" | "text" | "vector" | "slot";
  figmaType?: string;
  children?: AnatomyNode[];
}

export interface PropDefinition {
  name: string;
  type: "enum" | "boolean" | "string" | "slot";
  figmaType: "VARIANT" | "BOOLEAN" | "TEXT" | "INSTANCE_SWAP";
  default?: string | boolean;
  options?: string[];
}

// ============================================
// Property Mappings Types (from propertyMappings.json)
// ============================================

export interface PropertyMappingsFile {
  $schema: string;
  version: string;
  mappings: Record<string, ComponentMapping>;
}

export interface ComponentMapping {
  componentKey: string;
  frameMatcher: FrameMatcher;
  properties: PropertyMappingRule[];
  /** For tab-bar components: key for the individual tab item component */
  tabItemComponentKey?: string;
  /** For tab-bar components: matcher to find the tab list container */
  tabListMatcher?: FrameMatcher;
  /** For tab-bar components: matcher to find individual tab items within the list */
  tabItemMatcher?: FrameMatcher;
}

export interface FrameMatcher {
  type: "nameContains" | "nameEquals" | "nameStartsWith";
  value: string;
}

export interface PropertyMappingRule {
  target: string;
  source: SourceExtractor;
}

export type SourceExtractor =
  | { type: "text" }
  | { type: "hasLeftIcon" }
  | { type: "hasRightIcon" }
  | { type: "leftIconInstance" }
  | { type: "rightIconInstance" }
  | { type: "static"; value: string | boolean };

// ============================================
// Extracted Content (runtime)
// ============================================

export interface ExtractedContent {
  text: string | null;
  hasLeftIcon: boolean;
  hasRightIcon: boolean;
  leftIconKey: string | null;
  rightIconKey: string | null;
  /** For tab-bar components: array of tab item labels extracted from the source */
  tabItems?: ExtractedTabItem[];
}

export interface ExtractedTabItem {
  label: string;
  hasIcon: boolean;
  iconKey: string | null;
}

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

export interface ComponentRegistry {
  [key: string]: ComponentInfo;
}

export interface ComponentInfo {
  key: string;
  name: string;
  type?: string;
}

// ============================================
// Event Types
// ============================================

export const FIND_COMPONENTS_EVENT = "FIND_COMPONENTS" as const;
export const REPLACE_COMPONENTS_EVENT = "REPLACE_COMPONENTS" as const;

export type PluginEvent =
  | typeof FIND_COMPONENTS_EVENT
  | typeof REPLACE_COMPONENTS_EVENT;

export type FindComponentsEventHandler = {
  name: typeof FIND_COMPONENTS_EVENT;
  handler: () => void | Promise<void>;
};

export type ReplaceComponentsEventHandler = {
  name: typeof REPLACE_COMPONENTS_EVENT;
  handler: () => void | Promise<void>;
};
