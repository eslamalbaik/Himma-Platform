// ** React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

// ** Third Party Imports
import axios from 'axios'

// Loads a paginated admin list (`{data, meta: {total, ...}}`) and reloads it when the page,
// page size or filters change. `search` is debounced so typing doesn't fire a request per keystroke.
const useApiList = (url, filters = {}, { perPage: initialPerPage = 25 } = {}) => {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [search, setSearch] = useState(filters.search || '')
  const [reloadKey, setReloadKey] = useState(0)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false

      return
    }
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(filters.search || '')
    }, 350)

    return () => clearTimeout(timeout)
  }, [filters.search])

  const { search: _ignored, ...otherFilters } = filters
  const filtersKey = JSON.stringify(otherFilters)

  // Changing a filter starts again from the first page.
  useEffect(() => setPage(0), [filtersKey])

  useEffect(() => {
    const controller = new AbortController()
    const params = { page: page + 1, perPage, search: search || undefined }
    Object.entries(JSON.parse(filtersKey)).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params[key] = value
    })

    setLoading(true)
    setError(null)
    axios
      .get(url, { signal: controller.signal, params })
      .then(response => {
        setRows(response.data.data)
        setMeta(response.data.meta || { total: response.data.data.length })
      })
      .catch(err => {
        if (axios.isCancel(err)) return
        setError(err.response?.data?.error?.code || 'network_error')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [url, page, perPage, search, filtersKey, reloadKey])

  const reload = useCallback(() => setReloadKey(key => key + 1), [])

  return { rows, meta, loading, error, page, setPage, perPage, setPerPage, reload }
}

export default useApiList
