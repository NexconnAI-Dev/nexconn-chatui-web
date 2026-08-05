import { isMobileDevice } from '../helper';
import {
  EMOJI_PANEL_EMOJI_BTN_ICON, INPUT_ICON_EMOJI_HOVER_ICON,
  INPUT_ICON_EMOJI_ICON, INPUT_ICON_FILES_HOVER_ICON, INPUT_ICON_FILES_ICON,
  INPUT_ICON_IMAGES_HOVER_ICON, INPUT_ICON_IMAGES_ICON, INPUT_ICON_PHOTO_HOVER_ICON, INPUT_ICON_PHOTO_ICON,
} from '../assets';
import { ChatUIContext } from '../core/ChatUIContext';
import { ChatUIChannelModel } from '../models/NCUIChannelModel';
import { ChatUIModule } from './ChatUIModule';
import { NCEngine } from '@nexconn/chat';

/**
 * Built-in input panel menu item IDs
 * @description Identifiers for SDK's default input menu buttons
 */
export enum InputMenumID {
  /** Camera/photo capture button */
  PHOTO = 'input.menu.item.photo',
  /** Image picker button (allows multiple selection) */
  IMAGES = 'input.menu.item.images',
  /** File picker button (can select images as files) */
  FILES = 'input.menu.item.files',
  /** Emoji picker button */
  EMOJI = 'input.menu.item.emoji',
  /** Plus button (shows secondary menu) */
  PLUS = 'input.menu.item.plus',
}

/**
 * Character emoji library ID constant
 */
export const ChatUIEmojiLibraryID = 'ChatUIEmojiLibraryID';

/**
 * Input menu button position
 * @description Determines where the menu button is displayed
 */
export enum InputMenumPosition {
  /** Inside the Plus secondary menu */
  SECONDARY_MENU,
  /** Display on the left side of the input box */
  LEFT,
}

/**
 * Input menu item configuration
 * @description Defines a button in the input panel menu
 */
export interface InputMenumItem {
  /**
   * Menu item ID. Used in click events and for i18n text lookup.
   */
  id: InputMenumID | string,
  /**
   * Sort order. Lower values appear first when multiple items have the same position.
   */
  order: number,
  /**
   * Menu item icon URL
   */
  icon: string,
  /**
   * Hover state icon URL (optional)
   */
  hoverIcon?: string,
  /**
   * Filter function to control when this menu item is visible
   * @param model - Current channel model
   * @returns true to show, false to hide
   */
  filter?: (model: ChatUIChannelModel) => boolean,
  /**
   * Submenu items. If present, clicking this item shows a submenu instead of triggering an action.
   */
  submenu?: InputMenumItem[]
}

/**
 * Input menu configuration
 * @description Container for all input menu items
 */
export interface InputMenu {
  /** List of menu items */
  items: InputMenumItem[],
}

/**
 * Default menu configuration.
 */
const defaultMenu: InputMenu = {
  items: [
    {
      id: InputMenumID.EMOJI,
      order: 0,
      icon: INPUT_ICON_EMOJI_ICON,
      hoverIcon: INPUT_ICON_EMOJI_HOVER_ICON,
    },
    {
      id: InputMenumID.IMAGES,
      order: 1,
      icon: INPUT_ICON_IMAGES_ICON,
      hoverIcon: INPUT_ICON_IMAGES_HOVER_ICON,
    },
    {
      id: InputMenumID.FILES,
      order: 2,
      icon: INPUT_ICON_FILES_ICON,
      hoverIcon: INPUT_ICON_FILES_HOVER_ICON,
  },
    {
      id: InputMenumID.PHOTO,
      order: 3,
      icon: INPUT_ICON_PHOTO_ICON,
      hoverIcon: INPUT_ICON_PHOTO_HOVER_ICON,
      filter: () => (location.protocol === 'https:' || location.protocol === 'file' || location.hostname === 'localhost') && !isMobileDevice(),
    },
  ],
};

const cloneInputMenu = (menu: InputMenu): InputMenu => ({
  items: menu.items.map((item) => ({
    id: item.id,
    order: item.order,
    icon: item.icon,
    hoverIcon: item.hoverIcon,
    filter: item.filter,
    submenu: item.submenu ? item.submenu.map((subItem) => ({
      id: subItem.id,
      order: subItem.order,
      icon: subItem.icon,
      filter: subItem.filter,
      submenu: subItem.submenu, // Supports nested menus, though only two levels are currently implemented.
    })) : undefined,
  })),
});

/**
 * Image emoji library configuration
 * @description Defines a collection of image-based emojis/stickers
 */
export interface ImageEmojiLibrary {
  /**
   * Library ID, defined by the application
   */
  id: string,
  /**
   * Library icon URL, displayed as the emoji panel tab button
   */
  icon: string,
  /**
   * Display width for each emoji item in the panel
   */
  itemWidth: number,
  /**
   * Display height for each emoji item in the panel
   */
  itemHeight: number,
  /**
   * List of emoji items
   */
  items: Array<ImageEmoji>,
  /**
   * Sort order. Lower values appear first.
   */
  order: number,
}

/**
 * Image emoji thumbnail information
 * @description Thumbnail data for displaying in the emoji picker panel
 */
export interface ImageEmojiThumbnail {
  /**
   * Thumbnail data as base64 string. Used in the emoji panel to avoid bandwidth waste.
   */
  thumbnail: string,
  /**
   * Thumbnail width in pixels
   */
  thunbnailWidth: number;
  /**
   * Thumbnail height in pixels
   */
  thunbnailHeight: number;
}

/**
 * GIF image information
 * @description Metadata for GIF emoji/stickers
 */
export interface GifInfo {
  /**
   * GIF file size in bytes
   */
  size: number;
  /**
   * GIF width in pixels
   */
  width: number;
  /**
   * GIF height in pixels
   */
  height: number;
}

/**
 * Image emoji data
 * @description Represents a single image-based emoji or sticker
 */
export interface ImageEmoji {
  /**
   * Network URL for the emoji resource (e.g., https://example.com/emoji.png)
   * @description Ensure the URL is accessible from all client network environments
   */
  url: string,
  /**
   * Thumbnail information for static image emojis
   */
  imageThumbnail?: ImageEmojiThumbnail
  /**
   * GIF metadata for animated emojis
   */
  gifInfo?: GifInfo;
}

// Default supported emoji list.
const defaultEmojis: string[] = [
  // u+1f601 - u+1f64f
  '\u{1f601}', '\u{1f602}', '\u{1f603}', '\u{1f604}', '\u{1f605}', '\u{1f606}', '\u{1f607}', '\u{1f608}',
  '\u{1f609}', '\u{1f60a}', '\u{1f60b}', '\u{1f60c}', '\u{1f60d}', '\u{1f60e}', '\u{1f60f}', '\u{1f610}',
  '\u{1f611}', '\u{1f612}', '\u{1f613}', '\u{1f614}', '\u{1f615}', '\u{1f616}', '\u{1f617}', '\u{1f618}',
  '\u{1f619}', '\u{1f61a}', '\u{1f61b}', '\u{1f61c}', '\u{1f61d}', '\u{1f61e}', '\u{1f61f}', '\u{1f620}',
  '\u{1f621}', '\u{1f622}', '\u{1f623}', '\u{1f624}', '\u{1f625}', '\u{1f626}', '\u{1f627}', '\u{1f628}',
  '\u{1f629}', '\u{1f62a}', '\u{1f62b}', '\u{1f62c}', '\u{1f62d}', '\u{1f62e}', '\u{1f62f}', '\u{1f630}',
  '\u{1f631}', '\u{1f632}', '\u{1f633}', '\u{1f634}', '\u{1f635}', '\u{1f636}', '\u{1f637}', '\u{1f638}',
  '\u{1f639}', '\u{1f63a}', '\u{1f63b}', '\u{1f63c}', '\u{1f63d}', '\u{1f63e}', '\u{1f63f}', '\u{1f640}',
  '\u{1f641}', '\u{1f642}', '\u{1f643}', '\u{1f644}', '\u{1f645}', '\u{1f646}', '\u{1f647}', '\u{1f648}',
  '\u{1f649}', '\u{1f64a}', '\u{1f64b}', '\u{1f64c}', '\u{1f64d}', '\u{1f64e}', '\u{1f64f}',
  // u+1f910 - u+1f92f
  '\u{1f910}', '\u{1f911}', '\u{1f912}', '\u{1f913}', '\u{1f914}', '\u{1f915}', '\u{1f916}', '\u{1f917}',
  '\u{1f918}', '\u{1f919}', '\u{1f91a}', '\u{1f91b}', '\u{1f91c}', '\u{1f91d}', '\u{1f91e}', '\u{1f91f}',
  '\u{1f920}', '\u{1f921}', '\u{1f922}', '\u{1f923}', '\u{1f924}', '\u{1f925}', '\u{1f926}', '\u{1f927}',
  '\u{1f928}', '\u{1f929}', '\u{1f92a}', '\u{1f92b}', '\u{1f92c}', '\u{1f92d}', '\u{1f92e}', '\u{1f92f}',
];

/**
 * Character emoji library configuration
 * @description Defines the set of Unicode character emojis displayed in the emoji panel
 * @example
 * ```typescript
 * const library: ChatUIEmojiLibrary = {
 *   icon: 'emoji-tab-icon.svg',
 *   chats: ['😀', '😃', '😄', '😁', '😆', '😅']
 * };
 * ```
 */
export interface ChatUIEmojiLibrary {
  /**
   * Library icon URL, displayed as the emoji panel tab button
   */
  icon: string,
  /**
   * Array of Unicode character emojis
   */
  chats: string[],
}

const defaultChatEmojiLibrary: ChatUIEmojiLibrary = {
  icon: EMOJI_PANEL_EMOJI_BTN_ICON,
  chats: defaultEmojis,
};

const cloneChatEmojiLibrary = (library: ChatUIEmojiLibrary): ChatUIEmojiLibrary => ({
  icon: library.icon,
  chats: [...library.chats],
});

const cloneImageEmojiLibrary = (libraries: ImageEmojiLibrary[]): ImageEmojiLibrary[] => libraries.map((library) => ({
  id: library.id,
  icon: library.icon,
  itemWidth: library.itemWidth,
  itemHeight: library.itemHeight,
  items: library.items.map((item) => ({ ...item })),
  order: library.order,
}));

/**
 * Input configuration manager. Menu settings are global and do not change with the signed-in user.
 */
export class InputModule extends ChatUIModule {
  private _menu: InputMenu = cloneInputMenu(defaultMenu);

  public readonly menuList: InputMenumItem[] = [];

  public readonly chatEmojis: ChatUIEmojiLibrary = cloneChatEmojiLibrary(defaultChatEmojiLibrary);

  public readonly imageEmojis: ImageEmojiLibrary[] = [];

  constructor(ctx: ChatUIContext) {
    super(ctx);

    this.setInputMenu(defaultMenu);
  }

  private _inputMaxLength: number = 5000;

  public get inputMaxLength(): number {
    return this._inputMaxLength;
  }

  protected _onInit(): void {
    // No implementation required.
  }

  protected _onInitUserCache(): void {
    this._inputMaxLength = 5000;
  }

  protected _onDestroyUserCache(): void {
    // No implementation required.
  }

  public destroy(): void {
    this.chatEmojis.chats.length = 0;
    this.imageEmojis.length = 0;
    this.setInputMenu(defaultMenu);
  }

  /**
   * Get a copy of the input area button list.
   */
  cloneInputMenu(): InputMenu {
    return cloneInputMenu(this._menu);
  }

  /** ChatUIApplication ensures this function is called only before `ready`. */
  setInputMenu(menu: InputMenu): void {
    this._menu = cloneInputMenu(menu);
    this._resetMenu();
  }

  private _resetMenu(): void {
    // Clear existing data.
    this.menuList.length = 0;

    // Get the filtered menu.
    const { items } = this._menu;

    const sort = (a: InputMenumItem, b: InputMenumItem) => a.order - b.order;

    this.menuList.splice(0, this.menuList.length, ...items.sort(sort));
  }

  cloneChatEmojiLibrary(): ChatUIEmojiLibrary {
    return cloneChatEmojiLibrary(this.chatEmojis);
  }

  setChatEmojiLibrary(library: ChatUIEmojiLibrary): void {
    this.chatEmojis.chats.splice(0, this.chatEmojis.chats.length, ...library.chats);
    this.chatEmojis.icon = library.icon;
  }

  cloneImageEmojiLibraries(): ImageEmojiLibrary[] {
    return cloneImageEmojiLibrary(this.imageEmojis);
  }

  setImageEmojiLibraries(emojis: ImageEmojiLibrary[]): void {
    const newEmojis = cloneImageEmojiLibrary(emojis).sort((a, b) => a.order - b.order);
    this.imageEmojis.splice(0, this.imageEmojis.length, ...newEmojis);
  }
}
