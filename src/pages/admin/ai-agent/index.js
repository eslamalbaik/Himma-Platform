// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import LinearProgress from '@mui/material/LinearProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import useApiOptions from 'src/hooks/useApiOptions'
import DataTable from 'src/views/admin/billing/DataTable'
import ArticlePicker from 'src/views/admin/ai/ArticlePicker'
import ResultView from 'src/views/admin/ai/ResultView'
import { formatDate, pickLang } from 'src/views/admin/billing/format'

// The AI Center tools (§8.8), with the icon for each.
const TOOLS = {
  writer_assistant: 'tabler:edit',
  smart_reviewer: 'tabler:list-check',
  compliance_detection: 'tabler:shield-check',
  editor_report: 'tabler:file-invoice',
  issue_builder: 'tabler:book'
}

const statusColors = { completed: 'success', refused: 'warning', failed: 'error' }

const thisMonth = () => new Date().toISOString().slice(0, 7)

const AiCenterPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canRun = Boolean(ability?.can('create', 'ai_agent'))
  const canSettings = Boolean(ability?.can('update', 'settings'))
  const sections = useApiOptions('/api/admin/magazine/sections', { enabled: Boolean(ability?.can('read', 'magazine')) })

  const [overview, setOverview] = useState(null)
  const [article, setArticle] = useState(null)
  const [month, setMonth] = useState(thisMonth)
  const [running, setRunning] = useState(null)
  const [error, setError] = useState(null)
  const [output, setOutput] = useState(null) // { tool, usage, result, articles }
  const history = useApiList('/api/admin/ai/usages', { mine: 1 }, { perPage: 10 })

  const loadOverview = () =>
    axios
      .get('/api/admin/ai')
      .then(response => setOverview(response.data.data))
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))

  useEffect(() => {
    loadOverview()
  }, [])

  const run = tool => {
    setRunning(tool)
    setError(null)
    setOutput(null)
    axios
      .post('/api/admin/ai/run', tool === 'issue_builder' ? { tool, month } : { tool, articleId: article?.id }, {
        timeout: 300000
      })
      .then(response => {
        setOutput({ tool, ...response.data.data })
        history.reload()
        loadOverview()
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setRunning(null))
  }

  const openUsage = usage =>
    axios.get(`/api/admin/ai/usages/${usage.id}`).then(response => {
      const data = response.data.data
      setOutput({ tool: data.tool, usage: data, result: data.output, articles: [] })
    })

  const ready = overview?.enabled && overview?.configured

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <CustomAvatar skin='light' variant='rounded' sx={{ width: 48, height: 48 }}>
              <Icon icon='tabler:robot' fontSize='1.75rem' />
            </CustomAvatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant='h4'>{t('admin.ai.title')}</Typography>
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.ai.policy')}</Typography>
            </Box>
            {overview ? (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <CustomChip
                  rounded
                  skin='light'
                  color={ready ? 'success' : 'secondary'}
                  label={t(ready ? 'admin.ai.on' : 'admin.ai.off')}
                />
                <CustomChip rounded skin='light' label={t(`admin.settings.ai.modelName.${overview.model}`)} />
                <CustomChip
                  rounded
                  skin='light'
                  color='info'
                  label={
                    overview.monthlyLimit > 0
                      ? t('admin.ai.usageOfLimit', { used: overview.usedThisMonth, limit: overview.monthlyLimit })
                      : t('admin.ai.usage', { used: overview.usedThisMonth })
                  }
                />
              </Box>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      {overview && !ready ? (
        <Grid item xs={12}>
          <Alert
            severity='warning'
            action={
              canSettings ? (
                <Button component={Link} href='/admin/settings/ai' color='inherit' size='small'>
                  {t('admin.ai.openSettings')}
                </Button>
              ) : null
            }
          >
            {t(overview.enabled ? 'admin.ai.notConfigured' : 'admin.ai.disabled')}
          </Alert>
        </Grid>
      ) : null}

      {canRun ? (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                  <ArticlePicker
                    value={article}
                    onChange={setArticle}
                    label={t('admin.ai.article')}
                    helperText={t('admin.ai.articleHelp')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <CustomTextField
                    fullWidth
                    type='month'
                    label={t('admin.ai.month')}
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    helperText={t('admin.ai.monthHelp')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ) : null}

      {Object.entries(TOOLS).map(([tool, icon]) => {
        const enabled = Boolean(overview?.tools?.[tool])
        const needsArticle = tool !== 'issue_builder'

        return (
          <Grid item xs={12} sm={6} lg={tool === 'issue_builder' ? 12 : 3} key={tool}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: enabled ? 1 : 0.6 }}>
              <CardHeader
                avatar={
                  <CustomAvatar skin='light' variant='rounded'>
                    <Icon icon={icon} />
                  </CustomAvatar>
                }
                title={t(`admin.ai.tool.${tool}`)}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {t(`admin.ai.toolHelp.${tool}`)}
                </Typography>
              </CardContent>
              {canRun ? (
                <CardActions sx={{ px: 5, pb: 5 }}>
                  <Button
                    variant='contained'
                    size='small'
                    disabled={!ready || !enabled || Boolean(running) || (needsArticle && !article)}
                    onClick={() => run(tool)}
                  >
                    {t(enabled ? 'admin.ai.run' : 'admin.ai.toolOff')}
                  </Button>
                </CardActions>
              ) : null}
            </Card>
          </Grid>
        )
      })}

      {running ? (
        <Grid item xs={12}>
          <Alert severity='info' icon={<Icon icon='tabler:robot' />}>
            {t('admin.ai.running', { tool: t(`admin.ai.tool.${running}`) })}
          </Alert>
          <LinearProgress sx={{ mt: 2 }} />
        </Grid>
      ) : null}

      {error ? (
        <Grid item xs={12}>
          <Alert severity='error'>{t(`errors.${error}`)}</Alert>
        </Grid>
      ) : null}

      {output ? (
        <Grid item xs={12}>
          <ResultView
            key={output.usage.id}
            tool={output.tool}
            usage={output.usage}
            result={output.result}
            articles={output.articles}
            sections={sections}
            canApply={canRun}
            onApplied={usage => {
              setOutput({ ...output, usage })
              history.reload()
            }}
          />
        </Grid>
      ) : null}

      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.ai.myHistory')} />
          <CardContent>
            <DataTable
              list={history}
              emptyKey='admin.ai.noHistory'
              onRowClick={openUsage}
              columns={[
                { key: 'createdAt', label: t('admin.reports.date'), render: row => formatDate(row.createdAt, lang) },
                { key: 'tool', label: t('admin.ai.toolLabel'), render: row => t(`admin.ai.tool.${row.tool}`) },
                { key: 'subject', label: t('admin.ai.article'), render: row => row.articleTitle || row.subject || '-' },
                {
                  key: 'status',
                  label: t('admin.ai.statusLabel'),
                  render: row => (
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color={statusColors[row.status]}
                      label={t(`admin.ai.status.${row.status}`)}
                    />
                  )
                },
                {
                  key: 'applied',
                  label: t('admin.ai.appliedLabel'),
                  render: row =>
                    row.appliedFields?.length
                      ? row.appliedFields.map(f => t(`admin.ai.applyField.${f}`, f)).join('، ')
                      : '-'
                }
              ]}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

AiCenterPage.acl = { action: 'read', subject: 'ai_agent' }

export default AiCenterPage
