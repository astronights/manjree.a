// Customers never log in. Each browser gets a random, anonymous device id so
// analytics can count activity per device without any personal data.

const KEY = 'manjrees.device'

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
