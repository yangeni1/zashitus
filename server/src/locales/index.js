import { ru } from './ru.js'

export const locales = {
  ru,
}

export function getLocale(locale = 'ru') {
  return locales[locale] || ru
}
