import { LitElement, css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ChannelType } from '@nexconn/chat';
import { ChatUIEvent } from '@lib/core/ChatUIEvent';
import { ChatUIEvents, InnerEvent } from '@lib/core/EventDefined';
import { ChatUIMessageModel, ChatUIMessageReaction } from '@lib/models/NCUIMessageModel';
import { ICacheUserProfile } from '@lib/modules/appdata/UserCache';
import { SignalController } from '../SignalController';
import { ctx, getSelectedGroupMember, selectedGroupMembersVersion } from './context';

export class MessageReactionsProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 100%;
    }

    .nc-message-reactions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 100%;
    }
  `;

  @property({ type: Array })
  declare reactions: ChatUIMessageReaction[];

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  @property({ type: Boolean })
  declare align: boolean | undefined;

  @state()
  private declare reactionNames: Map<string, string[]>;

  private signalController = new SignalController(this, [selectedGroupMembersVersion]);
  private lookupKey = '';
  private lookupVersion = 0;

  connectedCallback() {
    super.connectedCallback();
    this.reactionNames = new Map();
  }

  disconnectedCallback() {
    this.lookupVersion += 1;
    this.reactionNames = new Map();
    super.disconnectedCallback();
  }

  protected willUpdate() {
    const nextKey = this.getLookupKey();
    if (nextKey === this.lookupKey) return;
    this.lookupKey = nextKey;
    void this.updateReactionNames();
  }

  private get showUsers(): boolean {
    return ctx().isShowMessageReactUsersEnabled;
  }

  private getLookupKey(): string {
    if (!this.showUsers || !this.message || !this.reactions?.length) return '';
    const reactionKey = this.reactions
      .map(reaction => `${reaction.reactionId}:${reaction.users.join(',')}`)
      .join('|');
    const memberKey = this.message.channelType === ChannelType.GROUP
      ? selectedGroupMembersVersion.value
      : 0;
    return `${this.message.channelType}:${this.message.channelIdentifier.channelId}:${reactionKey}:${memberKey}`;
  }

  private async updateReactionNames() {
    const requestVersion = ++this.lookupVersion;
    const reactions = this.reactions || [];
    if (!this.showUsers || !this.message || reactions.length === 0) {
      this.reactionNames = new Map();
      return;
    }

    const userIds = [...new Set(reactions.flatMap(reaction => reaction.users))];
    if (userIds.length === 0) {
      this.reactionNames = new Map();
      return;
    }

    this.reactionNames = new Map(reactions.map(reaction => [
      reaction.reactionId,
      [...reaction.users],
    ]));

    let profiles: ICacheUserProfile[] = [];
    try {
      profiles = await ctx().appData.requestUserProfiles(userIds);
    } catch (_) {
      // User IDs already provide the required fallback presentation.
    }
    if (requestVersion !== this.lookupVersion || this.getLookupKey() !== this.lookupKey) return;

    const profileById = new Map(profiles.map(profile => [profile.userId, profile]));
    this.reactionNames = new Map(reactions.map(reaction => [
      reaction.reactionId,
      reaction.users.map((userId) => {
        const member = this.message.channelType === ChannelType.GROUP
          ? getSelectedGroupMember(userId)
          : undefined;
        return member?.nickname || profileById.get(userId)?.name || member?.name || userId;
      }),
    ]));
    ctx().dispatchEvent(new ChatUIEvent(InnerEvent.ADJUST_MESSAGE_LIST_SCROLL));
  }

  private handleReactionClick(event: CustomEvent<ChatUIMessageReaction[]>) {
    const reaction = event.detail?.[0];
    if (!reaction) return;
    void ctx().message.updateMessageReaction(
      this.message,
      reaction.reactionId,
      reaction.hasCurrentUserReacted,
    );
  }

  private handleDetailClick(event: CustomEvent<ChatUIMessageReaction[]>) {
    const reaction = event.detail?.[0];
    if (!reaction) return;
    ctx().emit(new ChatUIEvent(ChatUIEvents.REACTIONS_DETAIL_EVENT, {
      message: this.message.clone(),
      reactionId: reaction.reactionId,
    }));
  }

  render() {
    if (!ctx().isMessageReactionEnabled || !this.reactions?.length) return nothing;
    return html`
      <div class="nc-message-reactions">
        ${this.reactions.map(reaction => html`
          <nc-reaction
            .reaction=${reaction}
            .showUsers=${this.showUsers}
            .names=${this.reactionNames.get(reaction.reactionId)}
            .align=${this.align}
            @reaction-click=${this.handleReactionClick}
            @detail-click=${this.handleDetailClick}
          ></nc-reaction>
        `)}
      </div>
    `;
  }
}
