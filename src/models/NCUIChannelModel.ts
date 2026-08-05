import { ChannelIdentifier, ChannelNoDisturbLevel, ChannelType } from "@nexconn/chat";
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ChatUIMentionedType } from "@lib/enums/ChatUIMentionedType";

/**
 * Channel model for a single entry in the channel list
 * @description Holds display and state data for that channel
 */
export class ChatUIChannelModel {
  public readonly channelIdentifier: ChannelIdentifier;

  /**
   * Constructor for creating a channel model, internal use only
   * @private Internal use only
   * @hidden
   */
  constructor(channelIdentifier: ChannelIdentifier) {
    this.channelIdentifier = channelIdentifier;
  }

  get channelId(): string {
    return this.channelIdentifier.channelId;
  }

  get channelType(): ChannelType {
    return this.channelIdentifier.channelType;
  }

  public name: string = '';

  public avatarUrl: string = '';

  public draft: string = '';

  public latestMessage: null | ChatUIMessageModel = null;

  public isPinned: boolean = false;

  public noDisturbLevel: ChannelNoDisturbLevel = ChannelNoDisturbLevel.ALL_MESSAGE;

  public unreadCount: number = 0;

  public updateTime: number = 0;

  /** Online status. `false` when display is disabled, no query hook is configured, or the channel is not direct. */
  public online: boolean = false;

  /** Group member count. Always 0 for direct channels. */
  public memberCount: number = 0;

  /** Aggregated mention type for group channels. */
  public mentionedType: ChatUIMentionedType = ChatUIMentionedType.NONE;


  public clone(): ChatUIChannelModel {
    const channel = new ChatUIChannelModel(this.channelIdentifier);
    channel.name = this.name;
    channel.avatarUrl = this.avatarUrl;
    channel.draft = this.draft;
    channel.latestMessage = this.latestMessage ? this.latestMessage.clone() : null;
    channel.isPinned = this.isPinned;
    channel.noDisturbLevel = this.noDisturbLevel;
    channel.unreadCount = this.unreadCount;
    channel.updateTime = this.updateTime;
    channel.online = this.online;
    channel.memberCount = this.memberCount;
    channel.mentionedType = this.mentionedType;
    return channel;
  }
}
