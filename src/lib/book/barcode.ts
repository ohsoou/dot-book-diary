import type { IScannerControls } from '@zxing/browser'

let controls: IScannerControls | null = null

export async function startScanner(
  videoEl: HTMLVideoElement,
  onDecode: (text: string) => void,
  onError: (err: Error) => void,
): Promise<void> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  try {
    controls = await reader.decodeFromVideoDevice(undefined, videoEl, (result, err) => {
      if (result) {
        onDecode(result.getText())
      }
      if (err && err.name !== 'NotFoundException') {
        onError(err as Error)
      }
    })
  } catch (err) {
    onError(err as Error)
  }
}

export function stopScanner(): void {
  controls?.stop()
  controls = null
}