// An organization's public profile (`GET /api/public/organizations/{slug}`): name, verified badge, bio,
// follow button, and tabs for its stories, its events and live broadcasts, and its people.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import StoryList from 'src/views/site/StoryList'
import FollowButton from 'src/views/site/FollowButton'
import VerifiedBadge from 'src/views/site/VerifiedBadge'
import BroadcastCard from 'src/views/site/BroadcastCard'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Utils
import { initialOf, serifFont } from 'src/views/site/storyText'

const OrganizationPage = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { user } = useAuth()
  const { slug } = router.query
  const lang = i18n.language

  const [org, setOrg] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | failed
  const [tab, setTab] = useState('stories')

  useEffect(() => {
    if (!slug) return
    setStatus('loading')
    axios
      .get(`/api/public/organizations/${slug}`)
      .then(({ data }) => {
        setOrg(data.data)
        setStatus('ready')
      })
      .catch(err => setStatus(err.response?.status === 404 ? 'missing' : 'failed'))
  }, [slug, user?.id])

  if (status === 'missing' || status === 'failed') {
    return (
      <SiteShell title={t('community.notFound')}>
        <Box sx={{ maxWidth: 680, mx: 'auto', px: 4, py: 24, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: serifFont(lang), fontSize: '2rem', fontWeight: 600, mb: 3 }}>
            {t(status === 'missing' ? 'community.notFound' : 'site.feed.failed')}
          </Typography>
          <Button component={Link} href='/' variant='contained' sx={pillSx}>
            {t('site.backHome')}
          </Button>
        </Box>
      </SiteShell>
    )
  }

  const name = org ? (lang === 'en' ? org.nameEn : org.nameAr) : ''
  const bio = org ? (lang === 'en' ? org.bioEn || org.bioAr : org.bioAr || org.bioEn) : ''
  const canManage = org?.isMember && user?.role === 'tenant_admin'
  const live = org?.broadcasts.filter(event => event.status === 'live').length || 0

  return (
    <SiteShell title={name} description={bio || undefined}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        {status === 'loading' ? (
          <>
            <Skeleton variant='rounded' width={96} height={96} />
            <Skeleton height={48} width='50%' sx={{ mt: 4 }} />
            <Skeleton width='80%' />
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <Avatar variant='rounded' sx={{ width: 96, height: 96, fontSize: '2.4rem', bgcolor: 'primary.main' }}>
                {initialOf(name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography
                  component='h1'
                  sx={{ fontFamily: serifFont(lang), fontSize: { xs: '1.8rem', md: '2.3rem' }, fontWeight: 700 }}
                >
                  {name}
                  <VerifiedBadge verified={org.verified} size='1.6rem' />
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                  <Chip size='small' variant='outlined' label={t(`community.orgTypes.${org.type}`)} />
                  {org.website ? (
                    <Typography
                      component='a'
                      href={org.website}
                      target='_blank'
                      rel='noopener noreferrer nofollow'
                      variant='body2'
                      dir='ltr'
                      sx={{ color: 'text.secondary' }}
                    >
                      {org.website.replace(/^https?:\/\//, '')}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {canManage ? (
                  <Button
                    component={Link}
                    href='/me/organization'
                    variant='outlined'
                    color='secondary'
                    sx={{ borderRadius: 99 }}
                  >
                    {t('community.manageOrg')}
                  </Button>
                ) : null}
                <FollowButton
                  type='organization'
                  id={org.slug}
                  following={org.isFollowing}
                  onChange={result =>
                    setOrg(prev => ({
                      ...prev,
                      isFollowing: result.isFollowing,
                      followersCount: result.followersCount
                    }))
                  }
                />
              </Box>
            </Box>

            {bio ? (
              <Typography sx={{ mt: 5, fontSize: '1.05rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {bio}
              </Typography>
            ) : null}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, mt: 5, color: 'text.secondary' }}>
              <Typography variant='body2'>
                <b>{org.followersCount}</b> {t('community.followers')}
              </Typography>
              <Typography variant='body2'>
                <b>{org.membersCount}</b> {t('community.people')}
              </Typography>
              <Typography variant='body2'>
                <b>{org.storiesCount}</b> {t('community.storiesCount')}
              </Typography>
            </Box>

            <Tabs
              value={tab}
              onChange={(e, value) => setTab(value)}
              variant='scrollable'
              scrollButtons={false}
              sx={{ mt: 8, borderBottom: theme => `1px solid ${theme.palette.divider}` }}
            >
              <Tab value='stories' label={t('community.tabs.stories')} />
              <Tab
                value='broadcasts'
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {t('community.tabs.broadcasts')}
                    {live ? <Chip size='small' color='error' label={t('community.broadcast.status.live')} /> : null}
                  </Box>
                }
              />
              <Tab value='people' label={t('community.tabs.people')} />
            </Tabs>

            {tab === 'stories' ? <StoryList params={{ tenantSlug: org.slug }} /> : null}

            {tab === 'broadcasts' ? (
              org.broadcasts.length ? (
                org.broadcasts.map(event => <BroadcastCard key={event.id} event={event} />)
              ) : (
                <Typography sx={{ color: 'text.secondary', py: 12, textAlign: 'center' }}>
                  {t('community.noBroadcasts')}
                </Typography>
              )
            ) : null}

            {tab === 'people' ? (
              <Box sx={{ pt: 3 }}>
                {org.members.map(member => (
                  <Box
                    key={member.handle}
                    component={Link}
                    href={`/u/${member.handle}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      py: 3,
                      textDecoration: 'none',
                      color: 'inherit',
                      borderBottom: theme => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {initialOf(lang === 'en' ? member.nameEn : member.nameAr)}
                    </Avatar>
                    <Typography sx={{ fontWeight: 500 }}>
                      {lang === 'en' ? member.nameEn : member.nameAr}
                      <VerifiedBadge verified={member.verified} />
                    </Typography>
                    {member.isAdmin ? (
                      <Chip size='small' variant='outlined' label={t('community.roles.tenant_admin')} />
                    ) : null}
                  </Box>
                ))}
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </SiteShell>
  )
}

OrganizationPage.getLayout = page => page
OrganizationPage.authGuard = false

export default OrganizationPage
