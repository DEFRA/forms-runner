const form = require('./cph.json')

const pages = form.pages.map((page) => {
  const { path, condition: cond } = page
  const rtn = {
    path
  }

  if (Array.isArray(cond)) {
    rtn.condition = cond
      .map((grp) => {
        const expr = grp
          .map((exp) => {
            const { pageId, componentId, operator, valueId } = exp
            const page = form.pages.find((p) => p.id === pageId)
            const component = page?.components.find((c) => c.id === componentId)
            const list = form.lists.find((l) => l.id === component.list)
            const item = list.items.find((i) => i.id === valueId)

            return `"${component?.title}" ${operator} ${typeof item.value === 'string' ? `"${item.value}"` : item.value}`
          })
          .join(' AND ')

        return cond.length === 1 ? expr : `(${expr})`
      })
      .join(' OR ')
  }

  return rtn
})

console.log(pages)
