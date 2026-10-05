---
name: Git revert state and checkpoints
description: Clearing completed no-commit revert state without undoing the user's requested restoration.
---

After a successful no-commit Git revert, clear the revert operation state with `git revert --quit` without undoing the restored files.

**Why:** A leftover REVERT_HEAD caused the automatic checkpoint process to repeatedly attempt `git revert --abort` and fail, preventing new checkpoints.

**How to apply:** Check that the requested source restoration succeeded, then quit the Git operation. Do not abort a successful user-requested revert, because aborting can undo the restoration.