# Slinger3000# Slinger 3000

An internal email generation tool for Yotpo outbound sequences. Built for Alex Rosenblum, Lifecycle Product Marketing Manager.

## What it does

Slinger 3000 generates cold outbound email sequences using Claude AI. It automatically matches target brands to verified Yotpo customers in the same vertical and injects them as proof points into the prompt.

## How to use it

1. **Target type** — choose Brand, Competitor, or Other
2. **Target** — enter a brand name or segment. If it matches a known brand, lookalike Yotpo customers appear automatically
3. **Audience** — Exec-focused (business outcomes, no features) or User-focused (features and workflows)
4. **Sender persona** — Exec, Marketing, or Sales. Each has its own voice and tone rules
5. **Angle** — pick the campaign angle: Reviews, Loyalty, AI Discoverability, Competitor Displacement, and more
6. **Emails in series** — choose 1 to 5 emails
7. Hit **Generate emails**

## Output

- 5 subject line options to A/B test
- Full email sequence written as a natural thread
- Each email is 15-30 seconds to read (60-120 words)
- Inline copy buttons for each email and subject line

## Rules baked in

- Emails always open with a you/brand statement, never a generic observation
- No em dashes, no AI tells, no filler language
- Each email in a sequence introduces a new angle — never repeats
- Stats and customer names are pulled from the content library only — no hallucinated data
- Thread cadence: Email 1 introduces, Email 2+ follow up naturally, final email is a soft close

## Setup

Add your Anthropic API key to line 21 of `slinger_3000.html`:

const HARDCODED_API_KEY = "sk-ant-...";

Then open the file in any browser.
