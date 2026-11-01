// Smart cards (NFC + QR): every card, how often it was opened, and new readers' requests.
// One card's editor: /admin/cards/{id}; the page the card opens: /c/{slug}.

// ** React Imports
import { useContext, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { CARD_KINDS, KIND_ICONS } from 'src/views/site/cards/helpers'

const CardsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const router = useRouter()
  const ability = useContext(AbilityContext)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const list = useApiList('/api/admin/cards', { search, kind, status })

  const columns = [
    {
      key: 'name',
      label: t('admin.cards.name'),
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              backgroundColor: row.color
            }}
          >
            <Icon icon={KIND_ICONS[row.kind]} fontSize='1.1rem' />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 500 }}>{localName(row, 'name', lang)}</Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }} dir='ltr'>
              /c/{row.slug}
            </Typography>
          </Box>
        </Box>
      )
    },
    { key: 'kind', label: t('admin.cards.kind'), render: row => t(`cards.kinds.${row.kind}`) },
    {
      key: 'status',
      label: t('admin.cards.status'),
      render: row => (
        <Chip
          size='small'
          skin='light'
          color={row.status === 'published' ? 'success' : 'secondary'}
          label={t(`admin.cards.statuses.${row.status}`)}
        />
      )
    },
    {
      key: 'opens',
      label: t('admin.cards.opens'),
      render: row => (
        <Typography variant='body2' sx={{ whiteSpace: 'nowrap' }}>
          {t('admin.cards.opensSummary', { nfc: row.opens.nfc, qr: row.opens.qr, link: row.opens.link })}
        </Typography>
      )
    },
    {
      key: 'newRequests',
      label: t('admin.cards.newRequests'),
      render: row => (row.newRequests ? <Chip size='small' color='warning' label={row.newRequests} /> : <span>0</span>)
    },
    { key: 'updatedAt', label: t('admin.cards.updatedAt'), render: row => formatDate(row.updatedAt, lang) }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.cards.title')}
            subheader={t('admin.cards.subtitle')}
            action={
              ability?.can('create', 'cards') ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => router.push('/admin/cards/new/')}
                >
                  {t('admin.cards.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  value={search}
                  placeholder={t('admin.cards.search')}
                  onChange={e => setSearch(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <CustomTextField
                  select
                  fullWidth
                  value={kind}
                  onChange={e => setKind(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>{t('admin.cards.allKinds')}</MenuItem>
                  {CARD_KINDS.map(value => (
                    <MenuItem key={value} value={value}>
                      {t(`cards.kinds.${value}`)}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <CustomTextField
                  select
                  fullWidth
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>{t('admin.cards.allStatuses')}</MenuItem>
                  {['published', 'draft'].map(value => (
                    <MenuItem key={value} value={value}>
                      {t(`admin.cards.statuses.${value}`)}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            <DataTable
              columns={columns}
              list={list}
              emptyKey='admin.cards.empty'
              onRowClick={row => router.push(`/admin/cards/${row.id}/`)}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

CardsPage.acl = { action: 'read', subject: 'cards' }

export default CardsPage
