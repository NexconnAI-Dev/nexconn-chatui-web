/**
 * Overlay container without Shadow DOM, allowing named slots to reach child components such as nc-modal-dialog.
 * LitElement would create a shadow root whose slot assignment rules block forwarding those named slots.
 */
export class ModalProvider extends HTMLElement {
  connectedCallback() {
    this.style.cssText = `
      background-color: rgba(0, 0, 0, .5);
      position: absolute;
      inset: 0px;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000000;
      overflow: hidden;
    `;
  }
}
