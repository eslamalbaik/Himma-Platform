// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import { RankTable } from 'src/views/admin/reports/parts'

const RESULT_COLORS = { pass: 'success', warn: 'warning', fail: 'error' }
const OVERALL_COLORS = { ready: 'success', needs_human_review: 'warning', needs_edits: 'error' }

// What a writer-assistant suggestion can be applied to (AI-P-02 "what was edited").
const APPLY_FIELDS = {
  writer_assistant: ['title', 'subtitle', 'summary', 'language', 'tags', 'section', 'questions'],
  editor_report: ['recommendation'],
  compliance_detection: ['sources', 'personal_data', 'rights', 'sponsored_label'],
  smart_reviewer: ['revised'],
  issue_builder: ['nominations', 'draft']
}

const Section = ({ title, children }) => (
  <Box sx={{ mb: 5 }}>
    <Typography variant='h6' sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Box>
)

const List = ({ items }) => {
  const { t } = useTranslation()

  return items?.length ? (
    <Box component='ul' sx={{ m: 0, ps: 5 }}>
      {items.map((item, i) => (
        <Typography component='li' key={i} sx={{ mb: 1 }}>
          {item}
        </Typography>
      ))}
    </Box>
  ) : (
    <Typography variant='body2' sx={{ color: 'text.disabled' }}>
      {t('admin.ai.nothingFound')}
    </Typography>
  )
}

const WriterAssistant = ({ result, sections }) => {
  const { t, i18n } = useTranslation()
  const section = sections.find(s => s.id === result.sectionId)

  return (
    <>
      <Section title={t('admin.ai.result.titles')}>
        <List items={result.titles} />
        <Typography sx={{ mt: 2 }}>
          <strong>{t('admin.ai.result.subtitle')}:</strong> {result.subtitle}
        </Typography>
      </Section>
      <Section title={t('admin.ai.result.summary')}>
        <Typography>{result.summary}</Typography>
      </Section>
      <Section title={t('admin.ai.result.languageFixes')}>
        <RankTable
          columns={[
            { key: 'original', label: t('admin.ai.result.original') },
            { key: 'suggestion', label: t('admin.ai.result.suggestion') },
            { key: 'reason', label: t('admin.ai.result.reason') }
          ]}
          rows={result.languageFixes || []}
        />
      </Section>
      <Section title={t('admin.ai.result.tagsAndSection')}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          {(result.tags || []).map(tag => (
            <CustomChip key={tag} rounded size='small' skin='light' label={tag} />
          ))}
        </Box>
        <Typography>
          <strong>{t('admin.ai.result.section')}:</strong>{' '}
          {section ? (i18n.language === 'en' ? section.nameEn : section.nameAr) : t('admin.ai.result.noSection')}
        </Typography>
        <Typography sx={{ mt: 1 }}>
          <strong>{t('admin.ai.result.readingTime')}:</strong>{' '}
          {t('admin.ai.result.minutes', { count: result.readingMinutes })}
        </Typography>
      </Section>
      <Section title={t('admin.ai.result.discussionQuestions')}>
        <List items={result.discussionQuestions} />
      </Section>
    </>
  )
}

const SmartReviewer = ({ result }) => {
  const { t } = useTranslation()

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Typography variant='h6'>{t('admin.ai.result.overall')}</Typography>
        <CustomChip
          rounded
          skin='light'
          color={OVERALL_COLORS[result.result]}
          label={t(`admin.ai.result.reviewResult.${result.result}`)}
        />
      </Box>
      <Typography sx={{ mb: 4 }}>{result.summary}</Typography>
      <RankTable
        columns={[
          { key: 'item', label: t('admin.ai.result.item'), render: row => t(`admin.ai.reviewItem.${row.item}`) },
          {
            key: 'result',
            label: t('admin.ai.result.check'),
            render: row => (
              <CustomChip
                rounded
                size='small'
                skin='light'
                color={RESULT_COLORS[row.result]}
                label={t(`admin.ai.result.check_${row.result}`)}
              />
            )
          },
          { key: 'note', label: t('admin.ai.result.note') }
        ]}
        rows={(result.items || []).map(row => ({ ...row, id: row.item }))}
      />
    </>
  )
}

const ComplianceDetection = ({ result }) => {
  const { t } = useTranslation()

  return (
    <>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
        <CustomChip rounded skin='light' color='info' label={t(`admin.ai.contentType.${result.contentType}`)} />
        <CustomChip
          rounded
          skin='light'
          color={result.sponsored?.detected ? 'warning' : 'success'}
          label={t(result.sponsored?.detected ? 'admin.ai.result.sponsoredFound' : 'admin.ai.result.sponsoredNone')}
        />
      </Box>
      {result.sponsored?.detected ? (
        <Section title={t('admin.ai.result.sponsoredEvidence')}>
          <List items={result.sponsored.evidence} />
        </Section>
      ) : null}
      <Section title={t('admin.ai.result.claims')}>
        <List items={(result.claimsNeedingSource || []).map(c => `«${c.quote}» — ${c.reason}`)} />
      </Section>
      <Section title={t('admin.ai.result.personalData')}>
        <List items={(result.personalData || []).map(c => `«${c.quote}» — ${c.kind}`)} />
      </Section>
      <Section title={t('admin.ai.result.mediaRights')}>
        <List items={(result.mediaNeedingRights || []).map(c => `${c.reference} — ${c.reason}`)} />
      </Section>
    </>
  )
}

const EditorReport = ({ result }) => {
  const { t } = useTranslation()

  return (
    <>
      <Section title={t('admin.ai.result.quality')}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant='h3'>{result.qualityScore}</Typography>
          <Typography sx={{ color: 'text.secondary' }}>/ 100</Typography>
        </Box>
        <LinearProgress variant='determinate' value={result.qualityScore} sx={{ height: 8, mt: 2, maxWidth: 360 }} />
      </Section>
      <Section title={t('admin.ai.result.strengths')}>
        <List items={result.strengths} />
      </Section>
      <Section title={t('admin.ai.result.improvements')}>
        <List items={result.improvements} />
      </Section>
      <Section title={t('admin.ai.result.recommendation')}>
        <Typography>{result.recommendation}</Typography>
      </Section>
    </>
  )
}

const IssueBuilder = ({ result, articles }) => {
  const { t, i18n } = useTranslation()
  const title = id => articles.find(a => a.id === id)?.title || id

  return (
    <>
      <Section title={t('admin.ai.result.nominations')}>
        <RankTable
          columns={[
            {
              key: 'category',
              label: t('admin.ai.result.category'),
              render: row => t(`admin.ai.issueCategory.${row.category}`)
            },
            { key: 'article', label: t('admin.ai.result.article'), render: row => title(row.articleId) },
            { key: 'reason', label: t('admin.ai.result.reason') }
          ]}
          rows={(result.nominations || []).map(row => ({ ...row, id: row.category }))}
        />
      </Section>
      <Section title={t('admin.ai.result.draft')}>
        <Typography sx={{ mb: 1 }}>
          <strong>{t('admin.ai.result.theme')}:</strong>{' '}
          {i18n.language === 'en' ? result.draft?.themeEn : result.draft?.themeAr}
        </Typography>
        <Typography sx={{ mb: 3 }}>
          {i18n.language === 'en' ? result.draft?.editorialNoteEn : result.draft?.editorialNoteAr}
        </Typography>
        <List items={(result.draft?.articleIds || []).map(title)} />
      </Section>
    </>
  )
}

// The answer of one AI Center tool, with "what I applied" for the usage log.
const ResultView = ({ tool, usage, result, articles = [], sections = [], canApply, onApplied }) => {
  const { t } = useTranslation()
  const [fields, setFields] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!result) {
    return <Alert severity='info'>{t('admin.ai.notKept')}</Alert>
  }

  const apply = () => {
    setSaving(true)
    setError(null)
    axios
      .post(`/api/admin/ai/usages/${usage.id}/applied`, { fields })
      .then(response => {
        setFields([])
        onApplied(response.data.data)
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSaving(false))
  }

  const body = {
    writer_assistant: <WriterAssistant result={result} sections={sections} />,
    smart_reviewer: <SmartReviewer result={result} />,
    compliance_detection: <ComplianceDetection result={result} />,
    editor_report: <EditorReport result={result} />,
    issue_builder: <IssueBuilder result={result} articles={articles} />
  }[tool]

  return (
    <Card>
      <CardHeader
        title={t(`admin.ai.tool.${tool}`)}
        subheader={usage.articleTitle || usage.subject || ''}
        avatar={<Icon icon='tabler:robot' fontSize='1.75rem' />}
      />
      <CardContent>
        <Alert severity='info' sx={{ mb: 5 }}>
          {t('admin.ai.adviceOnly')}
        </Alert>
        {body}
        {canApply && usage.status === 'completed' ? (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant='h6' sx={{ mb: 1 }}>
              {t('admin.ai.applyTitle')}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
              {t('admin.ai.applyHelp')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4 }}>
              {APPLY_FIELDS[tool].map(field => (
                <FormControlLabel
                  key={field}
                  control={
                    <Checkbox
                      checked={fields.includes(field) || (usage.appliedFields || []).includes(field)}
                      disabled={(usage.appliedFields || []).includes(field)}
                      onChange={e => setFields(e.target.checked ? [...fields, field] : fields.filter(f => f !== field))}
                    />
                  }
                  label={t(`admin.ai.applyField.${field}`)}
                />
              ))}
            </Box>
            {error ? (
              <Alert severity='error' sx={{ my: 2 }}>
                {t(`errors.${error}`)}
              </Alert>
            ) : null}
            <Button variant='tonal' onClick={apply} disabled={saving || fields.length === 0} sx={{ mt: 2 }}>
              {t('admin.ai.applySave')}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default ResultView
