# Release preparation and publication

Status on 2026-10-09: owner has merged all four sprint PRs. Reviewed main `5f39332b7358949d248da6b2f99ba445ee1b41e8` passes exact-main CI and local acceptance. Environment protection is configured and verified; Pages source/site is still unconfigured. Enabling Pages, public deployment, tagging and publishing Release assets require explicit owner approval. No public application URL is verified yet. October 14 is internal calendar day seven; no organizer submission hour has been established.

## Verified merge checklist

The owner, Matawaka, already merged the stack using GitHub on 2026-10-09:

| PR | Actual final base | Preserved source head | Merge commit |
| --- | --- | --- | --- |
| [#1](https://github.com/Matawaka/route-story/pull/1) | main | 7caf13db2f1f5b6b71b5474935b3a40896b29dcb | 9e4c843b2ef7cffb399a9d9f65ffddb09678a8ae |
| [#2](https://github.com/Matawaka/route-story/pull/2) | main | f9f63b5a96652887af4841ac1e25f25964226c32 | 96fe99026dc6fb8be3a40adb9211fffd18808d3c |
| [#3](https://github.com/Matawaka/route-story/pull/3) | main | 488db3b327b37379c3a225ecaaa3984210145012 | dd86c372b6d6c757d7327e22366b402f60ad9b4e |
| [#4](https://github.com/Matawaka/route-story/pull/4) | main | 3e4d6cb44b654c1b0a5616d20049a3a49e8916ff | 5f39332b7358949d248da6b2f99ba445ee1b41e8 |

All four are MERGED by the owner. The agent did not merge them. `git merge-base --is-ancestor 3e4d6cb44b654c1b0a5616d20049a3a49e8916ff origin/main` succeeds; `git diff 3e4d6cb44b654c1b0a5616d20049a3a49e8916ff origin/main --stat` is empty. Main therefore contains the complete verified release tree. [Exact-main push acceptance](https://github.com/Matawaka/route-story/actions/runs/37896163991) passed: clean install, 92 unit tests, production build, 23 browser tests and 3 intentional opt-in skips. Mergeability no longer applies to merged PRs.

At verification, main has no branch protection or rulesets, and no required checks are configured. Passing acceptance is observed evidence; the existing release guard additionally requires a successful exact-SHA push-to-main CI. Pages API returns 404: Pages is not configured. The protected environment below was configured as authorized preparation. Source branches are retained. Documentation changes use `codex/sprint-5-public-launch` from reviewed main; no additional automatic merge or deployment.

Completed main gate and remaining publication checklist:

1. VERIFIED: merged main is exactly the final Sprint 4 tree, with successful main-push CI and fresh local clean install, unit/build/browser/package/smoke acceptance.
2. VERIFIED: short and bounded medium exports pass; both existing synthetic 20s/30s examples were independently decoded again and their hashes match historical evidence. Full 30s/5000-point acceptance remains valid for the identical code.
3. VERIFIED: allowlisted production package, licenses/provenance and dependency audits; no new private route, runtime dependency or video in source Git.
4. PENDING: explicit owner permission to enable Pages, dispatch publication and publish `v1.0.0` assets. The earlier merge does not provide it.
5. Immediately before authorized dispatch, recheck remote main, its exact successful push CI and environment rules. If main changes, review and validate the new SHA; do not silently deploy a different commit.

## Pages workflow

`.github/workflows/pages.yml` uses only manual `workflow_dispatch`. Pushes and PR events do not publish. The operator must select main, supply its full reviewed SHA and explicitly set `approve_publication=true`. The script refuses PR events, other branches, abbreviated or mismatched SHAs and a SHA without a successful **push-to-main** run of `check.yml`.

The build job checks out exactly that SHA, disables persisted checkout credentials, uses pinned Node/dependencies, runs unit tests/build and validates the public package. It has only contents/actions read access. The upload contains `dist/`, with an allowlist, provenance checks and a 5 MiB bound; raw tests, `.reference`, MP4s and benchmark artifacts are excluded. `release.json` identifies the source commit and hashes every public file. It contains no route/device diagnostics.

Only the deployment job receives `pages: write` and `id-token: write`. It depends on the reviewed build, uses the `github-pages` environment and executes only pinned official configure/deploy actions, without checking out repository code. No custom secrets, PAT, domain or automatic Pages enablement. The post-deployment Windows/Edge job tests the actual URL returned by deploy-pages, anonymously, and independently decodes its downloads. A failed HTTPS test must be treated as a failed release, even if deployment itself completed.

All actions are pinned to reviewed 40-character SHAs. The workflow follows [GitHub's custom Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Environment protection must be configured separately; declaring an environment in YAML alone does **not** configure approval.

Actual environment settings read back on 2026-10-09:

| Setting | Verified value |
| --- | --- |
| Environment | `github-pages` |
| Required human reviewer | Matawaka |
| Prevent self-review | false; solo owner may approve their own initiated deployment |
| Deployment policy | Selected branches/tags, exactly one allowed branch: `main` (type branch) |
| Pages source | PENDING; site GET returns 404 |
| Deployment runs / Releases | None |

Do not approve the environment on the owner's behalf. [GitHub environment protection documentation](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

After explicit publication permission:

1. Repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Do not set a custom domain. Equivalent API configuration may be used through the existing authorized connection; no PAT is needed.
2. **Settings → Environments → github-pages**: confirm Matawaka is the required reviewer, **Prevent self-review** is unchecked and **Deployment branches and tags → Selected branches and tags** contains only branch main. These settings already exist; retain them.
3. **Actions → Reviewed GitHub Pages release → Run workflow**: select main, enter complete reviewed SHA `5f39332b7358949d248da6b2f99ba445ee1b41e8`, set `approve_publication=true` only after permission, then run.
4. When the deploy job waits for protection approval, the owner uses **Review deployments → github-pages → Approve and deploy**. The agent must not perform this human-review step.
5. Inspect build, deploy and HTTPS acceptance jobs. Obtain the actual `page_url` from deploy-pages/deployment evidence; do not guess it. Green deploy with failed HTTPS acceptance is not a successful release.

## Local release acceptance

Use Node 24.19.0 and installed Edge on Windows; no system ExecutionPolicy change:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run release:package
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd run release:acceptance
```

The test-only host serves the actual production package at `http://127.0.0.1:4185/route-story/` and closes afterward. It tests anonymous loading, all manifest hashes/map/licenses/samples, CSP, reversible seek, playback, both styles/aspects, Standard capability, cancellation/retry, unavailable-encoder behaviour, empty browser storage and first-party GET/HEAD requests only. It creates Atlas 20s and Night 30s through the real UI, validates every frame with FFmpeg/ffprobe, and plays/seeks each Blob through the browser's native video element. Localhost is a secure context but is **not public HTTPS acceptance**.

`--smoke` bounds the post-deployment check to two 10-second Standard exports. It writes separately named smoke videos, preserving the full local examples. Routine CI retains one production-subpath/package test; full performance/memory matrices remain opt-in.

After deployment, use its actual returned URL and exact commit:

```powershell
$env:APP_URL = Read-Host 'Actual published HTTPS application URL, ending with /'
$env:EXPECTED_COMMIT = Read-Host 'Exact deployed main commit SHA'
npm.cmd run release:acceptance -- --smoke
# Separate full-duration exports through the actual public UI: Atlas 20s, Night 30s.
npm.cmd run release:acceptance
Remove-Item Env:APP_URL, Env:EXPECTED_COMMIT
```

Reports under ignored `artifacts/release/` distinguish local and public HTTPS, record actual response/meta CSP, browser/OS, codec/resolution/duration/frames/bytes, export wall time and privacy observations. This is no physical-mobile or native-memory certification. Existing memory methodology remains in PERFORMANCE.md.

## Hosting and release assets

The Vite base is relative; the production prefix test exercises `/route-story/` without rewriting root paths or weakening CSP. GitHub Pages cannot be assumed to provide application-controlled security response headers. The HTML CSP meta is restrictive but cannot impose `frame-ancestors`, a report-only policy or every HTTP-header protection. Report actual headers after deployment; do not claim nonexistent headers or isolation.

Following approval and successful actual HTTPS acceptance, create GitHub Release `v1.0.0` tied to the complete reviewed main SHA. Do not move the tag after publication. Publish `atlas-20s.mp4`, `night-30s.mp4`, their independent `.validation.json` reports, `synthetic.gpx` and `synthetic-antimeridian.gpx`; include a local SHA256 manifest and optional verified candidate ZIP. Keep large outputs out of source Git. Do not create a draft/tag or upload assets before permission.

Prepared Sprint 4 files are present and revalidated; RELEASE_EVIDENCE.json retains their true generating source `67d17266…`. Public-site acceptance will generate new full examples through the real deployed UI. Revalidate/finalize the chosen files and record their new hashes if output differs. Do not require a cross-machine encoder to reproduce old video bytes. Publish only the minimal synthetic assets, never diagnostic/API responses, private routes, `.reference`, node_modules or unrelated files.

Populate README/COMPETITION_DELIVERY only with returned, verified URLs. Download every published asset anonymously and compare SHA-256 with the finalized local file. A local prepared package is not proof of a public release or a completed competition submission. Submit to organizers only through a supplied channel with separate explicit owner permission; no submission has occurred.

No backend, VPS, Timeweb, custom domain, new codec or remote asset dependency is needed. License/provenance and security checks must remain passing before recommending publication.
