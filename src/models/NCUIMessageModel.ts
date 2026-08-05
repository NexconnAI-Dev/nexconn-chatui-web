import { ChannelIdentifier, Message, MessageReadReceiptInfo, SentStatus, MessageDirection, Helper, SendMessageParams } from "@nexconn/chat";

/**
 * Message model representing a single message in a conversation
 * @description Wraps the SDK's Message object with additional UI-specific properties
 */
export class ChatUIMessageModel<T extends Record<string, any> = Record<string, any>> {
  public readonly message: Message<T>;

  /**
   * Send transaction ID. Locally created messages include this ID to match related events.
   */
  public transactionId?: number;
  /**
   * Upload progress
   * * 100 indicates completion
   * * -1 indicates failure
   */
  public progress?: number;
  /**
   * File awaiting upload
   */
  public file?: File;
  /* V5 read receipt data used by UI bindings. */
  public readReceiptInfo?: MessageReadReceiptInfo;

  /**
   * Constructor for creating a message model, internal use only
   * @private Internal use only
   * @hidden
   */
  constructor(message: Message) {
    this.message = message;
  }

  public get messageId(): string {
    return this.message.messageId;
  }

  public set messageId(id: string) {
    this.message.messageId = id;
  }

  public get sentTime(): number {
    return this.message.sentTime;
  }

  public set sentTime(time: number) {
    this.message.sentTime = time;
  }

  public get direction() {
    return this.message.direction;
  }

  public set direction(direction: MessageDirection) {
    this.message.direction = direction;
  }

  public get content() {
    return this.message.content;
  }

  public get messageType() {
    return this.message.messageType;
  }

  public get isStatusMessage() {
    return this.message.isStatusMessage;
  }

  public get senderUserId() {
    return this.message.senderUserId;
  }

  public set senderUserId(userId: string) {
    this.message.senderUserId = userId;
  }

  public get channelIdentifier(): ChannelIdentifier {
    return this.message.channelIdentifier;
  }

  public get channelType() {
    return this.message.channelIdentifier.channelType;
  }

  public get isPersisted() {
    return this.message.isPersisted;
  }

  public get isCounted() {
    return this.message.isCounted;
  }

  public get sentStatus(): SentStatus {
    return this.message.sentStatus;
  }

  public set sentStatus(status: SentStatus) {
    this.message.sentStatus = status;
  }

  public get clientId() {
    return this.message.clientId;
  }

  public set clientId(id: number) {
    this.message.clientId = id;
  }

  public get sentReceipt(): boolean {
    return this.message.sentReceipt || false;
  }

  public set sentReceipt(value: boolean) {
    this.message.sentReceipt = value;
  }

  public get needReceipt() {
    return this.message.needReceipt;
  }

  public clone(): ChatUIMessageModel {
    const params: SendMessageParams<any> = new SendMessageParams(this.content, this.messageType);
    const msg = Helper.createMessage(this.channelIdentifier, params);
    msg.directedUserIds = this.message.directedUserIds;
    msg.sentReceipt = this.message.sentReceipt;
    msg.needReceipt = this.message.needReceipt;
    msg.clientId = this.message.clientId;
    msg.messageId = this.message.messageId;
    msg.directedUserIds = this.message.directedUserIds;
    msg.sentTime = this.message.sentTime;
    msg.direction = this.message.direction;
    msg.senderUserId = this.senderUserId;
    msg.disableNotification = this.message.disableNotification;
    msg.hasChanged = this.message.hasChanged;
    msg.metadata = this.message.metadata;
    msg.updateInfo = this.message.updateInfo;
    msg.disableUpdateLastMessage = this.message.disableUpdateLastMessage;
    msg.sentStatus = this.message.sentStatus;
    const clone = new ChatUIMessageModel(msg);
    clone.transactionId = this.transactionId;
    clone.progress = this.progress;
    clone.file = this.file;
    clone.readReceiptInfo = this.readReceiptInfo;
    return clone;
  }

  isEqual(message: ChatUIMessageModel): boolean {
    return (this.messageId && this.messageId === message.messageId)
    || (!!this.transactionId && this.transactionId === message.transactionId);
  }
}
