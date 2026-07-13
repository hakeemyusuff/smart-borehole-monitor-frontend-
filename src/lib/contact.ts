// Central mailto used by every "Request access" CTA in the app.
// Access to BoreSense is invitation-only — visitors ask for a seeded
// demo account rather than self-registering into an empty app.
const CONTACT_EMAIL = "hakeemyusuff19@gmail.com"
const SUBJECT = "BoreSense demo access request"
const BODY = `Hi,

I'd like to try out BoreSense. Could you set me up with a demo account?

Thanks,`

export const REQUEST_ACCESS_MAILTO =
  `mailto:${CONTACT_EMAIL}` +
  `?subject=${encodeURIComponent(SUBJECT)}` +
  `&body=${encodeURIComponent(BODY)}`
