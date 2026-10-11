// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Autocomplete from '@mui/material/Autocomplete'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// Search-as-you-type article picker. `value` is an article ({ id, title, status, classification }) or null.
const ArticlePicker = ({ value, onChange, label, helperText }) => {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      setLoading(true)
      axios
        .get('/api/admin/content/articles', {
          signal: controller.signal,
          params: { search: input || undefined, perPage: 20 }
        })
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
      getOptionLabel={option => `${option.title} · ${t(`admin.content.status.${option.status}`)}`}
      getOptionDisabled={option => option.classification === 'confidential'}
      noOptionsText={t('admin.ai.noArticles')}
      renderInput={params => <CustomTextField {...params} fullWidth label={label} helperText={helperText} />}
    />
  )
}

export default ArticlePicker
