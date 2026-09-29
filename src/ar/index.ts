export type ArMode = 'webxr' | 'quicklook'

// Android Chrome (ARCore devices) supports live WebXR AR. iPhone and iPad
// Safari don't, but open USDZ files in AR Quick Look via <a rel="ar">.
export async function detectArMode(): Promise<ArMode | null> {
  try {
    if (await navigator.xr?.isSessionSupported('immersive-ar')) return 'webxr'
  } catch {
    // isSessionSupported throws when blocked by permissions policy.
  }
  if (document.createElement('a').relList.supports('ar')) return 'quicklook'
  return null
}
