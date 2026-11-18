import ArticlesList from 'src/views/admin/content/ArticlesList'

// The magazine's stories (القصص): articles of kind `story`, with the same review workflow as any article.
const StoriesPage = () => (
  <ArticlesList
    titleKey='admin.magazine.stories.title'
    subtitleKey='admin.magazine.stories.subtitle'
    fixedKind='story'
  />
)

StoriesPage.acl = { action: 'read', subject: 'content' }

export default StoriesPage
