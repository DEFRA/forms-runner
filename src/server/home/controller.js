const homeController = {
  handler: (request, h) => {
    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'Home'
    })
  }
}

export { homeController }
