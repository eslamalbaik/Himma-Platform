// ** React Imports
import { useMemo, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Helpers
import diffWords from './wordDiff'

const CURRENT = 'current'

// Additions are underlined and removals struck through, so the change does not rely on colour alone.
const Diff = ({ before, after }) => {
  const parts = useMemo(() => diffWords(before, after), [before, after])

  return (
    <Typography component='div' dir='auto' sx={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>
      {parts.map((part, i) =>
        part.type === 'same' ? (
          <span key={i}>{part.text}</span>
        ) : (
          <Box
            key={i}
            component={part.type === 'added' ? 'ins' : 'del'}
            sx={{
              px: 0.5,
              borderRadius: 0.5,
              textDecorationThickness: '2px',
              backgroundColor: part.type === 'added' ? 'success.light' : 'error.light',
              color: part.type === 'added' ? 'success.contrastText' : 'error.contrastText'
            }}
          >
            {part.text}
          </Box>
        )
      )}
    </Typography>
  )
}

// §6 Version Control: compare any two versions of an article, or a version with the current text.
const VersionCompareDialog = ({ open, article, initialVersion, onClose }) => {
  const { t } = useTranslation()
  const [from, setFrom] = useState(initialVersion ?? CURRENT)
  const [to, setTo] = useState(CURRENT)

  const textOf = key => {
    if (key === CURRENT) return { title: article.title, body: article.body }

    return article.versions.find(v => v.version === key) || { title: '', body: '' }
  }

  const options = [
    ...article.versions.map(v => ({ value: v.version, label: t('admin.content.details.version', { n: v.version }) })),
    { value: CURRENT, label: t('admin.content.versions.current') }
  ]

  const select = (label, value, onChange) => (
    <CustomTextField select fullWidth label={label} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </CustomTextField>
  )

  const a = textOf(from)
  const b = textOf(to)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth>
      <DialogTitle>{t('admin.content.versions.compareTitle')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6}>
            {select(t('admin.content.versions.from'), from, setFrom)}
          </Grid>
          <Grid item xs={12} sm={6}>
            {select(t('admin.content.versions.to'), to, setTo)}
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
          <Typography variant='body2' component='ins' sx={{ color: 'success.main' }}>
            {t('admin.content.versions.added')}
          </Typography>
          <Typography variant='body2' component='del' sx={{ color: 'error.main' }}>
            {t('admin.content.versions.removed')}
          </Typography>
        </Box>
        <Typography variant='h6' sx={{ mb: 2 }}>
          <Diff before={a.title} after={b.title} />
        </Typography>
        <Diff before={a.body} after={b.body} />
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default VersionCompareDialog
