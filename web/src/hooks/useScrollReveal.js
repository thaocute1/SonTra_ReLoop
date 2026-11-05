import { useEffect } from 'react'

/** Reveals marked sections once as they enter the viewport. */
export function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('[data-motion-reveal]'))
    if (!elements.length) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-motion-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-motion-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -48px' })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

export default useScrollReveal
