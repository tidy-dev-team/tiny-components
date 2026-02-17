import {
  Button,
  Container,
  MiddleAlign,
  Muted,
  Text,
  VerticalSpace,
  render,
  Divider,
  Dropdown,
  IconClose16,
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
  SELECTION_CHANGED_EVENT,
  SelectionChangedEventHandler,
} from "./types";
import type { SelectionInfo, ManualMapping } from "./types";
import { getAllMappingIds } from "./componentData";

function Plugin() {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [mappings, setMappings] = useState<ManualMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string>("");
  const [mappingOptions] = useState(() => {
    const ids = getAllMappingIds();
    return [
      { value: "", label: "Select component..." },
      ...ids.map((id) => ({ value: id, label: id })),
    ];
  });

  function handleFindComponentsClick() {
    emit<FindComponentsEventHandler>(FIND_COMPONENTS_EVENT);
  }

  function handleReplaceComponentsClick() {
    emit<ReplaceComponentsEventHandler>(REPLACE_COMPONENTS_EVENT);
  }

  function handleMapClick() {
    if (!selection || !selectedMappingId) return;
    emit<MapElementEventHandler>(MAP_ELEMENT_EVENT, selection.nodeId, selectedMappingId);
    setSelectedMappingId("");
    setTimeout(refreshMappings, 50);
  }

  function handleUnmapClick(nodeId: string) {
    emit<UnmapElementEventHandler>(UNMAP_ELEMENT_EVENT, nodeId);
    setTimeout(refreshMappings, 50);
  }

  const refreshSelection = useCallback(() => {
    emit<GetSelectionEventHandler>(GET_SELECTION_EVENT);
  }, []);

  const refreshMappings = useCallback(() => {
    emit<GetManualMappingsEventHandler>(GET_MANUAL_MAPPINGS_EVENT);
  }, []);

  useEffect(() => {
    on<SelectionChangedEventHandler>(SELECTION_CHANGED_EVENT, (info: SelectionInfo | null) => {
      setSelection(info);
    });

    refreshSelection();
    refreshMappings();
  }, [refreshSelection, refreshMappings]);

  return (
    <div>
      <MiddleAlign>
        <Container
          space="medium"
          style={{
            width: "260px",
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
          }}
        >
          <Text
            align="center"
            style={{ fontWeight: 600, paddingBottom: "12px" }}
          >
            Tiny Components
          </Text>

          <Text align="center" style={{ lineHeight: "20px" }}>
            <Muted>
              Refresh your selection with polished components in a single tap.
            </Muted>
          </Text>
          <VerticalSpace space="medium" />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <Button secondary fullWidth onClick={handleFindComponentsClick}>
              find components
            </Button>
            <Button fullWidth onClick={handleReplaceComponentsClick}>
              replace from DS
            </Button>
          </div>

          <VerticalSpace space="medium" />
          <Divider />
          <VerticalSpace space="medium" />

          <Text style={{ fontWeight: 500, paddingBottom: "8px" }}>
            Manual Mapping
          </Text>

          <div
            style={{
              padding: "8px 12px",
              backgroundColor: selection ? "#f0fdf4" : "#f8fafc",
              borderRadius: "6px",
              marginBottom: "10px",
              border: selection ? "1px solid #86efac" : "1px solid #e2e8f0",
            }}
          >
            <Text style={{ fontSize: "12px" }}>
              {selection ? (
                <span>
                  <strong>Selected:</strong> {selection.nodeName}
                </span>
              ) : (
                <Muted>No element selected</Muted>
              )}
            </Text>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Dropdown
                options={mappingOptions}
                value={selectedMappingId}
                onChange={(e) => setSelectedMappingId(e.currentTarget.value)}
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

          {mappings.length > 0 && (
            <div>
              <VerticalSpace space="medium" />
              <Text style={{ fontWeight: 500, paddingBottom: "6px" }}>
                Current Mappings
              </Text>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
              >
                {mappings.map((m) => (
                  <div
                    key={m.nodeId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "4px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Text style={{ fontSize: "11px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.nodeName} → <strong>{m.mappingId}</strong>
                    </Text>
                    <button
                      onClick={() => handleUnmapClick(m.nodeId)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                        marginLeft: "6px",
                      }}
                      title="Remove mapping"
                    >
                      <IconClose16 />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </MiddleAlign>
    </div>
  );
}

export default render(Plugin);
