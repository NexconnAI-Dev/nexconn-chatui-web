/**
 * Examples of i18n in Lit components.
 *
 * Shows how I18nController provides reactive localization in Lit components.
 */

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { I18nController } from './lit';

/**
 * Example 1: Basic usage.
 *
 * Each localized component creates an I18nController instance.
 * The component updates automatically when the language changes.
 */
@customElement('example-basic')
export class ExampleBasic extends LitElement {
  // Create an i18n controller.
  private i18n = new I18nController(this);

  render() {
    return html`
      <div>
        <!-- Get translated text with this.i18n.t(). -->
        <h1>${this.i18n.t('channel.loading.msg')}</h1>
        <p>${this.i18n.t('message.list.read-receipt.tooltip.read-count', '5')}</p>
      </div>
    `;
  }
}

/**
 * Example 2: Nested components.
 *
 * Parent and child components can use I18nController independently.
 * Both update on language changes without recreating the child instance.
 */
@customElement('example-parent')
export class ExampleParent extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`
      <div>
        <h1>${this.i18n.t('channel.draft.msg')}</h1>
        <!-- The child responds to language changes independently. -->
        <example-child></example-child>
      </div>
    `;
  }
}

@customElement('example-child')
export class ExampleChild extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`<p>${this.i18n.t('message.list.back')}</p>`;
  }
}

/**
 * Example 3: Pass translations through properties for presentational components.
 *
 * Presentational components can omit I18nController.
 * The parent passes translated text instead.
 */
@customElement('example-pure-display')
export class ExamplePureDisplay extends LitElement {
  @property() text: string = '';

  render() {
    return html`<div>${this.text}</div>`;
  }
}

@customElement('example-parent-with-pure-child')
export class ExampleParentWithPureChild extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`
      <!-- The parent translates the text and passes it to the child. -->
      <example-pure-display .text=${this.i18n.t('message.list.select')}></example-pure-display>
    `;
  }
}
