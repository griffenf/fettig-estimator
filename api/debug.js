export default async function handler(req, res) {
  return res.status(200).json({
    method: req.method,
    body: req.body,
    bodyType: typeof req.body,
    headers: {
      contentType: req.headers['content-type'],
    }
  })
}
