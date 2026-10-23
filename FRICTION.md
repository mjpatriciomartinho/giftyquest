# Friction log

Problems, surprises and feature requests found while building GiftyQuest with Amazon developer
tools. One entry per issue, written when it happens.

Format: task attempted, steps taken, expected vs. actual result, severity, workaround used,
actionable suggestion.

---

### 1. Amazon Bedrock · Model not usable on a new AWS account (2026-10-21)

- **Task:** Call Amazon Nova from our Lambda in a brand-new AWS account (eu-west-1).
- **Steps:** Created the account, deployed the stack, called `Converse` with
  `eu.amazon.nova-2-lite-v1:0`.
- **Expected:** The model works, since it is listed as available in the region.
- **Actual:** "Operation not allowed". `GetFoundationModelAvailability` returned `NOT_AUTHORIZED`
  for days, with no reason given.
- **Severity:** High (blocked the live Alexa demo).
- **Workaround:** Call Bedrock through a cross-account IAM role in an older account where Nova
  works (`GQ_BEDROCK_ROLE`).
- **Suggestion:** Say why a model is blocked (new account, pending review, quota) and how long it
  will take or what to do.

### 2. Amazon Bedrock · Newer models listed as available but denied (2026-10-08)

- **Task:** Use the newest models listed in eu-west-1.
- **Steps:** `ListFoundationModels` and `GetFoundationModelAvailability` showed them as
  `AUTHORIZED` and `AVAILABLE`, then called `Converse`.
- **Expected:** The call works.
- **Actual:** `AccessDeniedException: ... is not available for this account. ... contact AWS
  Sales`. A separate message said the provider use-case form was not filled in, but nothing
  connected the two.
- **Severity:** Medium.
- **Workaround:** Moved to Amazon Nova, which worked at once.
- **Suggestion:** Make the availability API match what `Converse` allows, and name the exact
  missing step in the error.

### 3. Amazon Nova on Bedrock · Tool calls stop in long conversations (2026-10-08)

- **Task:** A multi-turn voice interview where each answer is saved with a tool.
- **Steps:** Sent earlier turns as plain text, with the full tool list and clear instructions.
- **Expected:** The model keeps calling the save tool every turn.
- **Actual:** After a few turns it said "I saved it" without calling the tool. Nova Pro did the
  same.
- **Severity:** High (data silently lost).
- **Workaround:** Keep the full Converse history on the server, including `toolUse` and
  `toolResult` blocks, and send it every turn. For the one step that still slipped (saving
  inferred traits), a second call with `toolChoice` forcing the tool.
- **Suggestion:** A note in the Nova tool-use docs that dropping tool blocks from history degrades
  tool calling, plus a sample of a server-side conversation store.

### 4. Amazon Nova Pro and Lite v1 · Reasoning text in the answer (2026-10-08)

- **Task:** Use the model reply as Alexa's spoken answer.
- **Steps:** Called Nova Pro and Nova Lite (v1) with tools.
- **Expected:** Only the text to speak.
- **Actual:** Replies started with `<thinking>...</thinking>` text, which must never be spoken.
- **Severity:** Low.
- **Workaround:** Strip the tags before using the reply. Nova 2 Lite does not do this.
- **Suggestion:** Return reasoning in a separate content block, or an option to suppress it.

### 5. Amazon Associates Creators API · Eligibility gives no detail (2026-10-08)

- **Task:** Show real Amazon products (image, title, price) for each gift idea.
- **Steps:** Created credentials in Associates Central (Tools, Creators API), requested a token,
  called `searchItems`.
- **Expected:** Products, or an error that says what is missing.
- **Actual:** The token request worked (credential version 3.2, EU endpoint), but `searchItems`
  returned `403 AssociateNotEligible: Your account does not currently meet the eligibility
  requirements.` Associates Central issued credentials anyway, and the stored credentials did not
  include the version, which decides the token endpoint.
- **Severity:** High (main feature limited).
- **Workaround:** Detect the version by trying the region's endpoints, and fall back to tagged
  Amazon search links until the account is eligible.
- **Suggestion:** Say which requirement is not met and how far the account is from it (for example
  "7 of 10 qualifying sales in the last 30 days"), warn before issuing credentials to a
  non-eligible account, and offer a small sandbox quota for building and testing.

### 6. AWS CloudFormation · Deleting a failed stack removed another stack's role (2026-10-13)

- **Task:** Deploy the core stack in eu-west-1.
- **Steps:** The same template (with a fixed IAM role name) was launched by mistake in eu-north-1,
  where it succeeded, and in eu-west-1, where it failed and stayed in `ROLLBACK_FAILED`. Then
  deleted the failed eu-west-1 stack.
- **Expected:** Only the failed stack's resources are removed.
- **Actual:** It deleted the IAM role the eu-north-1 stack had created, because IAM names are
  global. No warning that the resource belonged to another stack.
- **Severity:** Medium.
- **Workaround:** Recreated the eu-west-1 stack, then deleted the eu-north-1 stack with
  `--retain-resources Role`.
- **Suggestion:** Warn before deleting a resource another stack manages, and show the region next
  to the "Create stack" button.
