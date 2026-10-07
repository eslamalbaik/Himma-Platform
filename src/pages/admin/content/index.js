import ArticlesList from 'src/views/admin/content/ArticlesList'

const ContentPage = () => <ArticlesList titleKey='admin.content.titleAll' subtitleKey='admin.content.subtitleAll' />

ContentPage.acl = { action: 'read', subject: 'content' }

export default ContentPage
