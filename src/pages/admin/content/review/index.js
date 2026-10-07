import ArticlesList from 'src/views/admin/content/ArticlesList'

const ContentReviewPage = () => (
  <ArticlesList
    titleKey='admin.content.titleReview'
    subtitleKey='admin.content.subtitleReview'
    fixedStatus='in_review'
  />
)

ContentReviewPage.acl = { action: 'read', subject: 'content' }

export default ContentReviewPage
