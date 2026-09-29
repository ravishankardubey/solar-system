import { BODIES } from '../bodies/data.ts'

export interface BodyList {
  setActive(id: string | null): void
}

// Title plus a button per body: the keyboard- and screen-reader-friendly way
// to select, alongside clicking in 3D. Keys 0–8 pick Sun…Neptune.
export function mountBodyList(
  parent: HTMLElement,
  onSelect: (id: string) => void,
): BodyList {
  const nav = document.createElement('nav')
  nav.className = 'body-nav'
  nav.setAttribute('aria-label', 'Bodies')
  nav.innerHTML = `
    <h1>Solar System</h1>
    <ul>
      ${BODIES.map(
        (b, i) => `
        <li>
          <button type="button" data-body="${b.id}" title="${b.name} (${i})" style="--body-color: ${b.color}">
            <span class="dot" aria-hidden="true"></span>${b.name}
          </button>
        </li>`,
      ).join('')}
    </ul>`
  parent.append(nav)

  nav.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      'button[data-body]',
    )
    if (btn) onSelect(btn.dataset.body!)
  })

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if ((e.target as Element).closest('input, textarea, select')) return
    const body = BODIES[Number(e.key)]
    if (/^\d$/.test(e.key) && body) onSelect(body.id)
  })

  const buttons = [...nav.querySelectorAll<HTMLButtonElement>('button')]
  return {
    setActive(id) {
      for (const b of buttons) {
        b.setAttribute('aria-pressed', String(b.dataset.body === id))
      }
    },
  }
}
