import { useNavigate } from 'react-router-dom'
import './BackButton.css'

interface BackButtonProps {
  to?: string
  label?: string
}

export default function BackButton({ to, label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) {
      navigate(to)
    } else {
      navigate(-1)
    }
  }

  return (
    <button
      type="button"
      className="back-button"
      onClick={handleClick}
      aria-label={label}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
