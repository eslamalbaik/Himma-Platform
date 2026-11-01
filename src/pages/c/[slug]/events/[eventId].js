// Landing page of one card event, e.g. a virtual book launch: the live broadcast, a digital dedication or a
// signed printed copy, the minute-by-minute programme and news by email. Data: GET /api/public/cards/{slug}.

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
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import CardFrame from 'src/views/site/cards/CardFrame'
import CardMissing from 'src/views/site/cards/CardMissing'
import RequestDialog from 'src/views/site/cards/RequestDialog'
import SubscribeBox from 'src/views/site/cards/SubscribeBox'
import useCard from 'src/views/site/cards/useCard'
import { GOLD, formatDateTime, isUpcoming, pick } from 'src/views/site/cards/helpers'

// "18:00" for a programme step: the event's start plus the step's minute.
const stepTime = (startsAt, minute, lang) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { timeStyle: 'short' }).format(
    new Date(new Date(startsAt).getTime() + minute * 60000)
  )

const EventPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const router = useRouter()
  const { slug, eventId } = router.query
  const { card, status } = useCard(slug)
  const [requestKind, setRequestKind] = useState(null)

  const event = card?.events.find(item => item.id === eventId)
  if (status !== 'ready' || !event) return <CardMissing status={status === 'ready' ? 'missing' : status} />

  const color = card.color
  const title = pick(event, 'title', lang)
  const book = card.books.find(item => item.titleEn === event.bookTitle || item.titleAr === event.bookTitle)
  const upcoming = isUpcoming(event)

  return (
    <CardFrame title={title} description={pick(event, 'summary', lang)} color={color}>
      {/* Hero: what, when, and the button to the live broadcast. */}
      <Box
        sx={{
          mt: 2,
          p: { xs: 6, sm: 8 },
          borderRadius: 6,
          color: '#fff',
          background: `linear-gradient(150deg, #2B1D0E 0%, ${color} 100%)`,
          boxShadow: `0 18px 40px ${color}55`
        }}
      >
        <Box
          component={Link}
          href={`/c/${card.slug}/`}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#fff', textDecoration: 'none', mb: 5 }}
        >
          <Avatar src={card.photoUrl || undefined} sx={{ width: 36, height: 36, border: `2px solid ${GOLD}` }}>
            {pick(card, 'name', lang).charAt(0)}
          </Avatar>
          <Typography sx={{ color: '#fff', fontWeight: 600 }}>{pick(card, 'name', lang)}</Typography>
        </Box>
        <Chip
          size='small'
          label={t(`cards.eventTypes.${event.type}`)}
          sx={{
            display: 'flex',
            width: 'fit-content',
            mb: 3,
            backgroundColor: GOLD,
            color: '#2B1D0E',
            fontWeight: 600
          }}
        />
        <Typography component='h1' sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)', mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Icon icon='tabler:calendar-event' fontSize='1.1rem' />
          {formatDateTime(event.startsAt, lang)}
        </Typography>
        {pick(event, 'location', lang) ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Icon icon='tabler:map-pin' fontSize='1.1rem' />
            {pick(event, 'location', lang)}
          </Typography>
        ) : null}
        {pick(event, 'summary', lang) ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', mt: 4, lineHeight: 1.8 }}>
            {pick(event, 'summary', lang)}
          </Typography>
        ) : null}
        {event.liveUrl ? (
          <Button
            component='a'
            href={event.liveUrl}
            target='_blank'
            rel='noopener noreferrer'
            size='large'
            variant='contained'
            startIcon={<Icon icon='tabler:player-play' />}
            sx={{
              mt: 6,
              borderRadius: 99,
              px: 6,
              color: '#2B1D0E',
              backgroundColor: GOLD,
              '&:hover': { backgroundColor: '#fff' }
            }}
          >
            {t(upcoming ? 'cards.event.watchLive' : 'cards.event.watchRecording')}
          </Button>
        ) : null}
      </Box>

      {card.acceptsRequests ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mt: 6 }}>
          {[
            { kind: 'dedication', icon: 'tabler:signature' },
            { kind: 'signed_copy', icon: 'tabler:book' }
          ].map(option => (
            <Box
              key={option.kind}
              component='button'
              type='button'
              onClick={() => setRequestKind(option.kind)}
              sx={{
                p: 5,
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'start',
                font: 'inherit',
                color: 'inherit',
                backgroundColor: '#fff',
                border: `1px solid ${color}33`,
                '&:hover': { borderColor: color }
              }}
            >
              <Avatar variant='rounded' sx={{ backgroundColor: `${color}1A`, color, mb: 3 }}>
                <Icon icon={option.icon} />
              </Avatar>
              <Typography sx={{ fontWeight: 700 }}>{t(`cards.requestKinds.${option.kind}`)}</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1 }}>
                {t(`cards.request.intro.${option.kind}`)}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {event.programme.length ? (
        <Box component='section' sx={{ mt: 8 }}>
          <Typography component='h2' sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 4 }}>
            {t('cards.event.programme')}
          </Typography>
          <Box sx={{ borderInlineStart: `2px solid ${color}44`, paddingInlineStart: '20px' }}>
            {event.programme.map((step, index) => (
              <Box key={index} sx={{ position: 'relative', pb: 5 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    insetInlineStart: -27,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? GOLD : color
                  }}
                />
                <Typography variant='body2' sx={{ color, fontWeight: 600 }} component='div'>
                  <bdi>{stepTime(event.startsAt, step.minute, lang)}</bdi>
                  <Box component='span' sx={{ color: 'text.secondary', fontWeight: 400, mx: 2 }}>
                    {t('cards.event.minute', { minute: step.minute })}
                  </Box>
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{pick(step, 'title', lang)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      {book ? (
        <Box
          sx={{
            mt: 4,
            p: 4,
            borderRadius: 4,
            backgroundColor: '#fff',
            border: `1px solid ${color}22`,
            display: 'flex'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t('cards.event.aboutBook')}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{pick(book, 'title', lang)}</Typography>
            {book.isbn ? (
              <Typography variant='caption' sx={{ color: 'text.secondary' }} dir='ltr'>
                ISBN {book.isbn}
              </Typography>
            ) : null}
          </Box>
          {book.storeUrl ? (
            <Button
              component='a'
              href={book.storeUrl}
              target='_blank'
              rel='noopener noreferrer'
              sx={{ alignSelf: 'center', color }}
              startIcon={<Icon icon='tabler:shopping-cart' />}
            >
              {t('cards.public.buy')}
            </Button>
          ) : null}
        </Box>
      ) : null}

      {card.newsletterEnabled ? (
        <Box sx={{ mt: 8 }}>
          <SubscribeBox slug={card.slug} color={color} />
        </Box>
      ) : null}

      {card.acceptsRequests ? (
        <RequestDialog
          open={Boolean(requestKind)}
          card={card}
          kind={requestKind || 'dedication'}
          bookTitle={book?.titleEn || ''}
          eventId={event.id}
          color={color}
          onClose={() => setRequestKind(null)}
        />
      ) : null}
    </CardFrame>
  )
}

EventPage.getLayout = page => page
EventPage.authGuard = false

export default EventPage
