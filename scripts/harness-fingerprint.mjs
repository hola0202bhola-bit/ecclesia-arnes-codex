import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
// The same function is embedded in the installed hook, before any harness import.
export function fingerprint(home) {
  const result = {};
  function walk(rel) {
    for (const e of readdirSync(join(home, rel), { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (["node_modules", ".git"].includes(e.name)) continue;
      const path = rel ? rel + "/" + e.name : e.name;
      if (lstatSync(join(home, path)).isSymbolicLink())
        throw new Error("Arnés enlazado no permitido: " + path);
      if (e.isDirectory()) walk(path);
      else
        result[path] = createHash("sha256")
          .update(readFileSync(join(home, path)))
          .digest("hex");
    }
  }
  walk("");
  return result;
}
