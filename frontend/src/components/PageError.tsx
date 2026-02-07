import { apiErrorMsg } from '../api/client'
import './PageError.css'

interface PageErrorProps {
  error: unknown
  title?: string
  onRetry?: () => void
}

export default function PageError({ error, title = 'Something went wrong', onRetry }: PageErrorProps) {
  return (
    <div className="page-error" role="alert">
      <h2 className="page-error__title">{title}</h2>
      <p className="page-error__message">{apiErrorMsg(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
