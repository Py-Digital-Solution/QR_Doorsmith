// Side-effect module: loads .env.local (then .env) BEFORE any other module
// (e.g. lib/env.ts) is evaluated. Import this first in every CLI script.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
