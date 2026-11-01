// The story text editor, Medium-style. The text is a list of blocks (paragraph, subheading, quote, picture,
// video). A round "+" appears beside the empty line you are on: it adds a picture, a video, a subheading
// or a quote. Selecting words shows a small bar over them: bold, italic, link, subheading, quote.
// The value stays the plain text described in storyText.js, so nothing changes on the server.

// ** React Imports
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Utils
import { fromBlocks, ink, serifFont, toBlocks, videoEmbed } from 'src/views/site/storyText'

let nextKey = 0
const withKey = block => ({ ...block, key: ++nextKey })
const emptyParagraph = () => withKey({ type: 'paragraph', text: '' })

const parse = value => {
  const blocks = toBlocks(value).map(withKey)

  return blocks.length ? blocks : [emptyParagraph()]
}

// A text block never holds a blank line (that would split it on the next load); Shift+Enter makes a line break.
const cleanText = text => text.replace(/\n\s*\n+/g, '\n')

// Where the characters at `index` of a textarea are drawn, found by copying the text into a hidden twin.
const caretBox = (el, index) => {
  const style = window.getComputedStyle(el)
  const twin = document.createElement('div')
  ;[
    'direction',
    'boxSizing',
    'width',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft'
  ].forEach(name => (twin.style[name] = style[name]))
  twin.style.cssText +=
    ';position:absolute;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;top:0;left:0'
  twin.textContent = el.value.slice(0, index)
  const mark = document.createElement('span')
  mark.textContent = el.value.slice(index) || '.'
  twin.appendChild(mark)
  document.body.appendChild(twin)
  const box = { top: mark.offsetTop, left: mark.offsetLeft, height: parseFloat(style.lineHeight) || 24 }
  document.body.removeChild(twin)

  return box
}

const Svg = ({ children }) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    {children}
  </svg>
)
const ImageIcon = () => (
  <Svg>
    <rect x='3' y='4' width='18' height='16' rx='2' />
    <circle cx='9' cy='10' r='1.5' />
    <path d='m21 16-5-5-9 9' />
  </Svg>
)
const VideoIcon = () => (
  <Svg>
    <rect x='3' y='5' width='18' height='14' rx='3' />
    <path d='m10 9 5 3-5 3z' />
  </Svg>
)

const toolSx = { width: 36, height: 36, border: theme => `1px solid ${theme.palette.divider}`, color: 'text.secondary' }

const StoryEditor = ({ value, onChange, language, disabled }) => {
  const { t } = useTranslation()
  const font = serifFont(language)
  const [blocks, setBlocks] = useState(() => parse(value))
  const [focused, setFocused] = useState(null)
  const [open, setOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selection, setSelection] = useState(null)
  const [linkUrl, setLinkUrl] = useState(null)

  const fields = useRef({})
  const pending = useRef(null)
  const fileInput = useRef(null)
  const insertAt = useRef(null)

  const commit = useCallback(
    next => {
      setBlocks(next)
      onChange(fromBlocks(next))
    },
    [onChange]
  )

  // After a change the cursor goes where the editing action asked.
  useLayoutEffect(() => {
    if (!pending.current) return
    const { key, start, end } = pending.current
    pending.current = null
    const el = fields.current[key]
    if (!el) return
    el.focus()
    const from = start === 'end' ? el.value.length : start
    el.setSelectionRange(from, end === undefined ? from : end)
  })

  useEffect(() => {
    setOpen(false)
    setVideoUrl(null)
  }, [focused])

  const update = (key, patch) => commit(blocks.map(b => (b.key === key ? { ...b, ...patch } : b)))
  const indexOf = key => blocks.findIndex(b => b.key === key)

  const onKeyDown = (e, block) => {
    const el = e.target
    const i = indexOf(block.key)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      const before = el.value.slice(0, el.selectionStart)
      const after = el.value.slice(el.selectionEnd)
      const fresh = withKey({ type: 'paragraph', text: after })
      const next = [...blocks]
      next[i] = { ...block, text: before }
      next.splice(i + 1, 0, fresh)
      pending.current = { key: fresh.key, start: 0 }
      commit(next)
    } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (block.type !== 'paragraph') {
        e.preventDefault()
        pending.current = { key: block.key, start: 0 }
        update(block.key, { type: 'paragraph' })
      } else if (i > 0) {
        const prev = blocks[i - 1]
        e.preventDefault()
        const next = blocks.filter(b => b.key !== block.key)
        if (prev.text !== undefined) {
          pending.current = { key: prev.key, start: (prev.text || '').length }
          next[i - 1] = { ...prev, text: (prev.text || '') + block.text }
        } else if (block.text) {
          return
        } else {
          pending.current = { key: next[i - 2]?.key ?? next[0]?.key, start: 'end' }
        }
        commit(next.length ? next : [emptyParagraph()])
      }
    }
  }

  // Replaces the empty paragraph you are on with a picture or video and leaves a line below it.
  const insertMedia = media => {
    const key = insertAt.current ?? focused
    const i = indexOf(key)
    const next = [...blocks]
    const added = withKey(media)
    const target = next[i]
    const tail = next[i + 1]
    const spare = tail && tail.type === 'paragraph' && !tail.text ? null : emptyParagraph()
    if (target && target.type === 'paragraph' && !target.text) next.splice(i, 1, added)
    else next.splice(i + 1, 0, added)
    if (spare) next.splice(next.indexOf(added) + 1, 0, spare)
    const caret = spare || tail
    if (caret) pending.current = { key: caret.key, start: 0 }
    commit(next)
    setOpen(false)
    setVideoUrl(null)
  }

  const upload = async file => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await axios.post('/api/me/media', form)
      // Keep the address relative so the story works on any domain.
      insertMedia({ type: 'image', alt: '', url: new URL(data.data.url, window.location.origin).pathname })
    } catch (err) {
      toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`))
    } finally {
      setUploading(false)
    }
  }

  const addVideo = () => {
    const url = (videoUrl || '').trim()
    if (!videoEmbed(url)) {
      toast.error(t('errors.invalid_video'))

      return
    }
    insertMedia({ type: 'video', url })
  }

  // The bar over selected words.
  const readSelection = (el, block) => {
    if (el.selectionStart === el.selectionEnd) {
      setSelection(null)
      setLinkUrl(null)

      return
    }
    const box = caretBox(el, el.selectionStart)
    setSelection({ key: block.key, top: el.offsetTop + box.top, left: el.offsetLeft + box.left })
  }

  const wrap = (block, mark) => {
    const el = fields.current[block.key]
    const { selectionStart: s, selectionEnd: e, value: text } = el
    const m = mark.length
    const wrapped =
      text.slice(s - m, s) === mark && text.slice(e, e + m) === mark && !(mark === '*' && text[s - 2] === '*')
    const next = wrapped
      ? text.slice(0, s - m) + text.slice(s, e) + text.slice(e + m)
      : text.slice(0, s) + mark + text.slice(s, e) + mark + text.slice(e)
    const shift = wrapped ? -m : m
    pending.current = { key: block.key, start: s + shift, end: e + shift }
    update(block.key, { text: next })
    setSelection(null)
  }

  const link = block => {
    const url = (linkUrl || '').trim()
    if (!/^(https?:\/\/|\/(?!\/))\S+$/.test(url)) {
      toast.error(t('errors.invalid_link'))

      return
    }
    const el = fields.current[block.key]
    const { selectionStart: s, selectionEnd: e, value: text } = el
    pending.current = { key: block.key, start: 'end' }
    update(block.key, { text: `${text.slice(0, s)}[${text.slice(s, e)}](${url})${text.slice(e)}` })
    setSelection(null)
    setLinkUrl(null)
  }

  const retype = (block, type) => {
    pending.current = { key: block.key, start: 'end' }
    update(block.key, { type: block.type === type ? 'paragraph' : type })
    setSelection(null)
  }

  const remove = block => {
    const next = blocks.filter(b => b.key !== block.key)
    commit(next.length ? next : [emptyParagraph()])
  }

  const textSx = block => ({
    fontFamily: font,
    color: ink,
    alignItems: 'flex-start',
    ...(block.type === 'heading'
      ? { fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700, lineHeight: 1.4, mt: 6 }
      : block.type === 'quote'
      ? {
          fontSize: { xs: '1.2rem', md: '1.35rem' },
          lineHeight: 1.8,
          my: 4,
          paddingInlineStart: 5,
          borderInlineStart: theme => `3px solid ${theme.palette.mode === 'light' ? '#191919' : '#F2F2F2'}`,
          fontStyle: language === 'en' ? 'italic' : 'normal'
        }
      : { fontSize: { xs: '1.125rem', md: '1.25rem' }, lineHeight: language === 'en' ? 1.65 : 1.95 })
  })

  return (
    <Box>
      <input
        ref={fileInput}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        hidden
        onChange={e => {
          upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {blocks.map((block, i) => {
        if (block.type === 'image' || block.type === 'video') {
          return (
            <Box key={block.key} component='figure' sx={{ position: 'relative', m: 0, my: 6 }}>
              {block.type === 'image' ? (
                <>
                  <Box component='img' src={block.url} alt={block.alt} sx={{ width: '100%', display: 'block' }} />
                  <InputBase
                    fullWidth
                    value={block.alt}
                    disabled={disabled}
                    onChange={e => update(block.key, { alt: e.target.value.replace(/[\]\n]/g, ' ') })}
                    placeholder={t('site.write.caption')}
                    inputProps={{ maxLength: 200, style: { textAlign: 'center' } }}
                    sx={{ mt: 2, fontSize: '0.9rem', color: 'text.secondary' }}
                  />
                </>
              ) : (
                <Box sx={{ position: 'relative', pt: '56.25%' }}>
                  <Box
                    component='iframe'
                    src={videoEmbed(block.url)}
                    title='video'
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </Box>
              )}
              {!disabled ? (
                <Tooltip title={t('site.write.remove')}>
                  <IconButton
                    size='small'
                    aria-label={t('site.write.remove')}
                    onClick={() => remove(block)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      insetInlineEnd: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                  >
                    ✕
                  </IconButton>
                </Tooltip>
              ) : null}
            </Box>
          )
        }

        const isEmpty = block.type === 'paragraph' && !block.text
        const showPlus = !disabled && focused === block.key && isEmpty
        const showBar = !disabled && selection?.key === block.key

        return (
          <Box key={block.key} sx={{ position: 'relative' }}>
            {showPlus ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  insetInlineStart: { xs: 0, md: -56 },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  zIndex: 2
                }}
              >
                <IconButton
                  aria-label={t('site.write.add')}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    insertAt.current = block.key
                    setOpen(o => !o)
                    setVideoUrl(null)
                  }}
                  sx={{ ...toolSx, bgcolor: 'background.paper', fontSize: '1.4rem', lineHeight: 1 }}
                >
                  <Box
                    component='span'
                    sx={{
                      display: 'inline-block',
                      transition: 'transform .15s',
                      transform: open ? 'rotate(45deg)' : 'none'
                    }}
                  >
                    +
                  </Box>
                </IconButton>
                {open && videoUrl === null ? (
                  <>
                    <Tooltip title={t('site.write.image')}>
                      <IconButton
                        aria-label={t('site.write.image')}
                        disabled={uploading}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => fileInput.current?.click()}
                        sx={{ ...toolSx, color: 'success.main', borderColor: 'success.main' }}
                      >
                        {uploading ? <CircularProgress size={18} /> : <ImageIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('site.write.video')}>
                      <IconButton
                        aria-label={t('site.write.video')}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setVideoUrl('')}
                        sx={{ ...toolSx, color: 'error.main', borderColor: 'error.main' }}
                      >
                        <VideoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('site.write.heading')}>
                      <IconButton
                        aria-label={t('site.write.heading')}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => retype(block, 'heading')}
                        sx={{ ...toolSx, fontFamily: font, fontWeight: 700, fontSize: '1rem' }}
                      >
                        T
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('site.write.quote')}>
                      <IconButton
                        aria-label={t('site.write.quote')}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => retype(block, 'quote')}
                        sx={{ ...toolSx, fontFamily: 'Georgia, serif', fontSize: '1.6rem', lineHeight: 1, pt: 2 }}
                      >
                        “
                      </IconButton>
                    </Tooltip>
                  </>
                ) : null}
              </Box>
            ) : null}
            {showPlus && open && videoUrl !== null ? (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  position: 'absolute',
                  top: 44,
                  insetInlineStart: { xs: 0, md: -56 },
                  zIndex: 3,
                  bgcolor: 'background.paper',
                  p: 2,
                  boxShadow: 3,
                  borderRadius: 1
                }}
              >
                <InputBase
                  autoFocus
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addVideo()
                    }
                  }}
                  placeholder={t('site.write.videoUrl')}
                  inputProps={{ dir: 'ltr', 'aria-label': t('site.write.videoUrl') }}
                  sx={{ width: { xs: 210, sm: 300 }, px: 2, fontSize: '0.9rem' }}
                />
                <Button size='small' variant='contained' onClick={addVideo}>
                  {t('site.write.addVideo')}
                </Button>
              </Box>
            ) : null}

            {showBar ? (
              <Box
                onMouseDown={e => {
                  if (e.target.tagName !== 'INPUT') e.preventDefault()
                }}
                sx={{
                  position: 'absolute',
                  top: Math.max(selection.top - 48, -48),
                  left: Math.min(Math.max(selection.left - 20, 0), 420),
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: '#191919',
                  color: '#fff',
                  boxShadow: 4,
                  direction: 'ltr'
                }}
              >
                {linkUrl !== null ? (
                  <InputBase
                    autoFocus
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        link(block)
                      } else if (e.key === 'Escape') setLinkUrl(null)
                    }}
                    placeholder='https://'
                    inputProps={{ dir: 'ltr', 'aria-label': t('site.write.linkUrl') }}
                    sx={{ color: '#fff', width: 220, px: 2, fontSize: '0.9rem' }}
                  />
                ) : (
                  [
                    ['B', t('site.write.bold'), () => wrap(block, '**'), { fontWeight: 800 }],
                    [
                      'i',
                      t('site.write.italic'),
                      () => wrap(block, '*'),
                      { fontStyle: 'italic', fontFamily: 'Georgia, serif' }
                    ],
                    ['🔗', t('site.write.link'), () => setLinkUrl(''), { fontSize: '0.85rem' }],
                    ['T', t('site.write.heading'), () => retype(block, 'heading'), { fontWeight: 700 }],
                    [
                      '“',
                      t('site.write.quote'),
                      () => retype(block, 'quote'),
                      { fontFamily: 'Georgia, serif', fontSize: '1.4rem' }
                    ]
                  ].map(([label, title, action, sx]) => (
                    <Tooltip key={title} title={title}>
                      <IconButton
                        size='small'
                        aria-label={title}
                        onClick={action}
                        sx={{ color: '#fff', width: 32, height: 32, ...sx }}
                      >
                        {label}
                      </IconButton>
                    </Tooltip>
                  ))
                )}
              </Box>
            ) : null}

            <InputBase
              fullWidth
              multiline
              readOnly={disabled}
              value={block.text}
              inputRef={el => {
                if (el) fields.current[block.key] = el
                else delete fields.current[block.key]
              }}
              onChange={e => update(block.key, { text: cleanText(e.target.value) })}
              onKeyDown={e => onKeyDown(e, block)}
              onFocus={() => setFocused(block.key)}
              onSelect={e => readSelection(e.target, block)}
              placeholder={i === 0 && blocks.length === 1 ? t('site.write.bodyPlaceholder') : ''}
              inputProps={{ 'aria-label': t('site.write.bodyPlaceholder') }}
              sx={textSx(block)}
            />
          </Box>
        )
      })}
    </Box>
  )
}

export default StoryEditor
