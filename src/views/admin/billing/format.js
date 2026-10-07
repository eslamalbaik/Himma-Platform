// Shared display helpers for the billing pages.

export const pickLang = i18n => (i18n.language === 'en' ? 'en' : 'ar')

// Name of a record in the current language, e.g. name(row, 'tenantName', lang) → row.tenantNameAr.
export const localName = (row, prefix, lang) =>
  (lang === 'en' ? row?.[`${prefix}En`] : row?.[`${prefix}Ar`]) || row?.[`${prefix}En`] || row?.[`${prefix}Ar`] || '-'

export const formatMoney = (amount, currency, lang) => {
  if (amount === null || amount === undefined) return '-'
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-AE' : 'ar-AE', {
      style: 'currency',
      currency: currency || 'AED'
    }).format(amount)
  } catch {
    return `${Number(amount).toFixed(2)} ${currency || ''}`
  }
}

export const formatDate = (value, lang) =>
  value ? new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG') : '-'

export const statusColors = {
  // subscriptions
  trial: 'info',
  active: 'success',
  past_due: 'warning',
  cancelled: 'secondary',

  // invoices
  unpaid: 'warning',
  paid: 'success',
  void: 'secondary',
  refunded: 'info',

  // payments and refunds
  pending: 'warning',
  succeeded: 'success',
  failed: 'error',
  canceled: 'secondary',
  completed: 'success'
}
