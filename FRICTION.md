# Friction log

Problems, surprises and feature requests found while building GiftyQuest with Amazon developer
tools. One entry per issue, written when it happens.

Format: date, tool, what I expected, what happened, how I solved it, what I would ask for.

---

### 2026-10-08 · Amazon Bedrock · Newer models listed but not usable

- **Expected:** models returned by `ListFoundationModels` and `ListInferenceProfiles` in eu-west-1
  (Claude Sonnet 5.5, Haiku 5.5, Sonnet 5), shown as `AUTHORIZED` and `AVAILABLE` by
  `GetFoundationModelAvailability`, to accept a `Converse` call.
- **What happened:** `AccessDeniedException: ... is not available for this account. ... contact AWS
  Sales`. Older models from the same provider worked with the same role. A separate call said the
  provider use-case form was not filled in, but nothing connected the two messages.
- **How I solved it:** moved on to Amazon Nova, which worked at once.
- **Feature request:** make the availability API and the console say why a model cannot be
  invoked from this account (form missing, account too new, quota) and what to do about it.

### 2026-10-13 · AWS CloudFormation · Deleting a failed stack removed another stack's role

- **What happened:** the same template (with a fixed IAM role name) was launched by mistake in
  eu-north-1, where it succeeded, and in eu-west-1, where it failed and stayed in
  `ROLLBACK_FAILED`. Deleting the failed eu-west-1 stack as an admin deleted the IAM role that
  the eu-north-1 stack had created, because IAM names are global. No warning that the resource
  belonged to another stack.
- **How I solved it:** recreated the eu-west-1 stack, then deleted the eu-north-1 stack with
  `--retain-resources Role` so it would not remove the role now used in eu-west-1.
- **Feature request:** when a stack deletes a resource it did not create (or that another stack
  manages), warn first. A console banner showing the region next to the "Create stack" button
  would also prevent launching in the wrong region.

### 2026-10-08 · Amazon Associates Creators API · Eligibility gives no detail

- **Expected:** after creating credentials in Associates Central (Tools, Creators API), a test
  `searchItems` call to return products, or an error that says what is missing.
- **What happened:** the token request worked (credential version 3.2, EU endpoint), but
  `searchItems` returned `403 AssociateNotEligible: Your account does not currently meet the
  eligibility requirements.` Associates Central let me create credentials anyway. The stored
  credentials also did not include the version, which decides the token endpoint, so I had to try
  both EU endpoints.
- **How I solved it:** detect the version by trying the region's endpoints, and fall back to
  tagged Amazon search links until the account is eligible.
- **Feature request:** say in the error and in Associates Central which requirement is not met
  and how far the account is from it (for example "7 of 10 qualifying sales in the last 30 days"),
  and do not issue credentials, or warn clearly, while the account is not eligible. A small
  sandbox quota for building and testing before the threshold would help developers a lot.

### 2026-10-08 · Amazon Nova on Bedrock · Tool use in long conversations

- **Expected:** with the full tool list and clear instructions, Nova 2 Lite would save each answer
  of a multi-turn interview with the matching tool.
- **What happened:** when earlier turns were sent as plain text only, the model stopped calling
  tools after a few turns and said "I saved it" without saving. Nova Pro did the same.
- **How I solved it:** keep the full Converse history on the server, including `toolUse` and
  `toolResult` blocks, and send it every turn. Tool calls became reliable. For the one step that
  still slipped (saving inferred traits), a second call with `toolChoice` forcing the tool.
- **Feature request:** a short note in the Nova tool-use docs saying that dropping tool blocks from
  history degrades tool calling, plus a sample of a server-side conversation store.

### 2026-10-08 · Amazon Nova Pro and Lite · Reasoning text in the answer

- **What happened:** Nova Pro and Nova Lite (v1) put `<thinking>...</thinking>` text before tool
  calls. Nova 2 Lite did not. For a voice assistant this text must never be spoken.
- **How I solved it:** strip the tags before using the reply.
- **Feature request:** an option to suppress or separate reasoning text, like a reasoning content
  block.
