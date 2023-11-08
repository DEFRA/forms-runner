global.afterEach(() => {
  // Clear down JSDOM document after each test
  document.getElementsByTagName('html')[0].innerHTML = ''
})
