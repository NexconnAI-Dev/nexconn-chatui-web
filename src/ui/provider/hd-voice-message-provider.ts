import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ctx } from './context';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { AudioPlayEvent, AudioPlayState, InnerEvent } from '../../core/EventDefined';
import { HDVoiceMessageContent, MessageDirection } from '@nexconn/chat';
import { HDVoiceMessageComponentProps } from '@lib/ui/component/messages/hd-voice-message';

export class HDVoiceMessageProvider extends LitElement {
  @property({ type: Object }) declare message: ChatUIMessageModel<HDVoiceMessageContent>;

  @state() private declare progress: number;
  @state() private declare playing: boolean;

  private context = ctx();

  private onAudioPlay = (evt: AudioPlayEvent) => {
    this.parseAudioState(evt.data);
  };

  private parseAudioState(data: AudioPlayState) {
    const { status, progress: p, messageUId, transactionId } = data;
    const { messageId: cUid, transactionId: cTid } = this.message;

    if ((cUid && cUid === messageUId) || (transactionId && transactionId === cTid)) {
      this.playing = status === 'playing';
      this.progress = p;
      if (p === 100) {
        // Reset after 300 ms so the progress bar can visibly reach 100%.
        setTimeout(() => this.progress = 0, 300);
      }
      return;
    }

    this.progress = 0;
    this.playing = false;
  }

  private onToggle = () => {
    if (this.playing) {
      this.context.audioPlayer.pause();
    } else {
      const msgContent = this.message.content;
      this.context.audioPlayer.play(msgContent.remoteUrl, this.message.messageId, this.message.transactionId);
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.context.addEventListener(InnerEvent.AUDIO_PLAY_EVENT, this.onAudioPlay);
    const data = this.context.audioPlayer.getCurrentState();
    this.parseAudioState(data);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.context.removeEventListener(InnerEvent.AUDIO_PLAY_EVENT, this.onAudioPlay);
  }

  render() {
    const msgContent = this.message.content;
    const duration: number = msgContent.duration;
    const isOwner: boolean = this.message.direction === MessageDirection.SEND;

    const componentProps: HDVoiceMessageComponentProps = {
      duration,
      isOwner,
      playing: this.playing,
      progress: this.progress,
      toggle: this.onToggle,
    };

    return html`<nc-hd-voice-message .value=${componentProps}></nc-hd-voice-message>`;
  }
}
