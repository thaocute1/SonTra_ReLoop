import React from "react";

/** Standard Design System Button */
export function Button({
  variant = "primary", // 'primary' | 'outline' | 'danger' | 'sun' | 'ghost'
  size = "md",        // 'sm' | 'md' | 'lg'
  icon: Icon,
  className = "",
  type = "button",
  children,
  disabled = false,
  ...props
}) {
  const supportedVariants = ["primary", "secondary", "outline", "danger", "sun", "ghost"];
  const supportedSizes = ["sm", "md", "lg"];
  const safeVariant = supportedVariants.includes(variant) ? variant : "primary";
  const safeSize = supportedSizes.includes(size) ? size : "md";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`ui-button ui-button--${safeVariant} ui-button--${safeSize} motion-press ${className}`.trim()}
      {...props}
    >
      {Icon && <Icon className="ui-button__icon" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Button;
