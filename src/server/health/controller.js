const healthController = {
  handler: (request, h) => {
    return h.response({ message: 'success' }).code(200)
  }
}

export { healthController }
