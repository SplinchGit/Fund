import { useEffect } from 'react'
import eruda from 'eruda'

declare global {
  interface Window {
    __ERUDA_LOADED__?: boolean
  }
}

const ErudaProvider = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.__ERUDA_LOADED__) {
      eruda.init()
      window.__ERUDA_LOADED__ = true
    }
  }, [])

  return null
}

export default ErudaProvider
