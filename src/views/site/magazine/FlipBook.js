// A page-turning book. `pages` is a list of React nodes designed at PAGE_W x PAGE_H (an even number of them: the
// first is the front cover, the last the back cover). On a wide screen two pages show side by side and a page
// turns in 3D around the spine; on a phone one page shows at a time. Arabic books (`rtl`) have the spine on the
// right and turn from left to right: the whole book is mirrored, and each page's content is mirrored back.
// Keyboard arrows, the buttons, the slider and swipes all turn pages.

// ** React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

export const PAGE_W = 560
export const PAGE_H = 784

const TURN_MS = 850

const Arrow = ({ flip }) => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
  >
    <path d='m9 6 6 6-6 6' />
  </svg>
)

// One face of a page: the content scaled to the book's size, mirrored back inside a mirrored (Arabic) book.
const Face = ({ children, width, height, rtl, shade }) => {
  const scale = width / PAGE_W

  return (
    <Box sx={{ position: 'relative', direction: 'ltr', width, height, overflow: 'hidden', bgcolor: '#fbf8f2' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: PAGE_W,
          height: PAGE_H,
          transformOrigin: '0 0',
          transform: rtl ? `translateX(${width}px) scale(${-scale}, ${scale})` : `scale(${scale})`
        }}
      >
        {children}
      </div>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: shade }} />
    </Box>
  )
}

// Light at the spine's edge, as if the paper curved down into it.
const SHADE_FRONT = 'linear-gradient(to right, rgba(0,0,0,.22) 0, rgba(0,0,0,.05) 5%, rgba(0,0,0,0) 12%)'
const SHADE_BACK = 'linear-gradient(to left, rgba(0,0,0,.22) 0, rgba(0,0,0,.05) 5%, rgba(0,0,0,0) 12%)'

const FlipBook = ({ pages, rtl, cursor, onCursor }) => {
  const { t } = useTranslation()
  const stage = useRef(null)
  const touch = useRef(null)
  const [box, setBox] = useState({ w: 0, single: false })
  const [full, setFull] = useState(false)

  const total = pages.length
  const single = box.single
  const step = single ? 1 : 2

  // The book's size follows the space it has: two pages or one, and never taller than the window.
  useEffect(() => {
    const measure = () => {
      const el = stage.current
      if (!el) return
      const avail = el.clientWidth
      const isSingle = avail < 820
      const maxH = Math.max(420, window.innerHeight - (document.fullscreenElement ? 150 : 250))
      let w = isSingle ? Math.min(avail - 8, PAGE_W) : Math.min(avail / 2 - 16, PAGE_W)
      if ((w * PAGE_H) / PAGE_W > maxH) w = (maxH * PAGE_W) / PAGE_H
      setBox({ w: Math.floor(w), single: isSingle })
    }
    measure()
    const observer = new ResizeObserver(measure)
    stage.current && observer.observe(stage.current)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [full])

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)

    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const clamp = useCallback(value => Math.min(Math.max(value, 0), total - 1), [total])

  // In two-page mode the cursor is always an even page (the right page of the open spread).
  const go = useCallback(
    target => onCursor(single ? clamp(target) : clamp(target - (target % 2))),
    [clamp, onCursor, single]
  )
  const next = useCallback(() => go(cursor + step), [go, cursor, step])
  const prev = useCallback(() => go(cursor - step), [go, cursor, step])

  useEffect(() => {
    if (!single && cursor % 2) onCursor(cursor - 1)
  }, [single, cursor, onCursor])

  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowRight') (rtl ? prev : next)()
      else if (e.key === 'ArrowLeft') (rtl ? next : prev)()
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(total - 1)
    }
    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [rtl, next, prev, go, total])

  const onTouchStart = e => (touch.current = e.touches[0].clientX)
  const onTouchEnd = e => {
    if (touch.current === null) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (Math.abs(dx) < 50) return // Dragging towards the spine side turns forward.
    ;(dx < 0 !== rtl ? next : prev)()
  }

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stage.current?.parentElement?.requestFullscreen?.()
  }

  const W = box.w
  const H = Math.round((W * PAGE_H) / PAGE_W)
  const leaves = total / 2
  const flipped = Math.floor(cursor / 2)

  // The closed book sits on the spine's far half; shift it to the middle while it is closed.
  const shift = single ? 0 : cursor === 0 ? (rtl ? W / 2 : -W / 2) : cursor >= total - 1 ? (rtl ? -W / 2 : W / 2) : 0

  return (
    <Box
      sx={{
        bgcolor: full ? '#15171c' : 'transparent',
        py: full ? 6 : 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: full ? '100vh' : 'auto'
      }}
    >
      <Box
        ref={stage}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: H + 24 }}
      >
        {W ? (
          single ? (
            <Box
              key={cursor}
              sx={{
                width: W,
                height: H,
                boxShadow: '0 18px 44px rgba(0,0,0,.28)',
                animation: 'bookFade .35s ease',
                '@keyframes bookFade': { from: { opacity: 0, transform: 'translateX(12px)' }, to: { opacity: 1 } }
              }}
            >
              <Face width={W} height={H} rtl={false}>
                <Box dir={rtl ? 'rtl' : 'ltr'} sx={{ width: PAGE_W, height: PAGE_H }}>
                  {pages[cursor]}
                </Box>
              </Face>
            </Box>
          ) : (
            <div style={{ transition: `transform ${TURN_MS}ms ease`, transform: `translateX(${shift}px)` }}>
              <div
                style={{
                  position: 'relative',
                  width: W * 2,
                  height: H,
                  perspective: 2600,
                  transform: rtl ? 'scaleX(-1)' : 'none',
                  filter: 'drop-shadow(0 22px 30px rgba(0,0,0,.32))'
                }}
              >
                {Array.from({ length: leaves }, (_, k) => {
                  const isFlipped = k < flipped

                  return (
                    <div
                      key={k}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: W,
                        width: W,
                        height: H,
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'left center',
                        transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                        transition: `transform ${TURN_MS}ms cubic-bezier(.45,.05,.25,1), z-index 0s ${TURN_MS / 2}ms`,
                        zIndex: isFlipped ? k : leaves - k
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                        <Face width={W} height={H} rtl={rtl} shade={SHADE_FRONT}>
                          <Box dir={rtl ? 'rtl' : 'ltr'} sx={{ width: PAGE_W, height: PAGE_H }}>
                            {pages[2 * k]}
                          </Box>
                        </Face>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <Face width={W} height={H} rtl={rtl} shade={SHADE_BACK}>
                          <Box dir={rtl ? 'rtl' : 'ltr'} sx={{ width: PAGE_W, height: PAGE_H }}>
                            {pages[2 * k + 1]}
                          </Box>
                        </Face>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          maxWidth: 620,
          width: '100%',
          mx: 'auto',
          mt: 5,
          px: 3,
          color: full ? '#fff' : 'text.primary'
        }}
      >
        <IconButton aria-label={t('magazine.prev')} onClick={prev} disabled={cursor === 0} color='inherit'>
          <Arrow flip={!rtl} />
        </IconButton>
        <Slider
          size='small'
          min={0}
          max={total - 1}
          step={step}
          value={cursor}
          onChange={(e, value) => go(value)}
          aria-label={t('magazine.slider')}
          sx={{ direction: rtl ? 'rtl' : 'ltr', color: 'primary.main' }}
        />
        <IconButton aria-label={t('magazine.next')} onClick={next} disabled={cursor >= total - 1} color='inherit'>
          <Arrow flip={rtl} />
        </IconButton>
        <IconButton aria-label={t(full ? 'magazine.exitFull' : 'magazine.full')} onClick={toggleFull} color='inherit'>
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            {full ? (
              <path d='M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' />
            ) : (
              <path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' />
            )}
          </svg>
        </IconButton>
      </Box>
      <Typography variant='body2' sx={{ textAlign: 'center', mt: 1, color: full ? 'grey.400' : 'text.secondary' }}>
        {t('magazine.page', { n: cursor + 1, total })} · {t('magazine.hint')}
      </Typography>
    </Box>
  )
}

export default FlipBook
