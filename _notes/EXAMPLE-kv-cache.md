# Topic map: The KV cache

> **Worked example.** This is what a map might look like part-way through learning:
> some questions answered, some still open. Copy the structure, not the content.
> Started: 2026-10-22 · Status: learning

## 0. The promise

**After reading, you will understand:** why LLMs store the keys and values of every earlier token, how much memory that takes, and why that memory, not compute, limits how many users one GPU can serve.

**Why I'm learning this:** it keeps coming up in everything about LLM inference, and I want to be able to size it myself.

**Who the reader is:** knows what a transformer is and has heard of attention; has read (or can skim) my GPU post.

## 1. Prerequisites

| Prerequisite | Me | Reader needs it? | Handle it by |
|---|---|---|---|
| Attention: queries, keys, values | ~ | yes | one-paragraph recap with a tiny example |
| Autoregressive decoding (one token at a time) | ✓ | yes | link to the decoding note in the GPU post |
| Matrix multiply, FLOPs, bytes | ✓ | a little | assume it |
| HBM capacity and bandwidth | ✓ | yes | link to the GPU post's memory section |
| Multi-head attention | ~ | yes | learn it first; one-line recap |

## 2. Core concepts

| # | Concept | My understanding today, in one line | Confidence 1–5 |
|---|---|---|---|
| 1 | Why K and V repeat | each new token attends to all earlier tokens, whose K and V never change | 4 |
| 2 | The cache itself | store K and V once per token per layer; compute only the new token's | 4 |
| 3 | Memory per token | 2 × layers × KV heads × head dim × bytes | 3 |
| 4 | Prefill vs decode | prefill builds the cache in one parallel pass; decode adds one entry per step | 3 |
| 5 | Memory limits batch size | the cache grows with every user and every token, and competes with the weights for HBM | 2 |

## 3. Depth levels

| Level | Means | For this topic | In this post? |
|---|---|---|---|
| L1 Intuition | the picture | "don't recompute what you've already computed" | yes |
| L2 Mechanics | step by step | prefill, then decode appending one K and one V per layer per step | yes |
| L3 Numbers | sizes, costs | ~0.5 MB per token for a 7B model in FP16; GBs per long conversation | yes |
| L4 Implementation | systems detail | PagedAttention: paging the cache like OS virtual memory | no: follow-up |
| L5 Frontier | variants, research | MQA / GQA, KV quantisation, sliding windows, eviction | no: follow-up |

**Target for this post:** L1 to L3.

## 4. Question log

| # | Question | Type | Answered? | Answer in one line / source |
|---|---|---|---|---|
| 1 | Why not cache Q too? | why | ☑ | Q is only needed for the current token; earlier queries are never used again |
| 2 | What exactly gets recomputed without a cache? | what | ☑ | K and V projections of every earlier token, at every step: quadratic total work |
| 3 | Does the cache make attention itself cheaper? | what-if | ☐ | I think no: each step still reads every cached K and V. Check |
| 4 | How big is it for a real model? | how | ☑ | Llama-2-7B: 2 × 32 × 32 × 128 × 2 bytes = 512 KiB per token, ~2 GiB at 4,096 tokens |
| 5 | Why does decode stay memory-bound even with a cache? | why | ☐ | (roofline: reads weights + cache per token, little math) |
| 6 | Where does the cache live, and what happens when HBM is full? | how / when | ☐ | |
| 7 | Why do newer models use fewer KV heads? | why | ☐ | GQA? Shrinks the cache by heads ÷ KV heads |

## 5. Connections

- **Earlier posts:** GPU post: HBM is 80 GB; the roofline note says batch-1 decoding is memory-bound.
- **Things I already know well:** memoisation in dynamic programming: same idea, store results you'll need again.
- **One analogy world:** a meeting where every new speaker must hear everything said so far. Without notes, everyone repeats themselves each time; the KV cache is the minutes.

## 6. Traps and misconceptions

- I first thought the cache saves attention compute. It saves *recomputing K and V*; attention still reads the whole cache every step.
- "Caching" sounds free. It trades compute for memory, and memory is the scarcer resource on an inference GPU.
- People mix up the KV cache with prompt caching across requests. Related idea, different scope.

## 7. Figures

| Figure | What the reader sees | The "aha" it should give |
|---|---|---|
| 1 | Generating 6 tokens with and without a cache: grey cells recomputed each step vs filled once | without a cache, the same work repeats every step |
| 2 | HBM bar filling: weights fixed, cache growing with tokens and with users | memory, not compute, caps the batch |

## 8. Size and effort

| | Estimate | Actual |
|---|---|---|
| Posts | 1 (L1–L3) | |
| Words per post | ~1,300 | |
| Figures | 2 | |
| Learning time | 2 evenings | |
| Writing time | 1 evening draft + 1 edit | |

## 9. Follow-ups

- PagedAttention and why fragmentation matters (L4).
- MQA vs GQA vs MHA: trading quality for cache size (L5).
- KV cache quantisation and eviction (L5).

## 10. Sources

- Vaswani et al. (2017), *Attention Is All You Need*: the attention equations.
- Pope et al. (2022), *Efficiently Scaling Transformer Inference*: memory and latency numbers.
- Kwon et al. (2023), *Efficient Memory Management for LLM Serving with PagedAttention*: the follow-up.
- Ainslie et al. (2023), *GQA*: why fewer KV heads.

## 11. Done when

- [ ] Every L1–L3 question in section 4 is answered (3, 5 and 6 are still open).
- [x] Every ✗ prerequisite the reader needs is handled.
- [ ] I can explain the topic for 5 minutes without notes.
- [ ] Every concept in section 2 is at confidence 4 or higher (5 is at 2).

**Explain-it log:**

- 2026-10-22: stalled on why decode is still memory-bound with a cache → question 5.
