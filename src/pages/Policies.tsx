import { Link } from 'react-router-dom'
import { shop } from '../config'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-night-800 dark:text-cream-100">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-night-700 dark:text-cream-200">
        {children}
      </div>
    </section>
  )
}

export default function Policies() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Link to="/" className="mt-3 inline-block text-sm text-night-700/85 hover:underline dark:text-cream-300/70">
        ← Back
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-night-800 dark:text-cream-100">
        Shipping, Returns & Policies
      </h1>
      <p className="mt-1 text-sm text-night-700/70 dark:text-cream-300/50">{shop.name} · manjree.online</p>

      <Section title="Shipping">
        <p>We ship from Chennai, India to customers across India and worldwide.</p>
        <p>
          <span className="font-medium text-night-800 dark:text-cream-100">Domestic (India):</span> Delivery typically
          takes 4–7 business days depending on your location and the courier partner.
        </p>
        <p>
          <span className="font-medium text-night-800 dark:text-cream-100">International:</span> Delivery times vary by
          destination, usually 10–21 business days. Customs duties and import taxes are the buyer's responsibility.
        </p>
        <p>
          Shipping charges are calculated based on your location and will be communicated to you at the time of enquiry
          on WhatsApp.
        </p>
      </Section>

      <Section title="Returns & Exchanges">
        <p>
          We want you to love what you receive. If there is a manufacturing defect or if the wrong item was sent, please
          contact us on WhatsApp within <span className="font-medium text-night-800 dark:text-cream-100">48 hours of
          delivery</span> with photos and we will make it right.
        </p>
        <p>
          We do not accept returns or exchanges for change of mind, incorrect size selection, or colour variation due to
          photography or screen settings.
        </p>
        <p>Custom and made-to-order pieces cannot be returned or exchanged.</p>
      </Section>

      <Section title="Cancellations">
        <p>
          Orders can be cancelled before they are dispatched. Once shipped, cancellations are not possible. Contact us
          on WhatsApp as soon as possible if you need to cancel.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For any questions about your order, reach us on WhatsApp — the button is available on every product page.
        </p>
      </Section>
    </main>
  )
}
