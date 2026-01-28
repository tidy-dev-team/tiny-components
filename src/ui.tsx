import {
  Button,
  Container,
  MiddleAlign,
  Muted,
  Text,
  VerticalSpace,
  render,
} from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h } from "preact";
import {
  FIND_COMPONENTS_EVENT,
  FindComponentsEventHandler,
  REPLACE_COMPONENTS_EVENT,
  ReplaceComponentsEventHandler,
} from "./types";

function Plugin() {
  function handleFindComponentsClick() {
    emit<FindComponentsEventHandler>(FIND_COMPONENTS_EVENT);
  }

  function handleReplaceComponentsClick() {
    emit<ReplaceComponentsEventHandler>(REPLACE_COMPONENTS_EVENT);
  }
  return (
    <div>
      <MiddleAlign>
        <Container
          space="medium"
          style={{
            width: "260px",
            padding: "24px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
          }}
        >
          <Text
            align="center"
            style={{ fontWeight: 600, paddingBottom: "16px" }}
          >
            Tiny Components
          </Text>

          <Text align="center" style={{ lineHeight: "20px" }}>
            <Muted>
              Refresh your selection with polished components in a single tap.
            </Muted>
          </Text>
          <VerticalSpace space="medium" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Button secondary fullWidth onClick={handleFindComponentsClick}>
              find components
            </Button>
            <Button fullWidth onClick={handleReplaceComponentsClick}>
              replace with components
            </Button>
          </div>
          <VerticalSpace space="medium" />
        </Container>
      </MiddleAlign>
    </div>
  );
}

export default render(Plugin);
