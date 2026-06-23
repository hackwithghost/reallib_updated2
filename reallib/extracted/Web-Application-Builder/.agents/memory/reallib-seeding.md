---
name: RealLib bcrypt seeding
description: How to seed admin passwords for RealLib — bcryptjs isn't importable from code_execution, use Python instead.
---

bcryptjs is installed in artifacts/api-server but cannot be dynamically imported from the code_execution sandbox or bare node eval — the pnpm workspace symlinks don't resolve from root.

**Why:** pnpm hoists bcryptjs into the workspace `.pnpm` store but the sandbox runs from workspace root which has no direct bcryptjs package.json entry.

**How to apply:** Use Python to generate the hash: `python3 -c "import bcrypt; print(bcrypt.hashpw(b'<pw>', bcrypt.gensalt(10)).decode())"` — then insert via `executeSql` with params.

Default admin credentials: username=`admin`, password=`admin123`.
