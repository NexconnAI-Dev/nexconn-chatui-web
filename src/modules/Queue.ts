import { FileType } from '@nexconn/engine';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ChatUIModule } from './ChatUIModule';
import { ChatUIEvent } from '../core/ChatUIEvent';
import { LogTag } from '../enums/LogTag';
import { InnerEvent } from '@lib/core/EventDefined';
import { ChatUIContext } from '@lib/core/ChatUIContext';
import { NCChatUICode } from '@lib/enums/NCChatUICode';

import {
  MessageType, Helper, ChannelIdentifier, SendMessageParams,
  Message, NCResult, SentStatus,
} from '@nexconn/chat';
import { createNexconnChannel } from '@lib/helper';

type Task<T, D> = {
  params: T,
  resolve: (value: NCResult<D>) => void,
  result?: NCResult<D>
}

/**
 * Asynchronous task queue. Tasks may run concurrently, but results are returned in enqueue order.
 * @param T Task parameter type.
 * @param D Task result type.
 */
export abstract class BaseQueue<T extends { transactionId?: number }, D> extends ChatUIModule {
  /**
   * Timestamps used to calculate executions per second.
   */
  private readonly _timestamps: number[] = [];

  /**
   * Pending tasks.
   */
  protected _queue: Array<Task<T, D>> = [];

  /**
   * Concurrently executing tasks. The queue length never exceeds `_parallel`.
   * Completed tasks are removed from the front until an unfinished task is reached, preserving enqueue order.
   */
  private _executing: Array<Task<T, D>> = [];

  /**
   * Task queue name used for logging.
   */
  protected abstract _tag: string;

  private _timer: number = -1;

  constructor(
    ctx: ChatUIContext,
    /**
     * Maximum number of concurrent tasks.
     */
    private readonly _parallel: number = 5,
    /**
     * Maximum executions per second.
    */
    private readonly _fps: number = 5,
  ) {
    super(ctx);
  }

  protected _onInitUserCache(): void {
    // No implementation required.
  }

  protected _onDestroyUserCache(): void {
    // Clear queued tasks.
  }

  public destroy(): void {
    clearTimeout(this._timer);
    this._timer = -1;
  }

  async push(data: T): Promise<NCResult<D>> {
    return new Promise((resolve) => {
      // Add the task to the pending queue.
      this._queue.push({ params: data, resolve });
      this.logger.info(LogTag.L_PUSH_2_QUEUE_O, `${this._tag}: queue length: ${this._queue.length}`);
      this._execute();
    });
  }

  /**
   * Remove a task.
   * TODO: Remove the task immediately without waiting for earlier tasks to finish.
   * @param transactionId
   * @description - A task may be running or pending. To preserve result order, cancellation only marks the task and does not modify the task list.
   * @returns true if cancellation was marked successfully; otherwise the task cannot be canceled.
   */
  remove(transactionId: number): boolean {
    // 1. Find the task in the pending queue and mark it as canceled.
    let index = this._queue.findIndex((item) => item.params.transactionId === transactionId);
    if (index !== -1) {
      const task = this._queue[index];
      task.result = NCResult.fail(NCChatUICode.TASK_CANCEL);
      return true;
    }

    // 2. Find the task in the executing queue, cancel it if possible, and mark it as canceled.
    index = this._executing.findIndex((item) => item.params.transactionId === transactionId);
    if (index !== -1) {
      const task = this._executing[index];
      // Attempt to cancel the running action; some actions cannot be canceled.
      const bool = this._try2CancelExecutingTask(transactionId)
      if (bool) {
        task.result = NCResult.fail(NCChatUICode.TASK_CANCEL);
      }
      return bool;
    }

    // Task not found.
    return false;
  }

  /**
   * Attempt to cancel a running task. Returns false when cancellation is unsupported.
   * @param transactionId
   */
  protected abstract _try2CancelExecutingTask(transactionId: number): boolean;

  private async _execute(): Promise<void> {
    if (this._paused || this._queue.length === 0 || this._executing.length >= this._parallel) {
      // The pending queue is empty or the concurrent queue is full.
      return;
    }

    // Check the rate limit.
    if (this._timestamps.length >= this._fps) {
      this.logger.warn(LogTag.L_TASK_QUEUE_EXECUTE_O, `${this._tag}: trigger limiting`);
      return;
    }

    // Rate-limit timer.
    if (this._timer === -1) {
      this._timer = window.setTimeout(() => {
        // Reset rate-limit state.
        this._timestamps.length = 0;
        this._timer = -1;
        // Resume task execution.
        this._execute();
      }, 1000);
    }

    // Move one pending task to the executing queue.
    const item = this._queue.shift()!;
    this._executing.push(item);
    // Record the execution time.
    this._timestamps.push(Date.now());

    this.logger.info(LogTag.L_TASK_QUEUE_EXECUTE_O, `${this._tag}: queue length: ${this._queue.length}, executing length: ${this._executing.length}`);

    // Execute the task.
    const promise = this._handle(item.params);

    // Check whether another task can start.
    this._execute();

    // Wait for the task result.
    const result = await promise;
    item.result = result;

    this._checkResolve();
  }

  private _checkResolve() {
    // Resolve completed tasks from the front in enqueue order.
    while (this._executing.length && this._executing[0].result !== undefined) {
      const {
        resolve, result,
      } = this._executing.shift()!;
      resolve(result!);
    }

    this._execute();
  }

  protected abstract _handle(data: T): Promise<NCResult<D>>

  private _paused: boolean = false;
}

type MessageSendQueueTask = {
  channelIdentifier: ChannelIdentifier,
  message: ChatUIMessageModel,
  params: SendMessageParams
  transactionId?: number
}

/**
 * Message sending queue.
 */
export class MessageSendQueue extends BaseQueue<MessageSendQueueTask, Message<any>> {
  protected _tag: string = 'MessageSendQueue';

  constructor(ctx: ChatUIContext) {
    super(ctx, 1, 5);
  }

  protected async _handle(opts: MessageSendQueueTask): Promise<NCResult<Message>> {
    const { channelIdentifier, message, params } = opts;
    params.needReceipt = this.ctx.isReadReceiptV5;
    params.pushConfig = this.ctx.store.getPushConfig(message);

    const channel = createNexconnChannel(channelIdentifier)!;

    const result = await channel.sendMessage(params);
    return result;
  }

  // Message sending cannot be canceled.
  protected _try2CancelExecutingTask(transactionId: number): boolean {
    return false
  }
}

type FileUploadQueueTask = {
  message: ChatUIMessageModel,
  transactionId: number,
  onProgress(loaded: number, total: number): void,
}

/**
 * File upload queue.
 */
export class FileUploadQueue extends BaseQueue<FileUploadQueueTask, { message: ChatUIMessageModel, httpUrl?: string }> {
  protected _tag: string = 'FileUploadQueue';

  private _uploaderMap: Map<Number, Helper.FileUploader> = new Map();

  private _getFileType(messageType: string): Helper.FileType {
    switch (messageType) {
      case MessageType.IMAGE:
      case MessageType.GIF:
        return Helper.FileType.IMAGE;
      case MessageType.SHORT_VIDEO:
        return Helper.FileType.SHORT_VIDEO;
      default:
        return Helper.FileType.FILE;
    }
  }

  protected async _handle(task: FileUploadQueueTask): Promise<NCResult<{ message: ChatUIMessageModel, httpUrl?: string }>> {
    const { message, transactionId, onProgress } = task;
    const file = message.file!;
    const fileType = this._getFileType(message.messageType);
    const result: { message: ChatUIMessageModel, httpUrl?: string } = { message };
    const uploadInfo: Helper.CreateFileUploaderParams = {
      file,
      fileType,
      onProgress,
      contentDisposition: 'attachment',
    };
    const traceId = this.logger.createTraceId();
    this.logger.info(LogTag.L_UPLOAD_FILE_T, `name: ${file.name}, size: ${file.size}`, traceId);

    const { isOk, data, code } = Helper.FileUploader.create(uploadInfo);
    if (!isOk) {
      // Upload failed.
      this.logger.warn(LogTag.L_UPLOAD_FILE_R, `code: ${code}`, traceId);
      return NCResult.fail(code, undefined, result);
    }

    const uploader = data!;
    this._uploaderMap.set(transactionId, uploader);

    const res = await uploader.result();
    if (!res.isOk) {
      this.logger.warn(LogTag.L_UPLOAD_FILE_R, `code: ${res.code}`, traceId);
      return NCResult.fail(res.code, undefined, result);
    }
    this.logger.info(LogTag.L_UPLOAD_FILE_R, 'success', traceId);
    result.httpUrl = res.data!.downloadUrl;
    return NCResult.ok(result);
  }

  protected _try2CancelExecutingTask(transactionId: number): boolean {
    const uploader = this._uploaderMap.get(transactionId);
    if (uploader) {
      uploader.stop();
      this._uploaderMap.delete(transactionId);
      return true;
    }
    return false
  }
}
