# i18n Localization

## Architecture

```text
ChatUIContext
    ↓ InnerEvent.LANGUAGE_CHANGE
i18n core (EventTarget)
    ├─→ signal.ts ($t / $tt / $has / lang / direction)
    └─→ lit.ts (I18nController)
```

## Files

- `core.ts`: Framework-agnostic i18n core that publishes language changes through `EventTarget`.
- `signal.ts`: Reactive API built on the project `Signal`; exports `$t()`, `$tt()`, `$has()`, `lang`, and `direction`.
- `lit.ts`: Lit adapter that provides the `I18nController` Reactive Controller.
- `lit-example.ts`: Usage examples for Lit components.

## Lit Components

### Option 1: Use I18nController (Recommended)

Use this for components that respond to language changes independently.

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { I18nController } from '@lib/ui/i18n';

@customElement('my-component')
export class MyComponent extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`
      <div>${this.i18n.t('hello')}</div>
      <div>${this.i18n.t('welcome', 'User')}</div>
    `;
  }
}
```

How it works:

1. `i18nCore` dispatches a `languagechange` event.
2. `I18nController` receives the event and calls `host.requestUpdate()`.
3. The component renders again, and `this.i18n.t()` returns text for the new language.

Lifecycle:

- `hostConnected()`: Starts listening when the component connects to the DOM.
- `hostDisconnected()`: Stops listening when the component disconnects to prevent memory leaks.

### Option 2: Pass Text Through Properties

Use this for presentational components that do not need independent language updates.

```typescript
@customElement('display-text')
export class DisplayText extends LitElement {
  @property() text: string = '';

  render() {
    return html`<div>${this.text}</div>`;
  }
}

@customElement('parent-component')
export class ParentComponent extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`
      <display-text .text=${this.i18n.t('some_text')}></display-text>
    `;
  }
}
```

## Signal API

`$t()` returns a derived `Signal` for observing language changes outside a Lit controller.

```typescript
import { $t, $tt, $has, lang, direction } from '@lib/ui/i18n';

const text = $t('channel.loading.msg');

console.log(text.value);
console.log($tt('channel.loading.msg'));
console.log($has('channel.loading.msg'));
console.log(lang.value, direction.value);
```

## API Reference

### I18nController

```typescript
class I18nController {
  t(key: string, ...args: Array<string | number>): string;
  has(key: string): boolean;
  get lang(): string;
  get direction(): 'ltr' | 'rtl';
}
```

### Signal API

```typescript
function $t(key: keyof LanguagePackEntries, ...args: Array<string | number>): DerivedSignal<string>;
function $tt(key: keyof LanguagePackEntries, ...args: Array<string | number>): string;
function $has(key: keyof LanguagePackEntries): boolean;

const lang: Signal<string>;
const direction: Signal<'ltr' | 'rtl'>;
```

## Nested Component Rendering

When a parent renders again, Lit updates the existing child instance instead of recreating it.

```typescript
@customElement('parent-component')
class ParentComponent extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`
      <div>${this.i18n.t('parent_text')}</div>
      <child-component></child-component>
    `;
  }
}

@customElement('child-component')
class ChildComponent extends LitElement {
  private i18n = new I18nController(this);

  render() {
    return html`<div>${this.i18n.t('child_text')}</div>`;
  }
}
```

Language update flow:

1. `i18nCore` dispatches a `languagechange` event.
2. The parent `I18nController` calls `parent.requestUpdate()`.
3. The child `I18nController` calls `child.requestUpdate()`.
4. The parent renders again with the same `<child-component>` position and type.
5. Lit preserves the child instance and updates only the changed content.

## Performance

Each `I18nController` listens for the global `languagechange` event. For pages with many components, pass translated text to presentational components through properties to reduce listener count.
