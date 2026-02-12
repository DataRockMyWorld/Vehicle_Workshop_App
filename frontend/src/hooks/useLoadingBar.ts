import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.2,
})

export function useLoadingBar() {
  const location = useLocation()

  useEffect(() => {
    NProgress.start()
    const timer = setTimeout(() => {
      NProgress.done()
    }, 300)

    return () => {
      clearTimeout(timer)
      NProgress.done()
    }
  }, [location.pathname])
}
