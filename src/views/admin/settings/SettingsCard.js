// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// The card around a settings page: title, error, loading, the Save button and the "saved" message.
const SettingsCard = ({ title, subtitle, group, onSave, children, actions = null }) => {
  const { t } = useTranslation()
  const { values, errorCode, busy, toast, setToast, canUpdate } = group

  return (
    <Card>
      <CardHeader title={t(title)} subheader={t(subtitle)} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!values ? (
          errorCode ? null : (
            <CircularProgress size={28} />
          )
        ) : (
          <>
            {children}
            {canUpdate && onSave ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 6 }}>
                <Button variant='contained' onClick={onSave} disabled={busy}>
                  {t('admin.common.save')}
                </Button>
                {actions}
              </Box>
            ) : null}
          </>
        )}
      </CardContent>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Card>
  )
}

export default SettingsCard
