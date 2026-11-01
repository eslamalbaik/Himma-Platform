// An editable list inside the card form (links, books, events, a programme): each row in a bordered box with
// move up / move down / remove, and an "add" button under the list.

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

const RowsEditor = ({ rows, onChange, newRow, addLabel, emptyLabel, titleOf, disabled, dense, children }) => {
  const { t } = useTranslation()

  const update = (index, patch) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const move = (index, step) => {
    const next = [...rows]
    ;[next[index], next[index + step]] = [next[index + step], next[index]]
    onChange(next)
  }

  return (
    <Box>
      {!rows.length && emptyLabel ? (
        <Typography sx={{ color: 'text.secondary', mb: 4 }}>{emptyLabel}</Typography>
      ) : null}
      {rows.map((row, index) => (
        <Box
          key={row.id || `new-${index}`}
          sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: dense ? 3 : 4, mb: 4 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontWeight: 600, flex: 1 }} noWrap>
              {titleOf ? titleOf(row, index) : index + 1}
            </Typography>
            {disabled ? null : (
              <>
                <IconButton
                  size='small'
                  disabled={index === 0}
                  aria-label={t('admin.landing.moveUp')}
                  onClick={() => move(index, -1)}
                >
                  <Icon icon='tabler:chevron-up' />
                </IconButton>
                <IconButton
                  size='small'
                  disabled={index === rows.length - 1}
                  aria-label={t('admin.landing.moveDown')}
                  onClick={() => move(index, 1)}
                >
                  <Icon icon='tabler:chevron-down' />
                </IconButton>
                <IconButton
                  size='small'
                  color='error'
                  aria-label={t('admin.common.delete')}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  <Icon icon='tabler:trash' />
                </IconButton>
              </>
            )}
          </Box>
          {children(row, patch => update(index, patch), index)}
        </Box>
      ))}
      {disabled ? null : (
        <Button
          variant='tonal'
          size={dense ? 'small' : 'medium'}
          startIcon={<Icon icon='tabler:plus' />}
          onClick={() => onChange([...rows, newRow()])}
        >
          {addLabel}
        </Button>
      )}
    </Box>
  )
}

export default RowsEditor
