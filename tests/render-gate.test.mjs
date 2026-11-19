import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkRender,
  validateRenderBlueprint,
} from "../scripts/check-render.mjs";

const project =
  process.env.ECCLESIA_PROJECT ??
  fileURLToPath(new URL("../../proyecto-ecclesia", import.meta.url));
test("Render exige tres superficies y configuración sin secretos ni despliegue automático", () => {
  if (!existsSync(resolve(project, "src"))) return;
  assert.deepEqual(checkRender(project), {
    services: 3,
    deploymentExecuted: false,
  });
});
test("Render rechaza plantillas alteradas: secretos, seed, modo, automatización o topología", () => {
  if (!existsSync(resolve(project, "src"))) return;
  const original = JSON.parse(
    readFileSync(resolve(project, "render.yaml"), "utf8"),
  );
  for (const mutate of [
    (b) => b.services.pop(),
    (b) => {
      b.services[0].autoDeployTrigger = "commit";
    },
    (b) => {
      b.services[0].startCommand += " && npm run db:seed";
    },
    (b) => {
      b.services[0].envVars.find((v) => v.key === "JWT_SECRET").value =
        "secreto";
    },
    (b) => {
      b.services[1].envVars.find((v) => v.key === "APP_SURFACE").value = "all";
    },
    (b) => {
      b.services[2].envVars = b.services[2].envVars.filter(
        (v) => v.key !== "FRONT_ORIGIN",
      );
    },
    (b) => {
      b.databases = [{ name: "no-autorizada" }];
    },
  ]) {
    const copy = structuredClone(original);
    mutate(copy);
    assert.throws(() => validateRenderBlueprint(copy));
  }
});
