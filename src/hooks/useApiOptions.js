// ** React Imports
import { useEffect, useState } from 'react'

// ** Third Party Imports
import axios from 'axios'

// Loads a short reference list (sections, tags, issues...) for selects. Skipped when `enabled` is false,
// e.g. when the signed-in role may not read that list.
const useApiOptions = (url, { enabled = true, params = {} } = {}) => {
  const [options, setOptions] = useState([])
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    axios
      .get(url, { signal: controller.signal, params: { perPage: 100, ...JSON.parse(paramsKey) } })
      .then(response => setOptions(response.data.data))
      .catch(() => {})

    return () => controller.abort()
  }, [url, enabled, paramsKey])

  return options
}

export default useApiOptions
