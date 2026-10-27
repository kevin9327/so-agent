# Launch notes

For the maintainer. Nothing here has been posted; the drafts are for you to edit and post yourself, under your own name.

## What actually drives GitHub Trending

GitHub says trending weighs stars, forks, commits, follows and page views, with recency counting heavily ([GitHub blog](https://github.blog/news-insights/company-news/explore-what-is-trending-on-github/)). In practice that means **star velocity inside a day**, relative to what the repo normally gets. Consequences:

- Trending follows real attention. A burst of stars from people who found the project is what makes it appear; you cannot schedule it. Star buying, star-for-star groups and bot accounts are against GitHub's terms, get filtered, and can get the repo or account flagged. Do none of it.
- Most of a launch's stars arrive in the first 24 hours of a post (one Show HN analysis estimates about 1.4 stars per HN point; [source](https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/)). So the README, install path and demo have to be ready **before** the post, not after.
- Forks, issues and discussion alongside stars make growth look organic. Answering issues quickly in the first week matters more than the post text.

## Honest positioning

so is Pi plus a short list of tested fixes, fork-safe defaults and an eval harness. That is not a headline by itself, and the numbers are small (`--version` 171.5 -> 23.5 ms; the rest is within noise). A launch that oversells it will be answered with the benchmark numbers in the first comment. Better angles, in order of how defensible they are:

1. **The eval harness**: "compare two coding-agent builds on the same tasks and any OpenAI-compatible endpoint, with provider-error handling, so a flaky gateway does not count as a failure." It is useful to anyone, not only so users.
2. **Pi extension compatibility on a tiny, auditable fork**: reproducible rename (`rename/rename.sh`), no hidden endpoints, every network call documented.
3. **A real differentiator you add later.** Trending needs a reason to star. Pick one thing so does that Pi does not (a feature that fits the niche you care about), build it, and launch with that.

## Before you post (checklist)

- [ ] Publish the packages so the README can say `npm install -g @so-agent/coding-agent` (see "npm" below). A launch where install means "clone and build" loses most readers.
- [ ] Add a screen recording (asciinema or a GIF) of a real session with a real model to the top of the README. `docs/demo.md` is text only, recorded with a 4B local model.
- [ ] Run the eval with a hosted model you have a key for, 20+ tasks, 5 runs each, and put the table in `docs/EFFICIENCY.md`. One credible result beats several claims.
- [ ] Repo social preview image: Settings -> General -> Social preview, upload a 1280x640 PNG made from `assets/banner.svg`.
- [ ] Pin the repo on your profile; keep topics set.
- [ ] Be free for the following 24 hours to answer comments and issues.
- [ ] Re-read the README as a stranger: what is it, why not Pi, how do I try it in 2 minutes.

## npm (needs you)

1. Create the `so-agent` org at npmjs.com (free for public packages) with 2FA on.
2. `npm login`.
3. `scripts/npm-claim-scope.sh` (dry run), then `scripts/npm-claim-scope.sh --publish` to reserve the 11 names with placeholder 0.0.0 versions.
4. Publishing the real 0.0.x packages is a separate step and is not scripted yet; ask before doing it so the install lock files and `files` fields can be checked on a clean machine.

## Timing

The success rate in that analysis is best at Monday 00:00 UTC, which is **09:00 on Monday in Seoul** (Sunday evening US Eastern). Tuesday to Thursday US morning is the fallback. Avoid launching the same day as a major model or agent release.

## Channels and draft posts

Post from your own accounts; read each community's self-promotion rules first. Do not ask friends to upvote in bulk, since HN detects voting rings.

### Show HN

Title (keep it plain, no superlatives):

> Show HN: so, a Pi-compatible terminal coding agent fork with a build-comparison eval harness

Text:

> so is a fork of Pi (the minimal terminal coding agent by Mario Zechner, MIT). I renamed it, kept the extension API compatible, and made a few small, tested changes: a stream fix for OpenAI-compatible gateways that send tool-call arguments under a wrong index, a more useful error when `edit` can't find the text, and fork-safe network defaults (no hidden endpoints; every URL is documented).
>
> The part I think is useful beyond the fork is bench/eval: it runs the same tasks against two builds through any OpenAI-compatible endpoint and reports success, turns, tokens and time, excluding runs that failed because of the provider. My first run (local Qwen3-4B, 3 runs x 8 tasks) showed no difference between so and upstream beyond noise, and I say so in docs/EFFICIENCY.md. The only measured speedup is `--version` (171 ms -> 23 ms); the request path is unchanged.
>
> It's 0.0.x and builds from source for now. I'd like feedback on the eval design and on which tasks to add.
>
> https://github.com/kevin9327/so-agent

First comment (post it yourself right away): list what is NOT better (see "What so is not" in the README), which pre-empts the obvious critique.

### Reddit (r/LocalLLaMA, r/commandline; check each sub's rules, r/LocalLLaMA likes local-model results)

Title:

> I made a small eval harness to compare coding-agent builds on the same tasks with any local or hosted model (Qwen3-4B results inside)

Body:

> While forking a terminal coding agent I wanted to know if my changes helped or hurt, so I built a harness: fixed tasks with end-state checks, same prompts for both builds, any OpenAI-compatible endpoint (I used llama.cpp), provider errors excluded instead of counted as failures. A rate-limit-respecting proxy and a tool-call-index repair for flaky gateways are included.
>
> Results on Qwen3-4B-Instruct Q4, CPU only, 3 runs per task: 11/21 vs 12/21 valid runs, which I read as "no difference". n is tiny; the table and caveats are in docs/EFFICIENCY.md. If you run it on a bigger model, please post numbers.
>
> https://github.com/kevin9327/so-agent (bench/eval)

### X / Twitter

> so: a Pi-compatible terminal coding agent fork. Small tested fixes, fork-safe defaults, and an eval harness to compare agent builds on the same tasks with any OpenAI-compatible model. 0.0.3, MIT, from source for now. Honest numbers (most things are within noise): github.com/kevin9327/so-agent

Add the banner image from `assets/banner.svg` (export to PNG) and one demo GIF.

## After the launch

- Reply to every issue within a day for a week; label `good first issue` on small ones so contributors can arrive.
- Cut a release (`gh release create`) when you ship fixes people asked for; release activity is part of the signal and gives people a reason to watch.
- Post the eval table you get from a hosted model as a follow-up; that is a second, honest reason to share the repo.
