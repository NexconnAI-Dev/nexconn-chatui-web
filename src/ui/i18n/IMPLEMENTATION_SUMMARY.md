# i18n Implementation Summary

## Files

- `src/ui/i18n/core.ts`: i18n core that publishes language changes through the native `EventTarget` API.
- `src/ui/i18n/signal.ts`: Reactive API built on the project `Signal`; exports `$t()`, `$tt()`, `$has()`, `lang`, and `direction`.
- `src/ui/i18n/lit.ts`: Lit Reactive Controller for Lit Web Components.
- `src/ui/i18n/lit-example.ts`: Lit usage examples.
- `src/ui/i18n/README.md`: Usage documentation.

## Architecture

```text
ChatUIContext
    ↓
InnerEvent.LANGUAGE_CHANGE
    ↓
i18n core (EventTarget)
    ├─→ Signal API
    └─→ I18nController
```

## Core Features

- `core.ts` tracks the current language and writing direction.
- `core.ts` dispatches a `languagechange` event when the language changes.
- `signal.ts` synchronizes language state to the project `Signal` implementation.
- `$t()` returns a `DerivedSignal<string>` that becomes dirty and recomputes after a language change.
- `$tt()` returns translated text for the current language synchronously.
- `$has()` checks whether the current language defines an entry.
- `I18nController` manages the Lit component lifecycle and calls `host.requestUpdate()` after language changes.

## Reactive Updates

### Signal API

```typescript
const text = $t('key');

console.log(text.value);
```

- When `lang.value` changes, dependent `DerivedSignal` instances become dirty.
- The translation is recomputed the next time `text.value` is read.

### Lit Components

```typescript
private i18n = new I18nController(this);
```

- `i18nCore` dispatches a `languagechange` event.
- `I18nController` receives the event and calls `host.requestUpdate()`.
- The Lit component renders again.

## Usage Guidelines

- Use `I18nController` for application components that respond to language changes independently.
- Pass translated text through properties to presentational components to reduce listener count.
- Use `$tt()` for synchronous translations outside components.
- Use the `DerivedSignal` from `$t()` for reactive text outside Lit components.

## Performance

- Each `I18nController` listens for the global event.
- On pages with many components, avoid creating an `I18nController` for every presentational component.
- `I18nController` removes its listener when the component disconnects to prevent memory leaks.
