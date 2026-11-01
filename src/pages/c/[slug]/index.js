// The page a Hinnah smart card opens on a phone (NFC tap or QR scan), no app and no sign-in needed:
// profile, links, books with ISBN, readers' requests, events and news. Data: GET /api/public/cards/{slug}.

// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import CardFrame from 'src/views/site/cards/CardFrame'
import CardMissing from 'src/views/site/cards/CardMissing'
import RequestDialog from 'src/views/site/cards/RequestDialog'
import SubscribeBox from 'src/views/site/cards/SubscribeBox'
import useCard from 'src/views/site/cards/useCard'
import {
  GOLD,
  KIND_ICONS,
  LINK_ICONS,
  downloadVCard,
  eventUrl,
  formatDateTime,
  isUpcoming,
  pick
} from 'src/views/site/cards/helpers'

const Section = ({ title, children }) => (
  <Box component='section' sx={{ mt: 8 }}>
    <Typography component='h2' sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 3 }}>
      {title}
    </Typography>
    {children}
  </Box>
)

const CardPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const router = useRouter()
  const { slug, src } = router.query
  const { card, status } = useCard(slug, router.isReady ? (['nfc', 'qr'].includes(src) ? src : 'link') : null)
  const [request, setRequest] = useState(null) // { kind, bookTitle }

  if (status !== 'ready') return <CardMissing status={status} />

  const color = card.color
  const name = pick(card, 'name', lang)
  const headline = pick(card, 'headline', lang)
  const bio = pick(card, 'bio', lang)
  const upcoming = card.events.filter(isUpcoming)
  const past = card.events.filter(event => !isUpcoming(event))
  const publisher = pick(card, 'publisher', lang)
  const rights = pick(card, 'rights', lang)

  const share = () => {
    const url = `${window.location.origin}/c/${card.slug}/`
    if (navigator.share) navigator.share({ title: name, url }).catch(() => null)
    else
      navigator.clipboard
        ?.writeText(url)
        .then(() => toast.success(t('cards.public.linkCopied')))
        .catch(() => null)
  }

  const contactActions = [
    { key: 'save', icon: 'tabler:address-book', onClick: () => downloadVCard(card, lang) },
    card.phone ? { key: 'call', icon: 'tabler:phone', href: `tel:${card.phone.replace(/[^+\d]/g, '')}` } : null,
    card.email ? { key: 'email', icon: 'tabler:mail', href: `mailto:${card.email}` } : null,
    { key: 'share', icon: 'tabler:share', onClick: share }
  ].filter(Boolean)

  return (
    <CardFrame title={name} description={headline} color={color}>
      {/* The card itself: amber gradient, photo, name and the quick contact buttons. */}
      <Box
        sx={{
          mt: 2,
          p: 6,
          borderRadius: 6,
          color: '#fff',
          textAlign: 'center',
          background: `linear-gradient(145deg, ${color} 0%, #2B1D0E 100%)`,
          boxShadow: `0 18px 40px ${color}55`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            insetInlineEnd: -40,
            top: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            border: `2px solid ${GOLD}55`
          }}
        />
        <Chip
          size='small'
          icon={<Icon icon={KIND_ICONS[card.kind]} fontSize='1rem' />}
          label={t(`cards.kinds.${card.kind}`)}
          sx={{ mb: 4, color: '#fff', backgroundColor: 'rgba(255,255,255,0.14)', '& .MuiChip-icon': { color: GOLD } }}
        />
        <Avatar
          src={card.photoUrl || undefined}
          alt={name}
          sx={{
            width: 96,
            height: 96,
            mx: 'auto',
            mb: 3,
            fontSize: '2.2rem',
            border: `3px solid ${GOLD}`,
            backgroundColor: 'rgba(255,255,255,0.12)'
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Typography component='h1' sx={{ color: '#fff', fontWeight: 700, fontSize: '1.7rem', lineHeight: 1.3 }}>
          {name}
        </Typography>
        {headline ? <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 1 }}>{headline}</Typography> : null}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 5 }}>
          {contactActions.map(action => (
            <Tooltip key={action.key} title={t(`cards.public.actions.${action.key}`)}>
              <IconButton
                component={action.href ? 'a' : 'button'}
                href={action.href}
                onClick={action.onClick}
                aria-label={t(`cards.public.actions.${action.key}`)}
                sx={{
                  color: '#2B1D0E',
                  backgroundColor: GOLD,
                  width: 48,
                  height: 48,
                  '&:hover': { backgroundColor: '#fff' }
                }}
              >
                <Icon icon={action.icon} />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>

      {card.links.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2, mt: 6 }}>
          {card.links.map((link, index) => (
            <Button
              key={index}
              component='a'
              href={link.url}
              target='_blank'
              rel='noopener noreferrer'
              variant='outlined'
              startIcon={<Icon icon={LINK_ICONS[link.type] || LINK_ICONS.other} />}
              sx={{
                justifyContent: 'flex-start',
                borderRadius: 3,
                py: 2.5,
                color: '#2B1D0E',
                borderColor: `${color}55`,
                backgroundColor: '#fff',
                '& .MuiButton-startIcon': { color }
              }}
            >
              <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pick(link, 'label', lang) || t(`cards.linkTypes.${link.type}`)}
              </Box>
            </Button>
          ))}
        </Box>
      ) : null}

      {bio ? (
        <Section title={t(card.kind === 'author' ? 'cards.public.aboutAuthor' : 'cards.public.about')}>
          <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.9, color: 'rgba(43,29,14,0.85)' }}>{bio}</Typography>
        </Section>
      ) : null}

      {card.books.length ? (
        <Section title={t('cards.public.works')}>
          {card.books.map(book => (
            <Box
              key={book.id}
              sx={{
                display: 'flex',
                gap: 4,
                p: 4,
                mb: 3,
                borderRadius: 4,
                backgroundColor: '#fff',
                border: `1px solid ${color}22`
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 108,
                  flexShrink: 0,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: GOLD,
                  background: book.coverUrl
                    ? `center / cover no-repeat url("${book.coverUrl}")`
                    : `linear-gradient(160deg, ${color}, #2B1D0E)`
                }}
              >
                {book.coverUrl ? null : <Icon icon='tabler:book' fontSize='2rem' />}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{pick(book, 'title', lang)}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1.5 }}>
                  <Chip size='small' label={t(`cards.bookFormats.${book.format}`)} />
                  {book.year ? <Chip size='small' variant='outlined' label={book.year} /> : null}
                </Box>
                {book.isbn ? (
                  <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary' }} dir='ltr'>
                    ISBN {book.isbn}
                  </Typography>
                ) : null}
                {pick(book, 'description', lang) ? (
                  <Typography variant='body2' sx={{ mt: 1.5, color: 'rgba(43,29,14,0.8)' }}>
                    {pick(book, 'description', lang)}
                  </Typography>
                ) : null}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 3 }}>
                  {book.storeUrl ? (
                    <Button
                      size='small'
                      variant='contained'
                      component='a'
                      href={book.storeUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      startIcon={<Icon icon='tabler:shopping-cart' />}
                      sx={{ backgroundColor: color, '&:hover': { backgroundColor: color } }}
                    >
                      {t('cards.public.buy')}
                    </Button>
                  ) : null}
                  {card.acceptsRequests ? (
                    <>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setRequest({ kind: 'signed_copy', bookTitle: book.titleEn })}
                        sx={{ color, borderColor: color }}
                      >
                        {t('cards.requestKinds.signed_copy')}
                      </Button>
                      <Button
                        size='small'
                        variant='text'
                        onClick={() => setRequest({ kind: 'dedication', bookTitle: book.titleEn })}
                        sx={{ color }}
                      >
                        {t('cards.requestKinds.dedication')}
                      </Button>
                    </>
                  ) : null}
                </Box>
              </Box>
            </Box>
          ))}
        </Section>
      ) : null}

      {card.events.length ? (
        <Section title={t('cards.public.events')}>
          {[...upcoming, ...past.reverse()].map(event => {
            const done = !isUpcoming(event)

            return (
              <Box
                key={event.id}
                component={Link}
                href={eventUrl(card.slug, event.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  p: 4,
                  mb: 3,
                  borderRadius: 4,
                  textDecoration: 'none',
                  color: 'inherit',
                  backgroundColor: '#fff',
                  border: `1px solid ${color}22`,
                  opacity: done ? 0.65 : 1
                }}
              >
                <Avatar variant='rounded' sx={{ backgroundColor: `${color}1A`, color, width: 48, height: 48 }}>
                  <Icon icon={event.liveUrl ? 'tabler:broadcast' : 'tabler:calendar-event'} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{pick(event, 'title', lang)}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {formatDateTime(event.startsAt, lang)}
                    {pick(event, 'location', lang) ? ` · ${pick(event, 'location', lang)}` : ''}
                  </Typography>
                </Box>
                <Chip
                  size='small'
                  label={t(done ? 'cards.public.ended' : `cards.eventTypes.${event.type}`)}
                  sx={{ backgroundColor: `${color}14`, color }}
                />
              </Box>
            )
          })}
        </Section>
      ) : null}

      {publisher || rights ? (
        <Section title={t('cards.public.publishing')}>
          <Box sx={{ p: 4, borderRadius: 4, backgroundColor: '#fff', border: `1px solid ${color}22` }}>
            {publisher ? (
              <Typography variant='body2'>
                <strong>{t('cards.public.publisher')}:</strong> {publisher}
              </Typography>
            ) : null}
            {rights ? (
              <Typography variant='body2' sx={{ mt: publisher ? 1.5 : 0, color: 'text.secondary' }}>
                {rights}
              </Typography>
            ) : null}
          </Box>
        </Section>
      ) : null}

      {card.newsletterEnabled ? (
        <Box sx={{ mt: 8 }}>
          <SubscribeBox slug={card.slug} color={color} />
        </Box>
      ) : null}

      {card.acceptsRequests ? (
        <RequestDialog
          open={Boolean(request)}
          card={card}
          kind={request?.kind || 'dedication'}
          bookTitle={request?.bookTitle}
          color={color}
          onClose={() => setRequest(null)}
        />
      ) : null}
    </CardFrame>
  )
}

CardPage.getLayout = page => page
CardPage.authGuard = false

export default CardPage
