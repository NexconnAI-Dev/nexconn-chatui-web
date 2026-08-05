# Contributing to Nexconn ChatUI

Contributions are welcome through issues and pull requests in the public GitHub repository.

## Before You Start

- Search existing issues and pull requests before opening a duplicate.
- Open an issue before starting a large API or architecture change.
- Keep changes focused on the public ChatUI source and public development workflow.
- Do not include credentials, customer information, internal infrastructure, or generated build output.

## Development Setup

Repository development requires Node.js 18.12 or newer because the project uses pnpm 9.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck:lib
pnpm run lint:lib
pnpm run build
pnpm run build:apidoc
```

`@nexconn/chat` and `@nexconn/engine` are maintained by Nexconn and are available through npm. They are not part of this source repository.

## Pull Requests

- Explain the problem and the behavior of the proposed change.
- Add or update validation appropriate to the change.
- Preserve backward compatibility unless the pull request clearly documents an approved breaking change.
- Update public API documentation and examples when public behavior changes.
- Do not commit `node_modules/`, `release/`, `dist/`, local configuration, or generated API documentation.
- Ensure TypeScript, lint, library build, and API documentation commands pass before requesting review.

Public contributions are reviewed in GitHub and then synchronized with Nexconn's internal source process. Contributor attribution is preserved when accepted changes are imported.

## License

By submitting a contribution, you agree that your contribution is licensed under the Apache License 2.0 used by this repository.
