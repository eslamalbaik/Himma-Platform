// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Autocomplete from '@mui/material/Autocomplete'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Helpers
import { localName, pickLang } from './format'

// Search-as-you-type client picker. `value` is a client object ({ id, nameAr, nameEn }) or null.
const TenantPicker = ({ value, onChange, label, error }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [input, setInput] = useState('')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      setLoading(true)
      axios
        .get('/api/admin/tenants', { signal: controller.signal, params: { search: input || undefined, perPage: 20 } })
        .then(response => setOptions(response.data.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [input])

  return (
    <Autocomplete
      value={value}
      onChange={(e, newValue) => onChange(newValue)}
      onInputChange={(e, newInput) => setInput(newInput)}
      options={options}
      loading={loading}
      filterOptions={x => x}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      getOptionLabel={option => localName(option, 'name', lang)}
      noOptionsText={t('admin.billing.noClients')}
      renderInput={params => <CustomTextField {...params} fullWidth label={label} error={error} />}
    />
  )
}

export default TenantPicker
