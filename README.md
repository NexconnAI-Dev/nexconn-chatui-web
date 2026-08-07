# Official Web Chat UI SDK for [Nexconn Chat](https://www.nexconn.ai/product/chat)

The official Web Components UI kit for [Nexconn Chat](https://www.nexconn.ai/product/chat). `@nexconn/chatui` provides Lit-based custom elements with the `nc-` prefix for adding a chat experience to web applications built with any framework that supports custom elements.

## Quick Links

- [Create a Nexconn account](https://console.nexconn.ai/agile/register)
- [Nexconn documentation](https://docs.nexconn.ai)
- [Chat demo](https://www.nexconn.ai/demos/chat)
- [Chat UI overview](https://www.nexconn.ai/product/chat#ui-showcase)
- [Release notes](https://docs.nexconn.ai/chatui-web/release-notes)

## Use Cases

With our component library, you can build a variety of chat use cases, including:

- Livestream chat like Twitch or YouTube.
- Team-style chat like Slack.
- Messaging-style chat like WhatsApp or Facebook Messenger.
- Customer support chat like Drift or Intercom.

## Chat UI Tutorial

Start with the [Nexconn documentation](https://docs.nexconn.ai) to create a Nexconn application and configure the Nexconn Chat SDK. This README then covers the ChatUI integration: provide profile hooks, initialize the application, register customizations, and mount the registered custom elements in your host application.

## Core Features

- **User Management**: Manage user profiles and relationships, with blocking and banning capabilities to help maintain a healthy community.
- **User Presence**: Track online, offline, and custom user states in real time for more precise communication.
- **Message Read Receipts**: Synchronize message read status across devices so senders can immediately see when messages have been read.
- **Rich Message Types**: Support text, emoji, images, voice, video, files, and custom messages out of the box.
- **Message Operations**: Send, delete, edit, reply to, forward, search, and retrieve message history.
- **Real-time Webhooks**: Receive real-time message, user, and group events to capture user activity accurately.
- **Broadcast Announcements**: Reach all users in an application, online users, tagged users, or selected users with targeted announcements.
- **Moderation & Safety**: Review message content intelligently, identify risks in real time, and help keep conversations safe.
- **Framework-friendly Web Components**: Embed Lit-based custom elements in applications built with frameworks that support custom elements.
- **Extensible UI**: Customize message components, language packs, input menus, emoji libraries, menus, and display configuration.

## Installation

Use Node.js 18.12 or newer. Install ChatUI together with its peer dependencies:

```bash
pnpm add @nexconn/chatui @nexconn/engine @nexconn/chat lit
```

Use versions of `@nexconn/engine` and `@nexconn/chat` that are compatible with the ChatUI release you install. These packages are closed-source Nexconn dependencies maintained and published through npm; their licensing is separate from the Apache-2.0 license for ChatUI.

## Quick Start

```ts
import { NCEngine } from '@nexconn/chat';
import { NCChatUIApplication } from '@nexconn/chatui';
import type { ServiceHooks } from '@nexconn/chatui';

async function startChatUI() {
  NCEngine.initialize({ appKey: 'your-app-key' });

  const hooks: ServiceHooks = {
    reqUserProfiles: async () => [],
    reqGroupProfiles: async () => [],
    reqSystemProfiles: async () => [],
    reqGroupMembers: async () => [],
  };

  const app = NCChatUIApplication.initialize({
    hooks,
    language: 'en_US',
  });

  if (!app) {
    throw new Error('Nexconn ChatUI initialization failed.');
  }

  app.ready();

  const result = await NCEngine.connect({ token: 'user-token-from-your-backend' });
  if (!result.isOk) {
    throw new Error('Nexconn Chat connection failed.');
  }
}

startChatUI();
```

Replace the sample hooks with authenticated requests to your backend before using ChatUI in production.

Mount the root element after `ready()` has registered the custom elements:

```html
<div id="chatui-root">
  <nc-chat-ui-app-provider></nc-chat-ui-app-provider>
</div>
```

The host element must have an explicit height:

```css
#chatui-root {
  height: 100vh;
}
```

## Usage

1. Call `NCChatUIApplication.initialize()` with your service hooks and optional configuration.
2. Configure custom messages, language packs, menus, emoji libraries, and display options before calling `ready()`.
3. Call `ready()` to register the built-in `nc-` custom elements, then render the required elements in a host container with an explicit size.
4. Use runtime APIs, such as channel operations and message sending, after the application is ready.
5. Call `destroy()` when the host application permanently removes ChatUI.

Do not embed application secrets or privileged service credentials in browser code. Obtain user-scoped authentication through your backend and follow the authentication requirements of the Nexconn SDK packages.

## Customization

ChatUI supports custom language packs and message components, input menu and emoji libraries, message bubble and channel item configuration, channel and message menu extensions, public event listeners, and command switches. See the generated API documentation and exports from `src/index.ts` for the complete API.

## Internationalization

ChatUI includes `en_US` and `zh_CN` language packs. Use `setLanguage()` to switch a supported language, or register an additional language pack before the application is ready.

## Documentation

See the [Nexconn documentation](https://docs.nexconn.ai) for product and SDK guidance. Generate the API reference locally with:

```bash
pnpm install --frozen-lockfile
pnpm run build:apidoc
```

The generated API documentation is written to `release/apidoc/`.

## Release Notes

See the [Nexconn ChatUI release notes](https://docs.nexconn.ai/chatui-web/release-notes) for version changes and upgrade information.

## Feedback

This repository is a read-only source mirror. Nexconn does not accept pull requests or feature requests for ChatUI. Report reproducible bugs through [GitHub Issues](https://github.com/NexconnAI-Dev/nexconn-chatui-web/issues); submitted bug reports do not create a commitment or delivery timeline.

## Support and Security

For support or private security reports, contact [support@nexconn.ai](mailto:support@nexconn.ai). Read [SECURITY.md](./SECURITY.md) before reporting a vulnerability.

## License

Copyright (c) 2026 Nexconn

Nexconn ChatUI is licensed under the [Apache License 2.0](./LICENSE). This license does not change the separate licensing of `@nexconn/chat` or `@nexconn/engine`.
