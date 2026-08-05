import { LitElement, html } from 'lit';
import { ModalForwardingType } from '@lib/core/EventDefined';
import {
  multiChoiceMode, selectedCount, selectedMessages, forwarding, ctx,
} from './context';
import { SignalController } from '../SignalController';
import { MessageType } from '@nexconn/chat';
import { SentStatus } from '@nexconn/chat';

export class MultiChoiceMenuProvider extends LitElement {
  private _signals = new SignalController(this, [selectedCount]);

  private async _handleForward(type: ModalForwardingType) {
    if (selectedMessages.value.length <= 0) return;
    if (selectedMessages.value.length > 100 && type === ModalForwardingType.MERGE) {
      ctx().alert('alert.forward.over.length');
      return;
    }
    const types: string[] = [
      MessageType.TEXT, MessageType.IMAGE, MessageType.FILE, MessageType.HD_VOICE,
      MessageType.COMBINE, MessageType.GIF,
      MessageType.SHORT_VIDEO, MessageType.FILE, MessageType.REFERENCE,
    ];
    if (type === ModalForwardingType.MERGE) {
      types.splice(types.length - 1, 1);
    }

    selectedMessages.value.sort((a, b) => a.sentTime - b.sentTime);

    const unaccepted: number[] = [];
    selectedMessages.value.forEach((item, index) => {
      if (!(types.includes(item.messageType) && item.sentStatus !== SentStatus.SENDING && item.sentStatus !== SentStatus.FAILED)) {
        unaccepted.push(index + 1);
      }
    });

    if (unaccepted.length > 0) {
      ctx().alert('alert.forward.not.supported', `${unaccepted.join(',')}`);
      return;
    }

    const bool = await forwarding(type, selectedMessages.value);
    if (!bool) return;
    multiChoiceMode.value = false;
  }

  render() {
    return html`
      <nc-multi-choice-menu
        .count=${selectedCount.value}
        @forward=${() => this._handleForward(ModalForwardingType.SINGLE)}
        @merge-forward=${() => this._handleForward(ModalForwardingType.MERGE)}
        @cancel=${() => { multiChoiceMode.value = false; }}
      ></nc-multi-choice-menu>
    `;
  }
}
