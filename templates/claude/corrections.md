# Corrections

Every time the owner corrects an agent, the correction gets a row here, in the same turn. A repeat of the same correction goes in that row and raises its count. When a row reaches 2, the same change adds a check that fails, and the row names it. The rules table in CLAUDE.md lists the checks. The daily `retro` skill reads the past day's threads and adds any correction that was missed.

| Correction | Seen | Last | Enforced by |
| --- | --- | --- | --- |
