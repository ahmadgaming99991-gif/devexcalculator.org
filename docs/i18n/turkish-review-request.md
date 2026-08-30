# Turkish review request — 4 sentences

## What this is

devexcalculator.org is an independent reference site for Roblox creators. It
explains Roblox's Developer Exchange (DevEx) programme — how creators convert
earned Robux into money, what the requirements are, and what the requirements
do **not** promise.

The Turkish version was machine-translated. Almost all of it has been checked
automatically. **Four sentences cannot be checked automatically**, because in
Turkish the negation is carried by a verb suffix rather than a separate word,
and our tooling cannot reliably see it.

We need a native Turkish speaker to confirm those four sentences still say
**no**.

## What we are NOT asking for

- Not a style review. Awkward-but-correct is fine.
- Not a rewrite. Do not improve the wording.
- Not a full-site review. Only these four sentences.

## What we ARE asking

For each sentence, one question:

> **Does the Turkish sentence deny / negate the same thing the English sentence
> denies — no more, no less?**

Specifically, please flag it if the Turkish:

- drops the negation, or attaches it to the wrong part of the sentence
- turns a denial into a promise ("once you reach X, you are approved")
- weakens a denial into a likelihood ("you will probably be approved")
- is ambiguous enough that a Turkish reader could reasonably read it either way

**Ambiguity counts as a fail.** These sentences exist to stop people believing
they are guaranteed money. If a reader could take it the other way, it has
failed, even if a careful reader would get it right.

## Two notes before you start

**`{minimumRobux}` is a placeholder, not a typo.** The site fills it in with a
number when the page is built. A Turkish reader sees `30.000`. It appears in
sentence 2.

**Full sentences are given, not fragments.** The negation is usually in the
second clause, but the first clause is what a reader has in mind when they get
to it — and one of the ways this can go wrong is the denial being attached to
the wrong clause. Both are below for that reason. **Product names — Roblox,
Robux, DevEx, Developer Exchange, Earned Robux — are deliberately left in
English and are not part of what we are asking about.**

---

## The four sentences

### 1. `calculator.home.meetingAllNote`

This renders on the home page, directly beneath the list of DevEx requirements.

**English**

> Meeting all of these lets you submit a request. It does not guarantee one will
> be approved.

**Turkish**

> Bunların hepsini karşılamak talep göndermenizi sağlar. Talebin onaylanacağını
> garanti etmez.

**Meaning to confirm:** meeting the requirements lets you *submit* a request,
and does **not** guarantee that the request will be *approved*. The permission
and the guarantee are two different things, and only the first is being given.

---

### 2. `calculator.planner.prose.estimateNotice`

This renders in the planner, next to a projection of when someone will reach the
minimum. It is the sentence closest to the moment a reader might act.

**English**

> Every figure here is an estimate produced from what you entered. Reaching
> {minimumRobux} Earned Robux lets you submit a DevEx request; it does not mean
> the request will be approved. Roblox reviews eligibility, account standing and
> compliance, and decides on every request itself. Rates can change, and a
> projection assumes you keep earning at the pace you gave.

**Turkish**

> Buradaki her rakam, girdiklerinizden üretilmiş bir tahmindir.
> {minimumRobux} Earned Robux'a ulaşmak bir DevEx talebi göndermenizi sağlar;
> talebin onaylanacağı anlamına gelmez. Roblox uygunluğu, hesap durumunu ve
> kurallara uygunluğu inceler ve her talebe kendisi karar verir. Oranlar
> değişebilir ve bir öngörü, verdiğiniz hızda kazanmayı sürdürdüğünüzü varsayar.

**Meaning to confirm:** reaching the figure lets you *submit* a request, and
does **not** mean the request will be *approved*. Roblox decides.

---

### 3. `common.footer.trademarkNotice`

This renders in the footer of every page on the site.

**English**

> DevExCalculator.org is an independent tool. Roblox, Robux and Developer
> Exchange are trademarks of Roblox Corporation, used here only to describe the
> subject of these calculations. This site is not endorsed, sponsored or
> operated by Roblox Corporation, and it cannot determine whether any DevEx
> request will be approved.

**Turkish**

> DevExCalculator.org bağımsız bir araçtır. Roblox, Robux ve Developer Exchange,
> Roblox Corporation'ın ticari markalarıdır ve burada yalnızca bu hesaplamaların
> konusunu tanımlamak için kullanılır. Bu site Roblox Corporation tarafından
> onaylanmamış, desteklenmemiş veya işletilmemektedir ve herhangi bir DevEx
> talebinin onaylanıp onaylanmayacağını belirleyemez.

**Meaning to confirm — this one carries two separate denials, please check both:**

1. The site is **not** endorsed by, **not** sponsored by, and **not** operated
   by Roblox Corporation. (The English says *endorsed, sponsored or operated* —
   it does not use the word "affiliated". We are asking whether the Turkish
   denies these three things, not whether it denies affiliation.)
2. The site **cannot** determine whether any DevEx request will be approved.

The second denial is the one most likely to be read wrongly, because the Turkish
ends on `onaylanıp onaylanmayacağını belirleyemez` — please confirm this says the
site *cannot determine* the outcome, and not that the site determines that a
request *will not* be approved. Those are different claims and only the first is
intended.

---

### 4. `guides.cashOut.body.safety.p3`

This renders in a guide, in a section warning readers about third parties who
promise DevEx approval.

**English**

> Anyone guaranteeing approval is guaranteeing something they do not control.

**Turkish**

> Onay garantisi veren biri, denetiminde olmayan bir şeyi garanti ediyordur.

**Meaning to confirm:** the thing being guaranteed is **not** under the control
of the person guaranteeing it. The negation belongs to *their control*, not to
the guaranteeing — the sentence says they *are* guaranteeing something, and that
the something is outside their control.

---

## How to answer

For each of the four, reply with just:

```
1. OK          — or —   1. PROBLEM: <what a Turkish reader would understand>
2. OK
3. OK
4. PROBLEM: ...
```

For sentence 3, please answer both of its denials — for example `3. OK / OK` or
`3. OK / PROBLEM: …`.

If you mark something PROBLEM, please say what the sentence currently
communicates to you. You do not need to supply a corrected translation — but if
you have one, it is welcome.

## What happens with your answer

If all four are OK, the Turkish version is published and you are credited by
name as the reviewer, with the date, in the site's own configuration — unless
you would rather not be, in which case say so and we will record the review
without the name.

If any is a PROBLEM, that sentence is corrected and the Turkish version stays
unpublished until it is right.

Thank you. This is the last check standing between us and publishing the
Turkish version.
