import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required staging variable: ${name}`);
  return value;
};

const projectId = required("SUPABASE_PROJECT_ID");
const accessToken = required("SUPABASE_ACCESS_TOKEN");
const supabaseUrl = required("SUPABASE_URL");

if (process.env.VITE_SECURE_SYNC_PHASE1 !== "false") {
  throw new Error("Refusing migration unless VITE_SECURE_SYNC_PHASE1=false");
}
if (process.env.VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION !== "false") {
  throw new Error("Refusing migration unless VITE_SECURE_SYNC_REAL_PROFILE_MIGRATION=false");
}
if (!supabaseUrl.includes(projectId)) {
  throw new Error("SUPABASE_URL and SUPABASE_PROJECT_ID do not identify the same staging project");
}

const requested = basename(process.argv[2] ?? "");
if (!/^\d{12}_[a-z0-9_]+\.sql$/.test(requested)) {
  throw new Error("Pass one timestamped staging migration filename");
}
const migrationDirectory = resolve(process.cwd(), "supabase/migrations");
if (!readdirSync(migrationDirectory).includes(requested)) {
  throw new Error(`Migration not found: ${requested}`);
}

const version = requested.slice(0, 12);
const name = requested.slice(13, -4);
const sql = readFileSync(resolve(migrationDirectory, requested), "utf8");
if (sql.includes("$migration$")) {
  throw new Error("Migration contains the reserved ledger delimiter $migration$");
}

const databaseQuery = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Staging migration request failed (${response.status}): ${detail}`);
  }
  return response.json();
};

const prior = await databaseQuery(
  `select version,name from supabase_migrations.schema_migrations where version='${version}'`,
);
if (prior.length) {
  throw new Error(`Migration version ${version} is already recorded as ${prior[0].name}`);
}

await databaseQuery(`
  begin;
  ${sql}
  insert into supabase_migrations.schema_migrations(version,statements,name)
  values ('${version}',array[$migration$${sql}$migration$]::text[],'${name}');
  commit;
`);

const applied = await databaseQuery(
  `select version,name,cardinality(statements) as statement_count
   from supabase_migrations.schema_migrations where version='${version}'`,
);
if (applied.length !== 1) throw new Error(`Migration ${version} was not recorded`);
console.log(JSON.stringify({ stagingProject: projectId, ...applied[0] }));
