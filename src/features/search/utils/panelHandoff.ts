/**
 * Which of the two heavy panels (list, map) exist right now.
 *
 * On a phone or tablet only one panel is ever on screen, and a phone cannot
 * hold both: the list's photos and the WebGL map with its pins together are
 * what makes Safari kill the tab. So the panels hand over, and nothing heavy
 * happens while the slide is running:
 *
 *   1. tap      — the slide starts; the leaving panel stays as it is (so the
 *                 slide shows real content, and the main thread stays free);
 *                 the arriving panel shows a cheap placeholder.
 *   2. released — the slide is over: the leaving panel is torn down.
 *   3. gone     — a moment later, once that teardown has been committed and
 *                 painted: the arriving panel is built.
 *
 * So the two are never alive together, and neither is built or destroyed
 * mid-slide. `*Released` and `*Gone` come from `useSettledHidden` with the two
 * delays. Pure, so the order is testable without a browser. Where both panels
 * share the screen (split view) `oneAtATime` is false and the older
 * deferred-mount values are used unchanged.
 */
export interface PanelHandoffInput {
  oneAtATime: boolean;
  listWanted: boolean;
  mapWanted: boolean;
  /** The list has been off screen for its slide: tear it down. */
  listReleased: boolean;
  /** …and a moment more: it is gone, the map may be built. */
  listGone: boolean;
  /** The map has been off screen for its slide: tear it down. */
  mapReleased: boolean;
  /** …and a moment more: it is gone, the list may be built. */
  mapGone: boolean;
  /** What the split view uses: the panel's own idle-deferred mount. */
  deferredList: boolean;
  deferredMap: boolean;
}

export interface PanelHandoff {
  renderList: boolean;
  renderMap: boolean;
  /** The list is wanted but waits for the map to be gone: show a placeholder. */
  listPending: boolean;
  /** The map is wanted but waits for the list to be gone: show a placeholder. */
  mapPending: boolean;
}

export function planPanels(i: PanelHandoffInput): PanelHandoff {
  if (!i.oneAtATime) {
    return { renderList: i.deferredList, renderMap: i.deferredMap, listPending: false, mapPending: false };
  }
  const renderList = i.listWanted ? i.mapGone : !i.listReleased;
  const renderMap = i.mapWanted ? i.listGone : !i.mapReleased;
  return {
    renderList,
    renderMap,
    listPending: i.listWanted && !renderList,
    mapPending: i.mapWanted && !renderMap,
  };
}
