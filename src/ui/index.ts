import { ChatUIContext } from '../core/ChatUIContext';

import { components } from './component';
import { providers } from './provider';

import { init, lang } from './i18n';
import {
  initProviderContext, setCustomMessageDigestHandler, regMessageTypeComponentTag,
  destroyUserCache,
} from './provider/context';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { CustomMessageRegistration, NCEngine, NCResult } from '@nexconn/chat';

/**
 * Custom element class
 */
export type CustomElementClass<T extends HTMLElement = HTMLElement> = new (...args: any[]) => T;

/**
 * Custom message component
 * @description Defines the Web Component tag and class for a custom message type
 */
export interface CustomMessageComponent {
  /**
   * Custom element tag name for the message component
   */
  tagName: string;
  /**
   * Web Component class for the custom message element
   */
  elementClass: CustomElementClass;
}

/**
 * Custom message registration configuration
 * @description Extends the SDK's CustomMessageRegistration with ChatUI-specific display options
 * @example
 * ```typescript
 * class GiftMessageElement extends HTMLElement {
 *   // ...
 * }
 *
 * const registration: ChatUICustomMessageRegistration = {
 *   messageType: 'custom:gift',
 *   isPersisted: true,
 *   isCounted: true,
 *   digest: (message, language) => {
 *     return language === 'en_US' ? '[Gift]' : '[Localized gift]';
 *   },
 *   component: {
 *     tagName: 'gift-message',
 *     elementClass: GiftMessageElement
 *   }
 * };
 * ```
 */
export interface ChatUICustomMessageRegistration extends CustomMessageRegistration {
  /**
   * Custom digest function to generate a summary text for the channel list
   * @param message - The message model
   * @param language - Current language code (e.g., 'en_US')
   * @returns Digest text displayed in the channel list
   */
  digest?: (message: ChatUIMessageModel, language: string) => string
  /**
   * Custom Web Component to render this message type in the chat panel
   */
  component?: CustomMessageComponent,
}

export class UIModule {
  /**
   * Custom message components registered by the application.
   */
  private readonly _customMessageComponents: Record<string, any> = {};

  /**
   * Overridable components.
   */
  // private readonly _overrideAbleComponents: Record<string, any> = { ...overrideAbleComponents };

  constructor(private readonly ctx: ChatUIContext) {
    // Initialize i18n.
    init(ctx);
    // Initialize the provider context.
    initProviderContext(ctx);
  }

  // public registerCustomElement<T extends keyof OverrideAbleComponentProps>(tag: T, opt: DefineCustomElementOptions): void {
  //   const originTag = OverrideAbleComponentTagInner[tag];
  //   // Replace the component tag definition.
  //   this._overrideAbleComponents[originTag] = opt.elementClass;
  // }

  /**
   * Registers custom elements with the browser.
   */
  public registerDOMElements(): void {
    // // Register overridable components.
    // Object.entries(this._overrideAbleComponents).forEach(([tagName, elementClass]) => {
    //   if (!customElements.get(tagName)) {
    //     customElements.define(tagName, elementClass);
    //   }
    // });

    // Register native Lit custom elements.
    Object.entries(components).forEach(([tagName, elementClass]) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, elementClass);
      }
    });

    // Register custom message components.
    Object.entries(this._customMessageComponents).forEach(([tagName, elementClass]) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, elementClass);
      }
    });

    // Register Lit provider components.
    Object.entries(providers).forEach(([tagName, elementClass]) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, elementClass);
      }
    });
  }

  /**
   * Registers custom messages.
   * @param messageType
   * @param options
   */
  registerCustomMessages(params: ChatUICustomMessageRegistration[]): NCResult {
    NCEngine.registerCustomMessages(params);
    params.forEach((param) => {
      if (param.digest) {
        setCustomMessageDigestHandler(param.messageType, param.digest);
      }
      if (param.component) {
        const { component } = param;
        // Add the `nc-c-` prefix so demo configuration detects Web Component tags consistently.
        const tagName = `nc-c-${component.tagName}`;
        regMessageTypeComponentTag(param.messageType, tagName);
        this._customMessageComponents[tagName] = component.elementClass;
      }
    });
    return NCResult.ok();
  }

  public destroy(): void {
    destroyUserCache();
    // Reset the default language.
    lang.value = 'zh_CN'
  }
}
