// Loads a published card (GET /api/public/cards/{slug}). `src` (nfc, qr or link) is sent only by the card
// page itself, so the dashboard counts each tap or scan once.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Third Party Imports
import axios from 'axios'

const useCard = (slug, src) => {
  const [card, setCard] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | failed

  useEffect(() => {
    if (!slug) return
    setStatus('loading')
    axios
      .get(`/api/public/cards/${slug}`, { params: src ? { src } : {} })
      .then(({ data }) => {
        setCard(data.data)
        setStatus('ready')
      })
      .catch(err => setStatus(err.response?.status === 404 ? 'missing' : 'failed'))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return { card, status }
}

export default useCard
