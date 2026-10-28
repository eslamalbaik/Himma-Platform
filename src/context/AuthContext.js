// ** React Imports
import { createContext, useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Axios
import axios from 'axios'

// ** Config
import authConfig from 'src/configs/auth'
import getHomeRoute from 'src/layouts/components/acl/getHomeRoute'
import { isMemberRole } from 'src/configs/roles'

// The session lives in an httpOnly cookie set by /api/auth/login; the browser never sees the token.

// ** Defaults
const defaultProvider = {
  user: null,
  loading: true,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  register: () => Promise.resolve(),
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

  // After signing in or up: back to the page that asked for it, else the user's home (site or dashboard).
  const goHome = user => {
    const returnUrl = router.query.returnUrl
    const redirectURL =
      typeof returnUrl === 'string' && returnUrl !== '/' && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : getHomeRoute(user.role)
    router.replace(redirectURL)
  }

  // errorCallback receives the error code from the API (see public/locales `errors.*`).
  const reportError = (err, errorCallback) => {
    // A rejected request is expected; only unexpected failures are logged (see SETUP.md troubleshooting).
    if (!err.response) console.warn('Auth request failed:', err)
    if (errorCallback) errorCallback(err.response?.data?.error?.code || 'network_error')
  }

  // `portal` is the door the user came through: 'member' (/login) or 'admin' (/admin/login).
  const handleLogin = (params, errorCallback) => {
    axios
      .post(authConfig.loginEndpoint, {
        email: params.email,
        password: params.password,
        remember: Boolean(params.rememberMe),
        portal: params.portal || 'admin'
      })
      .then(response => {
        setUser(response.data.user)
        goHome(response.data.user)
      })
      .catch(err => reportError(err, errorCallback))
  }

  // Individuals sign up themselves (organizations send a join request instead).
  const handleRegister = (params, errorCallback) => {
    axios
      .post(authConfig.registerEndpoint, params)
      .then(response => {
        setUser(response.data.user)
        goHome(response.data.user)
      })
      .catch(err => reportError(err, errorCallback))
  }

  const handleLogout = async () => {
    const member = isMemberRole(user?.role)
    try {
      await axios.post(authConfig.logoutEndpoint, {})
    } finally {
      setUser(null)
      router.push(member ? '/' : '/admin/login')
    }
  }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
