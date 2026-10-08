---
description: Lazily install and run the remote design-studio capability pack
---

Resolve the trusted `module-source` from `.claude/bootstrap-manifest.json`. Fetch only the registry entry for `design-studio`, then its declared manifest and files. Validate paths and hashes, install the payload under `.claude/modules/design-studio/`, and register its namespaced agent definitions under `.claude/agents/` only if the module is not already installed. Record the pinned module version and digests in `.claude/modules/installed.json`. Do not update an already-installed module unless the user explicitly asked for an update.

Then execute the installed `design-studio` workflow. Retrieve only the memory domains declared by its manifest plus directly applicable active rules. Dispatch specialists by phase rather than loading every specialist body into the parent context.
