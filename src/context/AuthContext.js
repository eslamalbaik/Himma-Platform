// ** React Imports
import { createContext, useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Axios
import axios from 'axios'

// ** Config
import authConfig from 'src/configs/auth'

// The session lives in an httpOnly cookie set by /api/auth/login; the browser never sees the token.

// ** Defaults
const defaultProvider = {
  user: null,
  loading: true,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve()
}
const AuthContext = createContext(defaultProvider)

const AuthProvider = ({ children }) => {
  // ** States
  const [user, setUser] = useState(defaultProvider.user)
  const [loading, setLoading] = useState(defaultProvider.loading)

  // ** Hooks
  const router = useRouter()
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await axios.get(authConfig.meEndpoint)
        setUser(response.data.user)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  // errorCallback receives the error code from the API (see public/locales `errors.*`).
  const handleLogin = (params, errorCallback) => {
    axios
      .post(authConfig.loginEndpoint, {
        email: params.email,
        password: params.password,
        remember: Boolean(params.rememberMe)
      })
      .then(response => {
        const returnUrl = router.query.returnUrl
        setUser(response.data.user)
        const redirectURL = returnUrl && returnUrl !== '/' && returnUrl.startsWith('/') ? returnUrl : '/'
        router.replace(redirectURL)
      })
      .catch(err => {
        // A rejected sign-in is expected; only unexpected failures are logged (see SETUP.md troubleshooting).
        if (!err.response) console.warn('Login failed:', err)
        if (errorCallback) errorCallback(err.response?.data?.error?.code || 'network_error')
      })
  }

  const handleLogout = async () => {
    try {
      await axios.post(authConfig.logoutEndpoint, {})
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    login: handleLogin,
    logout: handleLogout
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
