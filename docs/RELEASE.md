# Release preparation and publication

## Current photo publication checkpoint — 2026-10-09

Public https://matawaka.github.io/route-story/ currently serves accepted main8f4d0f665d3f6df7f9fdef0d356a33310d2800ab, version1.1.0-rc.1, DEM-only. Existing protected run37962492130 and anonymous HTTPS/full20–30s3D acceptance succeeded. v1.0.0 tag/assets remain immutable. The older release-preparation text below is retained as historical procedure/evidence.

Owner approved final photographic videos, public deployment and package-size increase. PR9 prepares1.2.0-rc.1 with the bounded Sogne Sentinel pack; its merge is still awaiting explicit authorization. PR5 documentation/PR8 stable1.1 version promotion are separate and not absorbed. No new tag or GitHub Release is implied by photo deployment approval.

Use ONLY existing Reviewed GitHub Pages release. After approved merge, verify the new full main SHA and its successful push check.yml; dispatch main with reviewed_sha set to that exact SHA, approve_publication=true and include_imagery=true. Owner personally approves github-pages when requested. The environment was reverified: GitHub Actions source, HTTPS enforced, main-only branch policy, required reviewer Matawaka, self-review permitted for solo owner. No environment bypass or broader job permissions.

Photo mode builds BUILD_IMAGERY_PACK=1 and validates --imagery-release: exact three assets, source/hash checks, baseline≤5MiB, two JPEGs≤2MiB/3million pixels/2048 sides, COMPLETE package including manifest≤6MiB. Default include_imagery=false preserves the baseline; legacy20m comparison data, raw DEM/crops, private routes, diagnostics and MP4s are never shipped.

The actual deploy-pages URL runs the existing2D smoke plus photographic10sCompatibility exports in both aspects, resident resources, forward/backward pixel check, cancellation/retry, empty storage, no external/POST/WebSocket requests, restrictive metaCSP, every manifest hash and every decoded/nonblank MP4 frame. The photo report is artifacts/release/imagery/acceptance.json. Separate full Standard20/30s proof on the actual public URL remains required on a verified GPU:

```powershell
$env:APP_URL = Read-Host 'Actual deploy-pages HTTPS URL ending with /'
$env:EXPECTED_COMMIT = Read-Host 'Exact newly deployed main SHA'
$env:ACCEPTANCE_DIR = 'artifacts/sprint9/public-photo-full'
node scripts/acceptance/imagery.mjs --full
Remove-Item Env:APP_URL, Env:EXPECTED_COMMIT, Env:ACCEPTANCE_DIR
```

For local authorized-package smoke, build with BUILD_IMAGERY_PACK=1, run package-release.mjs --imagery-release, then imagery.mjs --production --release --smoke. Public results and photo physical-device support are PENDING until actually observed. Do not advertise local acceptance as public acceptance.

Status on 2026-10-09: release preparation is authorized; merging the release PR, enabling Pages, public deployment, tagging and publishing release assets still require explicit owner approval. No public application URL is verified yet. October 14 is internal calendar day seven; no organizer submission hour has been established.

## Verified merge checklist

The owner, Matawaka, already merged the stack using GitHub on 2026-10-09:

| PR | Actual final base | Preserved source head | Merge commit |
| --- | --- | --- | --- |
| [#1](https://github.com/Matawaka/route-story/pull/1) | main | 7caf13db2f1f5b6b71b5474935b3a40896b29dcb | 9e4c843b2ef7cffb399a9d9f65ffddb09678a8ae |
| [#2](https://github.com/Matawaka/route-story/pull/2) | main | f9f63b5a96652887af4841ac1e25f25964226c32 | 96fe99026dc6fb8be3a40adb9211fffd18808d3c |
| [#3](https://github.com/Matawaka/route-story/pull/3) | main | 488db3b327b37379c3a225ecaaa3984210145012 | dd86c372b6d6c757d7327e22366b402f60ad9b4e |

All three are MERGED, with no unresolved review threads or comments. The agent did not merge them. `git merge-base --is-ancestor 488db3b327b37379c3a225ecaaa3984210145012 origin/main` succeeds; `git diff 488db3b327b37379c3a225ecaaa3984210145012 origin/main --stat` is empty. Thus main contains the complete verified implementation. [Final main acceptance](https://github.com/Matawaka/route-story/actions/runs/37889234952) passed. Mergeability no longer applies to closed merged PRs.

At verification, main has no branch protection or rulesets, and no required checks are configured. Passing acceptance is observed evidence, not an enforced repository rule. Pages API returns 404: Pages is not configured. No repository settings were changed. `release/route-story-v1` starts at the verified main above and will target main; it has no remaining stacked-PR dependency. Source branches are retained.

Before approving the release PR:

1. Review its cumulative diff, current SHA, checks and comments.
2. Confirm the original short and bounded medium exports pass; inspect full local 30-second evidence and both synthetic examples.
3. Verify no private GPX or generated large videos entered Git and inspect licenses/workflow permissions.
4. Give explicit permission for merge and publication. Use a native merge that preserves history, with no force push or source-branch deletion.
5. Fetch the resulting main, confirm ancestry and content, wait for its exact push acceptance to pass, and record that full SHA. If main changes afterward, review and validate the new SHA before deployment.

## Pages workflow

`.github/workflows/pages.yml` uses only manual `workflow_dispatch`. Pushes and PR events do not publish. The operator must select main, supply its full reviewed SHA and explicitly set `approve_publication=true`. The script refuses PR events, other branches, abbreviated or mismatched SHAs and a SHA without a successful **push-to-main** run of `check.yml`.

The build job checks out exactly that SHA, disables persisted checkout credentials, uses pinned Node/dependencies, runs unit tests/build and validates the public package. It has only contents/actions read access. The upload contains `dist/`, with an allowlist, provenance checks and a 5 MiB bound; raw tests, `.reference`, MP4s and benchmark artifacts are excluded. `release.json` identifies the source commit and hashes every public file. It contains no route/device diagnostics.

Only the deployment job receives `pages: write` and `id-token: write`. It depends on the reviewed build, uses the `github-pages` environment and executes only pinned official configure/deploy actions, without checking out repository code. No custom secrets, PAT, domain or automatic Pages enablement. The post-deployment Windows/Edge job tests the actual URL returned by deploy-pages, anonymously, and independently decodes its downloads. A failed HTTPS test must be treated as a failed release, even if deployment itself completed.

All actions are pinned to reviewed 40-character SHAs. The workflow follows [GitHub's custom Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Environment protection must be configured separately; declaring an environment in YAML alone does **not** configure approval.

After owner authorization, configure Pages source as **GitHub Actions**, then `github-pages` to allow only main and require a human reviewer (Matawaka). For this solo-owner repository, allow the owner to approve their own initiated deployment; otherwise required self-review prevention would block this release. Do not approve the environment on the owner's behalf. Verify these settings before dispatch. [GitHub environment protection documentation](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

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

`--smoke` bounds the post-deployment check to two 10-second Standard exports and does not replace full local 30-second acceptance. Routine CI adds one cheap production-subpath/package test; full performance/memory matrices remain opt-in.

After deployment, use its actual returned URL and exact commit:

```powershell
$env:APP_URL = Read-Host 'Actual published HTTPS application URL, ending with /'
$env:EXPECTED_COMMIT = Read-Host 'Exact deployed main commit SHA'
npm.cmd run release:acceptance -- --smoke
Remove-Item Env:APP_URL, Env:EXPECTED_COMMIT
```

Reports under ignored `artifacts/release/` distinguish local and public HTTPS, record actual response/meta CSP, browser/OS, codec/resolution/duration/frames/bytes, export wall time and privacy observations. This is no physical-mobile or native-memory certification. Existing memory methodology remains in PERFORMANCE.md.

## Hosting and release assets

The Vite base is relative; the production prefix test exercises `/route-story/` without rewriting root paths or weakening CSP. GitHub Pages cannot be assumed to provide application-controlled security response headers. The HTML CSP meta is restrictive but cannot impose `frame-ancestors`, a report-only policy or every HTTP-header protection. Report actual headers after deployment; do not claim nonexistent headers or isolation.

Following approval, publish the two validated synthetic MP4s, their validation JSONs and synthetic GPX files as GitHub Release assets at a tag tied to the reviewed release commit. Keep large outputs out of source Git. Do not create the release/tag or upload assets before permission. Populate README/COMPETITION_DELIVERY only with returned, verified URLs. Download published assets again and compare SHA-256 hashes. A local prepared package is not proof of a public release or a completed competition submission.

No backend, VPS, Timeweb, custom domain, new codec or remote asset dependency is needed. License/provenance and security checks must remain passing before recommending publication.
