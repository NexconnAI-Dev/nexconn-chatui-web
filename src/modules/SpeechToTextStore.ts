import { ILogger } from '@nexconn/engine';
import { LogTag } from '../enums/LogTag';
import { EventDispatcher } from '../core/EventDispatcher';
import { EventDefined, InnerEvent } from '../core/EventDefined';
import { ChatUIEvent } from '../core/ChatUIEvent';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { MessageHandler, NCEngine, SpeechToTextCompletedEvent } from '@nexconn/chat';
import { NCChatUICode } from '@lib/enums/NCChatUICode';

/**
 * In-memory speech-to-text manager.
 * - Caches successful results only, keyed by messageUId.
 * - LRU limit: 200 entries.
 */
export class SpeechToTextStore {
  /** Stores only successfully converted text. */
  private cache = new Map<string, string>();

  /** Message UIDs currently being converted. */
  private convertingTTSList = new Set<string>();

  /** Message UIDs whose conversion failed, for retryable UI state. */
  private errorTTSList = new Set<string>();

  /** Timeout timers for active requests. */
  private timers = new Map<string, any>();

  /** Maximum LRU cache size. */
  static readonly MAX_CACHE_SIZE = 200;

  /** Request timeout in milliseconds. */
  static readonly REQUEST_TIMEOUT = 30000;

  constructor(
    private readonly logger: ILogger,
    private readonly eventDispatcher?: EventDispatcher<EventDefined>
  ) {
    const onSpeechToTextCompleted = this.#onResponse.bind(this);
    NCEngine.addMessageHandler('speech-to-text-store', new MessageHandler({
      onSpeechToTextCompleted,
    }));
  }

  /** Dispatch a state change event. */
  private dispatchStateChange(
    messageUId: string, status: 'converting' | 'success' | 'error',
    text?: string,
    code?: number,
  ): void {
    if (this.eventDispatcher) {
      this.eventDispatcher.dispatchEvent(
        new ChatUIEvent(InnerEvent.SPEECH_TO_TEXT_STATE_CHANGE, {
          messageUId,
          status,
          text,
          errorCode: code,
        })
      );
    }
  }

  /** Get converted text when cached. */
  public getSTTText(messageUId: string): string | undefined {
    return this.cache.get(messageUId);
  }

  /** Whether conversion is in progress. */
  public isConverting(messageUId: string): boolean {
    return this.convertingTTSList.has(messageUId);
  }

  /** Whether conversion has failed. */
  public hasError(messageUId: string): boolean {
    return this.errorTTSList.has(messageUId);
  }

  /** Whether conversion succeeded. */
  public hasConverted(messageUId: string): boolean {
    return this.cache.has(messageUId);
  }

  /**
   * Start speech-to-text conversion. Return SUCCESS immediately for cached or in-progress requests.
   */
  public async requestForMessage(message: ChatUIMessageModel): Promise<number> {
    const { messageId: messageUId } = message;

    if (this.cache.has(messageUId)) {
      return NCChatUICode.SUCCESS;
    }

    if (this.convertingTTSList.has(messageUId)) {
      return NCChatUICode.SUCCESS;
    }

    this.errorTTSList.delete(messageUId);
    this.convertingTTSList.add(messageUId);

    // Dispatch the converting state.
    this.dispatchStateChange(messageUId, 'converting');

    try {
      const { code, msg, isOk } = await message.message.requestSpeechToText();

      if (isOk) {
        // Start a timeout timer; the final result arrives through an event.
        const timer = setTimeout(() => {
          this.timers.delete(messageUId);
          if (this.convertingTTSList.has(messageUId)) {
            this.convertingTTSList.delete(messageUId);
            this.errorTTSList.add(messageUId);
            this.logger?.warn(LogTag.D, `[STT] timeout: ${messageUId}`);
            // Dispatch the timeout failure state.
            this.dispatchStateChange(messageUId, 'error');
          }
        }, SpeechToTextStore.REQUEST_TIMEOUT);

        this.timers.set(messageUId, timer);
      } else {
        this.convertingTTSList.delete(messageUId);
        this.errorTTSList.add(messageUId);
        this.logger?.warn(LogTag.L_STT_REQUEST_E, `[STT] request failed: code=${code}, uid=${messageUId}, msg=${msg}`);
        // Dispatch the request failure state.
        this.dispatchStateChange(messageUId, 'error', undefined, code);
      }

      return code;
    } catch (e) {
      this.convertingTTSList.delete(messageUId);
      this.errorTTSList.add(messageUId);
      this.logger?.warn(LogTag.L_STT_REQUEST_E, `[STT] request exception: ${e}`);
      // Dispatch the exception failure state.
      this.dispatchStateChange(messageUId, 'error');
      return -1;
    }
  }

  /** Event callback that receives SDK conversion results. */
  #onResponse = (response: SpeechToTextCompletedEvent) => {
    try {
      const { code, messageId, info } = response || {};
      this.logger?.info(LogTag.L_STT_RESPONSE_R, `[STT] response: ${messageId}, code: ${code}`);

      const timer = this.timers.get(messageId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(messageId);
      }

      if (code === NCChatUICode.SUCCESS) {
        // Write the result to the LRU cache.
        const text = info!.text;
        this.cache.set(messageId, text);
        while (this.cache.size > SpeechToTextStore.MAX_CACHE_SIZE) {
          const firstKey = this.cache.keys().next().value || '';
          this.cache.delete(firstKey);
        }

        this.errorTTSList.delete(messageId);
        this.convertingTTSList.delete(messageId);
        this.logger?.info(LogTag.L_STT_RESPONSE_O, `[STT] success: ${messageId}`);
        // Dispatch the conversion success state.
        this.dispatchStateChange(messageId, 'success', text);
      } else {
        this.convertingTTSList.delete(messageId);
        this.errorTTSList.add(messageId);
        this.logger?.warn(LogTag.L_STT_RESPONSE_E, `[STT] failed: code=${code}, uid=${messageId}`);
        // Dispatch the conversion failure state.
        this.dispatchStateChange(messageId, 'error');
      }
    } catch (e) {
      this.logger?.warn(LogTag.L_STT_RESPONSE_E, `[STT] exception: ${e}`);
    }
  };

  /** Clear in-memory state. */
  public clearMemoryData() {
    this.cache.clear();
    this.convertingTTSList.clear();
    this.errorTTSList.clear();
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  /** Destroy the store. */
  public destroy() {
    NCEngine.removeMessageHandler('speech-to-text-store');
    this.clearMemoryData();
  }
}
