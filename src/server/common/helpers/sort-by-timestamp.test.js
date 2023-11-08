import { sortByTimestamp } from '~/src/server/common/helpers/sort-by-timestamp'
import { productsFixture } from '~/src/__fixtures__/products'

describe('#sortByTimestamp', () => {
  test('Should provide "desc" sorting by default', () => {
    expect(productsFixture.sort(sortByTimestamp())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ timestamp: '2023-04-14T14:40:02.242Z' }),
        expect.objectContaining({ timestamp: '2023-02-10T09:41:02.242Z' }),
        expect.objectContaining({ timestamp: '2022-01-17T11:40:02.242Z' })
      ])
    )
  })

  test('Should provide "desc" sorting with "desc" argument', () => {
    expect(productsFixture.sort(sortByTimestamp('desc'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ timestamp: '2023-04-14T14:40:02.242Z' }),
        expect.objectContaining({ timestamp: '2023-02-10T09:41:02.242Z' }),
        expect.objectContaining({ timestamp: '2022-01-17T11:40:02.242Z' })
      ])
    )
  })

  test('Should provide "asc" sorting with "asc" argument', () => {
    expect(productsFixture.sort(sortByTimestamp('asc'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ timestamp: '2022-01-17T11:40:02.242Z' }),
        expect.objectContaining({ timestamp: '2023-02-10T09:41:02.242Z' }),
        expect.objectContaining({ timestamp: '2023-04-14T14:40:02.242Z' })
      ])
    )
  })
})
