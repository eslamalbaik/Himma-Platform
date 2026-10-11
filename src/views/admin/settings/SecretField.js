// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// A write-only key: the page never sees the stored value, only whether one is set. Leaving the field
// empty keeps the stored key; "Remove" clears it on the next save.
const SecretField = ({ label, hasValue, value, onChange, clear, onClear, disabled }) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      <CustomTextField
        fullWidth
        type='password'
        autoComplete='new-password'
        label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={clear ? t('admin.settings.secret.willRemove') : hasValue ? t('admin.settings.secret.keep') : ''}
        helperText={hasValue ? t('admin.settings.secret.isSet') : t('admin.settings.secret.notSet')}
        inputProps={{ dir: 'ltr' }}
      />
      {hasValue && !disabled ? (
        <Button color={clear ? 'secondary' : 'error'} onClick={onClear} sx={{ mb: 5.5, whiteSpace: 'nowrap' }}>
          {t(clear ? 'admin.settings.secret.undoRemove' : 'admin.settings.secret.remove')}
        </Button>
      ) : null}
    </Box>
  )
}

export default SecretField
