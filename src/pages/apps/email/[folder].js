// ** Third Party Imports
import axios from 'axios'
// Demo data must be mocked here too: `next build` runs getStatic* without _app.js
import 'src/@fake-db'

// ** Demo Components Imports
import Email from 'src/views/apps/email/Email'

const EmailApp = ({ folder }) => {
  return <Email folder={folder} />
}

export const getStaticPaths = async () => {
  const res = await axios.get('/apps/email/allEmails')
  const data = await res.data.emails

  const paths = data.map(mail => ({
    params: { folder: mail.folder }
  }))

  return {
    paths,
    fallback: false
  }
}

export const getStaticProps = ({ params }) => {
  return {
    props: {
      folder: params?.folder
    }
  }
}

EmailApp.contentHeightFixed = true

export default EmailApp
