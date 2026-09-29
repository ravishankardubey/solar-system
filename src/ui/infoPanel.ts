import { BODIES, type BodyData } from '../bodies/data.ts'

const num = (digits: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: digits })

function formatDuration(hours: number): string {
  return hours < 48
    ? `${num(1).format(hours)} hours`
    : `${num(1).format(hours / 24)} days`
}

function formatYear(days: number): string {
  return days < 1000
    ? `${num(0).format(days)} days`
    : `${num(1).format(days / 365.25)} years`
}

function formatMass(earths: number): string {
  if (earths === 1) return '5.97 × 10²⁴ kg'
  const format =
    earths < 1
      ? new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 })
      : num(1)
  return `${format.format(earths)} × Earth`
}

function facts(body: BodyData): [string, string][] {
  const isStar = body.type === 'Star'
  const rows: [string, string][] = [
    ['Radius', `${num(0).format(body.radiusKm)} km`],
    ['Mass', formatMass(body.massEarths)],
    [
      'Surface gravity',
      `${num(body.gravity < 1 ? 2 : 1).format(body.gravity)} m/s²`,
    ],
    [
      isStar ? 'Rotation (equator)' : 'Length of day',
      formatDuration(body.dayHours),
    ],
  ]
  if (body.orbitalPeriodDays)
    rows.push(['Length of year', formatYear(body.orbitalPeriodDays)])
  if (body.distanceAu !== undefined)
    rows.push([
      'Distance from Sun',
      `${num(2).format(body.distanceAu)} AU · ${num(0).format(body.distanceAu * 149.6)} million km`,
    ])
  if (body.meanTempC !== undefined)
    rows.push([
      isStar ? 'Surface temperature' : 'Mean temperature',
      `${num(0).format(body.meanTempC)} °C`,
    ])
  if (body.moons !== undefined)
    rows.push([
      'Known moons',
      body.moonsAsOf ? `${body.moons} (${body.moonsAsOf})` : String(body.moons),
    ])
  if (!isStar) rows.push(['Axial tilt', `${num(1).format(body.axialTiltDeg)}°`])
  return rows
}

export interface InfoPanel {
  readonly element: HTMLElement
  show(id: string | null): void
}

// Side panel (top sheet on phones) with the selected body's facts.
export function mountInfoPanel(
  parent: HTMLElement,
  onClose: () => void,
): InfoPanel {
  const panel = document.createElement('aside')
  panel.className = 'info-panel'
  panel.hidden = true
  panel.setAttribute('aria-labelledby', 'info-title')
  parent.append(panel)

  panel.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.info-close')) onClose()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) onClose()
  })

  return {
    element: panel,
    show(id) {
      const body = BODIES.find((b) => b.id === id)
      panel.hidden = !body
      if (!body) return
      panel.style.setProperty('--body-color', body.color)
      panel.innerHTML = `
        <header>
          <div>
            <p class="info-type">${body.type}</p>
            <h2 id="info-title">${body.name}</h2>
          </div>
          <button type="button" class="info-close" aria-label="Close and return to overview" title="Close (Esc)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <p class="info-description">${body.description}</p>
        <dl>
          ${facts(body)
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
            .join('')}
        </dl>`
    },
  }
}
