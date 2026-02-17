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
  instanceSizing?: {
    horizontal?: "HUG" | "FILL" | "FIXED";
    vertical?: "HUG" | "FILL" | "FIXED";
  };
}

export interface FrameMatcher {
  type: "nameContains" | "nameEquals" | "nameStartsWith" | "nameFuzzy";
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
// Selection & Manual Mapping Types
// ============================================

export interface SelectionInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

export interface ManualMapping {
  nodeId: string;
  nodeName: string;
  mappingId: string;
}

// ============================================
// Event Types
// ============================================

export const FIND_COMPONENTS_EVENT = "FIND_COMPONENTS" as const;
export const REPLACE_COMPONENTS_EVENT = "REPLACE_COMPONENTS" as const;
export const GET_SELECTION_EVENT = "GET_SELECTION" as const;
export const MAP_ELEMENT_EVENT = "MAP_ELEMENT" as const;
export const UNMAP_ELEMENT_EVENT = "UNMAP_ELEMENT" as const;
export const GET_MANUAL_MAPPINGS_EVENT = "GET_MANUAL_MAPPINGS" as const;
export const SELECTION_CHANGED_EVENT = "SELECTION_CHANGED" as const;
export const MAPPINGS_UPDATED_EVENT = "MAPPINGS_UPDATED" as const;
export const SELECT_MAPPED_NODE_EVENT = "SELECT_MAPPED_NODE" as const;

export type PluginEvent =
  | typeof FIND_COMPONENTS_EVENT
  | typeof REPLACE_COMPONENTS_EVENT
  | typeof GET_SELECTION_EVENT
  | typeof MAP_ELEMENT_EVENT
  | typeof UNMAP_ELEMENT_EVENT
  | typeof GET_MANUAL_MAPPINGS_EVENT
  | typeof SELECTION_CHANGED_EVENT
  | typeof MAPPINGS_UPDATED_EVENT
  | typeof SELECT_MAPPED_NODE_EVENT;

export type FindComponentsEventHandler = {
  name: typeof FIND_COMPONENTS_EVENT;
  handler: () => void | Promise<void>;
};

export type ReplaceComponentsEventHandler = {
  name: typeof REPLACE_COMPONENTS_EVENT;
  handler: () => void | Promise<void>;
};

export type GetSelectionEventHandler = {
  name: typeof GET_SELECTION_EVENT;
  handler: () => SelectionInfo | null;
};

export type MapElementEventHandler = {
  name: typeof MAP_ELEMENT_EVENT;
  handler: (nodeId: string, mappingId: string) => void;
};

export type UnmapElementEventHandler = {
  name: typeof UNMAP_ELEMENT_EVENT;
  handler: (nodeId: string) => void;
};

export type GetManualMappingsEventHandler = {
  name: typeof GET_MANUAL_MAPPINGS_EVENT;
  handler: () => ManualMapping[];
};

export type SelectionChangedEventHandler = {
  name: typeof SELECTION_CHANGED_EVENT;
  handler: (selection: SelectionInfo | null) => void;
};

export type MappingsUpdatedEventHandler = {
  name: typeof MAPPINGS_UPDATED_EVENT;
  handler: (mappings: ManualMapping[]) => void;
};

export type SelectMappedNodeEventHandler = {
  name: typeof SELECT_MAPPED_NODE_EVENT;
  handler: (nodeId: string) => void;
};
