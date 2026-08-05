import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { AUDIO_RUN_ICON, AUDIO_STOP_ICON } from '../../../assets';

export interface HDVoiceMessageComponentProps {
  /**
   * Whether the message was sent by the current user
   */
  isOwner: boolean,
  /**
   * Whether audio is playing
   */
  playing: boolean,
  /**
   * Playback progress
   */
  progress: number,
  /**
   * Voice message duration
   */
  duration: number,
  /**
   * Toggle playback
   */
  toggle: () => void,
}

export class HDVoiceMessageElement extends LitElement {
  static styles = css`
    :host { display: block; }
    .voice {
      display: flex;
      align-items: center;
      padding: 20px;
      gap: 10px;
    }
    .control {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    .progress {
      height: 22px;
      display: flex;
      align-items: center;
    }
    .line {
      margin-right: 5px;
      width: 3px;
      animation: bounce-in 2s;
      background: #020814;
    }
    .line.active {
      transition: all 0.5s;
      background: #0047FF;
    }
    .time {
      font-size: 14px;
    }
  `;

  @property({ type: Object }) declare value: HDVoiceMessageComponentProps;

  @state() private declare processLines: number[];

  connectedCallback() {
    super.connectedCallback();
    this.processLines = new Array(20).fill(0).map(() => (Math.floor(Math.random() * 9) + 3) * 2);
  }

  private get runIndex(): number {
    return Math.floor(this.value.progress / 100 * 20) || -1;
  }

  private get btnIcon(): string {
    return this.value?.playing ? AUDIO_RUN_ICON : AUDIO_STOP_ICON;
  }

  private toggleState = () => {
    this.value?.toggle();
  };

  render() {
    if (!this.value) return nothing;
    const { duration } = this.value;
    return html`
      <div>
        <div class="voice">
          <img .src=${this.btnIcon} alt="Button Icon" class="control" @click=${this.toggleState} />
          <div class="progress">
            ${this.processLines.map((item, index) => html`
              <div class="line ${this.runIndex >= index ? 'active' : ''}" style="height: ${item}px;"></div>
            `)}
          </div>
          <div class="time">${duration}s</div>
        </div>
      </div>
    `;
  }
}
