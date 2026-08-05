import { InnerEvent, AudioPlayState } from "../core/EventDefined";
import { ChatUIEvent } from "../core/ChatUIEvent";
import { ChatUIModule } from "./ChatUIModule";

/**
 * Audio manager that tracks playback progress and provides play, pause, and stop controls.
 * @description Only one audio clip can play at a time.
 */
export class AudioPlayer extends ChatUIModule {
  private _audio: HTMLAudioElement = new Audio();

  private _status: 'playing' | 'stopped' = 'stopped';
  private _progress: number = 0;
  private _messageUId: string = '';
  private _transactionId: number = 0;

  protected _onInitUserCache(): void {
    this._audio.addEventListener('ended', this._onEnded);
    this._audio.addEventListener('timeupdate', this._onTimeUpdate);
    this._audio.addEventListener('error', this._onError);
  }

  protected _onDestroyUserCache(): void {
    this._audio.removeEventListener('ended', this._onEnded);
    this._audio.removeEventListener('timeupdate', this._onTimeUpdate);
    this._audio.addEventListener('error', this._onError);
  }

  public destroy(): void {
    throw new Error("Method not implemented.");
  }

  private _onError = () => {
    this._progress = 0;
    this._status = 'stopped';
    this._dispatch();
  }

  private _onTimeUpdate = () => {
    const { currentTime, duration } = this._audio;
    this._progress = Math.floor(currentTime / duration * 100);
    if (this._status === 'stopped') {
      // Ignore timeupdate events emitted after playback stops.
      return;
    }
    this._dispatch();
  }

  private _onEnded = () => {
    this._progress = 100;
    this._status = 'stopped';
    this._dispatch();
  }

  /**
   * Get the current playback state.
   */
  public getCurrentState(): AudioPlayState {
    return {
      progress: this._progress,
      status: this._status,
      messageUId: this._messageUId,
      transactionId: this._transactionId,
    }
  }

  private _dispatch() {
    this.ctx.dispatchEvent(new ChatUIEvent(InnerEvent.AUDIO_PLAY_EVENT, this.getCurrentState()), false);
  }

  /**
   * Play audio.
   * @param url Audio URL.
   * @param messageUId Message UID for the audio resource. A local outgoing message may use ''.
   * @param transactionId Transaction ID for a local outgoing message, used as its unique identifier before a UID exists.
   */
  play(url: string, messageUId: string, transactionId?: number): void {
    if ((this._messageUId && this._messageUId === messageUId) || (this._transactionId && this._transactionId === transactionId)) {
      // Resume playback.
      if (this._status === 'stopped') {
        this._audio.play();
        this._status = "playing";
        this._onTimeUpdate();
      }
      return;
    }

    this._status = 'playing';
    this._messageUId = messageUId;
    this._transactionId = 0;
    this._progress = 0;

    this._audio.src = url;
    this._audio.play();
    this._dispatch();
  }

  /**
   * Stop playback and clear its progress.
   */
  stop() {
    this._status = 'stopped';
    this._messageUId = '';
    this._transactionId = 0;
    this._progress = 0;

    if (this._audio.src) {
      this._audio.pause();
      this._audio.src = '';
    }
    this._dispatch();
  }

  /**
   * Pause playback and preserve its current progress.
   */
  pause() {
    if (this._status === 'stopped') {
      return;
    }
    this._status = 'stopped';
    this._audio.pause();
    this._dispatch();
  }
}
