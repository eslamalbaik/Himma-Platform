import ArticlesList from 'src/views/admin/content/ArticlesList'

const WithdrawnContentPage = () => (
  <ArticlesList
    titleKey='admin.content.titleWithdrawn'
    subtitleKey='admin.content.subtitleWithdrawn'
    fixedStatus='withdrawn'
  />
)

WithdrawnContentPage.acl = { action: 'read', subject: 'content' }

export default WithdrawnContentPage
