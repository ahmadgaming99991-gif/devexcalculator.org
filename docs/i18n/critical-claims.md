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

On **2026-08-31** the site's maintainer read the Turkish content and accepted
it, which moved `tr` to `qualityReview: "self-reviewed"` — "read by the
maintainer, who is not a native speaker" — and Turkish was published on that
basis (D-046). That is a second non-native reading, not a native one, and it
does not change any verdict below. The four sentences whose negation is carried
by a verb suffix are marked *non-native reading* for that reason, and they are
live on the site.

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

Thirty-one English strings carry this claim. `approvalClaimKeys()` in the audit
harness derives the list from the English catalog, so a new page that makes the
claim joins the check the day it is written rather than when somebody remembers.

All thirty-one are below, in all six languages — 186 translated sentences, each
quoted and back-translated literally. Three were recorded here before; the other
twenty-eight were covered only by the automated `negation-lost` check, which
confirms a negation marker is present and cannot read what the sentence says
around it.

**How to read the back-translations.** They are literal, not fluent: the point
is to expose the grammar of the claim, not to produce good English. Where a
language says something in a different order or with a different idiom, the
gloss follows the original rather than tidying it. The **claim clause** column
carries only the part of the string that makes the claim; the rest of each
string is checked by the same pass but is not the sentence at issue.

### 1.1 The threshold is a condition, not an outcome

#### `calculator.home.meetingAllNote`

English: *Meeting all of these lets you submit a request. It does not guarantee
one will be approved.*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Cumprir tudo isso permite enviar um pedido. **Não garante** que ele será aprovado. | "…It **does not guarantee** it will be approved." | **PASS** |
| `es` | Cumplir todo esto te permite enviar una solicitud. **No garantiza** que se apruebe. | "…It **does not guarantee** it is approved." | **PASS** |
| `id` | Memenuhi semua ini memungkinkan Anda mengajukan permohonan. Itu **tidak menjamin** permohonan akan disetujui. | "…That **does not guarantee** the request will be approved." | **PASS** |
| `fr` | Remplir tout cela vous permet de déposer une demande. Cela **ne garantit pas** qu'elle sera acceptée. | "…That **does not guarantee** it will be accepted." | **PASS** |
| `de` | Wenn du all das erfüllst, kannst du einen Antrag stellen. Es **garantiert nicht**, dass er genehmigt wird. | "…It **does not guarantee** that it will be approved." | **PASS** |
| `tr` | Bunların hepsini karşılamak talep göndermenizi sağlar. Talebin onaylanacağını **garanti etmez**. | "…It **does not guarantee** that the request will be approved." | **PASS**, non-native reading |

#### `data.minimum.note`

English: *Roblox states a minimum of {minimumRobux} Earned Robux to submit a
DevEx request. Meeting the number is not the same as being approved.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Atingir o número **não é o mesmo que** ser aprovado. | "Reaching the number **is not the same as** being approved." | **PASS** |
| `es` | Alcanzar la cifra **no es lo mismo que** ser aprobado. | "Reaching the figure **is not the same as** being approved." | **PASS** |
| `id` | Mencapai angka itu **tidak sama dengan** disetujui. | "Reaching that number **is not the same as** being approved." | **PASS** |
| `fr` | Atteindre ce nombre **n'équivaut pas à** être accepté. | "Reaching that number **is not equivalent to** being accepted." | **PASS** |
| `de` | Die Zahl zu erreichen ist **nicht dasselbe wie** angenommen zu werden. | "Reaching the number is **not the same as** being accepted." | **PASS** |
| `tr` | Bu sayıya ulaşmak, onaylanmakla **aynı şey değildir**. | "Reaching this number **is not the same thing as** being approved." | **PASS** |

#### `rates.requirements.threshold.above`

English: *At or above the line, a request can be submitted. It is then reviewed,
and meeting the threshold is not the same as being approved.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Ela então passa por análise, e atingir o limite **não é o mesmo que** ser aprovado. | "It then goes through review, and reaching the limit **is not the same as** being approved." | **PASS** |
| `es` | Después se revisa, y alcanzar el umbral **no es lo mismo que** ser aprobado. | "Afterwards it is reviewed, and reaching the threshold **is not the same as** being approved." | **PASS** |
| `id` | Setelah itu permohonan ditinjau, dan mencapai ambang batas **tidak sama dengan** disetujui. | "After that the request is reviewed, and reaching the threshold **is not the same as** being approved." | **PASS** |
| `fr` | Elle est ensuite examinée, et atteindre le seuil **n'équivaut pas à** être approuvé. | "It is then examined, and reaching the threshold **is not equivalent to** being approved." | **PASS** |
| `de` | Er wird dann geprüft, und die Schwelle zu erreichen ist **nicht dasselbe wie** bewilligt zu werden. | "It is then checked, and reaching the threshold is **not the same as** being granted." | **PASS** |
| `tr` | Talep ardından incelenir ve eşiği aşmak, onaylanmakla **aynı şey değildir**. | "The request is then examined, and passing the threshold **is not the same thing as** being approved." | **PASS** |

All six keep both halves — that a request *can* be submitted, and that
submission is followed by review — and attach the negation to the second, not
the first.

#### `calculator.results.body.intro.p1`

English: *Reaching that number is a requirement, not an approval — Roblox
reviews every request and decides which Robux qualify.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Atingir esse número é um requisito, **não uma aprovação** — a Roblox analisa cada solicitação e decide quais Robux se qualificam. | "Reaching that number is a requirement, **not an approval** — Roblox analyses every request and decides which Robux qualify." | **PASS** |
| `es` | Alcanzar esa cifra es un requisito, **no una aprobación**: Roblox revisa cada solicitud y decide qué Robux califican. | "Reaching that figure is a requirement, **not an approval**: Roblox reviews every request and decides which Robux qualify." | **PASS** |
| `id` | Mencapai angka itu adalah syarat, **bukan persetujuan** — Roblox meninjau setiap permintaan dan menentukan Robux mana yang memenuhi syarat. | "Reaching that number is a condition, **not an approval** — Roblox reviews every request and determines which Robux meet the conditions." | **PASS** |
| `fr` | Atteindre ce nombre est une condition, **pas une approbation** — Roblox examine chaque demande et décide quels Robux sont admissibles. | "Reaching that number is a condition, **not an approval** — Roblox examines every request and decides which Robux are admissible." | **PASS** |
| `de` | Diese Zahl zu erreichen ist eine Voraussetzung, **keine Genehmigung** — Roblox prüft jeden Antrag und entscheidet, welche Robux infrage kommen. | "Reaching this number is a prerequisite, **not an approval** — Roblox checks every application and decides which Robux come into question." | **PASS** |
| `tr` | Bu sayıya ulaşmak bir koşuldur, **onay değil** — Roblox her talebi inceler ve hangi Robux'ların uygun olduğuna karar verir. | "Reaching this number is a condition, **not an approval** — Roblox examines every request and decides which Robux are eligible." | **PASS** |

#### `routes.home.faqs.q03.answer`

English: *Reaching that number is a requirement, not an approval — Roblox still
reviews every request.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Chegar a esse número é um requisito, **não uma aprovação** — o Roblox ainda analisa cada pedido. | "Getting to that number is a requirement, **not an approval** — Roblox still analyses every request." | **PASS** |
| `es` | Llegar a esa cifra es un requisito, **no una aprobación**: Roblox sigue revisando cada solicitud. | "Getting to that figure is a requirement, **not an approval**: Roblox goes on reviewing every request." | **PASS** |
| `id` | Mencapai angka itu adalah syarat, **bukan persetujuan** — Roblox tetap meninjau setiap permohonan. | "Reaching that number is a condition, **not an approval** — Roblox still reviews every request." | **PASS** |
| `fr` | Atteindre ce nombre est une condition, **pas une acceptation** — Roblox examine toujours chaque demande. | "Reaching that number is a condition, **not an acceptance** — Roblox always examines every request." | **PASS** |
| `de` | Diese Zahl zu erreichen ist eine Voraussetzung, **keine Genehmigung** — Roblox prüft weiterhin jeden Antrag. | "Reaching this number is a prerequisite, **not an approval** — Roblox continues to check every application." | **PASS** |
| `tr` | O sayıya ulaşmak bir koşuldur, **onay değil** — Roblox yine de her talebi inceler. | "Reaching that number is a condition, **not an approval** — Roblox examines every request all the same." | **PASS** |

#### `calculator.body.intro.p3`

English: *The {minimumEarnedRobux} Earned Robux minimum is a requirement to
submit a request, not an approval. Roblox decides which Robux qualify and
whether any request succeeds.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | …é um requisito para enviar uma solicitação, **não uma aprovação**. A Roblox decide quais Robux se qualificam e se alguma solicitação é aprovada. | "…is a requirement for sending a request, **not an approval**. Roblox decides which Robux qualify and whether any request is approved." | **PASS** |
| `es` | …es un requisito para enviar una solicitud, **no una aprobación**. Roblox decide qué Robux califican y si alguna solicitud prospera. | "…is a requirement for sending a request, **not an approval**. Roblox decides which Robux qualify and whether any request prospers." | **PASS** |
| `id` | …adalah syarat untuk mengajukan permintaan, **bukan persetujuan**. Roblox yang menentukan Robux mana yang memenuhi syarat dan apakah suatu permintaan berhasil. | "…is a condition for submitting a request, **not an approval**. It is Roblox that determines which Robux meet the conditions and whether a request succeeds." | **PASS** |
| `fr` | …est une condition pour soumettre une demande, **pas une approbation**. Roblox décide quels Robux sont admissibles et si une demande aboutit. | "…is a condition for submitting a request, **not an approval**. Roblox decides which Robux are admissible and whether a request comes off." | **PASS** |
| `de` | …ist eine Voraussetzung für das Einreichen eines Antrags, **keine Genehmigung**. Roblox entscheidet, welche Robux infrage kommen und ob ein Antrag Erfolg hat. | "…is a prerequisite for submitting an application, **not an approval**. Roblox decides which Robux come into question and whether an application has success." | **PASS** |
| `tr` | …bir talep göndermek için bir koşuldur, **onay değildir**. Hangi Robux'ların uygun olduğuna ve bir talebin başarılı olup olmayacağına Roblox karar verir. | "…is a condition for sending a request, **it is not an approval**. Roblox decides which Robux are eligible and whether a request will succeed or not." | **PASS** |

#### `rates.amountPage.clearsMinimum`

English: *Clearing the threshold is not approval — Roblox reviews every request.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Superar o limite **não é aprovação** — o Roblox analisa cada solicitação. | "Exceeding the limit **is not approval** — Roblox analyses every request." | **PASS** |
| `es` | Superar el umbral **no es una aprobación**: Roblox revisa cada solicitud. | "Exceeding the threshold **is not an approval**: Roblox reviews every request." | **PASS** |
| `id` | Melewati ambang **bukan berarti disetujui** — Roblox meninjau setiap permohonan. | "Passing the threshold **does not mean being approved** — Roblox reviews every request." | **PASS** |
| `fr` | Franchir le seuil **n'est pas une approbation** — Roblox examine chaque demande. | "Crossing the threshold **is not an approval** — Roblox examines every request." | **PASS** |
| `de` | Die Schwelle zu überschreiten ist **keine Bewilligung** — Roblox prüft jeden Antrag. | "Crossing the threshold is **not a grant** — Roblox checks every application." | **PASS** |
| `tr` | Eşiği aşmak **onay demek değildir** — Roblox her talebi inceler. | "Passing the threshold **does not mean approval** — Roblox examines every request." | **PASS** |

#### The eight conversion FAQ answers

Eight keys, one sentence pattern:

- `routes.conversions.30000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.50000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.100000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.200000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.300000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.500000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.1000000RobuxToUsd.faqs.q02.answer`
- `routes.conversions.10000000RobuxToUsd.faqs.q02.answer`

English claim clause: *Clearing the threshold is not the same as being approved
— Roblox reviews every request.*

The claim clause is **byte-identical across all eight keys in every locale**.
That is checked, not assumed: splitting each of the eight strings after its
first sentence and collecting the remainder into a set gives exactly one
distinct clause per language, English included. One row therefore covers eight
keys without any of them going unread.

| Locale | Claim clause (all eight keys) | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Passar do limite **não é o mesmo que** ser aprovado — o Roblox analisa cada pedido. | "Getting past the limit **is not the same as** being approved — Roblox analyses every request." | **PASS** |
| `es` | Superar el umbral **no es lo mismo que** estar aprobado: Roblox revisa cada solicitud. | "Exceeding the threshold **is not the same as** being approved: Roblox reviews every request." | **PASS** |
| `id` | Melewati ambang **tidak sama dengan** disetujui — Roblox meninjau setiap permohonan. | "Passing the threshold **is not the same as** being approved — Roblox reviews every request." | **PASS** |
| `fr` | Franchir le seuil **n'équivaut pas à** être accepté — Roblox examine chaque demande. | "Crossing the threshold **is not equivalent to** being accepted — Roblox examines every request." | **PASS** |
| `de` | Die Schwelle zu überschreiten ist **nicht dasselbe wie** genehmigt zu sein — Roblox prüft jeden Antrag. | "Crossing the threshold is **not the same as** being approved — Roblox checks every application." | **PASS** |
| `tr` | Eşiği aşmak **onaylanmakla aynı şey değildir** — Roblox her talebi inceler. | "Passing the threshold **is not the same thing as** being approved — Roblox examines every request." | **PASS** |

The multiple in the first sentence of each — 1.0×, 1.7×, 3.3×, 6.7×, 10.0×,
16.7×, 33.3×, 333.3× — is compared against the registry by the numeric check,
in each locale's own notation.

### 1.2 The headings

Three strings state the claim on their own, as a heading a reader scans rather
than reads.

#### `rates.requirements.notApprovalHeading` and `routes.devexRequirements.sections.not-approval`

English (both): *Meeting the threshold is not approval*

| Locale | `rates.requirements.notApprovalHeading` | `routes.devexRequirements.sections.not-approval` | Literal back-translation | Verdict |
| --- | --- | --- | --- | --- |
| `pt-BR` | Atingir o limite **não é** aprovação | Atingir o limite **não é** aprovação | "Reaching the limit **is not** approval" | **PASS** |
| `es` | Alcanzar el umbral **no es** una aprobación | Alcanzar el umbral **no es** una aprobación | "Reaching the threshold **is not** an approval" | **PASS** |
| `id` | Mencapai ambangnya **bukan berarti** disetujui | Mencapai ambangnya **bukan** persetujuan | "Reaching its threshold **does not mean** being approved" / "…**is not** an approval" | **PASS** |
| `fr` | Atteindre le seuil **n'est pas** une acceptation | Atteindre le seuil **n'est pas** une acceptation | "Reaching the threshold **is not** an acceptance" | **PASS** |
| `de` | Die Schwelle zu erreichen ist **keine** Genehmigung | Die Schwelle zu erreichen ist **keine** Genehmigung | "Reaching the threshold is **not an** approval" | **PASS** |
| `tr` | Eşiği karşılamak **onay değildir** | Eşiği karşılamak **onay değildir** | "Meeting the threshold **is not approval**" | **PASS** |

`id` is the only locale where the two differ, and both forms carry the negation.

#### `calculator.preparation.preparedNotApprovedTitle`

English: *Prepared is not approved*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Preparado **não é** aprovado | "Prepared **is not** approved" | **PASS** |
| `es` | Preparado **no es** aprobado | "Prepared **is not** approved" | **PASS** |
| `id` | Siap **bukan berarti** disetujui | "Ready **does not mean** approved" | **PASS** |
| `fr` | Préparé **ne veut pas dire** accepté | "Prepared **does not mean** accepted" | **PASS** |
| `de` | Vorbereitet **heißt nicht** genehmigt | "Prepared **does not mean** approved" | **PASS** |
| `tr` | Hazır olmak **onaylanmak değildir** | "Being ready **is not being approved**" | **PASS** |

### 1.3 Nobody here can promise an outcome

#### `rates.requirements.body.notApproval.p1`

English: *No calculator, including this one, can tell you whether a DevEx
request will be approved. … Anyone telling you otherwise — including any site
promising a guaranteed payout — is not in a position to know.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | **Nenhuma** calculadora, incluindo esta, pode lhe dizer se um pedido de DevEx será aprovado. … Quem diz o contrário — inclusive qualquer site prometendo pagamento garantido — **não tem como saber**. | "**No** calculator, including this one, can tell you whether a DevEx request will be approved. … Whoever says the contrary — including any site promising guaranteed payment — **has no way of knowing**." | **PASS** |
| `es` | **Ninguna** calculadora, ni siquiera esta, puede decirte si se aprobará una solicitud de DevEx. … **no está en posición de saberlo**. | "**No** calculator, not even this one, can tell you whether a DevEx request will be approved. … **is not in a position to know it**." | **PASS** |
| `id` | **Tidak ada** kalkulator, termasuk yang ini, yang bisa memberi tahu apakah sebuah permohonan DevEx akan disetujui. … **tidak berada dalam posisi untuk tahu**. | "**There is no** calculator, including this one, that can tell whether a DevEx request will be approved. … **is not in a position to know**." | **PASS** |
| `fr` | **Aucune** calculatrice, celle-ci comprise, **ne peut** vous dire si une demande DevEx sera acceptée. … **n'est pas en position de le savoir**. | "**No** calculator, this one included, **can** tell you whether a DevEx request will be accepted. … **is not in a position to know it**." | **PASS** |
| `de` | **Kein** Rechner, auch dieser **nicht**, kann dir sagen, ob ein DevEx-Antrag genehmigt wird. … **ist nicht in der Lage, das zu wissen**. | "**No** calculator, this one **not** either, can tell you whether a DevEx application will be approved. … **is not in a position to know that**." | **PASS** |
| `tr` | **Hiçbir** hesaplayıcı — bu da dâhil — bir DevEx talebinin onaylanıp onaylanmayacağını size **söyleyemez**. … bunu bilebilecek konumda **değildir**. | "**No** calculator — this one included — **can tell** you whether a DevEx request will be approved or not. … **is not** in a position to be able to know this." | **PASS** |

`tr` uses the impotential suffix on *söyleyemez* ("cannot tell") and the
standalone negative copula *değildir* on the second clause.

#### `guides.cashOut.body.safety.p3`

English: *Anyone guaranteeing approval is guaranteeing something they do not
control.*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Quem garante aprovação está garantindo algo que **não controla**. | "Whoever guarantees approval is guaranteeing something they **do not control**." | **PASS** |
| `es` | Quien garantiza la aprobación garantiza algo que **no controla**. | "Whoever guarantees the approval guarantees something they **do not control**." | **PASS** |
| `id` | Siapa pun yang menjamin persetujuan sedang menjamin sesuatu yang **tidak dikendalikannya**. | "Anyone who guarantees approval is guaranteeing something that **is not controlled by them**." | **PASS** |
| `fr` | Quiconque garantit une approbation garantit quelque chose qu'il **ne contrôle pas**. | "Whoever guarantees an approval guarantees something that he **does not control**." | **PASS** |
| `de` | Wer eine Genehmigung garantiert, garantiert etwas, das er **nicht in der Hand hat**. | "Whoever guarantees an approval guarantees something that he **does not have in hand**." | **PASS** |
| `tr` | Onay garantisi veren biri, denetiminde **olmayan** bir şeyi garanti ediyordur. | "Someone giving a guarantee of approval is guaranteeing a thing that is **not** under their supervision." | **PASS**, non-native reading |

#### `calculator.results.copyDisclaimer`

English: *Estimate from devexcalculator.org — not a guarantee of approval.*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Estimativa de devexcalculator.org — **não é garantia** de aprovação. | "Estimate from devexcalculator.org — **is not a guarantee** of approval." | **PASS** |
| `es` | Estimación de devexcalculator.org: **no es una garantía** de aprobación. | "Estimate from devexcalculator.org: **is not a guarantee** of approval." | **PASS** |
| `id` | Perkiraan dari devexcalculator.org — **bukan jaminan** persetujuan. | "Estimate from devexcalculator.org — **not a guarantee** of approval." | **PASS** |
| `fr` | Estimation de devexcalculator.org — **pas une garantie** d'approbation. | "Estimate from devexcalculator.org — **not a guarantee** of approval." | **PASS** |
| `de` | Schätzung von devexcalculator.org — **keine Zusage** einer Bewilligung. | "Estimate from devexcalculator.org — **no promise** of a grant." | **PASS** |
| `tr` | devexcalculator.org tahminidir — **onay güvencesi değildir**. | "It is a devexcalculator.org estimate — **it is not an assurance of approval**." | **PASS** |

This is the string copied to a clipboard, so it travels away from the page that
qualifies it. All six keep the disclaimer inside the copied text.

#### `common.footer.trademarkNotice`

English: *This site is not endorsed, sponsored or operated by Roblox
Corporation, and it cannot determine whether any DevEx request will be
approved.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Este site **não é** endossado, patrocinado **nem** operado pela Roblox Corporation, e **não tem como determinar** se algum pedido de DevEx será aprovado. | "This site **is not** endorsed, sponsored **nor** operated by Roblox Corporation, and **has no way of determining** whether any DevEx request will be approved." | **PASS** |
| `es` | Este sitio **no está** respaldado, patrocinado **ni** gestionado por Roblox Corporation, y **no puede determinar** si una solicitud de DevEx será aprobada. | "This site **is not** backed, sponsored **nor** managed by Roblox Corporation, and **cannot determine** whether a DevEx request will be approved." | **PASS** |
| `id` | Situs ini **tidak** didukung, disponsori, atau dioperasikan oleh Roblox Corporation, serta **tidak dapat menentukan** apakah suatu permohonan DevEx akan disetujui. | "This site is **not** supported, sponsored, or operated by Roblox Corporation, and **cannot determine** whether a DevEx request will be approved." | **PASS** |
| `fr` | Ce site **n'est ni** approuvé, **ni** sponsorisé, **ni** exploité par Roblox Corporation, et il **ne peut pas déterminer** si une demande DevEx sera acceptée. | "This site **is neither** approved, **nor** sponsored, **nor** operated by Roblox Corporation, and it **cannot determine** whether a DevEx request will be accepted." | **PASS** |
| `de` | Diese Website wird von der Roblox Corporation **weder** unterstützt **noch** gesponsert **oder** betrieben, und sie **kann nicht feststellen**, ob ein DevEx-Antrag genehmigt wird. | "This website is **neither** supported **nor** sponsored **or** operated by Roblox Corporation, and it **cannot establish** whether a DevEx application will be approved." | **PASS** |
| `tr` | Bu site Roblox Corporation tarafından **onaylanmamış**, **desteklenmemiş** veya **işletilmemektedir** ve herhangi bir DevEx talebinin onaylanıp onaylanmayacağını **belirleyemez**. | "This site is **not approved**, **not supported** or **not operated** by Roblox Corporation and **cannot determine** whether any DevEx request will be approved or not." | **PASS**, non-native reading |

#### `routes.about.quickAnswer`

English: *It is not affiliated with, endorsed by or operated by Roblox
Corporation, and it cannot determine whether any request will be approved.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | **Não é** afiliado, endossado **nem** operado pela Roblox Corporation, e **não tem como determinar** se algum pedido será aprovado. | "**It is not** affiliated, endorsed **nor** operated by Roblox Corporation, and **has no way of determining** whether any request will be approved." | **PASS** |
| `es` | **No está** afiliado, respaldado **ni** gestionado por Roblox Corporation, y **no puede determinar** si se aprobará una solicitud. | "**It is not** affiliated, backed **nor** managed by Roblox Corporation, and **cannot determine** whether a request will be approved." | **PASS** |
| `id` | Situs ini **tidak** berafiliasi dengan, **tidak** didukung, dan **tidak** dioperasikan oleh Roblox Corporation, serta **tidak dapat menentukan** apakah suatu permohonan akan disetujui. | "This site is **not** affiliated with, **not** supported, and **not** operated by Roblox Corporation, and **cannot determine** whether a request will be approved." | **PASS** |
| `fr` | Le site **n'est ni** affilié à Roblox Corporation, **ni** approuvé ou exploité par elle, et il **ne peut pas déterminer** si une demande sera acceptée. | "The site **is neither** affiliated with Roblox Corporation, **nor** approved or operated by it, and it **cannot determine** whether a request will be accepted." | **PASS** |
| `de` | Die Website ist **nicht** mit der Roblox Corporation verbunden, wird von ihr **nicht** unterstützt und **nicht** betrieben, und sie **kann nicht feststellen**, ob ein Antrag genehmigt wird. | "The website is **not** connected with Roblox Corporation, is **not** supported by it and **not** operated, and it **cannot establish** whether an application will be approved." | **PASS** |
| `tr` | Roblox Corporation ile bağlantılı **değildir**; onun tarafından **onaylanmamış** ve **işletilmemektedir** ve herhangi bir talebin onaylanıp onaylanmayacağını **belirleyemez**. | "**It is not** connected with Roblox Corporation; it is **not approved** by it and **not operated**, and **it cannot determine** whether any request will be approved or not." | **PASS** |

### 1.4 The planner, where a reader is closest to acting

#### `calculator.planner.prose.estimateNotice`

English: *Reaching {minimumRobux} Earned Robux lets you submit a DevEx request;
it does not mean the request will be approved.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | …permite enviar uma solicitação de DevEx; **não significa** que ela será aprovada. | "…allows sending a DevEx request; **it does not mean** it will be approved." | **PASS** |
| `es` | …te permite enviar una solicitud de DevEx; **no significa** que vaya a aprobarse. | "…allows you to send a DevEx request; **it does not mean** it is going to be approved." | **PASS** |
| `id` | …memungkinkan Anda mengajukan permohonan DevEx; itu **tidak berarti** permohonannya akan disetujui. | "…lets you submit a DevEx request; that **does not mean** the request will be approved." | **PASS** |
| `fr` | …vous permet de déposer une demande DevEx ; cela **ne signifie pas** qu'elle sera approuvée. | "…lets you file a DevEx request; that **does not mean** it will be approved." | **PASS** |
| `de` | …erlaubt Ihnen, einen DevEx-Antrag zu stellen; es **bedeutet nicht**, dass er bewilligt wird. | "…allows you to file a DevEx application; it **does not mean** that it will be granted." | **PASS** |
| `tr` | …bir DevEx talebi göndermenizi sağlar; talebin onaylanacağı **anlamına gelmez**. | "…lets you send a DevEx request; **it does not come to the meaning** that the request will be approved." | **PASS**, non-native reading |

#### `calculator.planner.alreadyEnoughDetail` and `calculator.planner.alreadyThere`

English (both): *Meeting the minimum is not approval — Roblox decides that.*

| Locale | `alreadyEnoughDetail` | `alreadyThere` | Literal back-translation | Verdict |
| --- | --- | --- | --- | --- |
| `pt-BR` | Atingir o mínimo **não é** aprovação — quem decide isso é o Roblox. | *(identical)* | "Reaching the minimum **is not** approval — the one who decides that is Roblox." | **PASS** |
| `es` | Alcanzar el mínimo **no es una aprobación**: eso lo decide Roblox. | *(identical)* | "Reaching the minimum **is not an approval**: Roblox decides that." | **PASS** |
| `id` | Mencapai batas minimum **bukan berarti** disetujui — Roblox yang memutuskan itu. | Memenuhi batas minimum **bukan** persetujuan — Roblox yang memutuskan itu. | "Reaching the minimum **does not mean** being approved" / "Meeting the minimum **is not** approval" — "it is Roblox that decides that." | **PASS** |
| `fr` | Atteindre le minimum **n'est pas une approbation** : c'est Roblox qui en décide. | Atteindre le minimum **n'est pas une acceptation** — c'est Roblox qui en décide. | "Reaching the minimum **is not an approval / an acceptance**: it is Roblox that decides on it." | **PASS** |
| `de` | Das Minimum zu erreichen ist **keine Bewilligung** — darüber entscheidet Roblox. | Das Minimum zu erreichen ist **keine Genehmigung** — das entscheidet Roblox. | "Reaching the minimum is **not a grant / not an approval** — Roblox decides on that." | **PASS** |
| `tr` | Alt sınıra ulaşmak **onay demek değildir** — buna Roblox karar verir. | Alt sınırı karşılamak **onay değildir** — buna Roblox karar verir. | "Reaching the lower limit **does not mean approval** / **is not approval** — Roblox decides on this." | **PASS** |

### 1.5 Where the site declines to state a number

Three strings make the negative claim about *processing time* rather than
approval, and they are in the approval-claim set because a promised timeline is
the same kind of promise.

#### `guides.cashOut.prose.noGuaranteedTime`

English: *Roblox does not publish a guaranteed processing time, so this page
does not state one.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | O Roblox **não publica** um prazo de processamento garantido, então esta página **não afirma nenhum**. | "Roblox **does not publish** a guaranteed processing deadline, so this page **states none**." | **PASS** |
| `es` | Roblox **no publica** un plazo de procesamiento garantizado, así que esta página **no indica ninguno**. | "Roblox **does not publish** a guaranteed processing deadline, so this page **indicates none**." | **PASS** |
| `id` | Roblox **tidak menerbitkan** waktu pemrosesan yang dijamin, jadi halaman ini pun **tidak menyebutkan satu pun**. | "Roblox **does not publish** a guaranteed processing time, so this page too **does not mention a single one**." | **PASS** |
| `fr` | Roblox **ne publie pas** de délai de traitement garanti ; cette page **n'en annonce donc aucun**. | "Roblox **does not publish** a guaranteed processing delay; this page therefore **announces none of it**." | **PASS** |
| `de` | Roblox **veröffentlicht keine** garantierte Bearbeitungszeit, also **nennt** diese Seite **auch keine**. | "Roblox **publishes no** guaranteed processing time, so this page **names none either**." | **PASS** |
| `tr` | Roblox garantili bir işlem süresi **yayımlamaz**, bu yüzden bu sayfa da bir süre **belirtmez**. | "Roblox **does not publish** a guaranteed processing time, therefore this page **does not state** a time either." | **PASS**, negation by suffix |

#### `routes.howToCashOutRobux.faqs.q02.answer`

English: *Roblox does not publish a guaranteed processing time, so this site
does not state one. Any specific number you see quoted elsewhere is someone's
anecdote rather than an official commitment.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | O Roblox **não publica** um prazo de processamento garantido, então este site **não declara nenhum**. Qualquer número específico … é o relato de alguém, **não um compromisso oficial**. | "Roblox **does not publish** a guaranteed processing deadline, so this site **declares none**. Any specific number … is somebody's account, **not an official commitment**." | **PASS** |
| `es` | Roblox **no publica** un plazo de tramitación garantizado, así que este sitio **no indica ninguno**. … es la anécdota de alguien, **no un compromiso oficial**. | "Roblox **does not publish** a guaranteed processing deadline, so this site **indicates none**. … is somebody's anecdote, **not an official commitment**." | **PASS** |
| `id` | Roblox **tidak menerbitkan** waktu pemrosesan yang dijamin, jadi situs ini **tidak menyebut satu pun**. … adalah cerita seseorang, **bukan komitmen resmi**. | "Roblox **does not publish** a guaranteed processing time, so this site **mentions none**. … is somebody's story, **not an official commitment**." | **PASS** |
| `fr` | Roblox **ne publie aucun** délai de traitement garanti : ce site **n'en indique donc aucun**. … est le témoignage de quelqu'un, **pas un engagement officiel**. | "Roblox **publishes no** guaranteed processing delay: this site therefore **indicates none of it**. … is somebody's testimony, **not an official commitment**." | **PASS** |
| `de` | Roblox **veröffentlicht keine** zugesicherte Bearbeitungszeit, deshalb **nennt** diese Website **auch keine**. … ist die Erfahrung von jemandem, **keine offizielle Zusage**. | "Roblox **publishes no** assured processing time, therefore this website **names none either**. … is somebody's experience, **no official promise**." | **PASS** |
| `tr` | Roblox garantili bir işlem süresi **yayımlamaz**; bu yüzden bu site de bir süre **belirtmez**. … birinin anlattığı bir deneyimdir, resmî bir taahhüt **değil**. | "Roblox **does not publish** a guaranteed processing time; therefore this site too **does not state** a time. … is an experience somebody recounted, **not** an official undertaking." | **PASS** |

#### `trust.editorialPolicy.body.sourcing.p2`

English: *Roblox publishes no guaranteed timeline, so none is stated here, even
though a number would be more satisfying to read.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | o Roblox **não publica prazo garantido algum**, então **nenhum é declarado** aqui, ainda que um número fosse mais satisfatório de ler. | "Roblox **publishes no guaranteed deadline at all**, so **none is declared** here, even though a number would be more satisfying to read." | **PASS** |
| `es` | Roblox **no publica ningún** plazo garantizado, así que aquí **no se indica ninguno**, aunque una cifra resultaría más satisfactoria de leer. | "Roblox **publishes no** guaranteed deadline, so here **none is indicated**, although a figure would turn out more satisfying to read." | **PASS** |
| `id` | Roblox **tidak menerbitkan jaminan tenggat apa pun**, jadi di sini pun **tidak ada yang dinyatakan**, meski sebuah angka akan lebih memuaskan untuk dibaca. | "Roblox **does not publish any guaranteed deadline**, so here too **there is nothing stated**, though a number would be more satisfying to read." | **PASS** |
| `fr` | Roblox **ne publie aucun** délai garanti, donc **aucun n'est indiqué** ici, même si un chiffre serait plus satisfaisant à lire. | "Roblox **publishes no** guaranteed delay, so **none is indicated** here, even if a figure would be more satisfying to read." | **PASS** |
| `de` | Roblox **veröffentlicht keine** zugesicherte Frist, also **steht hier keine**, auch wenn eine Zahl befriedigender zu lesen wäre. | "Roblox **publishes no** assured deadline, so **none stands here**, even if a number would be more satisfying to read." | **PASS** |
| `tr` | Roblox garantili bir süre **yayımlamaz**; bu yüzden okuması daha tatmin edici olsa da burada da **hiçbir süre belirtilmez**. | "Roblox **does not publish** a guaranteed period; therefore, even though it would be more satisfying to read, **no period at all is stated** here either." | **PASS** |

### 1.6 The distinction the claim rests on

#### `rates.earnedRobux.groupFundsDescription`

English: *Robux held by a group are not the same as Robux held by you.*

| Locale | Translation | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Robux mantidos por um grupo **não são o mesmo que** Robux mantidos por você. | "Robux held by a group **are not the same as** Robux held by you." | **PASS** |
| `es` | Los Robux que tiene un grupo **no son lo mismo que** los Robux que tienes tú. | "The Robux a group has **are not the same as** the Robux you have." | **PASS** |
| `id` | Robux yang dipegang sebuah grup **bukanlah** Robux yang Anda pegang. | "Robux held by a group **are not** the Robux you hold." | **PASS** — states identity rather than sameness; the distinction survives |
| `fr` | Les Robux détenus par un groupe **ne sont pas** les Robux que vous détenez. | "The Robux held by a group **are not** the Robux you hold." | **PASS** — same shape as `id` |
| `de` | Robux, die eine Gruppe hält, sind **nicht dasselbe wie** Robux, die du hältst. | "Robux that a group holds are **not the same as** Robux that you hold." | **PASS** |
| `tr` | Bir grubun elindeki Robux, sizin elinizdeki Robux ile **aynı şey değildir**. | "The Robux in a group's hand **are not the same thing as** the Robux in your hand." | **PASS** |

#### `routes.devexRequirements.quickAnswer`

English: *Meeting all five is a condition of applying, not a guarantee of
approval.*

| Locale | Claim clause | Literal back-translation | Verdict |
| --- | --- | --- | --- |
| `pt-BR` | Cumprir os cinco é condição para solicitar, **não garantia de aprovação**. | "Fulfilling the five is a condition for applying, **not a guarantee of approval**." | **PASS** |
| `es` | Cumplir los cinco es condición para solicitar, **no garantía de aprobación**. | "Fulfilling the five is a condition for applying, **not a guarantee of approval**." | **PASS** |
| `id` | Memenuhi kelimanya adalah syarat untuk mengajukan, **bukan jaminan persetujuan**. | "Meeting all five is a condition for applying, **not a guarantee of approval**." | **PASS** |
| `fr` | Remplir les cinq est une condition pour déposer une demande, **pas une garantie d'acceptation**. | "Fulfilling the five is a condition for filing a request, **not a guarantee of acceptance**." | **PASS** |
| `de` | Alle fünf zu erfüllen ist die Bedingung, um einen Antrag zu stellen, **keine Zusage einer Genehmigung**. | "Fulfilling all five is the condition for filing an application, **no promise of an approval**." | **PASS** |
| `tr` | Beşini de karşılamak başvurmanın koşuludur, **onay güvencesi değil**. | "Meeting all five is the condition of applying, **not an assurance of approval**." | **PASS** |

The count *five* and the age *13* are compared against the English by the
numeric check in every locale; both hold.

### 1.7 What this covered, and what it did not

**Covered.** 31 keys × 6 locales = 186 translated sentences, each read against
its English source and back-translated above. None drops the negation, attaches
it to the wrong clause, turns the requirement into a sufficiency, or weakens it
to a probability. The one systematic variation is vocabulary: `de` renders
"approval" as *Genehmigung*, *Bewilligung* and *Zusage*, and `fr` alternates
*approbation* and *acceptation*. Both are correct in context and neither changes
what is being denied, but a native reviewer may want one word chosen and used
throughout.

**Not covered, and no summary line above should be read as covering it.**

- **This is not a native review.** The back-translations were written by the
  same author as the translations. That is a consistency check, not an
  independent one.
- **A fluent softening that keeps its negation word is invisible to all of
  this.** "It does not guarantee approval" and "it does not usually guarantee
  approval" both contain a negation, both back-translate to something that
  looks right, and only the second is wrong. The automated `negation-lost`
  check cannot see the difference, and neither can a back-translation written
  by the person who wrote the sentence.
- **Register and force are not assessed.** Whether the Turkish reads as a firm
  disclaimer or as a hedge, whether the German *du*/*Sie* mix on these
  particular strings is jarring, whether the Indonesian is the register a
  creator expects — none of that is settled here.
- **Four Turkish sentences carry the negation as a verb suffix** and are
  reported as `negation-morphological` rather than passed silently:
  `calculator.home.meetingAllNote`, `calculator.planner.prose.estimateNotice`,
  `common.footer.trademarkNotice` and `guides.cashOut.body.safety.p3`. They
  read as correct here. That reading is not a verdict, and `tr` stays blocked
  until a Turkish reader gives one.

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
six. The per-key evidence, in all thirty-one places the site makes this claim,
is in section 1.

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

### The one open item, now closed

`rates.earnedRobux.pendingDescription` — the section on pending balances.

English used to read *"Newly earned Robux are not immediately available"*, with
"earned" in lower case as an ordinary adjective. On the one page that exists to
teach that **Earned Robux** is a specific balance, that sentence reads either
way, and all six translations took the ordinary-adjective reading —
`verdiente Robux`, `Robux fraîchement gagnés`, `Robux recién ganados` — which
collapses the distinction.

**Settled against the primary source.** Roblox's own developer documentation
says: *"There is up to a 24 hour delay between Earned Robux transfers/sales and
the Earned Robux balance reflecting the new values."*
(<https://create.roblox.com/docs/production/monetization/developer-exchange>.)
Roblox draws the line between the Robux and the balance, not between "not yet
Earned" and "Earned": the delayed amounts already **are** Earned Robux, and
what lags is the balance reflecting them.

English now reads:

> Earned Robux you have just acquired do not appear in your balance
> immediately, which surprises creators watching it climb.

This names the term where no translator can read it as an adjective, and it
puts the delay where the source puts it — on the balance, not on the Robux.
All six locales are realigned and the glossary check passes, so every locale is
now `quality 0`.

**One thing deliberately not published.** A Roblox Support article quotes 72
hours where the developer documentation quotes 24. That page returns 403 to
automated fetches and could not be read, so this site publishes no delay figure
at all until the discrepancy is settled against a source that can be opened.

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
| `tr` | PASS | **BLOCKED-PENDING-REVIEW** — see below | **not done** |

### Rendered output is not clean, in any locale

The catalog audit passing is not the same as the page being in one language.
Five English strings are hardcoded in components rather than looked up, so they
render in English in all six locales:

| String | Source |
| --- | --- |
| `The plan` | `src/features/devex/planner.tsx:363` |
| `. This site gives no tax advice.` | `src/views/how-to-cash-out-robux.tsx:189` |
| `" and above"` | `src/views/robux-tax-calculator.tsx:118` |
| `Publicly, in the` | `src/views/corrections.tsx:75` |
| `Fees and taxes` (nav label) | `src/lib/content/route-registry.ts:869` |

Separately, `Maturity: Minimal` / `Maturity: Mild` renders as an English label
inside otherwise-translated live-data rows on `/platform/`. The leakage
detector cannot see it: it counts English function words, and that label has
none.

These are open leaks, not allow-list entries. No locale is clean on rendered
output until they are fixed.

### Turkish: reviewed by the maintainer, not by a native speaker

`tr` carries the no-guarantee claim morphologically: the negation is a verb
suffix (`garanti et**mez**`, `aynı şey değildir`), not a separate word. The
automated `negation-lost` check cannot confirm a suffix it does not know how to
segment. Four sentences are affected — the keys reported as
`negation-morphological` in `dist/reports/i18n/audit-tr.json`:
`calculator.home.meetingAllNote`,
`calculator.planner.prose.estimateNotice`, `common.footer.trademarkNotice` and
`guides.cashOut.body.safety.p3`.

**What happened, precisely.** The four sentences were extracted into a review
packet (`docs/i18n/turkish-review-request.md`) for a native Turkish reader. That
packet was **not sent**. On **2026-08-31** the site's maintainer reviewed the
Turkish content — meaning, factual accuracy, disclaimer wording, DevEx approval
language, placeholders and consistency with the English source — and accepted
it. `qualityReview` moved from `machine-drafted` to `self-reviewed`, which the
registry defines as "read by the maintainer, who is not a native speaker".

**What that is and is not.** It is a real review by the person responsible for
the site. It is not a native review, and this document does not claim one:
`reviewerName` and `reviewedAt` remain `null`, because those fields record a
named native speaker and `assertRegistry` refuses them without the matching
claim. No locale in this registry is marked `native-reviewed`.

**What is still unconfirmed, and is now live.** Whether a Turkish reader would
find any of the four sentences ambiguous enough to read the other way. Ambiguity is the failure
mode a non-native reader is least able to detect, and it is the one that
matters most here: these four sentences exist to stop somebody believing they
are guaranteed money. The reading recorded in §1 — that all four negate
correctly — is a non-native reading and remains so.

The review packet is kept, unsent, so that if a Turkish reader is ever
available the question can be put to them in one message.

The third column is the one that gates publication, and nothing in this audit
changes it. `docs/i18n/publishing-a-locale.md` has the procedure.
