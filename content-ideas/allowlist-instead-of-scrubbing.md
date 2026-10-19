---
title: "Allowlist instead of scrubbing: keeping sensitive data out of error reports"
status: idea
platforms: []
source: Private work on how error reports are built. Principle only.
confidentiality: needs-gordon-ok
created: 2026-10-19
---

## Angle

A principle for owners and for anyone shipping software that reports errors: regex redaction misses things, and every new field leaks until someone updates the list of what to strip. The safer habit is an allowlist. Only send fields that have already been verified safe.

## Draft

No draft yet.

## Notes

Principle only. Do not add field names, systems, client or employer names, examples of data that leaked, or anything about how a particular app reports errors.

Platforms not chosen yet. Likely a short LinkedIn or blog note once Gordon okays the framing.

For SMB owners this is a trust point: the tool that tells you something broke should not also carry customer data out of the building.
