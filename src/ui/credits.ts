// Solar System Scope textures are CC BY 4.0 and must be credited wherever
// they're shown; NASA/DLR imagery and JPL data are credited as requested.
// A fuller credits page comes in M5.
export function mountCredits(parent: HTMLElement): void {
  const el = document.createElement('p')
  el.className = 'credits'
  el.innerHTML = [
    'Textures: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>)',
    'Ceres &amp; Vesta: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA (Dawn)',
    'Asteroid orbits: <a href="https://ssd.jpl.nasa.gov/tools/sbdb_query.html" target="_blank" rel="noopener">NASA/JPL SBDB</a>',
  ].join(' · ')
  parent.append(el)
  // Publish the credits height so bottom panels sit above it when it wraps.
  new ResizeObserver(() => {
    document.documentElement.style.setProperty(
      '--credits-height',
      `${el.offsetHeight}px`,
    )
  }).observe(el)
}
