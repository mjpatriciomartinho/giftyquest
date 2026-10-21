// Checks the Creators API connection: one product search.
// Usage: npx tsx scripts/amazon.ts "ceramic incense holder" 40
import { amazonConfig, searchProduct } from "../src/catalog/amazon";

const query = process.argv[2] ?? "ceramic incense holder";
const max = process.argv[3] ? Number(process.argv[3]) : null;
const c = await amazonConfig();
if (!c) process.exit(1);
console.log(`marketplace ${c.marketplace}, credential version ${c.version}, tag ${c.tag}`);
console.log(await searchProduct(query, max));
