// Textures are CC BY 4.0 and must be credited wherever they're shown.
// A fuller credits page comes in M5.
export function mountCredits(parent: HTMLElement): void {
  const el = document.createElement('p')
  el.className = 'credits'
  el.innerHTML =
    'Textures: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>)'
  parent.append(el)
}
