import { LitElement, css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import {
  BaseChannel,
  ChannelType,
  MessageReactionUser,
  MessageReactionUsersQuery,
} from '@nexconn/chat';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { ICacheUserProfile } from '@lib/modules/appdata/UserCache';
import { I18nController } from '../../i18n/lit';
import { ctx, getSelectedGroupMember } from '../context';

interface ReactionUserItem {
  userId: string;
  name: string;
  avatarUrl: string;
}

export class ModalReactionsDetailProvider extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .reactions-detail-panel {
      display: flex;
      flex-direction: column;
      width: 520px;
      height: 460px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      overflow: hidden;
      background: #FFFFFF;
      border-radius: 6px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }

    .reactions-detail-header {
      flex-shrink: 0;
      padding: 16px 20px;
      color: #020814;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      border-bottom: 1px solid #E5E5E5;
    }

    .reactions-detail-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .reactions-tab-list {
      display: flex;
      flex-shrink: 0;
      flex-direction: column;
      gap: 8px;
      width: 120px;
      padding: 12px 16px;
      overflow-y: auto;
      border-right: 1px solid #E5E5E5;
      box-sizing: border-box;
    }

    .reactions-tab-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 12px;
      color: #41464F;
      font-size: 14px;
      white-space: nowrap;
      background-color: #F3F5FA;
      border: 0;
      border-radius: 14px;
      cursor: pointer;
    }

    .reactions-tab-item:hover {
      background-color: #E3E7EF;
    }

    .reactions-tab-item-active {
      color: #FFFFFF;
      background-color: #0047FF;
    }

    .tab-emoji {
      font-size: 16px;
    }

    .tab-count {
      font-size: 12px;
    }

    .reactions-user-list {
      flex: 1;
      min-width: 0;
      padding: 12px 0;
      overflow-y: auto;
    }

    .reactions-user-loading {
      padding: 20px;
      color: #7C838E;
      font-size: 14px;
      text-align: center;
    }

    .reactions-user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
    }

    .user-name {
      min-width: 0;
      overflow: hidden;
      color: #41464F;
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel;

  @property({ type: String })
  declare initialReactionId: string | undefined;

  @query('.reactions-user-list')
  private declare userListEl: HTMLElement | undefined;

  @state()
  private declare selectedReactionId: string;

  @state()
  private declare loadingMore: boolean;

  @state()
  private declare userList: ReactionUserItem[];

  private i18n = new I18nController(this);
  private query: MessageReactionUsersQuery | null = null;
  private requestGeneration = 0;

  connectedCallback() {
    super.connectedCallback();
    this.userList = [];
    this.loadingMore = false;
    const initialReaction = this.message?.reactions.find(
      reaction => reaction.reactionId === this.initialReactionId,
    );
    this.selectReaction(initialReaction?.reactionId || this.message?.reactions[0]?.reactionId || '');
  }

  disconnectedCallback() {
    this.requestGeneration += 1;
    this.query = null;
    super.disconnectedCallback();
  }

  private selectReaction(reactionId: string) {
    if (!reactionId || (reactionId === this.selectedReactionId && this.query)) return;
    this.selectedReactionId = reactionId;
    this.userList = [];
    this.loadingMore = false;
    this.userListEl?.scrollTo({ top: 0 });
    const generation = ++this.requestGeneration;
    this.query = BaseChannel.createMessageReactionUsersQuery({
      channelIdentifier: this.message.channelIdentifier,
      messageId: this.message.messageId,
      reactionId,
      count: 50,
    });
    void this.loadNextPage(generation, reactionId, this.query);
  }

  private async loadNextPage(
    generation = this.requestGeneration,
    reactionId = this.selectedReactionId,
    query = this.query,
  ) {
    if (!query || !query.hasNext || this.loadingMore || query.isLoading) return;
    this.loadingMore = true;
    let result: Awaited<ReturnType<MessageReactionUsersQuery['loadNextPage']>>;
    try {
      result = await query.loadNextPage();
    } catch (error) {
      if (this.isCurrentRequest(generation, reactionId, query)) {
        this.loadingMore = false;
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
        ctx().alert('alert.imlib.failed.generic', code);
      }
      return;
    }
    if (!this.isCurrentRequest(generation, reactionId, query)) return;

    if (!result.isOk) {
      this.loadingMore = false;
      ctx().alert('alert.imlib.failed.generic', result.code);
      return;
    }

    const users = result.data?.data || [];
    const resolvedUsers = await this.resolveUsers(users);
    if (!this.isCurrentRequest(generation, reactionId, query)) return;

    const knownUserIds = new Set(this.userList.map(user => user.userId));
    this.userList = [
      ...this.userList,
      ...resolvedUsers.filter(user => !knownUserIds.has(user.userId)),
    ];
    this.loadingMore = false;
  }

  private isCurrentRequest(
    generation: number,
    reactionId: string,
    query: MessageReactionUsersQuery,
  ): boolean {
    return this.isConnected
      && generation === this.requestGeneration
      && reactionId === this.selectedReactionId
      && query === this.query;
  }

  private async resolveUsers(users: MessageReactionUser[]): Promise<ReactionUserItem[]> {
    const userIds = [...new Set(users.map(user => user.userId))];
    let profiles: ICacheUserProfile[] = [];
    try {
      profiles = await ctx().appData.requestUserProfiles(userIds);
    } catch (_) {
      // Missing profiles fall through to group data or the user ID.
    }
    const profilesById = new Map(profiles.map(profile => [profile.userId, profile]));
    return userIds.map((userId) => {
      const profile = profilesById.get(userId);
      const member = this.message.channelType === ChannelType.GROUP
        ? getSelectedGroupMember(userId)
        : undefined;
      return {
        userId,
        name: member?.nickname || profile?.name || member?.name || userId,
        avatarUrl: profile?.avatarUrl || member?.avatarUrl || '',
      };
    });
  }

  private handleScroll() {
    if (!this.query?.hasNext || this.loadingMore) return;
    const element = this.userListEl;
    if (!element) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 20) {
      void this.loadNextPage();
    }
  }

  private handleClose = () => {
    this.requestGeneration += 1;
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  };

  render() {
    return html`
      <nc-modal-provider @click=${this.handleClose}>
        <div class="reactions-detail-panel" @click=${(event: Event) => event.stopPropagation()}>
          <div class="reactions-detail-header">${this.i18n.t('reaction.detail.title')}</div>
          <div class="reactions-detail-body">
            <div class="reactions-tab-list">
              ${this.message?.reactions.map(reaction => html`
                <button
                  class="reactions-tab-item ${this.selectedReactionId === reaction.reactionId ? 'reactions-tab-item-active' : ''}"
                  type="button"
                  @click=${() => this.selectReaction(reaction.reactionId)}
                >
                  <span class="tab-emoji">${reaction.reactionId}</span>
                  <span class="tab-count">${reaction.totalCount > 99 ? '99+' : reaction.totalCount}</span>
                </button>
              `)}
            </div>
            <div class="reactions-user-list" @scroll=${this.handleScroll}>
              ${this.userList.map(user => html`
                <div class="reactions-user-item">
                  <nc-icon
                    .url=${user.avatarUrl}
                    .width=${32}
                    .height=${32}
                    .radius=${50}
                    .online=${false}
                  ></nc-icon>
                  <span class="user-name">${user.name}</span>
                </div>
              `)}
              ${this.loadingMore ? html`
                <div class="reactions-user-loading">${this.i18n.t('reaction.detail.loading')}</div>
              ` : nothing}
            </div>
          </div>
        </div>
      </nc-modal-provider>
    `;
  }
}
