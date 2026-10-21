// Real Amazon products through the Amazon Associates Creators API (successor of PA-API 5).
// Credentials come from AWS SSM at runtime (/giftyquest/amazon-creators.env); nothing is
// written to disk or committed.
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export interface AmazonProduct {
  asin: string;
  title: string;
  imageUrl: string | null;
  price: string | null; // as Amazon displays it, e.g. "34,99 €"
  amount: number | null;
  currency: string | null;
  url: string; // detail page with the affiliate tag
}

interface Config {
  id: string;
  secret: string;
  version: string;
  tag: string;
  marketplace: string; // e.g. www.amazon.es
}

const SSM_NAME = process.env.GQ_CREATORS_SSM ?? "/giftyquest/amazon-creators.env";
const CATALOG = "https://creatorsapi.amazon/catalog/v1";

// Token endpoints by credential version (3.x: Login with Amazon, 2.x: Cognito).
const TOKEN_URL: Record<string, string> = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
  "2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
  "2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
  "2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
};

let configPromise: Promise<Config | null> | null = null;
let token: { value: string; expires: number } | null = null;
// When Amazon says the account is not eligible (sales threshold), stop calling for a while.
let notEligibleUntil = 0;

function parseEnv(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function loadConfig(): Promise<Config | null> {
  let env: Record<string, string> = process.env as Record<string, string>;
  if (!env.CREATORS_CREDENTIAL_ID) {
    try {
      // Locally the default AWS profile is used (or GQ_SECRETS_PROFILE); on Lambda the role is used.
      const profile = process.env.AWS_LAMBDA_FUNCTION_NAME ? undefined : process.env.GQ_SECRETS_PROFILE;
      const ssm = new SSMClient({ region: "eu-west-1", ...(profile ? { profile } : {}) });
      const res = await ssm.send(new GetParameterCommand({ Name: SSM_NAME, WithDecryption: true }));
      env = parseEnv(res.Parameter?.Value ?? "");
    } catch (e) {
      console.warn(`Amazon products disabled: could not read ${SSM_NAME} (${(e as Error).name}).`);
      return null;
    }
  }
  const pick = (...keys: string[]) => keys.map((k) => env[k]).find(Boolean) ?? "";
  const c: Config = {
    id: pick("CREATORS_CREDENTIAL_ID", "AMZ_CREATORS_CREDENTIAL_ID"),
    secret: pick("CREATORS_CREDENTIAL_SECRET", "AMZ_CREATORS_CREDENTIAL_SECRET"),
    version: pick("CREATORS_VERSION", "AMZ_CREATORS_VERSION"), // optional: detected below when missing
    tag: pick("ASSOCIATE_TAG", "AMZ_ASSOCIATE_TAG") || (process.env.GQ_ASSOCIATE_TAG ?? ""),
    marketplace: pick("MARKETPLACE", "AMZ_MARKETPLACE") || (process.env.GQ_MARKETPLACE ?? "www.amazon.es"),
  };
  if (!c.id || !c.secret) {
    console.warn("Amazon products disabled: the Creators API credential id and secret are required.");
    return null;
  }
  if (!c.version) {
    // The credential version decides the token endpoint. Try the ones for the marketplace's region.
    const eu = /amazon\.(es|co\.uk|de|fr|it|nl|se|pl|com\.be|com\.tr|ae|sa|in|eg)$/.test(c.marketplace);
    const candidates = eu ? ["3.2", "2.2"] : /amazon\.(co\.jp|sg|com\.au)$/.test(c.marketplace) ? ["3.3", "2.3"] : ["3.1", "2.1"];
    for (const v of candidates) {
      try {
        await accessToken({ ...c, version: v });
        c.version = v;
        break;
      } catch { /* try the next one */ }
    }
    if (!c.version) {
      console.warn(`Amazon products disabled: the credentials were rejected by the token endpoints for versions ${candidates.join(", ")}.`);
      return null;
    }
  }
  return c;
}

export function amazonConfig() {
  if (!configPromise) {
    configPromise = loadConfig();
    // If the secret is not there yet, look again in a minute instead of remembering "no store".
    configPromise.then((c) => { if (!c) setTimeout(() => { configPromise = null; }, 60_000); });
  }
  return configPromise;
}

async function accessToken(c: Config): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const url = TOKEN_URL[c.version];
  const v3 = c.version.startsWith("3.");
  const res = await fetch(url, v3
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "client_credentials", client_id: c.id, client_secret: c.secret, scope: "creatorsapi::default" }) }
    : { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.id, client_secret: c.secret, scope: "creatorsapi/default" }) });
  if (!res.ok) throw new Error(`Creators API token request failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return token.value;
}

interface RawItem {
  asin: string;
  detailPageURL: string;
  images?: { primary?: { medium?: { url: string }; large?: { url: string } } };
  itemInfo?: { title?: { displayValue: string } };
  offersV2?: { listings?: { price?: { money?: { amount: number; currency: string; displayAmount: string } } }[] };
}

/** Best matching product for a search query, within a max price in the marketplace currency. */
export async function searchProduct(query: string, maxPrice: number | null): Promise<AmazonProduct | null> {
  const c = await amazonConfig();
  if (!c || Date.now() < notEligibleUntil) return null;
  const t = await accessToken(c);
  const res = await fetch(`${CATALOG}/searchItems`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: c.version.startsWith("2.") ? `Bearer ${t}, Version ${c.version}` : `Bearer ${t}`,
      "x-marketplace": c.marketplace,
    },
    body: JSON.stringify({
      keywords: query,
      partnerTag: c.tag,
      marketplace: c.marketplace,
      itemCount: 3,
      ...(maxPrice ? { maxPrice: Math.round(maxPrice * 100) } : {}),
      resources: ["images.primary.medium", "itemInfo.title", "offersV2.listings.price"],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("AssociateNotEligible")) {
      notEligibleUntil = Date.now() + 60 * 60 * 1000;
      console.warn("Creators API: the Associates account is not eligible yet (sales threshold). Using tagged search links for an hour.");
      return null;
    }
    throw new Error(`Creators API searchItems failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  const body = (await res.json()) as { searchResult?: { items?: RawItem[] } };
  const items = body.searchResult?.items ?? [];
  const item = items.find((i) => i.offersV2?.listings?.[0]?.price) ?? items[0];
  if (!item) return null;
  const money = item.offersV2?.listings?.[0]?.price?.money;
  return {
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? query,
    imageUrl: item.images?.primary?.medium?.url ?? item.images?.primary?.large?.url ?? null,
    price: money?.displayAmount ?? null,
    amount: money?.amount ?? null,
    currency: money?.currency ?? null,
    url: item.detailPageURL,
  };
}

/** Amazon search page for a query in the configured store, with the affiliate tag. Works without API eligibility. */
export function taggedSearchUrl(c: { marketplace: string; tag: string }, query: string) {
  const tag = c.tag ? `&tag=${encodeURIComponent(c.tag)}` : "";
  return `https://${c.marketplace}/s?k=${encodeURIComponent(query)}${tag}`;
}

/** Search several queries at once; a failure or slow answer just leaves that idea without a product. */
export async function findProducts(queries: string[], maxPrice: number | null, timeoutMs = 5000) {
  const one = (q: string) => Promise.race([
    searchProduct(q, maxPrice).catch((e) => { console.warn((e as Error).message); return null; }),
    new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
  ]);
  return Promise.all(queries.map(one));
}
