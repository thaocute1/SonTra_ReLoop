import './ui.css'

/** A responsive, semantic surface container. */
export function Card({ as: Component = 'section', className = '', children, ...props }) {
  return (
    <Component className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}
