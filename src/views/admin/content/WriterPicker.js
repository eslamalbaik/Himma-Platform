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
import { localName, pickLang } from 'src/views/admin/billing/format'

// Search-as-you-type writer picker. Suspended writers cannot be named on an article, so they are not offered.
// `value` is { id, nameAr, nameEn, status } or null.
const WriterPicker = ({ value, onChange, label, error, helperText }) => {
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
        .get('/api/admin/writers', { signal: controller.signal, params: { search: input || undefined, perPage: 20 } })
        .then(response => setOptions(response.data.data.filter(writer => writer.status !== 'suspended')))
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
      getOptionLabel={option =>
        `${localName(option, 'name', lang)} · ${t(`admin.writers.status.${option.status || 'pending'}`)}`
      }
      noOptionsText={t('admin.writers.noneFound')}
      renderInput={params => (
        <CustomTextField {...params} fullWidth label={label} error={error} helperText={helperText} />
      )}
    />
  )
}

export default WriterPicker
