// src/components/buttons/LinkButton.jsx
import  './LinkButton.css'

function LinkButton({ href, children, className = '', ...props }) {
  return (
    <a 
      href={href} 
      className={`link-button ${className}`} 
      {...props} 
    >
      {children}
    </a>
  )
}

export default LinkButton