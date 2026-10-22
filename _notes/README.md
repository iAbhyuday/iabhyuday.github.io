# Notes: topic maps

Folders starting with `_` aren't published on the blog, but this repo is public, so these notes are visible on GitHub.

Before learning a new topic, size it with a **topic map**:

```bash
./new-topic.sh kv-cache "The KV cache"
```

That creates `_notes/kv-cache.md` from [`TEMPLATE.md`](TEMPLATE.md). See [`EXAMPLE-kv-cache.md`](EXAMPLE-kv-cache.md) for a filled-in one.

**The workflow**

1. **Size** (before learning): fill in sections 0–3 and 8: promise, prerequisites, concepts, depth, size. If it's over ~7 concepts or ~1,500 words, split it now.
2. **Learn**: keep the question log (section 4) open and add every "wait, why?". Note traps (6) and connections (5) as they come up.
3. **Explain**: explain it out loud for 5 minutes without notes. Log where you stall. Repeat until section 11 is all ticked.
4. **Outline**: turn the question log into sections, one idea each, ordered so each needs only what came before.
5. **Draft**: `./new-post.sh` and write fast, no editing. Figures: send section 7 to Claude.
6. **Review**: edit in passes against the checklist in `_post-template/README.md`; ask Claude for a comment-only review.
