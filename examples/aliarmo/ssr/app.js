const Vue = require('../../../dist/vue')
const server = require('express')()
const renderer = require('../../../packages/vue-server-renderer').createRenderer()

server.get('*', (req, res) => {
  const app = new Vue({
    data: {
      url: req.url
    },
    template: `<div>url： {{ url }}</div>`
  })
  console.log(app)
  renderer.renderToString(app, (err, html) => {
    if (err) {
      res.status(500).end('Internal Server Error')
      return
    }
    res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'}); // 设置response编码为utf-8
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Hello</title></head>
        <body>${html}</body>
      </html>
    `)
  })
})

server.listen(8080)
