// Text with **bold**, *italic* and [links](https://...). Built as React nodes, never as HTML.

// ** MUI Imports
import Link from '@mui/material/Link'

const MARKS = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\((?:https?:\/\/|\/(?!\/))[^\s)]+\))/g

const StoryInline = ({ text }) =>
  (text || '').split(MARKS).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return (
        <Link key={i} href={link[2]} target='_blank' rel='noopener noreferrer nofollow' sx={{ color: 'inherit' }}>
          {link[1]}
        </Link>
      )
    }

    return part
  })

export default StoryInline
