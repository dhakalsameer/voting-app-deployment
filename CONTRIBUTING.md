# Contributing

## Getting Started

1. Fork the repo and clone locally
2. Follow the [README](./README.md#setup) setup instructions
3. Create a branch: `git checkout -b feat/your-feature`

## Development Workflow

### Smart Contracts

```bash
cd contracts
forge build          # compile
forge test -vv       # run tests
forge fmt            # format Solidity
```

- Keep test coverage comprehensive — every `require` should have a corresponding test
- Run `forge test` before committing contract changes

### Backend

```bash
cd backend
npm run dev          # auto-restart on changes
npm run migrate      # apply new schema files
```

- Schema migrations go in `backend/schema/` with a descriptive filename
- New routes should be small controllers; reuse `middleware/auth.js` for JWT-protected routes

### Frontend

```bash
cd election-frontend
npm run dev          # Vite dev server
```

- Components go in `election-frontend/src/components/`
- Admin components in `components/admin/`
- Reusable UI components in `components/ui/`
- Use existing patterns (Tailwind utility classes, function components, existing hooks)

## Code Style

- **Solidity**: Follow existing patterns in `Election3.sol`; use `forge fmt`
- **JavaScript/JSX**: 2-space indentation, single quotes, semicolons
- **CSS**: Tailwind utility classes only — no CSS modules or styled-components
- **Imports**: Group by: (1) external libs, (2) internal modules, (3) relative imports — with blank line between groups

## Commit Messages

Use conventional commits:

```
feat: add voter turnout chart
fix: handle wallet disconnect during voting
docs: update API endpoint list
refactor: extract modal into reusable component
test: add castVote insufficient female GM test
```

## Pull Requests

- One feature/fix per PR
- Include a clear description of what and why
- Reference related issues (e.g., `Closes #12`)
- Verify all tests pass before requesting review
- Keep PRs focused and reasonably sized

## Testing

```bash
# Smart contract tests
cd contracts && forge test -vv

# Manual e2e against Sepolia
node backend/scripts/test_e2e.mjs
```

New features should include tests. Bug fixes should include a test that catches the regression.
