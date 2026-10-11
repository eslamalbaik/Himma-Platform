// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Third Party Imports
import axios from 'axios'

const pad = n => String(n).padStart(2, '0')
export const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Quick periods for the date filter. Each returns {from, to} as YYYY-MM-DD.
export const presets = {
  thisMonth: () => {
    const now = new Date()

    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) }
  },
  last3Months: () => {
    const now = new Date()

    return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: isoDate(now) }
  },
  last12Months: () => {
    const now = new Date()

    return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to: isoDate(now) }
  },
  thisYear: () => {
    const now = new Date()

    return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(now) }
  }
}

// Loads one report (`/api/admin/reports/<type>`) for a period and downloads its CSV export.
const useReport = type => {
  const [range, setRange] = useState(presets.last12Months)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!range.from || !range.to) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    axios
      .get(`/api/admin/reports/${type}`, { signal: controller.signal, params: range })
      .then(response => setData(response.data.data))
      .catch(err => {
        if (axios.isCancel(err)) return
        setError(err.response?.data?.error?.code || 'network_error')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [type, range])

  const exportCsv = useCallback(
    async lang => {
      setExporting(true)
      setError(null)
      try {
        const response = await axios.get(`/api/admin/reports/${type}/export`, {
          params: { ...range, lang },
          responseType: 'blob'
        })
        const url = URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.download = `himma-${type}-${range.from}-${range.to}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      } catch (err) {
        // The error body is a Blob here: read the code out of it.
        let code = 'network_error'
        try {
          code = JSON.parse(await err.response.data.text()).error.code
        } catch {}
        setError(code)
      } finally {
        setExporting(false)
      }
    },
    [type, range]
  )

  return { range, setRange, data, loading, error, exporting, exportCsv }
}

export default useReport
