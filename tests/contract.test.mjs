import test from "node:test";
import assert from "node:assert/strict";
import { validateContract } from "../scripts/validate-contract.mjs";
test("acepta un contrato mínimo de herramienta", async () => {
  await validateContract({
    openapi: "3.1.1",
    info: { title: "Fixture", version: "1" },
    paths: {},
  });
});
test("rechaza referencias de esquema rotas", async () => {
  await assert.rejects(
    validateContract({
      openapi: "3.1.1",
      info: { title: "Fixture", version: "1" },
      paths: {
        "/x": {
          get: {
            responses: {
              200: {
                description: "Fixture",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/NoExiste" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  );
});
test("H03 rechaza referencias externas que escaparían de la snapshot", async () => {
  await assert.rejects(
    validateContract({
      openapi: "3.1.1",
      info: { title: "Fixture", version: "1" },
      paths: {},
      components: { schemas: { Bad: { $ref: "../working-tree.json" } } },
    }),
    /fuera de snapshot/,
  );
});
