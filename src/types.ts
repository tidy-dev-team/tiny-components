export interface ComponentRegistry {
  [key: string]: ComponentInfo;
}

export interface ComponentInfo {
  key: string;
  name: string;
  type?: string;
}

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
