import { on, showUI } from "@create-figma-plugin/utilities";
import {
  FIND_COMPONENTS_EVENT,
  FindComponentsEventHandler,
} from "./types";

export default function () {
  showUI({
    height: 280,
    width: 280,
  });

  on<FindComponentsEventHandler>(FIND_COMPONENTS_EVENT, handleFindComponents);
}

function handleFindComponents() {
  const buttonFrames = figma.currentPage.findAll((node) =>
    isButtonFrame(node)
  );

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

function isButtonFrame(node: SceneNode) {
  if (node.type !== "FRAME") {
    return false;
  }
  const name = node.name.trim().toLowerCase();
  return name.includes("button");
}
