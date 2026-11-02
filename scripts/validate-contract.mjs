import parser from "@apidevtools/swagger-parser";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
export async function validateContract(file) {
  const api =
    typeof file === "string" ? JSON.parse(readFileSync(file, "utf8")) : file;
  function localRefs(value) {
    if (!value || typeof value !== "object") return;
    if (
      "$ref" in value &&
      (typeof value.$ref !== "string" || !value.$ref.startsWith("#/"))
    )
      throw new Error(
        "Referencia fuera de snapshot/contrato no permitida: " + value.$ref,
      );
    for (const item of Object.values(value)) localRefs(item);
  }
  localRefs(api);
  return parser.validate(api);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.argv[2]) throw new Error("Indica el archivo OpenAPI.");
  const api = await validateContract(resolve(process.argv[2]));
  console.log(
    "OpenAPI válido estructuralmente:",
    api.info.version,
    Object.keys(api.paths).length,
    "rutas. No ejecuta endpoints.",
  );
}
