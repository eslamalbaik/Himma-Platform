// ** React Imports
import { useCallback, useContext, useEffect, useState } from 'react'

// ** Third Party Imports
import axios from 'axios'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

export const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Loads one settings group (`GET url`), saves it (`PUT url`) and runs its actions (`POST url/<action>`).
const useSettingsGroup = url => {
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))
  const [values, setValues] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    axios
      .get(url)
      .then(response => setValues(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [url])

  const send = useCallback((request, toastKey) => {
    setBusy(true)
    setErrorCode(null)

    return request()
      .then(response => {
        setValues(response.data.data)
        setToast(toastKey)

        return response.data.data
      })
      .catch(err => {
        setErrorCode(errorOf(err))

        return null
      })
      .finally(() => setBusy(false))
  }, [])

  const save = body => send(() => axios.put(url, body), 'admin.common.saved')
  const run = (action, toastKey) => send(() => axios.post(`${url}/${action}`), toastKey)

  return { values, setValues, errorCode, busy, toast, setToast, save, run, canUpdate }
}

export default useSettingsGroup
