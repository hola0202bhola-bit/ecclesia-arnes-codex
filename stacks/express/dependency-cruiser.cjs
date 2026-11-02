const fs = require("node:fs");
const modules = fs.existsSync("src/modules")
  ? fs
      .readdirSync("src/modules", { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  : [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const layer = (name) =>
  "^src/(modules/[^/]+/" + name + "|shared/" + name + ")/";
const internal = (layers) =>
  "^src/(modules/[^/]+/(" + layers + ")|shared/(" + layers + "))/";
module.exports = {
  forbidden: [
    { name: "sin-ciclos", severity: "error", from: {}, to: { circular: true } },
    {
      name: "sin-imports-no-resueltos",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "dominio-puro",
      severity: "error",
      from: { path: layer("domain") },
      to: { pathNot: internal("domain") },
    },
    {
      name: "aplicacion-hacia-dominio",
      severity: "error",
      from: { path: layer("application") },
      to: { pathNot: internal("domain|application") },
    },
    {
      name: "presentacion-sin-infra",
      severity: "error",
      from: { path: layer("presentation") },
      to: {
        path: "^src/",
        pathNot: internal("domain|application|presentation"),
      },
    },
    {
      name: "presentacion-sin-orm",
      severity: "error",
      from: { path: layer("presentation") },
      to: {
        path: "^node_modules/(?:@prisma/|prisma/|pg/|knex/|sequelize/|typeorm/)",
      },
    },
    {
      name: "infra-sin-aplicacion-ni-http",
      severity: "error",
      from: { path: layer("infrastructure") },
      to: { path: "^src/", pathNot: internal("domain|infrastructure") },
    },
    {
      name: "composicion-sin-entrantes",
      severity: "error",
      from: { pathNot: "^src/composition/" },
      to: { path: "^src/composition/" },
    },
    {
      name: "src-sin-capas-desconocidas",
      severity: "error",
      from: {},
      to: {
        path: "^src/",
        pathNot:
          "^src/(composition/|(?:modules/[^/]+|shared)/(?:domain|application|presentation|infrastructure)/)",
      },
    },
    {
      name: "shared-sin-modulos",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/modules/" },
    },
    ...modules.map((name) => ({
      name: "modulo-aislado-" + name,
      severity: "error",
      from: { path: "^src/modules/" + esc(name) + "/" },
      to: { path: "^src/modules/", pathNot: "^src/modules/" + esc(name) + "/" },
    })),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
  },
};
