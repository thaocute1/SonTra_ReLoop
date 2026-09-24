import { forwardRef, useId } from 'react'

/**
 * Labelled input with optional leading/trailing icon slots and accessible error text.
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leadingIcon,
    trailingIcon,
    id: providedId,
    className = '',
    inputClassName = '',
    disabled,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && <label className="ui-field__label" htmlFor={id}>{label}</label>}
      <div className={`ui-input ${error ? 'ui-input--error' : ''} ${disabled ? 'ui-input--disabled' : ''}`.trim()}>
        {leadingIcon && <span className="ui-input__icon" aria-hidden="true">{leadingIcon}</span>}
        <input
          ref={ref}
          id={id}
          className={`ui-input__control ${inputClassName}`.trim()}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={helpId}
          {...props}
        />
        {trailingIcon && <span className="ui-input__icon" aria-hidden="true">{trailingIcon}</span>}
      </div>
      {(error || hint) && (
        <p id={helpId} className={error ? 'ui-field__message ui-field__message--error' : 'ui-field__message'}>
          {error || hint}
        </p>
      )}
    </div>
  )
})
