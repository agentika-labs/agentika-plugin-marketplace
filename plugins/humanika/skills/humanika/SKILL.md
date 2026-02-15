---
name: humanika
description: |
  Use this skill when the user asks to "humanize this text",
  "make this sound less like AI", "fix AI writing patterns",
  "make this more natural", "rewrite to sound human",
  or mentions AI-sounding text, robotic writing, or Claude-speak.
version: 0.2.0
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Humanize Writing

Write like you're explaining something to a colleague over coffee -- with opinions, specifics, and your actual voice. This skill detects AI writing patterns and transforms text to sound like a real person wrote it.

## Input

**Text or file**: $ARGUMENTS

If the user provides a file path, read the file. If they paste text directly, work with that. If no input is provided, ask what text they want humanized.

## Process

Follow these steps:

### Step 1: Read the input

Read the provided text or file. Identify the intended audience, purpose, and tone (formal report, blog post, email, documentation, etc.).

### Step 2: Scan for AI patterns

Check the text against every pattern category below. Count occurrences and note specific examples.

### Step 3: Report findings

Show the user a brief summary:
- Number of AI patterns found, grouped by category
- The 3-5 worst offenders with specific quotes
- An overall "AI-ness" rating: Low (1-3 patterns), Medium (4-8), High (9+)

### Step 4: Ask user preference

Ask the user:
- **Light touch**: Fix only the most obvious AI tells (vocabulary swaps, sycophantic openings)
- **Standard**: Fix all detected patterns while preserving structure
- **Full rewrite**: Rewrite from scratch in a natural voice, keeping the same information

### Step 5: Apply fixes and verify

Apply the chosen level of fixes. For each change, preserve the original meaning. Show a before/after diff so the user can review.

After applying fixes, run a quality check:
1. **Re-scan** the output for any remaining AI patterns (vocabulary, structure, tone, formatting)
2. **Read-aloud test**: Would someone actually say this out loud? If a sentence sounds wrong spoken aloud, rewrite it.
3. **Output a detection risk rating**:
   - **Low**: Reads like a real person wrote it. No obvious AI patterns remain.
   - **Medium**: Mostly natural but 1-2 patterns linger. Note which ones.
   - **High**: Still reads like AI. Needs another pass. Explain why.

### Step 6: Revise (if the user iterates)

When the user asks for changes to already-humanized text:
1. Re-scan the revised text for remaining or newly introduced AI patterns
2. Apply the user's specific feedback
3. Show a diff of what changed this round
4. Report an updated detection risk rating

---

## AI Patterns to Detect

### Vocabulary

These words and phrases are strong AI signals. Replace them with plain language.

**AI-favorite words** -- Almost never used by humans in casual or professional writing:

| AI word | Human alternative |
|---------|-------------------|
| delve | dig into, explore, look at |
| tapestry | mix, combination, range |
| landscape | field, area, space |
| multifaceted | complex, varied |
| nuanced | subtle, detailed |
| leverage | use, take advantage of |
| utilize | use |
| facilitate | help, enable, make easier |
| comprehensive | thorough, complete, full |
| robust | strong, solid, reliable |
| streamline | simplify, speed up |
| innovative | new, clever, creative |
| cutting-edge | latest, newest, modern |
| paradigm | model, approach, way of thinking |
| synergy | teamwork, combined effect |
| holistic | overall, whole-picture, full |
| pivotal | key, important, critical |
| testament | proof, evidence, sign |
| realm | area, field, world |
| embark | start, begin |
| foster | encourage, support, build |
| underscore | highlight, show, emphasize |
| myriad | many, countless, a range of |
| esteemed | respected, well-known |
| commendable | impressive, worth praising |
| meticulous | careful, thorough, precise |
| intricate | complex, detailed |
| endeavor | effort, attempt, project |
| resonate | connect, ring true, click |
| aligns with | fits, matches, supports |
| showcasing | showing, demonstrating, presenting |
| cultivating | building, growing, developing |
| encompassing | covering, including, spanning |

**Promotional/travel-brochure language** -- Sounds like ad copy, not real writing:

- groundbreaking, breathtaking, nestled, vibrant, bustling, captivating
- game-changer, unparalleled, transformative, awe-inspiring
- elevate, unlock (your potential), reimagine, harness
- "a testament to", "serves as a beacon", "stands as a symbol"

**Superficial -ing verbs** -- These gesture at depth without adding content:

- highlighting, underscoring, emphasizing, ensuring, reflecting
- symbolizing, contributing to, cultivating, fostering, encompassing, showcasing

**Undue significance language** -- Makes ordinary things sound historic:

- "stands as / serves as", "is a testament to"
- "a vital / crucial / pivotal role", "reflects broader trends"
- "at the heart of", "is emblematic of", "speaks to the power of"

### Structure

**Rule of three** -- AI loves grouping things in threes. Humans sometimes use two, sometimes four, sometimes seven. If you see repeated triple groupings, vary them.

> AI: "It requires patience, dedication, and perseverance."
> Human: "It requires patience. And honestly, a lot of stubbornness."

**Em dash overuse** -- AI uses em dashes (—) far more than most human writers. Target: zero. Replace ALL em dashes with commas, periods, or parentheses. Even one is a tell because real writers rarely reach for them.

**Negative parallelism** -- "It's not just X, it's Y" or "It's not merely X, it's Y." AI uses this construction constantly. Humans state what something IS, not what it isn't-then-is.

> AI: "It's not just a tool, it's a revolution."
> Human: "It's a genuinely useful tool."

**Inline-header lists** -- Lists where each item starts with a **bolded label** followed by a colon. Real writing uses plain bullet points or just paragraphs.

> AI:
> - **Scalability**: Handles millions of requests
> - **Reliability**: 99.9% uptime guarantee
> - **Security**: Enterprise-grade encryption
>
> Human:
> It scales well (millions of requests), stays up (99.9%), and the encryption is solid.

**False ranges** -- "from X to Y" used to sound comprehensive without saying anything specific.

> AI: "From seasoned professionals to curious beginners, everyone will find value."
> Human: "Beginners will get the most out of this, but experienced devs will find a few tricks too."

**Synonym cycling** -- Referring to the same thing by a different name each time to avoid repetition. Humans just say "it" or repeat the word.

> AI: "The framework... the platform... the solution... the tool..."
> Human: "The framework... it... the framework..."

**Copula avoidance** -- Using "serves as" or "stands as" instead of "is." AI rarely just says "is."

> AI: "This serves as a powerful reminder that..."
> Human: "This is a good reminder that..."

### Tone

**Sycophantic openings** -- Starting responses with flattery or enthusiasm about the question itself:

- "Great question!"
- "That's a really interesting point!"
- "What a fantastic topic to explore!"
- "Absolutely!"
- "I'd be happy to help!"
- "Of course!"
- "Certainly!"
- "You're absolutely right!"
- "I hope this helps!"
- "Would you like me to..."
- "Let me know if..."
- "Here is a..."

Remove these entirely. Just answer the question.

**Inflated symbolism** -- Making ordinary things sound profound or world-changing:

> AI: "This commit represents a fundamental shift in how we think about error handling."
> Human: "This commit changes how we handle errors."

**Superficial -ing analyses** -- Sentences that use an -ing word to gesture at depth without adding content:

> AI: "By leveraging cloud infrastructure, organizations are transforming their digital capabilities."
> Human: "Companies moved to the cloud and things got faster."

**Generic positive conclusions** -- Ending with vague optimism instead of a real takeaway:

> AI: "The future holds exciting possibilities for those willing to embrace change."
> Human: "If you start migrating now, you'll save about 20% on infra costs by Q3."

### Attribution

**Weasel words** -- Vague attributions that sound authoritative but cite nothing:

- "Experts say...", "Studies suggest...", "Research has shown..."
- "It is widely believed...", "Many consider...", "It's generally accepted..."
- "According to industry standards..."

Either cite the specific source or drop the claim.

**Knowledge-cutoff disclaimers** -- Any variation of "As of my last update" or "Based on my training data." Remove these entirely. If the information might be outdated, say so naturally: "This was true in 2024 -- worth double-checking."

### Hedging

**Excessive qualification** -- Softening every statement with hedges:

- "It's important to note that...", "It's worth mentioning that..."
- "It should be noted that...", "One might argue that..."
- "In many cases...", "To some extent..."
- "arguably", "potentially", "perhaps", "in a sense"

Cut these. State the thing directly. If uncertainty is real, express it once, clearly.

**Filler transitions** -- Generic connectors that add words without adding meaning:

- "Moreover", "Furthermore", "Additionally", "In addition"
- "That being said", "Having said that", "With that in mind"
- "In today's rapidly evolving landscape", "In an era of..."
- "When it comes to", "In terms of"

Replace with a period and a new sentence, or just delete them.

### Formatting

**Emoji decoration** -- Using emojis as bullet points or section markers. Real technical or professional writing doesn't do this.

**Title case headings everywhere** -- AI tends to capitalize Every Word In A Heading. Humans usually use sentence case.

**Overuse of boldface** -- Bolding key terms in every paragraph as if the reader can't find the important parts. Use bold sparingly for genuine emphasis.

**Curly quotation marks** -- AI tends to produce typographic "smart quotes" (curly quotes) instead of straight ASCII quotes ("like this"). Most human-written plain text and code uses straight quotes. Replace curly single/double quotes with their straight equivalents.

---

## Adding Voice

Removing AI patterns is necessary but not sufficient. Clean text can still feel lifeless. These techniques inject a real human voice.

**Signs of clean-but-lifeless writing:**
- Every sentence is the same length
- No opinions or judgments anywhere
- No uncertainty or hedging that feels genuine
- Nothing surprising or unexpected in the phrasing

**Injection techniques:**

- **Start with connectors**: "And", "But", "Look,", "Here's the thing,", "Honestly"
- **Use fragments**: "Because that's real." "Not even close." "Worth it."
- **Be specific about feelings**: Don't say "concerning." Say what the discomfort actually is: "makes my stomach drop" or "keeps me up thinking about edge cases"
- **Let tangents happen**: Parenthetical asides are human. (Like this one. Real people go on detours.)
- **Vary paragraph length dramatically**: Follow a five-sentence paragraph with a one-liner.
- **Break grammar rules on purpose**: Start with "And." End with a preposition. Use "they" as singular. Write how people actually talk.
- **Interrupt yourself**: Use dashes (sparingly, see the em dash rule) or ellipses to trail off... then come back.

---

## What Good Writing Looks Like

After removing AI patterns, actively add these qualities:

### Have opinions

Don't hedge on everything. If something is good, say it's good. If an approach is bad, say why. "I think X is the better choice because..." is more useful than "Both X and Y have their merits."

### Use specific details

Replace vague claims with concrete facts, numbers, or examples.

> Vague: "This significantly improves performance."
> Specific: "This cut our P95 latency from 340ms to 90ms."

### Be direct

Start sentences with the actual point instead of building up to it.

> Indirect: "It is important to consider the fact that the API has rate limits."
> Direct: "The API rate-limits at 100 requests/minute."

### Vary sentence rhythm

Mix short sentences with longer ones. Use fragments occasionally. Let the writing breathe. A paragraph of identically-structured sentences is a tell.

### Use conversational asides

Parenthetical comments, dashes (sparingly), "honestly," "to be fair," "look," -- these signal a real person is writing. See the "Adding Voice" section above for more techniques.

### Acknowledge honest limitations

Instead of pretending to know everything, admit what you don't know or what's uncertain. "I'm not sure this scales past 10K users -- we haven't tested it" is more trustworthy than "This solution is highly scalable."

### Use "I" and "we" when appropriate

AI avoids first person. Humans don't. "I've found that..." or "We tried X and it didn't work" sounds real.

### Prefer active voice and present tense

> AI: "The data was processed by the pipeline and the results were stored."
> Human: "The pipeline processes the data and stores the results."

---

## Before/After Examples

### Example 1: Technical blog intro

**Before (AI):**
> In today's rapidly evolving technological landscape, developers are increasingly leveraging containerization to streamline their deployment workflows. Docker has emerged as a pivotal tool in this transformative journey, offering a robust and comprehensive solution for managing application lifecycles. This guide delves into the multifaceted world of Docker, from foundational concepts to cutting-edge best practices.

**After (human):**
> Docker changed how we deploy code. Instead of fighting "works on my machine" bugs, you package everything into a container and ship it. This guide covers the basics and a few tricks I've picked up running Docker in production for three years.

*What changed: Removed "landscape," "leveraging," "streamline," "pivotal," "transformative," "robust," "comprehensive," "delves," "multifaceted," "cutting-edge." Replaced vague scope with a specific personal angle. Cut word count by 40%.*

### Example 2: Product description

**Before (AI):**
> Our groundbreaking platform serves as a testament to innovative engineering, offering an unparalleled suite of tools designed to elevate your workflow. From seasoned developers to curious beginners, our holistic solution fosters collaboration, streamlines processes, and unlocks new possibilities for teams of all sizes.

**After (human):**
> It's a dev tool platform. It handles CI/CD, code review, and project tracking in one place. We built it because Jira+GitHub+Jenkins was three tools too many. Small teams (under 20 devs) get the most out of it.

*What changed: Removed "groundbreaking," "testament," "innovative," "unparalleled," "elevate," "holistic," "fosters," "streamlines," "unlocks." Replaced false range ("from seasoned to beginners") with a real target audience. Added the actual problem it solves.*

### Example 3: Email response

**Before (AI):**
> Thank you for your thoughtful and comprehensive inquiry! I'd be happy to help you navigate this multifaceted challenge. It's important to note that there are several nuanced considerations to keep in mind. Moreover, the landscape of options available is quite robust, and I believe we can find a solution that aligns perfectly with your needs.

**After (human):**
> Good question. Short answer: yes, but with a caveat. The free tier caps at 1000 API calls/month. If you need more, the $29/month plan removes the limit. Let me know which makes sense for your usage and I'll walk you through the setup.

*What changed: Removed sycophantic opening, hedging, and every AI-vocabulary word. Replaced vague promises with a real answer containing specific numbers.*

---

## Tips

- **Preserve meaning**: Every rewrite must convey the same information. Humanizing isn't about removing content -- it's about changing how it's expressed.
- **Match intended tone**: A legal document should sound different from a blog post. "Human" doesn't always mean "casual." It means "like a person with expertise actually wrote this."
- **Don't over-correct**: Not every instance of "comprehensive" needs replacement. One or two per document is fine. It's the accumulation of patterns that sounds artificial.
- **Watch for context**: Some AI words are normal in specific domains. "Robust" is fine in statistics. "Leverage" is fine in finance. Flag them but use judgment.
- **Keep technical accuracy**: When rewriting technical content, don't sacrifice precision for personality. "It's fast" is worse than "P95 is 12ms" even though it sounds more casual.
- **First person is your friend**: Inject "I think," "In my experience," "We found that" where appropriate. This is the single fastest way to make text sound human.
