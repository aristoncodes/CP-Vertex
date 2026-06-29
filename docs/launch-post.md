# CP-Vertex: actually *train* your Codeforces weaknesses — 1v1 duels, weakness-targeted drilling, upsolve tracking

> Codeforces launch post. Fill in `[your handle]`, add screenshots at the marked
> spots (lead with a **duel** or the **drill** flow — not the analyzer), and
> sanity-check the live site before posting.

---

Hi Codeforces,

There are a hundred tools that'll show you a nice graph of your rating. Far fewer that answer the next question: **okay, I know graphs are my weak spot — now what do I actually do about it?**

CP-Vertex is built around that loop:

> **find your weak topic → drill it with targeted problems → test it under pressure in a 1v1 duel → upsolve what you missed → repeat.**

It's less "analytics dashboard," more "training gym." Here's the part I think this community will actually use.

---

## ⚔️ 1v1 Duels — the fun part

Challenge anyone to a **real-time head-to-head**:

- Problems auto-picked near **both** players' ratings — fair fights, not stomps.
- Live progress, plus **spectator mode** to watch ongoing duels.
- Solves are **verified through the Codeforces API** — you actually have to AC on CF; there's no "mark as done" button to cheese.
- The whole lifecycle (`pending → active → completed`) is validated server-side, so results can't be faked.

Timed practice against someone at your level, with stakes. It's the most fun I've had doing speed practice.

> *[screenshot: a live duel]*

---

## 🏋️ Training modes — the core loop

This is the heart of it. The tool figures out where you're weak, then gives you ways to attack it:

- **Drill** — a curated set targeting your **weakest tags** specifically. This is the main loop: stop grinding random problems, hit what's actually holding you back.
- **Blitz** — timed speed sessions for the "I can solve it, just too slowly" problem.
- **Warmup** — a few quick at-level problems before a contest.
- **Boss** — one problem ~300–500 above your rating, for deliberate stretch.
- **Upsolve tracker** — automatically queues the problems you **didn't** solve in recent contests, with deadlines, so they stop rotting in an open tab.
- **Virtual contests** + a full **problem browser** with rating/tag/status filters.

---

## 📊 The analytics that drive it

The training is only as good as knowing *what* to train, so there's a solid analysis layer underneath — and yes, you can run it on **any handle with no login** (`/u/<handle>`), which makes a decent free analyzer too:

- **Topic strengths** at your rating band — "how reliably do I solve graphs *at my level*," not padded by easy problems.
- **Rating-based heatmap** — each day colored by the hardest problem you solved (à la the [rating-heatmap extension](https://github.com/gopikrishna000/Codeforces-Rating-Based-Heatmap-Extension), built in).
- **Contest pace & accuracy** and a **"what-if zero WAs"** rank/rating estimate.
- **Compare two handles** head-to-head: `/u/<you>/vs/<rival>`.

I won't oversell this part — there are plenty of analyzers. The difference here is that the weakness it finds plugs straight into Drill and the upsolve queue.

> *[screenshot: weak-topic → drill handoff]*

---

## Kept honest (this community will check)

- Scores key off **official CF problem ratings** — no hidden Elo.
- **Distinct problems** only; **team submissions excluded**; re-submits don't inflate anything.
- Handle linking is verified by submitting a **Compilation Error** to a random problem — no passwords, the app can never touch your CF account.
- **Open source:** https://github.com/aristoncodes/CP-Vertex

There's also XP/streaks/badges, but they track on-platform activity from when you join, and **Serious Mode** (auto-on for Expert+) tones the game-y stuff down — ignore it entirely if you just want to train.

---

## Honest limitations

- Public submissions only; logged-in stats depend on a sync.
- **Duels need two people online** — so early on, grab a friend or ping me for a match.

I'd love feedback — especially on whether the **Drill** sets actually feel like they target your real weak spots. That's the part I most want to get right.

Thanks for reading.

— [your handle]
