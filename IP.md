# IP records

| Date | Covers | Type | Record | Signer | Tag |
|---|---|---|---|---|---|
| 2026-10-14 | Signed-response and auth hardening; missing-context evaluations mc-h1 and mc-h2 (commit ef7a55f) | software | [95750103f03ec4f16fbceda1e8a951115a82a5decdd2446db77ac53219012da5](https://iptrust.org/v/95750103f03ec4f16fbceda1e8a951115a82a5decdd2446db77ac53219012da5) | Gregory J. Ward | `ip-2026-10-14` |

A record is evidence that the committed content existed by the time of the anchoring blocks and that the signer made the statement. It does not create or register any right.

## Verifying a record

The evidence package (`.iptrust/v2/<recordHash>/`, including the private `opening.json` and `manifest.json`) is kept by the authors and is not in this repository. With it:

```
git worktree add /tmp/at-tag-lumenbridge ip-2026-10-14 && cp -r .iptrust /tmp/at-tag-lumenbridge/
(cd /tmp/at-tag-lumenbridge && iptrust2 verify <recordHash> --fetch-headers)
git worktree remove --force /tmp/at-tag-lumenbridge
```

Expect `verdict: valid` and `content: matched`.
