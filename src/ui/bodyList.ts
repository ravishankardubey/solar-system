import { BODIES } from '../bodies/data.ts'
import { CREDITS_HTML } from './credits.ts'

export interface BodyList {
  setActive(id: string | null): void
}

const MENU_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="bars" d="M4 7h16M4 12h16M4 17h16"/><path class="close" d="M6 6l12 12M18 6 6 18"/></svg>'

// Title plus a button per body: the keyboard- and screen-reader-friendly way
// to select, alongside clicking in 3D. Keys 0–8 pick Sun…Neptune. On phones
// the list collapses into a menu behind a toggle, which also holds the credits.
export function mountBodyList(
  parent: HTMLElement,
  onSelect: (id: string) => void,
): BodyList {
  const nav = document.createElement('nav')
  nav.className = 'body-nav'
  nav.setAttribute('aria-label', 'Bodies')
  nav.innerHTML = `
    <h1>Solar System</h1>
    <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="body-menu" aria-label="Planets and asteroids">${MENU_ICON}</button>
    <div class="body-menu" id="body-menu">
      <ul>
        ${BODIES.map(
          (b) => `
          <li>
            <button type="button" data-body="${b.id}" title="${b.shortcut === undefined ? b.name : `${b.name} (${b.shortcut})`}" style="--body-color: ${b.color}"${b.minor ? ' class="minor"' : ''}>
              <span class="dot" aria-hidden="true"></span>${b.name}
            </button>
          </li>`,
        ).join('')}
      </ul>
      <p class="menu-credits">${CREDITS_HTML}</p>
    </div>`
  parent.append(nav)

  const toggle = nav.querySelector<HTMLButtonElement>('.menu-toggle')!
  function setOpen(open: boolean): void {
    nav.classList.toggle('open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }

  nav.addEventListener('click', (e) => {
    const target = e.target as Element
    if (target.closest('.menu-toggle')) {
      setOpen(!nav.classList.contains('open'))
      return
    }
    const btn = target.closest<HTMLButtonElement>('button[data-body]')
    if (btn) {
      setOpen(false)
      onSelect(btn.dataset.body!)
    }
  })
  // Tapping anywhere outside the menu closes it.
  document.addEventListener('pointerdown', (e) => {
    if (!nav.contains(e.target as Node)) setOpen(false)
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if ((e.target as Element).closest('input, textarea, select')) return
    const body = BODIES.find((b) => String(b.shortcut) === e.key)
    if (body) onSelect(body.id)
  })

  const buttons = [
    ...nav.querySelectorAll<HTMLButtonElement>('button[data-body]'),
  ]
  return {
    setActive(id) {
      for (const b of buttons) {
        b.setAttribute('aria-pressed', String(b.dataset.body === id))
      }
    },
  }
}
