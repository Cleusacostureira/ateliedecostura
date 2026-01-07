import React from 'react'

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, info: any) {
    try {
      const payload = { error: String(error), info }
      localStorage.setItem('lastUncaughtError', JSON.stringify(payload))
    } catch (e) {
      // ignore
    }
    // still log for developer console
    // eslint-disable-next-line no-console
    console.error('Uncaught error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      let last: any = null;
      try { last = JSON.parse(localStorage.getItem('lastUncaughtError') || 'null'); } catch(_) { last = null; }
      return (
        <div style={{ padding: 24 }}>
          <h2>Algo deu errado.</h2>
          <p>Houve um erro inesperado. Você pode recarregar a página ou checar os detalhes abaixo.</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', borderRadius: 6, border: 'none' }}>Recarregar</button>
            <button onClick={() => { try { navigator.clipboard.writeText(JSON.stringify(last || {}, null, 2)); } catch(e){} }} style={{ marginLeft: 8, padding: '8px 12px', background: '#374151', color: 'white', borderRadius: 6, border: 'none' }}>Copiar detalhes</button>
          </div>
          {last && (
            <pre style={{ marginTop: 12, maxHeight: 300, overflow: 'auto', background: '#f3f4f6', padding: 8, borderRadius: 6 }}>{JSON.stringify(last, null, 2)}</pre>
          )}
        </div>
      )
    }
    // @ts-ignore
    return this.props.children
  }
}
