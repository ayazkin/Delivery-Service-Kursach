type LoadingProps = {
  label?: string
}

export function Loading({ label = 'Загрузка...' }: LoadingProps) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
