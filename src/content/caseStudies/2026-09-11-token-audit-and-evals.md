---
title: "How do you know your AI is still working?"
description: "Engineering observability and continuous evaluation into AI projects"
date: 2026-09-11
hero: "../../assets/langfuse-openai-agent-example-trace-handoff.png"
heroAlt: "Example of an Agent trace using Langfuse."
---

Any client can put together a demo and call it done.  That's table stakes.  The real questions come 3 months later.

# Case study: Accounts Payable reconciliation agent

I recently assisted with implementation of a simple email agent to reconcile incoming invoices against known purchase orders.  The theory of operation
was simple: monitor the accounts payable inbox for invoices, match those invoices by customer against purchase orders in the ERP, then reply internally
on the email thread with the found data for human review.  When effective, this agent saved hours for the finance team each week.

The demo was complete, the AP team loved it, the project was funded.  But how are we sure that it works?

## Define your metrics

The first thing to do is come up with a definition of "works".  What is our success metric?  Hours saved of course, but accuracy is also hugely important.
We had to break down "accuracy" into simple, measurable indicators, and quantify the cost of each

1. Number of false positive matches (an invoice matched a PO, but it shouldn't have):  
  In this case we might be paying someone we aren't supposed to!

2. Rate of non-matches, compared to the base rate (an invoice didn't match a PO where it should have):
  We might not pay someone who we owe!

3. Rate of confusion (an invoice matched multiple possible POs but should have only matched one):  
  Extra work for the finance team, but generally OK.

Based on the above consequences we structured our evals around minimizing 1, then 2, then 3.

## Instrument and measure them

For number 1, this required human judgement.  We asked the finance team to report number of false positives, and built tooling into the AI agent allowing our team
to register false matches.

Number 2 is trackable automatically, it simply required estimation.  However we did not previously know the "natural" rate, i.e. the number of fraudulent invoices
we receive compared to the total number (it's not zero!).  We got a guesstimate from the subject matter experts to use for comparison.

Number 3 is trivially measurable and is a good optimization number to compare against.  Once we've gotten numbers 1 and 2 to an acceptable rate, we can work on driving
down number 3 as we have development resources.

## Set up an evaluation harness

Once you have the metrics, the next step is reading traces.  Only by reading the traces and practicing error analysis can you find the unique conditions that lead
to failures.  Then, codify these conditions (as well as some happy path ones!) into a suite of Agent Evals.  You can use an evaluation framework (we used Langfuse)
but you can also build it straight into your app!  This path maximizes the code reuse between your production harness and your test harness, which leads to a better
testing environment.  This is the approach we took for [Alice, the AI agent I built for Healthshare Technology Solutions](./2026-03-18-building-alice)

Set up your same metrics in your eval environment and then tweak the prompts until you drive your numbers in the right direction.  This process is iterative and
requires a lot of testing time and manual feedback.  You should guide it with your intuition based on the results of your error analysis.  By applying some quick
vibe checks and a couple additional guardrails, we can increase the agent's effectiveness

## Deploy and watch the metrics!

When your testing is complete, deploy your prompt changes and watch your metrics improve!

# Are you worried about your agents?

Astute observers will note that all of the above is just good engineering.  If that engineering practice is not present, then just like vibe-coded apps your "vibe"
prompted agents will have endless issues and corner cases.  And just like vibe-coded apps, when you change things something else will break.

If you find yourself constantly tweaking your prompts and never getting them quite right, [let's talk!](/contact)

