// A person's public profile (`GET /api/public/people/{handle}`), like a reader's page on Medium: name,
// verified badge, bio, who they follow, their stories, and a Follow button.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
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
import { pillSx } from 'src/views/site/SiteHeader'

// ** Utils
import { formatDate, initialOf, serifFont } from 'src/views/site/storyText'

const PersonPage = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { handle } = router.query
  const lang = i18n.language

  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | failed

  useEffect(() => {
    if (!handle) return
    setStatus('loading')
    axios
      .get(`/api/public/people/${handle}`)
      .then(({ data }) => {
        setProfile(data.data)
        setStatus('ready')
      })
      .catch(err => setStatus(err.response?.status === 404 ? 'missing' : 'failed'))
  }, [handle])

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

  const name = profile ? (lang === 'en' ? profile.nameEn : profile.nameAr) : ''
  const bio = profile ? (lang === 'en' ? profile.bioEn || profile.bioAr : profile.bioAr || profile.bioEn) : ''
  const org = profile?.organization
  const orgName = org ? (lang === 'en' ? org.nameEn : org.nameAr) : ''

  return (
    <SiteShell title={name} description={bio || undefined}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        {status === 'loading' ? (
          <>
            <Skeleton variant='circular' width={96} height={96} />
            <Skeleton height={48} width='50%' sx={{ mt: 4 }} />
            <Skeleton width='80%' />
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <Avatar sx={{ width: 96, height: 96, fontSize: '2.4rem', bgcolor: 'primary.main' }}>
                {initialOf(name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography
                  component='h1'
                  sx={{ fontFamily: serifFont(lang), fontSize: { xs: '1.8rem', md: '2.3rem' }, fontWeight: 700 }}
                >
                  {name}
                  <VerifiedBadge verified={profile.verified} size='1.6rem' />
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }} dir='ltr' align='start'>
                  @{profile.handle}
                </Typography>
                {org ? (
                  <Typography variant='body2' sx={{ mt: 1 }}>
                    {org.isAdmin ? t('community.adminOf') : t('community.memberOf')}{' '}
                    <Box component={Link} href={`/org/${org.slug}`} sx={{ fontWeight: 600, color: 'inherit' }}>
                      {orgName}
                    </Box>
                    <VerifiedBadge verified={org.verified} size='1rem' />
                  </Typography>
                ) : null}
              </Box>
              <Box>
                {profile.isSelf ? (
                  <Button
                    component={Link}
                    href='/me/profile'
                    variant='outlined'
                    color='secondary'
                    sx={{ borderRadius: 99 }}
                  >
                    {t('community.editProfile')}
                  </Button>
                ) : (
                  <FollowButton
                    type='person'
                    id={profile.handle}
                    following={profile.isFollowing}
                    onChange={result =>
                      setProfile(prev => ({
                        ...prev,
                        isFollowing: result.isFollowing,
                        followersCount: result.followersCount
                      }))
                    }
                  />
                )}
              </Box>
            </Box>

            {bio ? (
              <Typography sx={{ mt: 5, fontSize: '1.05rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {bio}
              </Typography>
            ) : null}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, mt: 5, color: 'text.secondary' }}>
              <Typography variant='body2'>
                <b>{profile.followersCount}</b> {t('community.followers')}
              </Typography>
              <Typography variant='body2'>
                <b>{profile.followingCount}</b> {t('community.followingCount')}
              </Typography>
              <Typography variant='body2'>
                {t('community.joined', { date: formatDate(profile.joinedAt, lang) })}
              </Typography>
            </Box>

            <Divider sx={{ my: 8 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {t('community.storiesBy', { name, count: profile.storiesCount })}
            </Typography>
            <StoryList params={{ authorHandle: profile.handle }} />
          </>
        )}
      </Box>
    </SiteShell>
  )
}

PersonPage.getLayout = page => page
PersonPage.authGuard = false

export default PersonPage
