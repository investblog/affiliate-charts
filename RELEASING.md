# Releasing affiliate-charts

Releases publish via **OIDC Trusted Publishing** with provenance (`.github/workflows/release.yml`). No npm
token lives in this repository's code, and none stays in its CI secrets for longer than one day.

## One-time bootstrap (v0.1.0)

npm cannot attach a trusted publisher to a package that does not exist yet, so the first version goes
out over a token and every later one over OIDC. The family's procedure, with its traps, is
slots-lite's RELEASING.md; the short form:

1. **The account is publish-ready**: no recovery-code sign-in in the last 72 hours (npm freezes the
   account for 72 hours after one), and a working passkey or security key for the second factor.
2. **The name is still free** the same day: `npm view affiliate-charts` answers E404. npm may still
   refuse it at the publish as too similar to another name; the fallback is `@spintax/affiliate-charts`
   (ADR 013).
3. npmjs.com → Access Tokens → **Granular**: **All packages**, **Read and write (publish and stage)**,
   **Bypass 2FA**, the shortest expiry.
4. GitHub → Settings → Secrets and variables → Actions → `NPM_TOKEN`, pasted by hand. It passes through
   no chat, file or agent.
5. `package.json` already says `0.1.0`. Actions → **Bootstrap publish (one-time)** → Run workflow from
   `main`. It checks the token's shape, re-runs every gate, verifies the tarball, publishes with
   `--provenance`.
6. **The same day:** npmjs.com → package → Settings → **Trusted Publisher** → GitHub Actions:
   `investblog` / `affiliate-charts` / `release.yml` / no environment. Then push the `v0.1.0` tag (its
   run exits green on the duplicate check), delete the `NPM_TOKEN` secret, revoke the token on
   npmjs.com, delete `bootstrap-publish.yml`.

**Done on 2026-10-08:** `affiliate-charts@0.1.0` published by the bootstrap workflow with provenance;
the `NPM_TOKEN` secret and `bootstrap-publish.yml` were removed the same day. Two things seen on the way,
for the next library:

- The client printed `+ affiliate-charts@0.1.0` while the registry listed only a `0.0.0-stage`
  version for about two minutes; `0.1.0` and `latest` then appeared. `0.0.0-stage` stays in the version
  list as a trace of the first publish; `latest` never pointed at it.
- A secret's value cannot be copied between repositories. An older `NPM_TOKEN` left in another
  repository was tried from a throwaway branch there and failed `404 Not Found - PUT` (no rights): a
  token of months ago is not a bootstrap path.

## Every later release

```sh
npm version minor          # or patch
# move the CHANGELOG entry from "unreleased" to the new version, amend or commit
git push && git push --tags
```

`release.yml` runs on the `v*` tag: it checks the tag against `package.json`, re-runs every gate,
verifies the tarball and publishes with provenance. A version already on the registry exits green.

## Failures that report something else (the family's record)

| Message | Cause |
|---|---|
| `is not a legal HTTP header value` | whitespace or a line break in the token secret |
| `EOTP` / one-time password required | the token cannot bypass 2FA |
| `404 Not Found - PUT` | npm masks 403 as 404: no publish rights, or no trusted publisher on the OIDC path |
| `403 … temporarily suspended` | the 72-hour hold after a recovery-code sign-in |
| `403 … Package name too similar` | the typosquatting guard, run only at the publish |
