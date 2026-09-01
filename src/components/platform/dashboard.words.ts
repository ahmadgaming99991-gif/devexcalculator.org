/**
 * Every string the platform dashboard renders.
 *
 * A separate module because the dashboard is `"use client"`, and a value
 * exported from a client module reaches a Server Component as a client
 * reference rather than as the array itself. The server copies exactly these
 * keys out of the dictionary and hands them over as a plain object, so no
 * dictionary — and therefore no seven languages of every namespace — reaches
 * the browser bundle.
 *
 * The list is exported by the component's own module so the set the server
 * passes cannot drift from the set the component reads: a key missing here
 * throws at render time on the server, where a build is watching, rather than
 * leaving a blank where a sentence should be.
 */
export const PLATFORM_DASHBOARD_WORDS: readonly string[] = [
  // Shared chrome
  "common.ui.opensInNewTab",
  "common.ranges.day",
  "common.ranges.threeDays",
  "common.ranges.sevenDays",
  "common.ranges.days",

  // Section headings and descriptions, rendered into the static document
  "platform.live.nowHeading",
  "platform.live.nowDescription",
  "platform.history.topOverTimeHeading",
  "platform.history.topOverTimeDescription",
  "platform.history.busiestSingleHeading",
  "platform.history.busiestSingleDescription",
  "platform.history.observedHeading",
  "platform.history.observedDescription",

  // Dashboard states
  "platform.dashboard.loadingTitle",
  "platform.dashboard.loadingBody",
  "platform.dashboard.offlineTitle",
  "platform.dashboard.offlineBody",
  "platform.dashboard.emptyTitle",
  "platform.dashboard.emptyBody",
  "platform.dashboard.retry",
  "platform.dashboard.staleTitle",
  "platform.dashboard.staleBody",
  "platform.dashboard.observedAt",
  "platform.dashboard.detailsRefreshed",
  "platform.dashboard.detailsPending",
  "platform.dashboard.detailsClockNote",
  "platform.dashboard.sourcesLabel",

  // Live table and figures
  "platform.live.rankingsLabel",
  "platform.live.noExperiencesTitle",
  "platform.live.stats.playersInRanking",
  "platform.live.stats.experiencesShown",
  "platform.live.stats.experiencesShownValue",
  "platform.live.stats.robloxRanking",
  "platform.live.stats.busiestRightNow",
  "platform.live.table.experience",
  "platform.live.table.playersNow",
  "platform.live.table.last24h",
  "platform.live.table.lifetimeVisits",
  "platform.live.table.approval",
  "platform.live.table.genre",
  "platform.live.table.wrapperLabel",
  "platform.live.table.caption",
  "platform.live.sponsored",
  "platform.live.byCreator",
  "platform.live.verifiedSuffix",
  "platform.live.favouritesCount",
  "platform.live.maturity",
  "platform.live.unknownObservationTime",
  "platform.live.rankingsNote.one",
  "platform.live.rankingsNote.other",
  "platform.live.body.related.p3",
  "platform.live.body.related.p4",
  "platform.live.body.related.p5",
  "platform.live.body.experience.p1",
  "platform.live.body.experience.p5",
  "platform.live.body.experience.p7",
  "platform.live.body.experience.p8",
  "platform.live.body.experience.p16",

  "platform.platformFigure.label",
  "platform.platformFigure.method",
  "platform.platformFigure.floorHeading",
  "platform.platformFigure.floorBody",

  // History sections
  "platform.history.rangeLabel",
  "platform.history.recordedByThisSite",
  "platform.history.unnamedExperience",
  "platform.history.notEnoughLinesTitle",
  "platform.history.notEnoughLinesBody",
  "platform.history.noPerExperienceCounts",
  "platform.history.notEnoughYetTitle",
  "platform.history.stats.experiencesTracked",
  "platform.history.stats.observationsHeld",
  "platform.history.stats.observationsNote",
  "platform.history.stats.busiestTracked",
  "platform.history.stats.busiestNote",
  "platform.history.stats.observations",
  "platform.history.stats.observedPeak",
  "platform.history.stats.observedLow",
  "platform.history.stats.observationsRecorded",
  "platform.history.stats.periodCovered",
  "platform.history.stats.mostRecentTotal",
  "platform.history.stats.averageAcrossObservations",
  "platform.history.stats.meanNoteText",
  "platform.history.stats.highestObserved",
  "platform.history.stats.lowestObserved",
  "platform.history.stats.overSpan",
  "platform.history.charts.topOverTimeCaption",
  "platform.history.charts.busiestCaption",
  "platform.history.charts.totalCaption",
  "platform.history.charts.experienceCaption",
  "platform.history.highestObservedNote",
  "platform.history.observationsSoFar.one",
  "platform.history.observationsSoFar.other",
  "platform.history.onlyNObservations.one",
  "platform.history.onlyNObservations.other",
];
