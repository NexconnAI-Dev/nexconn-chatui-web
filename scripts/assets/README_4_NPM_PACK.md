# Nexconn ChatUI SDK

## Source Repository

[NexconnAI-Dev/nexconn-chatui-web](https://github.com/NexconnAI-Dev/nexconn-chatui-web)

## Install

`@nexconn/chatui` expects the following packages at **runtime** (they are declared as peer dependencies and are **not** bundled with ChatUI):

- `@nexconn/engine`
- `@nexconn/chat`
- `lit`

Install them **before** installing ChatUI, using the versions required by your ChatUI release (see the `peerDependencies` field in ChatUI's `package.json` on npm).

```bash
# Example (adjust versions to match your ChatUI peer range)
npm install @nexconn/engine @nexconn/chat lit
npm install @nexconn/chatui
```

```bash
pnpm add @nexconn/engine @nexconn/chat lit
pnpm add @nexconn/chatui
```

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

Mount `<nc-chat-ui-app-provider></nc-chat-ui-app-provider>` in a host element with
an explicit height after `ready()` has registered the custom elements. Call
`registerCustomMessages()` before `ready()` when custom message renderers are
needed. See the generated API documentation for the complete public API.

## Support and License

For support and security reports, contact [support@nexconn.ai](mailto:support@nexconn.ai).

Copyright (c) 2026 Nexconn. This package is licensed under Apache-2.0.
