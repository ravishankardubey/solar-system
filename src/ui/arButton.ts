export interface ArButton {
  setBusy(busy: boolean): void
}

const CUBE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 0v9m0 0 8-4.5M12 12l-8-4.5M12 12v9"/></svg>'

// "AR" button, only mounted on devices that support AR. Top bar on phones,
// bottom-right on larger screens.
export function mountArButton(
  parent: HTMLElement,
  label: string,
  onClick: () => void,
): ArButton {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ar-button'
  button.setAttribute('aria-label', label)
  button.title = label
  button.innerHTML = `${CUBE_ICON}<span>AR</span>`
  button.addEventListener('click', onClick)
  parent.append(button)
  return {
    setBusy(busy) {
      button.disabled = busy
      button.querySelector('span')!.textContent = busy ? 'Preparing…' : 'AR'
    },
  }
}
