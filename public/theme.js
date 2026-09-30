// Light/dark mode. A plain (non-module) script loaded in <head> so the saved choice applies before
// first paint; the CSP forbids inline scripts. With no saved choice the page follows the system.
// Any [data-theme-toggle] button flips the theme, and gets aria-pressed="true" while dark.
;(function () {
  var KEY = 'wnb:theme'
  var COLORS = { light: '#ffd23f', dark: '#17150f' }
  var root = document.documentElement
  var system = matchMedia('(prefers-color-scheme: dark)')
  var choice = read()

  function read() {
    try {
      var t = localStorage.getItem(KEY)
      return t === 'light' || t === 'dark' ? t : null
    } catch (e) {
      return null
    }
  }

  function systemTheme() {
    return system.matches ? 'dark' : 'light'
  }

  function apply() {
    if (choice) root.setAttribute('data-theme', choice)
    else root.removeAttribute('data-theme')
    var metas = document.querySelectorAll('meta[name="theme-color"]')
    for (var i = 0; i < metas.length; i++) {
      metas[i].content = COLORS[choice || (metas[i].media.indexOf('dark') >= 0 ? 'dark' : 'light')]
    }
    var dark = (choice || systemTheme()) === 'dark'
    var buttons = document.querySelectorAll('[data-theme-toggle]')
    for (var j = 0; j < buttons.length; j++) buttons[j].setAttribute('aria-pressed', String(dark))
  }

  apply()
  document.addEventListener('DOMContentLoaded', apply)
  system.addEventListener('change', apply)
  addEventListener('storage', function (e) {
    if (e.key === KEY) {
      choice = read()
      apply()
    }
  })

  document.addEventListener('click', function (e) {
    var button = e.target instanceof Element && e.target.closest('[data-theme-toggle]')
    if (!button) return
    var next = (choice || systemTheme()) === 'dark' ? 'light' : 'dark'
    // Picking what the system already shows means "follow the system" again.
    choice = next === systemTheme() ? null : next
    try {
      if (choice) localStorage.setItem(KEY, choice)
      else localStorage.removeItem(KEY)
    } catch (err) {
      /* private mode: the choice lasts for this page only */
    }
    apply()
  })
})()
