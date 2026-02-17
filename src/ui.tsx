import {
  Button,
  Muted,
  Text,
  VerticalSpace,
  render,
  TextboxAutocomplete,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import {
  FIND_COMPONENTS_EVENT,
  FindComponentsEventHandler,
  REPLACE_COMPONENTS_EVENT,
  ReplaceComponentsEventHandler,
  GET_SELECTION_EVENT,
  GetSelectionEventHandler,
  MAP_ELEMENT_EVENT,
  MapElementEventHandler,
  UNMAP_ELEMENT_EVENT,
  UnmapElementEventHandler,
  GET_MANUAL_MAPPINGS_EVENT,
  GetManualMappingsEventHandler,
  MAPPINGS_UPDATED_EVENT,
  MappingsUpdatedEventHandler,
  SELECTION_CHANGED_EVENT,
  SelectionChangedEventHandler,
} from "./types";
import type { SelectionInfo, ManualMapping } from "./types";
import { getAllMappingIds } from "./componentData";

const styles = {
  container: {
    width: "100%",
    minHeight: "100vh",
    padding: "16px",
    boxSizing: "border-box" as const,
    background: "linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize: "12px",
    lineHeight: "18px",
    color: "#64748b",
  },
  section: {
    marginTop: "16px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "10px",
  },
  selectionBox: (hasSelection: boolean, isMapped: boolean) => ({
    padding: "10px 12px",
    backgroundColor: isMapped
      ? "#fef3c7"
      : hasSelection
      ? "#ecfdf5"
      : "#f8fafc",
    borderRadius: "8px",
    border: `1px solid ${
      isMapped ? "#fcd34d" : hasSelection ? "#6ee7b7" : "#e2e8f0"
    }`,
    marginBottom: "12px",
  }),
  selectionLabel: {
    fontSize: "10px",
    fontWeight: 500,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
    marginBottom: "4px",
  },
  selectionName: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#1e293b",
    lineHeight: "18px",
  },
  mappedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "6px",
    padding: "3px 8px",
    backgroundColor: "#fef3c7",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 500,
    color: "#92400e",
  },
  mapRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  dropdownWrapper: {
    flex: 1,
  },
  mappingItem: (isHighlighted: boolean) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: isHighlighted ? "#fefce8" : "#ffffff",
    borderRadius: "8px",
    border: `1px solid ${isHighlighted ? "#fde047" : "#e2e8f0"}`,
    marginBottom: "6px",
    transition: "all 0.15s ease",
  }),
  mappingText: {
    fontSize: "12px",
    lineHeight: "18px",
    color: "#334155",
    flex: 1,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  mappingArrow: {
    color: "#94a3b8",
    margin: "0 6px",
  },
  mappingTarget: {
    fontWeight: 600,
    color: "#0f172a",
  },
  removeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    marginLeft: "8px",
    transition: "all 0.15s ease",
  },
  mappingsList: {
    maxHeight: "140px",
    overflowY: "auto" as const,
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "16px",
    color: "#94a3b8",
    fontSize: "12px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
};

function Plugin() {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [mappings, setMappings] = useState<ManualMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string>("");
  const [mappingOptionValues] = useState(() => getAllMappingIds());
  const mappingOptions = mappingOptionValues.map((id) => ({ value: id }));

  function handleFindComponentsClick() {
    emit<FindComponentsEventHandler>(FIND_COMPONENTS_EVENT);
  }

  function handleReplaceComponentsClick() {
    emit<ReplaceComponentsEventHandler>(REPLACE_COMPONENTS_EVENT);
  }

  function handleMapClick() {
    if (!selection || !selectedMappingId) return;
    emit<MapElementEventHandler>(
      MAP_ELEMENT_EVENT,
      selection.nodeId,
      selectedMappingId
    );
    setSelectedMappingId("");
    refreshMappings();
  }

  function handleUnmapClick(nodeId: string) {
    emit<UnmapElementEventHandler>(UNMAP_ELEMENT_EVENT, nodeId);
    refreshMappings();
  }

  const refreshSelection = useCallback(() => {
    emit<GetSelectionEventHandler>(GET_SELECTION_EVENT);
  }, []);

  const refreshMappings = useCallback(() => {
    emit<GetManualMappingsEventHandler>(GET_MANUAL_MAPPINGS_EVENT);
  }, []);

  useEffect(() => {
    on<SelectionChangedEventHandler>(
      SELECTION_CHANGED_EVENT,
      (info: SelectionInfo | null) => {
        setSelection(info);
      }
    );
    on<MappingsUpdatedEventHandler>(
      MAPPINGS_UPDATED_EVENT,
      (nextMappings: ManualMapping[]) => {
        setMappings(nextMappings);
      }
    );

    refreshSelection();
    refreshMappings();
  }, [refreshSelection, refreshMappings]);

  const selectedMapping = selection
    ? mappings.find((m) => m.nodeId === selection.nodeId)
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>Tiny Components</div>
          <div style={styles.subtitle}>
            Replace placeholders with polished DS components
          </div>
        </div>

        {/* Primary Actions */}
        <div style={styles.buttonGroup}>
          <Button secondary fullWidth onClick={handleFindComponentsClick}>
            Find Components
          </Button>
          <Button fullWidth onClick={handleReplaceComponentsClick}>
            Replace from DS
          </Button>
        </div>

        {/* Manual Mapping Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Manual Mapping</div>

          {/* Selection Box */}
          <div style={styles.selectionBox(!!selection, !!selectedMapping)}>
            <div style={styles.selectionLabel}>
              {selection ? "Selected Layer" : "No Selection"}
            </div>
            <div style={styles.selectionName}>
              {selection ? selection.nodeName : "Select a layer on canvas"}
            </div>
            {selectedMapping && (
              <div style={styles.mappedBadge}>
                <span>Mapped to:</span>
                <strong>{selectedMapping.mappingId}</strong>
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div style={styles.mapRow}>
            <div style={styles.dropdownWrapper}>
              <TextboxAutocomplete
                filter
                strict
                options={mappingOptions}
                value={selectedMappingId}
                placeholder="Select component..."
                onValueInput={setSelectedMappingId}
                disabled={!selection}
              />
            </div>
            <Button
              secondary
              onClick={handleMapClick}
              disabled={!selection || !selectedMappingId}
            >
              Map
            </Button>
          </div>
        </div>

        {/* Current Mappings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Mappings ({mappings.length})</div>

          {mappings.length === 0 ? (
            <div style={styles.emptyState}>
              <Muted>No mappings yet</Muted>
            </div>
          ) : (
            <div style={styles.mappingsList}>
              {mappings.map((m) => {
                const isHighlighted = selection?.nodeId === m.nodeId;
                return (
                  <div key={m.nodeId} style={styles.mappingItem(isHighlighted)}>
                    <div style={styles.mappingText}>
                      <span>{m.nodeName}</span>
                      <span style={styles.mappingArrow}> → </span>
                      <span style={styles.mappingTarget}>{m.mappingId}</span>
                    </div>
                    <button
                      onClick={() => handleUnmapClick(m.nodeId)}
                      style={styles.removeButton}
                      title="Remove mapping"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <VerticalSpace space="small" />
    </div>
  );
}

export default render(Plugin);
