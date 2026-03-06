# Denna Spec Browser

A web-based IDE for browsing, comparing, and editing [`.denna-spec.json`](https://spec.denna.io) files stored in GitHub repositories.

Live at [browser.spec.denna.io](https://browser.spec.denna.io).

## Features

- **Repo discovery** — enter any GitHub repo URL and instantly find all `.denna-spec.json` files
- **Rich preview** — human-readable rendering of spec metadata, allocations, rates, addresses, and other canonical Denna types
- **Raw view** — syntax-highlighted JSON
- **Edit & PR** — edit spec fields in a structured form and submit a pull request directly from the browser (requires GitHub sign-in)
- **Version compare** — select any two release tags to view the same file side by side
- **IDE-style layout** — file explorer sidebar with a persistent viewer panel; no page reloads when switching files
- **Dark / light theme** — persisted across sessions

## Stack

| Concern | Choice |
|---|---|
| Framework | SvelteKit + Svelte 5 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| GitHub API | `@octokit/rest` |
| Auth | GitHub OAuth (httpOnly cookie) |
| Deployment | Vercel |
| Releases | semantic-release |

## Getting started

```sh
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

Create a `.env` file at the project root:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Register an OAuth App in your GitHub settings with the callback URL set to `http://localhost:5173/auth/callback` for local dev and `https://browser.spec.denna.io/auth/callback` for production. Both can be registered in the same OAuth App as separate callback URLs.

## Building

```sh
bun run build
bun preview
```

## Releases

Releases are automated via [semantic-release](https://semantic-release.io) on every push to `main`. Use [conventional commits](https://www.conventionalcommits.org):

- `fix: ...` → patch
- `feat: ...` → minor
- `feat!: ...` / `BREAKING CHANGE:` → major
