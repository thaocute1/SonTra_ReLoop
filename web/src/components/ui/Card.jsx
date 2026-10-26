/** A responsive, semantic surface container. */
export function Card({ as: Component = 'section', interactive = false, className = '', children, ...props }) {
  return (
    <Component className={`ui-card motion-fade-up ${interactive ? 'motion-hover-lift' : ''} ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}
