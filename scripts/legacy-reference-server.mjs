// Adaptador exclusivo del arnés: conserva regresiones HTTP históricas de módulos
// sin debilitar el arranque público actual, que exige sesión en todos los modos.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if (
  process.env.ECCLESIA_TEST_REFERENCE !== "1" ||
  process.env.NODE_ENV !== "test" ||
  new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1"
)
  throw new Error("Referencia permitida solo en PostgreSQL local del arnés");
const requireProject = createRequire(resolve("package.json"));
const { PrismaClient } = requireProject("@prisma/client");
const { PrismaPg } = requireProject("@prisma/adapter-pg");
const { createApp } = await import(
  pathToFileURL(resolve("dist/composition/app.js")).href
);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const server = createApp(db, {
  secret: process.env.JWT_SECRET,
  issuer: "ecclesia-personal",
  audience: "ecclesia-api",
  origin: process.env.APP_ORIGIN,
}).listen(Number(process.env.PORT), "127.0.0.1", () =>
  console.log("Referencia local:", process.env.APP_ORIGIN),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      void db.$disconnect();
    }),
  );
