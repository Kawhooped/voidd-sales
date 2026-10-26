# Analytics setup

Goal: measure which pages get traffic and which CTAs are clicked so we can rank what to expand, keep, or drop.

## Chosen path

Cloudflare Web Analytics (free, privacy-friendly, works on GitHub Pages).

## Steps (Danny)

1. Cloudflare dashboard → Web Analytics → Add a site.
2. Hostname: `kawhooped.github.io`
3. Copy the beacon `<script>` they give you (contains the unique token).
4. Paste the full script into the chat.
5. Grok will add it to the Phantom pages (index, tools/index, store, codeshelf, about, call, blog, and main tool pages) in one commit.

## After install

- Wait 24–48 hours for first data.
- Update TRAFFIC.md each week with the numbers.
- Rank pages. Act only on the ranking.

## Fallback

GoatCounter (goatcounter.com) if Cloudflare is unavailable. Same process: paste the script, Grok installs it.

## Not used

- Google Analytics (heavier, cookie issues)
- Custom hit.js on Pages (currently localhost-only by design)
- Paid analytics
