import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageError from './PageError'

describe('PageError', () => {
  it('renders default title and error message', () => {
    render(<PageError error={{ detail: 'Server unavailable' }} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/Server unavailable/)).toBeInTheDocument()
  })

  it('renders custom title when provided', () => {
    render(
      <PageError error={new Error('failed')} title="Could not load data" />
    )

    expect(screen.getByText('Could not load data')).toBeInTheDocument()
  })

  it('renders retry button when onRetry is provided', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(
      <PageError error={new Error('failed')} onRetry={onRetry} />
    )

    const retryBtn = screen.getByRole('button', { name: /try again/i })
    expect(retryBtn).toBeInTheDocument()

    await user.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<PageError error={new Error('failed')} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
