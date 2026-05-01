import { useState } from 'react'

export function usePlaceholder() {
  const [v, setV] = useState('')
  return { v, setV }
}
