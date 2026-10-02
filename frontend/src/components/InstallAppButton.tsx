import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setInstallPrompt(null)
    } else {
      setShowHelp((current) => !current)
    }
  }

  function installationInstructions() {
    const agent = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(agent)) {
      return <>En Safari, tocá <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>.</>
    }
    if (/Edg\//.test(agent)) {
      return <>En Edge, abrí el menú <strong>…</strong> y elegí <strong>Aplicaciones → Instalar este sitio como una aplicación</strong>.</>
    }
    if (/Chrome\//.test(agent)) {
      return <>En Chrome, abrí <strong>⋮ → Guardar y compartir → Instalar página como aplicación</strong>. Si esa opción no aparece, comprobá que Campus esté abierto desde una dirección segura o <strong>localhost</strong>.</>
    }
    if (/Safari\//.test(agent)) {
      return <>En Safari para Mac, abrí <strong>Archivo → Añadir al Dock</strong>.</>
    }
    return <>Abrí el menú del navegador y buscá <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</>
  }

  return (
    <div className="relative">
      <button type="button" onClick={install} className="whitespace-nowrap rounded-full bg-cobalt px-3.5 py-2 text-sm font-bold text-white transition hover:bg-ink">
        Instalar app
      </button>
      {showHelp && (
        <div role="status" className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-ink/10 bg-white p-4 text-sm leading-5 text-ink shadow-xl">
          {installationInstructions()}
        </div>
      )}
    </div>
  )
}
