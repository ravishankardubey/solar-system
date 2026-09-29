import { SPEEDS, type SimClock } from '../clock/index.ts'

const ICONS = {
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z"/>',
  slower: '<path d="M11.5 6 4 12l7.5 6zm8 0L12 12l7.5 6z"/>',
  faster: '<path d="M4.5 6v12l7.5-6zm8 0v12l7.5-6z"/>',
  reverse:
    '<path d="M4 9h13m0 0-3.5-3.5M17 9l-3.5 3.5M20 15H7m0 0 3.5-3.5M7 15l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
}

function icon(name: keyof typeof ICONS): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`
}

// Keys: Space play/pause, [ slower, ] faster, R reverse, N jump to now.
const SHORTCUTS: Record<string, (clock: SimClock) => void> = {
  ' ': (c) => c.togglePlay(),
  '[': (c) => c.slower(),
  ']': (c) => c.faster(),
  r: (c) => c.reverse(),
  n: (c) => c.resetToNow(),
}

export interface TimeControls {
  update(): void
}

// Bottom panel: sim date, speed, and transport buttons. Talks only to the clock.
export function mountTimeControls(
  parent: HTMLElement,
  clock: SimClock,
): TimeControls {
  const panel = document.createElement('div')
  panel.className = 'time-panel'
  panel.setAttribute('role', 'group')
  panel.setAttribute('aria-label', 'Time controls')
  panel.innerHTML = `
    <div class="time-readout">
      <time class="time-date"></time>
      <span class="time-speed"></span>
    </div>
    <div class="time-buttons">
      <button type="button" data-action="reverse" title="Reverse time (R)" aria-label="Reverse time">${icon('reverse')}</button>
      <button type="button" data-action="slower" title="Slower ([)" aria-label="Slower">${icon('slower')}</button>
      <button type="button" data-action="play" class="primary" title="Play/pause (Space)"></button>
      <button type="button" data-action="faster" title="Faster (])" aria-label="Faster">${icon('faster')}</button>
      <button type="button" data-action="now" class="text" title="Jump to now (N)">Now</button>
    </div>`
  parent.append(panel)

  const dateEl = panel.querySelector<HTMLTimeElement>('.time-date')!
  const speedEl = panel.querySelector<HTMLSpanElement>('.time-speed')!
  const playBtn = panel.querySelector<HTMLButtonElement>('[data-action=play]')!
  const reverseBtn = panel.querySelector<HTMLButtonElement>(
    '[data-action=reverse]',
  )!
  const slowerBtn = panel.querySelector<HTMLButtonElement>(
    '[data-action=slower]',
  )!
  const fasterBtn = panel.querySelector<HTMLButtonElement>(
    '[data-action=faster]',
  )!

  const actions: Record<string, () => void> = {
    reverse: () => clock.reverse(),
    slower: () => clock.slower(),
    play: () => clock.togglePlay(),
    faster: () => clock.faster(),
    now: () => clock.resetToNow(),
  }
  panel.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      'button[data-action]',
    )
    if (btn) actions[btn.dataset.action!]()
    update()
  })

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as Element
    // Form fields keep their keys; a focused button keeps Space/Enter.
    if (target.closest('input, textarea, select')) return
    if (target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return
    const run = SHORTCUTS[e.key.toLowerCase()]
    if (!run) return
    e.preventDefault()
    run(clock)
    update()
  })

  const withSeconds = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
  const withMinutes = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Only touch the DOM when something visible changed.
  let shown = ''
  function update(): void {
    const format = clock.speedIndex <= 1 ? withSeconds : withMinutes
    const dateText = format.format(clock.date)
    const speedText = `${clock.direction < 0 ? '−' : ''}${SPEEDS[clock.speedIndex].label}`
    const key = `${dateText}|${speedText}|${clock.playing}`
    if (key === shown) return
    shown = key

    dateEl.textContent = dateText
    dateEl.dateTime = clock.date.toISOString()
    speedEl.textContent = clock.playing ? speedText : `Paused · ${speedText}`
    playBtn.innerHTML = icon(clock.playing ? 'pause' : 'play')
    playBtn.setAttribute('aria-label', clock.playing ? 'Pause' : 'Play')
    reverseBtn.setAttribute('aria-pressed', String(clock.direction < 0))
    slowerBtn.disabled = clock.speedIndex === 0
    fasterBtn.disabled = clock.speedIndex === SPEEDS.length - 1
  }
  update()
  return { update }
}
