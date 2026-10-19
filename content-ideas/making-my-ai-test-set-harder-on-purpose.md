---
title: Making my AI test set harder on purpose
status: drafted
platforms:
  - LinkedIn
  - X
  - Facebook
source: Private client work on an AI feature that decides whether a reply is safe to send automatically. No client name and no metrics.
confidentiality: needs-gordon-ok
created: 2026-10-19
---

## Angle

Evals, for owners and product teams adding an AI feature. A perfect score can mean the tests are too easy. The useful question is which kind of mistake you can live with, and who looks at the failures.

## Draft

### LinkedIn

I made my AI test set harder on purpose last week, so the AI would stop scoring perfectly.

I was working on a feature where AI decides whether a reply is safe to send automatically. At first it passed everything. That felt great for about a day, until I realized a perfect score meant the tests were too easy. It told me nothing about where the AI would fail with real customers.

So I added the hard cases: the ambiguous ones, the sensitive ones, the ones where a person would stop and think. Now it gets some wrong, and that's useful, because I can see how it fails.

I also wrote down one rule before looking at results: when the AI is unsure, it can be too cautious, but it can never approve something it shouldn't. Being cautious costs a human a few extra seconds. A wrong approval costs you a customer.

If you're thinking about adding AI to your product or your operations, here's what I'd ask before you ship it:
1. What does a bad answer look like, and which kind of mistake can you live with?
2. Do you have real examples to test against, including the ugly ones?
3. Who looks at the failures, and how often?

Most of what makes AI trustworthy is this unglamorous testing work. I've been learning it from Hamel Husain's writing on evals, and it has changed how I build.

If you're weighing an AI feature and aren't sure how you'd know it works, I'm happy to talk it through.

### X

I made my AI test set harder on purpose so it would stop scoring 100%. A perfect score meant the tests were too easy. Rule I wrote first: the AI may be too cautious, but it may never approve what it shouldn't. Learning this from @HamelHusain's evals work.

### Facebook

Work note: I spent part of this week making a test harder for an AI feature I'm building. It had been passing everything, which sounds good but really meant I wasn't testing the right things. Now it fails some, and I can finally see how. Still learning, and it's the part of AI work I find most interesting.

## Notes

Based on private client work. No numbers, no client or product name, no examples of the sensitive cases.

Verify the X handle `@HamelHusain` before posting.

Fits the evals side of the ICP: companies building an AI feature into their product who need to know whether it works.
