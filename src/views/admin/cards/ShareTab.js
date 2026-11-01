// What goes on the physical card: the QR code to print and the address to write on the NFC tag. Each has its
// own `src` so the card's counters tell taps and scans apart.

// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import { cardUrl } from 'src/views/site/cards/helpers'

const Stat = ({ icon, label, value }) => (
  <Box sx={{ p: 4, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
    <Icon icon={icon} fontSize='1.6rem' />
    <Typography variant='h4' sx={{ mt: 1 }}>
      {value}
    </Typography>
    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
  </Box>
)

const CopyField = ({ label, value }) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box
          component='code'
          dir='ltr'
          sx={{ flex: 1, p: 2, borderRadius: 1, backgroundColor: 'action.hover', overflowWrap: 'anywhere' }}
        >
          {value}
        </Box>
        <Button
          size='small'
          variant='tonal'
          startIcon={<Icon icon='tabler:copy' />}
          onClick={() =>
            navigator.clipboard
              ?.writeText(value)
              .then(() => toast.success(t('admin.cards.share.copied')))
              .catch(() => null)
          }
        >
          {t('admin.cards.share.copy')}
        </Button>
      </Box>
    </Box>
  )
}

const ShareTab = ({ card }) => {
  const { t } = useTranslation()
  const [svg, setSvg] = useState('')
  const qrUrl = cardUrl(card.slug, 'qr')
  const nfcUrl = cardUrl(card.slug, 'nfc')

  useEffect(() => {
    QRCode.toString(qrUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2B1D0E' } })
      .then(setSvg)
      .catch(() => setSvg(''))
  }, [qrUrl])

  const download = (href, name) => {
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = name
    anchor.click()
  }

  const downloadSvg = () => {
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    download(href, `hinnah-${card.slug}-qr.svg`)
    URL.revokeObjectURL(href)
  }

  const downloadPng = () =>
    QRCode.toDataURL(qrUrl, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#2B1D0E' } })
      .then(href => download(href, `hinnah-${card.slug}-qr.png`))
      .catch(() => null)

  return (
    <Grid container spacing={6}>
      {card.status !== 'published' ? (
        <Grid item xs={12}>
          <Alert severity='warning'>{t('admin.cards.share.draftWarning')}</Alert>
        </Grid>
      ) : null}
      <Grid item xs={12} md={5}>
        <Box
          sx={{
            p: 4,
            borderRadius: 1,
            border: theme => `1px solid ${theme.palette.divider}`,
            backgroundColor: '#fff',
            maxWidth: 320,
            mx: 'auto',
            '& svg': { display: 'block', width: '100%', height: 'auto' }
          }}
          aria-label={t('admin.cards.share.qrAlt')}
          role='img'
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
          <Button variant='contained' startIcon={<Icon icon='tabler:download' />} onClick={downloadPng} disabled={!svg}>
            PNG
          </Button>
          <Button variant='tonal' startIcon={<Icon icon='tabler:download' />} onClick={downloadSvg} disabled={!svg}>
            {t('admin.cards.share.svgForPrint')}
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12} md={7}>
        <CopyField label={t('admin.cards.share.qrUrl')} value={qrUrl} />
        <CopyField label={t('admin.cards.share.nfcUrl')} value={nfcUrl} />
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
          {t('admin.cards.share.nfcHelp')}
        </Typography>
        <Button
          variant='outlined'
          component='a'
          href={cardUrl(card.slug)}
          target='_blank'
          rel='noopener noreferrer'
          startIcon={<Icon icon='tabler:external-link' />}
          disabled={card.status !== 'published'}
        >
          {t('admin.cards.share.open')}
        </Button>
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={4}>
            <Stat icon='tabler:nfc' label={t('admin.cards.share.nfcOpens')} value={card.opens.nfc} />
          </Grid>
          <Grid item xs={4}>
            <Stat icon='tabler:qrcode' label={t('admin.cards.share.qrOpens')} value={card.opens.qr} />
          </Grid>
          <Grid item xs={4}>
            <Stat icon='tabler:link' label={t('admin.cards.share.linkOpens')} value={card.opens.link} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default ShareTab
