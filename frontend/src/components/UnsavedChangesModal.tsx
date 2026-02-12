import './UnsavedChangesModal.css'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function UnsavedChangesModal({ isOpen, onConfirm, onCancel }: UnsavedChangesModalProps) {
  if (!isOpen) return null

  return (
    <div className="unsaved-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
      <div className="unsaved-modal">
        <div className="unsaved-modal__icon">⚠️</div>
        <h2 id="unsaved-title" className="unsaved-modal__title">
          Unsaved Changes
        </h2>
        <p className="unsaved-modal__message">
          You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?
        </p>
        <div className="unsaved-modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
            autoFocus
          >
            Stay on Page
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
