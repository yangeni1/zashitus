// src/components/buttons/LinkButton.jsx
import { Link } from 'react-router-dom'
import './LinkButton.css'

function LinkButton({ to, href, text, children, className = '', onClick, ...props }) {
  const content = text || children
  
  if (to) {
    return (
      <Link 
        to={to} 
        className={`link-button ${className}`} 
        onClick={onClick}
        {...props} 
      >
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a 
        href={href} 
        className={`link-button ${className}`} 
        onClick={onClick}
        {...props} 
      >
        {content}
      </a>
    )
  }

  return (
    <button 
      type="button"
      className={`link-button ${className}`} 
      onClick={onClick}
      {...props} 
    >
      {content}
    </button>
  )
}

export default LinkButton
