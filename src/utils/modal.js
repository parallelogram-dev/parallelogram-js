/**
 * Find the open modal that content must go inside to be seen, used or announced
 *
 * Everything outside an open modal dialog is inert. This finds an open `<p-modal>`, whose light DOM
 * children are slotted inside its shadow root's dialog, or a `<dialog>` in the document opened with
 * `showModal()`. When modals are nested, the last in document order is returned.
 *
 * @returns {HTMLElement|null} The `p-modal` host or `<dialog>`, or null when no modal is open
 */
export function getOpenModal() {
  return [...document.querySelectorAll('p-modal[open], dialog:modal')].at(-1) ?? null;
}
