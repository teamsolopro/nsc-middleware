const crypto = require('crypto');

function validateWebhook(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return next();

  const signature = req.headers['x-ghl-signature'] || req.headers['x-webhook-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(req.body) // req.body is raw Buffer when using express.raw()
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Parse body for downstream handlers
  req.body = JSON.parse(req.body.toString());
  next();
}

module.exports = { validateWebhook };
