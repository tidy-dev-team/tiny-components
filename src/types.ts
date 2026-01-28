export interface ComponentRegistry {
  [key: string]: ComponentInfo;
}

export interface ComponentInfo {
  key: string;
  name: string;
  type?: string;
}

export const FIND_COMPONENTS_EVENT = "FIND_COMPONENTS" as const;
export type PluginEvent = typeof FIND_COMPONENTS_EVENT;
export type FindComponentsEventHandler = {
  name: typeof FIND_COMPONENTS_EVENT;
  handler: () => void;
};
