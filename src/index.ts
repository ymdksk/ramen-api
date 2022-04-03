import { Hono } from 'hono'
import { graphqlServer } from 'hono/graphql-server'
import { prettyJSON } from 'hono/pretty-json'
import { getMimeType } from 'hono/utils/mime'
import { getContentFromKVAsset } from 'hono/utils/cloudflare'
import { getShop, listShops } from '@/app'
import { schema } from '@/graphql-app'

export const app = new Hono()

app.use('*', prettyJSON())

app.get('/', async (c) => {
  return c.json({ message: 'Here is Ramen API' })
})

app.get('/shops', async (c) => {
  const limit = Number(c.req.query('limit') ?? 10)
  const offset = Number(c.req.query('offset') ?? 0)
  const listResult = await listShops({ limit, offset })
  return c.json({
    total_count: listResult.totalCount,
    shops: listResult.shops,
  })
})

app.get('/shops/:id', async (c) => {
  const id = c.req.param('id')
  const shop = await getShop(id)
  if (!shop) {
    return c.json(
      {
        errors: [
          {
            message: `The requested Ramen Shop '${id}' is not found`,
          },
        ],
      },
      404
    )
  }
  return c.json({ shop: shop })
})

app.get('/images/:shop_id/:filename', async (c) => {
  const shopId = c.req.param('shop_id')
  const filename = c.req.param('filename')
  const mimeType = getMimeType(filename)
  const content = await getContentFromKVAsset(`shops/${shopId}/${filename}`)

  if (!content) return c.notFound()

  c.header('Content-Type', mimeType)
  return c.body(content)
})

app.notFound((c) => {
  return c.json(
    {
      errors: [
        {
          message: 'Not found',
        },
      ],
    },
    404
  )
})

app.use('/graphql', graphqlServer({ schema }))

app.fire()
