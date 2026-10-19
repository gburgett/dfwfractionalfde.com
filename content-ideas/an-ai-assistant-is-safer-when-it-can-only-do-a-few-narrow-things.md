---
title: An AI assistant is safer when it can only do a few narrow things
status: idea
platforms: []
source: "Public project: https://github.com/gburgett/kroger-mealplanner"
confidentiality: public-ok
created: 2026-10-19
---

## Angle

Frame for SMB owners. An AI assistant is safer when its powers are few and named, and when nothing it writes is executed.

Public source, Gordon's kroger-mealplanner project:

- A sandboxed shell was replaced with documents stored in a database and a handful of file verbs: read, write, edit, grep, and history.
- That change was about 8.8k lines removed and 2.4k lines added.
- Nothing the assistant writes gets run.
- History is the undo.

The owner-facing point: you can give an assistant real work without giving it a terminal. If it does the wrong thing, you roll the document back.

## Draft

No draft yet.

## Notes

Stay inside what is already public in kroger-mealplanner. Do not add private client parallels, hosting details, or credentials.

Platforms not chosen yet. LinkedIn, with a link to the repo, is the natural first cut. A blog post could walk the verbs one by one.

Good companion to "An AI that works from your own documents," which uses the same design as a knowledgebase analogy.
