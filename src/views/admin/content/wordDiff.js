// Word-level difference between two texts (longest common subsequence), for comparing article versions.
// Returns [{ type: 'same' | 'added' | 'removed', text }]. Very long texts are compared line by line instead,
// so the browser never builds a table of tens of millions of cells.
const MAX_CELLS = 4000000

const tokens = (text, byLine) => (byLine ? (text || '').split(/(\n)/) : (text || '').split(/(\s+)/)).filter(Boolean)

const diffWords = (before, after) => {
  let a = tokens(before, false)
  let b = tokens(after, false)
  if (a.length * b.length > MAX_CELLS) {
    a = tokens(before, true)
    b = tokens(after, true)
  }

  // lcs[i][j] = length of the common subsequence of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const parts = []
  const push = (type, text) => {
    const last = parts[parts.length - 1]
    if (last && last.type === type) last.text += text
    else parts.push({ type, text })
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push('removed', a[i++])
    } else {
      push('added', b[j++])
    }
  }
  while (i < a.length) push('removed', a[i++])
  while (j < b.length) push('added', b[j++])

  return parts
}

export default diffWords
