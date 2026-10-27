/**
 * Shared animation config. Every timing / easing used in the dashboard lives
 * here so the whole "feel" can be tuned from one place.
 * Durations are in seconds (Framer Motion) unless noted as ms (Recharts).
 */

export const EASE = {
  /** Strong ease-out: fast start, gentle landing. Used for entrances and count-ups. */
  out: [0.16, 1, 0.3, 1],
  /** Material-style standard curve for value-to-value updates. */
  standard: [0.4, 0, 0.2, 1],
  inOut: [0.65, 0, 0.35, 1],
}

export const MOTION = {
  /** First-load choreography: nav/header first, then the content area. */
  layout: {
    navDuration: 0.45,
    contentDelay: 0.18,
    contentDuration: 0.6,
    contentOffsetY: 16,
  },
  /** Route-to-route transitions. */
  page: {
    duration: 0.3,
    offsetY: 12,
    exitDuration: 0.16,
    exitOffsetY: -6,
  },
  /** Staggered card/section entrance. */
  stagger: {
    itemDuration: 0.5,
    offsetY: 16,
    gap: 0.08,
    delayChildren: 0.05,
  },
  /** <AnimatedNumber/> */
  countUp: {
    duration: 1.5, // 0 → value on first view
    updateDuration: 0.5, // previous → new value on live updates
    viewMargin: '0px 0px -40px 0px',
  },
  /** Recharts draw-in (ms). Only used for the first render of each chart. */
  chart: {
    duration: 1200,
    easing: 'ease-out',
  },
  gauge: { duration: 1.2, updateDuration: 0.5 },
  progress: { duration: 1.0, updateDuration: 0.5 },
  toggle: { type: 'spring', stiffness: 520, damping: 34 },
  list: { duration: 0.32, offsetY: -12, offsetX: 16 },
  dialog: { duration: 0.2 },
  sheet: { type: 'spring', stiffness: 380, damping: 36 },
}
