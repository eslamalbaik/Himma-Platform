// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { ArticleStatusChip, ComplianceChip, complianceValueColors } from './chips'
import { COMPLIANCE_ITEMS } from './ComplianceDialog'
import CorrectionDialog from './CorrectionDialog'
import VersionCompareDialog from './VersionCompareDialog'

const EDITABLE = ['draft', 'in_review', 'approved', 'rejected']

const Row = ({ label, children }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 1, flexWrap: 'wrap' }}>
    <Typography sx={{ color: 'text.secondary', minWidth: 140 }}>{label}</Typography>
    <Box sx={{ flex: 1 }}>{children}</Box>
  </Box>
)

// Everything recorded about an article: metadata, compliance evidence, decisions, corrections (GOV-04)
// and versions (§6), which can be compared and, while the article is editable, restored.
// `onUpdated(article)` receives the article after a correction or a restore.
const ArticleDetailsDialog = ({ open, article, loading, onClose, onUpdated }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const name = (row, prefix) => localName(row, prefix, lang)
  const sep = lang === 'en' ? ', ' : '، '
  const ability = useContext(AbilityContext)
  const canCorrect = Boolean(ability?.can('manage', 'content')) && article?.status === 'published'
  const canRestore = Boolean(ability?.can('update', 'content')) && EDITABLE.includes(article?.status)

  const [compare, setCompare] = useState(null) // the version to start the comparison from
  const [correcting, setCorrecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorCode, setErrorCode] = useState(null)

  const send = (request, after) => {
    setBusy(true)
    setErrorCode(null)
    request()
      .then(response => {
        after()
        onUpdated?.(response.data.data)
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setBusy(false))
  }

  const correct = values =>
    send(
      () => axios.post(`/api/admin/content/articles/${article.id}/corrections`, values),
      () => setCorrecting(false)
    )

  const restore = version =>
    send(
      () => axios.post(`/api/admin/content/articles/${article.id}/versions/${version}/restore`),
      () => {}
    )

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t('admin.content.details.title')}</DialogTitle>
      <DialogContent>
        {loading || !article ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant='h5' sx={{ mb: 2 }}>
              {article.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
              <ArticleStatusChip status={article.status} />
              <Chip
                size='small'
                variant='outlined'
                label={t(`admin.content.classification.${article.classification}`)}
              />
              <ComplianceChip result={article.complianceResult} />
              {article.isSponsored ? <Chip size='small' color='warning' label={t('admin.content.sponsored')} /> : null}
            </Box>

            {article.reviewNote ? (
              <Alert severity='warning' sx={{ mb: 3 }}>
                <strong>{t('admin.content.details.reviewNote')}:</strong> {article.reviewNote}
              </Alert>
            ) : null}
            {article.withdrawalReason ? (
              <Alert severity='error' sx={{ mb: 3 }}>
                <strong>{t('admin.content.details.withdrawalReason')}:</strong> {article.withdrawalReason}
              </Alert>
            ) : null}

            <Row label={t('admin.content.field.authorName')}>{article.authorName}</Row>
            <Row label={t('admin.content.field.language')}>{t(`language.${article.language}`)}</Row>
            <Row label={t('admin.content.field.section')}>
              {article.sectionId
                ? `${name(article, 'sectionName')} · ${t(`admin.magazine.axis.${article.axis}`)}`
                : t('admin.content.none')}
            </Row>
            <Row label={t('admin.content.field.issue')}>{article.issueNumber ?? t('admin.content.none')}</Row>
            {article.tenantId ? <Row label={t('admin.content.field.tenant')}>{name(article, 'tenantName')}</Row> : null}
            <Row label={t('admin.content.field.audiences')}>
              {(article.audiences || []).map(value => t(`admin.content.audience.${value}`)).join(sep) ||
                t('admin.content.none')}
            </Row>
            <Row label={t('admin.content.field.tags')}>
              {(article.tags || []).map(tag => name(tag, 'name')).join(sep) || t('admin.content.none')}
            </Row>
            <Row label={t('admin.content.field.source')}>{article.source || t('admin.content.none')}</Row>
            <Row label={t('admin.content.field.rightsNote')}>{article.rightsNote || t('admin.content.none')}</Row>
            {article.publishedAt ? (
              <Row label={t('admin.content.details.publishedAt')}>{formatDate(article.publishedAt, lang)}</Row>
            ) : null}
            {article.reviewerNameAr || article.reviewerNameEn ? (
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1 }}>
                {t('admin.content.details.reviewedBy', { name: name(article, 'reviewerName') })}
              </Typography>
            ) : null}

            {article.complianceChecks ? (
              <>
                <Divider sx={{ my: 4 }} />
                <Typography variant='h6' sx={{ mb: 2 }}>
                  {t('admin.content.compliance.title')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {COMPLIANCE_ITEMS.map(item => (
                    <Chip
                      key={item}
                      size='small'
                      variant='tonal'
                      color={complianceValueColors[article.complianceChecks[item]] || 'default'}
                      label={`${t(`admin.content.compliance.item.${item}`)}: ${t(
                        `admin.content.compliance.value.${article.complianceChecks[item]}`
                      )}`}
                    />
                  ))}
                </Box>
              </>
            ) : null}

            {article.corrections?.length || canCorrect ? (
              <>
                <Divider sx={{ my: 4 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Typography variant='h6' sx={{ flexGrow: 1 }}>
                    {t('admin.content.corrections.title')}
                  </Typography>
                  {canCorrect ? (
                    <Button size='small' variant='tonal' onClick={() => setCorrecting(true)}>
                      {t('admin.content.corrections.add')}
                    </Button>
                  ) : null}
                </Box>
                {article.corrections?.length ? (
                  article.corrections.map(c => (
                    <Alert key={c.id} severity='info' icon={false} sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {t(`admin.content.corrections.kind.${c.kind}`)} · {formatDate(c.createdAt, lang)}
                        {c.version ? ` · ${t('admin.content.details.version', { n: c.version })}` : ''}
                      </Typography>
                      <Typography dir='auto'>{c.note}</Typography>
                      {c.correctorNameAr || c.correctorNameEn ? (
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                          {t('admin.content.details.editedBy', { name: name(c, 'correctorName') })}
                        </Typography>
                      ) : null}
                    </Alert>
                  ))
                ) : (
                  <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                    {t('admin.content.corrections.none')}
                  </Typography>
                )}
              </>
            ) : null}

            <Divider sx={{ my: 4 }} />
            {article.summary ? (
              <Typography sx={{ fontWeight: 500, mb: 2 }} dir='auto'>
                {article.summary}
              </Typography>
            ) : null}
            <Typography sx={{ whiteSpace: 'pre-line' }} dir='auto'>
              {article.body}
            </Typography>

            {article.versions?.length ? (
              <>
                <Divider sx={{ my: 4 }} />
                <Typography variant='h6' sx={{ mb: 2 }}>
                  {t('admin.content.details.versions')}
                </Typography>
                {errorCode && !correcting ? (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {t(`errors.${errorCode}`)}
                  </Alert>
                ) : null}
                {article.versions.map(version => (
                  <Box key={version.version} sx={{ display: 'flex', gap: 2, py: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 500 }}>
                      {t('admin.content.details.version', { n: version.version })}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {formatDate(version.createdAt, lang)}
                      {version.editorNameAr || version.editorNameEn
                        ? ` · ${t('admin.content.details.editedBy', { name: name(version, 'editorName') })}`
                        : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, ms: 'auto' }}>
                      <Button size='small' onClick={() => setCompare(version.version)}>
                        {t('admin.content.versions.compare')}
                      </Button>
                      {canRestore && version.version !== article.versions[article.versions.length - 1].version ? (
                        <Button size='small' color='warning' disabled={busy} onClick={() => restore(version.version)}>
                          {t('admin.content.versions.restore')}
                        </Button>
                      ) : null}
                    </Box>
                    <Typography sx={{ flexBasis: '100%' }} dir='auto'>
                      {version.title}
                    </Typography>
                  </Box>
                ))}
              </>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>
      {article && compare !== null ? (
        <VersionCompareDialog open article={article} initialVersion={compare} onClose={() => setCompare(null)} />
      ) : null}
      <CorrectionDialog
        open={correcting}
        article={article}
        submitting={busy}
        errorCode={correcting ? errorCode : null}
        onSubmit={correct}
        onClose={() => setCorrecting(false)}
      />
    </Dialog>
  )
}

export default ArticleDetailsDialog
