# GiftyQuest

**The gift memory for the people you love.** Tell Alexa about them, drop hints whenever you hear
one, and get gift ideas that come with a reason.

GiftyQuest is a web app plus an MCP server. The web app is where you see and edit everything about
the people you shop for. The MCP server lets Alexa+ (and any MCP-compatible assistant) read and
update the same data: run a short voice interview to build a profile, save hints, suggest gifts
for a budget and complete a purchase inside the conversation.

Built for the Amazon "Build, Ship, Shape" developer hackathon (Alexa+ track).

**Live demo:** https://main.dv6i6jw0gr6sb.amplifyapp.com (judges: the code for the live Alexa is in the
submission's testing instructions).

## What it does

- **A card per person:** dates, sizes, likes, dislikes, allergies, dated hints, gift history with
  how each gift landed. Every field is editable.
- **Voice interview:** Alexa asks a few questions, follows up on the answers and fills the card
  live.
- **Alexa's guesses, with a reason:** traits Alexa infers are shown apart from what you said, and
  you keep or drop each one.
- **Ideas that explain themselves:** every suggestion says why it fits. Alexa asks your budget
  each time.
- **Purchase in the conversation:** simulated checkout with rich cards. No real payment.
- **Trending:** popular gifts, flagged when they fit someone on your list.

## Project layout

```
giftyquest/
  shared/          domain types, example data, dates and the example gift catalog
  server/          Node server (Hono): REST API + MCP endpoint
    src/core/      business logic, no HTTP and no AWS (gifts.ts)
    src/mcp.ts     MCP tools and the gift_interview prompt
    src/brain/     simulated Alexa+: Amazon Nova on Bedrock acting as an MCP client
    src/store/     storage behind an interface (local JSON files now, DynamoDB on AWS)
    scripts/       smoke.ts: end-to-end check with a real MCP client
  web/             React + Vite app (Tailwind, lucide-react, React Router)
    src/alexa/     live Alexa client and a scripted fallback for visitors without a judge code
```

## Run locally

Requires Node 22+.

```
npm install
AWS_PROFILE=<profile with Bedrock access> npm run dev:server   # API + MCP on http://localhost:8787
npm run dev:web      # web app on http://localhost:5177 (proxies /api and /mcp)
npx tsx server/scripts/smoke.ts       # MCP check with a real MCP client
npx tsx server/scripts/talk.ts        # live Alexa: hint, ideas, budget, purchase
npx tsx server/scripts/interview.ts   # live Alexa: full gift interview
npx tsx server/scripts/ideas.ts       # live Alexa: what the gift ideas combine
npx tsx server/scripts/explore.ts     # live Alexa: explore an existing person
```

Server settings (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `GQ_MODEL` | `eu.amazon.nova-2-lite-v1:0` | Bedrock model or inference profile for the Alexa simulation |
| `GQ_BEDROCK_REGION` | `eu-west-1` | Bedrock region |
| `GQ_JUDGE_CODE` | empty | When set, the live Alexa needs this code (sent as `x-judge-code`). Empty means open, for local development |
| `GQ_TURNS_PER_DAY` | `120` | Live Alexa turns per demo account per day |
| `GQ_CREATORS_SSM` | `/giftyquest/amazon-creators.env` | SSM parameter with the Amazon Creators API credentials |
| `GQ_ASSOCIATE_TAG` | empty | Amazon Associates tag for product and search links (none when empty) |
| `GQ_MARKETPLACE` | `www.amazon.es` | Amazon store used for products |

## Real Amazon products

Gift ideas are matched with real products through the Amazon Associates Creators API (the
successor of PA-API 5): the model writes a short search query in the store's language, the server
calls `searchItems` within the user's budget, and the card shows the product image, title and
price with an affiliate link. Credentials are read from AWS SSM at runtime. If the Associates
account is not eligible yet (Amazon requires recent qualifying sales), each idea links to an
Amazon search with the affiliate tag instead. `npx tsx server/scripts/amazon.ts "<query>" <max>`
checks the connection.

Each browser gets a demo account (a random id kept in localStorage). Demo accounts expire after
24 hours.

## MCP server

- Endpoint: `POST /mcp/<accountId>` (the web app shows the full address under "Connect your own
  assistant").
- Transport: Streamable HTTP, stateless, JSON responses. Protocol version 2025-11-25.
- Tools: `list_people`, `get_profile`, `create_person`, `update_profile`, `add_preference`,
  `add_hint`, `save_guesses`, `profile_gaps`, `get_upcoming_dates`, `suggest_gifts`,
  `start_purchase`, `confirm_purchase`, `cancel_purchase`, `record_gift`.
- Prompts: `gift_interview`, a short voice interview that builds a profile for someone new, and
  `explore_person`, a few gap-driven questions that deepen an existing card ("Explore with Alexa").
- People can be referred to by name or by how the user calls them ("my girlfriend", "mom").

## How the Alexa simulation works

Alexa+ does not accept third-party add-ons yet, so the web app simulates it. The simulation is not
a mock: on every turn the server runs Amazon Nova 2 Lite on Amazon Bedrock (Converse API) and
connects it to the GiftyQuest MCP server as a real MCP client (in-memory transport). It lists the
same tools and reads the same `gift_interview` prompt any assistant would get over HTTP.

- The full conversation, tool calls included, is stored with the demo account so each turn knows
  what was already saved.
- Gift ideas mix concepts instead of repeating what you said: `suggest_gifts` picks a different
  combination of profile signals for each idea (a hint plus a color, a hobby plus a food...) and
  the model invents one specific gift per combination, showing the signals it used on the card.
- Two rules are enforced in code, not left to the model: `suggest_gifts` is refused until the user
  has given a budget, and nothing is bought without an explicit yes from the user in that turn.
- One extra screen-only tool, `show_gift_cards`, draws the Echo Show style idea cards.
- Visitors without a judge code get a scripted version of the same flow, so the demo costs nothing
  for them.

## Architecture on AWS

| Piece | Service | Why |
|---|---|---|
| Web app | AWS Amplify Hosting | Static React build with HTTPS. Rewrites send `/api/*` and `/mcp/*` to the Lambda, so the browser talks to one origin |
| API and MCP server | AWS Lambda (Node 22, arm64) with a function URL | The same Hono app as local (`server/src/lambda.ts`); runs only when called |
| Data | Amazon DynamoDB (on-demand) | One item per demo account; TTL on `expiresAt` deletes demo accounts after 24 hours |
| Alexa brain | Amazon Bedrock, Amazon Nova 2 Lite (EU inference profile) | Runs the interview, picks MCP tools, invents ideas and writes the reasons |
| Secrets | AWS Systems Manager Parameter Store (SecureString) | Judge code and Amazon Creators API credentials, read at runtime |

The Lambda role has least privilege: `GetItem`/`PutItem` on the table, `InvokeModel` on Nova,
`polly:SynthesizeSpeech`, and `GetParameter` on the two parameters it needs.

### Deploy

1. Once, with an IAM admin: create the CloudFormation stack `giftyquest-core` from
   [`infra/core.yaml`](infra/core.yaml) in eu-west-1 (table, Lambda role, Lambda and its URL).
2. Every release, without IAM permissions: `AWS_PROFILE=<profile> infra/deploy.sh` bundles the
   server with esbuild, updates the Lambda code, builds the web app and publishes it on Amplify.

## Feedback and friction

See [FRICTION.md](FRICTION.md).

## License

[MIT](LICENSE)
