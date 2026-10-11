// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Switch from '@mui/material/Switch'
import MenuItem from '@mui/material/MenuItem'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

const KINDS = ['correction', 'clarification', 'update']

// GOV-04: a correction to a published article. The note is shown to readers with the article.
const CorrectionDialog = ({ open, article, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const [kind, setKind] = useState('correction')
  const [note, setNote] = useState('')
  const [changeText, setChangeText] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (open && article) {
      setKind('correction')
      setNote('')
      setChangeText(false)
      setTitle(article.title)
      setBody(article.body || '')
    }
  }, [open, article])

  const submit = () => onSubmit(changeText ? { kind, note, title, body } : { kind, note })
  const dir = article?.language === 'en' ? 'ltr' : 'rtl'

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t('admin.content.corrections.addTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Alert severity='info' sx={{ mb: 4 }}>
          {t('admin.content.corrections.hint')}
        </Alert>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.content.corrections.kindLabel')}
              value={kind}
              onChange={e => setKind(e.target.value)}
            >
              {KINDS.map(k => (
                <MenuItem key={k} value={k}>
                  {t(`admin.content.corrections.kind.${k}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label={t('admin.content.corrections.note')}
              helperText={t('admin.content.corrections.noteHelp')}
              value={note}
              onChange={e => setNote(e.target.value)}
              inputProps={{ dir, maxLength: 2000 }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={changeText} onChange={e => setChangeText(e.target.checked)} />}
              label={t('admin.content.corrections.changeText')}
            />
          </Grid>
          {changeText ? (
            <>
              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  label={t('admin.content.field.title')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  inputProps={{ dir, maxLength: 255 }}
                />
              </Grid>
              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={10}
                  label={t('admin.content.field.body')}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  inputProps={{ dir }}
                />
              </Grid>
            </>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={submit} disabled={submitting || !note.trim()}>
          {t('admin.content.corrections.publish')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CorrectionDialog
