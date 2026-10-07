// What only the Vuexy reference pages (/apps/*, /dashboards/*, /ui/*, ...) need: the Redux store,
// the mocked API (src/@fake-db), Prism for code samples and the full icon set.
// Loaded on demand by _app.js, so Himma pages never download it.

// ** Store Imports
import { store } from 'src/store'
import { Provider } from 'react-redux'

// ** Fake-DB (mocks axios for the demo pages; real /api calls pass through)
import 'src/@fake-db'

// ** Prism (styles stay in _app.js: global CSS can only be imported there)
import 'prismjs'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'

// ** Every tabler icon (Himma pages use the small src/iconify-bundle/icons-himma.js)
import 'src/iconify-bundle/icons-bundle-react'

const DemoProvider = ({ children }) => <Provider store={store}>{children}</Provider>

export default DemoProvider
