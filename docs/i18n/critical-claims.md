# Critical claims register

The site's load-bearing factual claims, and a per-locale verdict on each.

Every figure below was read out of `src/data/rates.json` and the English
catalog on the audit run, not carried over from a brief or from memory. The
automated half of this — that the numbers match, that no negation word is
missing, that the terminology holds — runs in `npm run i18n:audit`. The half
recorded here is the half a script cannot do: whether the translated sentence
*means* what the English one means.

**What this register is not.** It is not a native review. The verdicts below
were reached by reading each translation against its English source and
back-translating it, by the same author who wrote the translations. That
catches a dropped negation, a changed number, a reversed condition and a
collapsed distinction — and it does not catch register, idiom, or the way a
sentence lands on somebody who grew up in the language. No locale is marked
`native-reviewed` by this audit, and `reviewerName` is still `null` for all six
in `src/i18n/config.ts`.

---

## The canonical figures

Read from `src/data/rates.json` on this run.

| Fact | Value | Source path |
| --- | --- | --- |
| Standard rate | `0.0038` USD per eligible Earned Robux | `rates[id=standard-current].usdPerRobux` |
| Standard, per 1,000 | `3.80` | `.usdPerThousandRobux` |
| Eligible U.S. 18+ rate | `0.0054` (`5.40` per 1,000), status `conditional` | `rates[id=us-18-plus-qualified]` |
| Legacy rate | `0.0035` (`3.50` per 1,000), status `legacy` | `rates[id=legacy-pre-2025-09-05]` |
| Minimum | `30000` eligible Earned Robux | `minimum.eligibleEarnedRobux` |
| Minimum age | `13` | English catalog, `rates.requirements.items.minimumAgeDetail` |
| Marketplace shares | in-experience 70/30 · Marketplace avatar item 30/70 · avatar item in experience 30/30, 40 to the experience owner | `marketplace.schemes[]` |

---

## 1. The sentence that matters most

> **Meeting the minimum requirements does NOT guarantee DevEx approval.**

Sixteen English strings carry this claim. `approvalClaimKeys()` in the audit
harness derives the list from the English catalog, so a new page that makes the
claim joins the check the day it is written rather than when somebody remembers.

Three carry it in the places a reader is most likely to act on: the homepage
note under the requirements, the note on the documented minimum, and the
threshold callout on `/devex-requirements/`. All three are quoted below with a
literal back-translation.

### `calculator.home.meetingAllNote`

English: *Meeting all of these lets you submit a request. It does not guarantee
one will be approved.*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Cumprir tudo isso permite enviar um pedido. **Não garante** que ele será aprovado. | "…It **does not guarantee** it will be approved." | **PASS** |
| `es` | Cumplir todo esto te permite enviar una solicitud. **No garantiza** que se apruebe. | "…It **does not guarantee** it is approved." | **PASS** |
| `id` | Memenuhi semua ini memungkinkan Anda mengajukan permohonan. Itu **tidak menjamin** permohonan akan disetujui. | "…That **does not guarantee** the request will be approved." | **PASS** |
| `fr` | Remplir tout cela vous permet de déposer une demande. Cela **ne garantit pas** qu'elle sera acceptée. | "…That **does not guarantee** it will be accepted." | **PASS** |
| `de` | Wenn du all das erfüllst, kannst du einen Antrag stellen. Es **garantiert nicht**, dass er genehmigt wird. | "…It **does not guarantee** that it will be approved." | **PASS** |
| `tr` | Bunların hepsini karşılamak talep göndermenizi sağlar. Talebin onaylanacağını **garanti etmez**. | "…It **does not guarantee** that the request will be approved." | **PASS** |

### `data.minimum.note`

English: *Roblox states a minimum of 30,000 Earned Robux to submit a DevEx
request. Meeting the number is not the same as being approved.*

| Locale | The second sentence | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Atingir o número **não é o mesmo que** ser aprovado. | "Reaching the number **is not the same as** being approved." | **PASS** |
| `es` | Alcanzar la cifra **no es lo mismo que** ser aprobado. | "Reaching the figure **is not the same as** being approved." | **PASS** |
| `id` | Mencapai angka itu **tidak sama dengan** disetujui. | "Reaching that number **is not the same as** being approved." | **PASS** |
| `fr` | Atteindre ce nombre **n'équivaut pas à** être accepté. | "Reaching that number **is not equivalent to** being accepted." | **PASS** |
| `de` | Die Zahl zu erreichen ist **nicht dasselbe wie** angenommen zu werden. | "Reaching the number is **not the same as** being accepted." | **PASS** |
| `tr` | Bu sayıya ulaşmak, onaylanmakla **aynı şey değildir**. | "Reaching this number **is not the same thing as** being approved." | **PASS** |

### `rates.requirements.threshold.above`

English: *At or above the line, a request can be submitted. It is then reviewed,
and meeting the threshold is not the same as being approved.*

All six preserve both halves — that a request *can* be submitted, and that
submission is followed by review — and attach the negation to the second, not
the first. `pt-BR` "atingir o limite não é o mesmo que ser aprovado", `es`
"alcanzar el umbral no es lo mismo que ser aprobado", `id` "mencapai ambang
batas tidak sama dengan disetujui", `fr` "atteindre le seuil n'équivaut pas à
être approuvé", `de` "die Schwelle zu erreichen ist nicht dasselbe wie bewilligt
zu werden", `tr` "eşiği aşmak, onaylanmakla aynı şey değildir". **PASS** in all
six.

**None of the six** drops the negation, attaches it to the wrong clause, turns
the requirement into a sufficiency, or weakens it to a probability. The
automated `negation-lost` check confirms no approval-claim sentence in any
locale is missing a negation marker; four Turkish sentences carry it as a verb
suffix (`garanti et**mez**`) and are reported as `negation-morphological` for a
Turkish reader to confirm rather than passed silently.

---

## 2. Rate values and their conditions

| Locale | 0.0038 standard | 0.0054 U.S. 18+ | 0.0035 legacy | Condition attached to the right rate | Verdict |
| --- | --- | --- | --- | --- | --- |
| `pt-BR` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |
| `es` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |
| `id` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |
| `fr` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |
| `de` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |
| `tr` | `0,0038` | `0,0054` | `0,0035` | yes | **PASS** |

**Fixed during this audit.** All six wrote the rate as `0.0038` with an English
decimal point while localizing every other number in the same sentence —
`rates.usdToRobux.body.rounding.p1` and `rates.devexRates.body.changes.p1`. The
value was right and the notation was not, in the one figure the site exists to
publish. Corrected in `src/i18n/locales/<locale>/rates.json`.

The U.S. 18+ rate keeps its condition in every locale: that Roblox determines
which portion of a balance qualifies and the creator cannot select it
(`data.rates.us-18-plus-qualified.conditionNote`). The legacy rate keeps its
cut-off — 5 September 2025 at 10:00 PT — with the time correctly localized
(`10h` in French and Portuguese, `10.00` in Indonesian and Turkish).

---

## 3. The minimum threshold

`30,000` eligible Earned Robux, present and correct in all six, written with
each locale's own grouping: `30.000` in pt-BR, es, id, de and tr, `30 000` in
fr. Framed as a minimum to *submit*, never as a target, a cap, or a guaranteed
payout point — verified above in `data.minimum.note`. **PASS** in all six.

---

## 4. Age requirement

`13`, in all six, as a minimum age to participate. Not softened into a
recommendation and not shifted to another number.
(`rates.requirements.items.minimumAgeDetail`, `routes.devexRequirements.quickAnswer`.)

`routes.devexRequirements.faqs.q02.answer` keeps the distinction English makes:
13 is the age to participate; the separate 18+ condition concerns the age
verification of the *players who spent the Robux* and affects the rate, not the
creator's eligibility. All six preserve both halves. **PASS**.

---

## 5. Eligibility conditions, and their conjunction

English documents **five** requirements joined by "and", with one internal
disjunction ("IRS form W-9 **or** W-8").

| Locale | Count | Joined with | Internal "or" preserved | Verdict |
| --- | --- | --- | --- | --- |
| `pt-BR` | cinco | `e` | `W-9 ou W-8` | **PASS** |
| `es` | cinco | `y` | `W-9 o W-8` | **PASS** |
| `id` | lima | `dan` | `W-9 atau W-8` | **PASS** |
| `fr` | cinq | `et` | `W-9 ou W-8` | **PASS** |
| `de` | fünf | `und` | `W-9 oder W-8` | **PASS** |
| `tr` | beş | `ve` | `W-9 ya da W-8` | **PASS** |

No locale renders the set as alternatives, as examples, or as a partial list,
and every one keeps the separate obligation that follows ("You must also comply
with the Roblox Terms of Use and Community Standards").

---

## 6. Approval rests with Roblox

Every locale keeps approval with Roblox and keeps it discretionary — "Roblox
reviews every request", "Roblox analisa cada solicitação", "Roblox examine
chaque demande", "Roblox prüft jeden Antrag", "Roblox her talebi inceler". No
locale renders approval as automatic, procedural or assured. **PASS** in all
six.

---

## 7. Earned Robux versus ordinary Robux

The distinction the whole site rests on, and the one several of these languages
have no natural way to make.

**The decision, enforced by the harness:** "Earned Robux" stays in English in
every locale. It is the name of a specific balance, not a description, and
translating it produces a phrase that reads as "Robux you earned" — which is
what a reader would already assume about all of their Robux.

The glossary check in `scripts/i18n/audit/run.ts` asserts this on every English
string that uses the term. All six comply. German compounds it as
`Earned-Robux-Beträge`, which is correct German and keeps the term intact; the
check treats a hyphen as a space for that reason.

### One open item, and it is English's

`rates.earnedRobux.pendingDescription` — the section on pending balances.

> English: *Newly **earned Robux** are not immediately available, which
> surprises creators watching a balance climb.*

English writes "earned" here in lower case, as an ordinary adjective. In a
section about how long **Earned Robux** stay pending, it reads either way: "the
Earned Robux you have just acquired", or "Robux you recently earned". All six
translations took the second reading and used the ordinary adjective —
`verdiente Robux`, `Robux fraîchement gagnés`, `Robux recién ganados` — which
collapses the distinction on the one page that exists to teach it.

**No translation was changed and no English was changed.** English is the
reference the other five were derived from, and this is an ambiguity in the
reference, not an error in the translations. It needs a decision:

- If the term is meant, English should read "Newly acquired Earned Robux" or
  similar, and all six translations then keep "Earned Robux" untranslated.
- If the ordinary adjective is meant, the six translations are already correct
  and only the harness's glossary check needs an exemption for this key.

Recorded as **NEEDS-DECISION (English)**, blocking nothing else.

---

## 8. Estimates and independence

Every locale states that calculator output is an estimate, and that the site is
independent of Roblox Corporation
(`calculator.results.copyDisclaimer`, `common.footer.trademarkNotice`). No
locale drops the trademark attribution or the non-affiliation. **PASS** in all
six.

---

## Standing verdicts

| Locale | Catalog audit | Critical claims | Native review |
| --- | --- | --- | --- |
| `pt-BR` | PASS | PASS | **not done** |
| `es` | PASS | PASS | **not done** |
| `id` | PASS | PASS | **not done** |
| `fr` | PASS | PASS | **not done** |
| `de` | PASS | PASS | **not done** |
| `tr` | PASS | PASS, 4 sentences flagged for a Turkish reader | **not done** |

The third column is the one that gates publication, and nothing in this audit
changes it. `docs/i18n/publishing-a-locale.md` has the procedure.
