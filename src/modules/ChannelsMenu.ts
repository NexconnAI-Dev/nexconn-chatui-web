import { ChannelNoDisturbLevel } from '@nexconn/chat';
import { ChatUIChannelModel } from '../models/NCUIChannelModel';
import { ChatUIModule } from './ChatUIModule';
import {
  CHANNELS_MENU_DELETE_ICON,
  CHANNELS_MENU_MUTE_ICON,
  CHANNELS_MENU_PIN_ICON,
  CHANNELS_MENU_UNMUTE_ICON,
  CHANNELS_MENU_UNPIN_ICON,
} from '../assets';
import { ChannelsMenuItemClickEvent, ChatUIEvents } from '@lib/core/EventDefined';

/**
 * Channel list context menu item IDs
 * @description Built-in menu item identifiers for channel operations
 */
export enum ChannelsMenuID {
  /** Pin channel to top */
  PIN = 'channel.menu.item.pin',
  /** Unpin channel */
  UNPIN = 'channel.menu.item.unpin',
  /** Mute channel notifications */
  MUTE = 'channel.menu.item.mute',
  /** Unmute channel notifications */
  UNMUTE = 'channel.menu.item.unmute',
  /** Delete channel */
  REMOVE = 'channel.menu.item.remove',
}

/**
 * Channel list context menu item configuration
 * @description Defines a menu item shown when right-clicking or long-pressing a channel
 */
export interface ChannelsMenuItem {
  /**
   * Menu item ID. Used in click events and for i18n text lookup.
   */
  id: ChannelsMenuID | string,
  /**
   * Menu item icon URL
   */
  icon: string,
  /**
   * Filter function to control when this menu item is visible
   * @param model - Channel model
   * @returns true to show the menu item, false to hide it
   */
  filter?: (model: ChatUIChannelModel) => boolean,
}

const defaultMenu: ChannelsMenuItem[] = [
  {
    id: ChannelsMenuID.PIN,
    icon: CHANNELS_MENU_PIN_ICON,
    filter: (model: ChatUIChannelModel) => !model.isPinned,
  },
  {
    id: ChannelsMenuID.UNPIN,
    icon: CHANNELS_MENU_UNPIN_ICON,
    filter: (model: ChatUIChannelModel) => model.isPinned,
  },
  {
    id: ChannelsMenuID.MUTE,
    icon: CHANNELS_MENU_MUTE_ICON,
    filter: (model: ChatUIChannelModel) => model.noDisturbLevel !== ChannelNoDisturbLevel.MUTED,
  },
  {
    id: ChannelsMenuID.UNMUTE,
    icon: CHANNELS_MENU_UNMUTE_ICON,
    filter(model) {
      return model.noDisturbLevel === ChannelNoDisturbLevel.MUTED;
    },
  },
  {
    id: ChannelsMenuID.REMOVE,
    icon: CHANNELS_MENU_DELETE_ICON,
  },
];

const cloneChannelsMenu = (menu: ChannelsMenuItem[]): ChannelsMenuItem[] => menu.map((item) => ({
  ...item,
}));

export class ChannelsMenu extends ChatUIModule {
  private _menu: ChannelsMenuItem[] = cloneChannelsMenu(defaultMenu);

  protected _onInit(): void {
    this.ctx.addEventListener(ChatUIEvents.CHANNELS_MENU_ITEM_CLICK, this._onMenuItemClick, this);
  }

  protected _onInitUserCache(): void {
    // No implementation required.
  }

  protected _onDestroyUserCache(): void {
    // No implementation required.
  }

  public destroy(): void {
    this._menu = cloneChannelsMenu(defaultMenu);
  }

  /**
   * Handle a channel menu item click.
   * @param event
   */
  private _onMenuItemClick(event: ChannelsMenuItemClickEvent): void {
    const { id, channelModel } = event.data;
    switch (id) {
      case ChannelsMenuID.PIN:
        this.ctx.channelModule.setChannelPinned(channelModel.channelIdentifier, true);
        break;
      case ChannelsMenuID.UNPIN:
        this.ctx.channelModule.setChannelPinned(channelModel.channelIdentifier, false);
        break;
      case ChannelsMenuID.MUTE:
        this.ctx.channelModule.setNoDisturbLevel(channelModel.channelIdentifier, ChannelNoDisturbLevel.MUTED);
        break;
      case ChannelsMenuID.UNMUTE:
        this.ctx.channelModule.setNoDisturbLevel(channelModel.channelIdentifier, ChannelNoDisturbLevel.ALL_MESSAGE);
        break;
      case ChannelsMenuID.REMOVE:
        this.ctx.channelModule.deleteChannel(channelModel.channelIdentifier);
        break;
      default:
        // Custom application menu items are handled externally.
        break;
    }
  }

  /**
   * Get channel menu items after applying their filters.
   * @param model
   */
  getMenum(model: ChatUIChannelModel): ChannelsMenuItem[] {
    return this._menu.filter((item) => !item.filter || item.filter(model));
  }

  cloneChannelsMenu(): ChannelsMenuItem[] {
    return cloneChannelsMenu(this._menu);
  }

  setChannelsMenu(menu: ChannelsMenuItem[]): void {
    this._menu = cloneChannelsMenu(menu);
  }
}
