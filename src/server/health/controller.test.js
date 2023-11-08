import { healthController } from '~/src/server/health/controller'

describe('#healthController', () => {
  const mockViewHandler = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }

  test('Should provide expected response', () => {
    healthController.handler(null, mockViewHandler)

    expect(mockViewHandler.response).toHaveBeenCalledWith({
      message: 'success'
    })
    expect(mockViewHandler.code).toHaveBeenCalledWith(200)
  })
})
