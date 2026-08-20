import Link from 'next/link'
import '../marketing.css'

export default function ContactPage() {
  return (
    <div className="marketing-site">
      <div className="bg-graphic">
        <svg viewBox="0 0 820 820" xmlns="http://www.w3.org/2000/svg">
          <circle cx="700" cy="650" r="200" fill="#16233f" opacity="0.05"/>
          <circle cx="600" cy="760" r="130" fill="#7a1f2b" opacity="0.06"/>
          <path d="M 560 550 C 680 560, 760 660, 700 780" stroke="#16233f" strokeWidth="1.5" fill="none" opacity="0.1"/>
          <circle cx="640" cy="500" r="3" fill="#7a1f2b" opacity="0.3"/>
          <circle cx="760" cy="580" r="4" fill="#16233f" opacity="0.28"/>
        </svg>
      </div>

      <header>
        <nav>
          <Link href="/" className="logo"><span className="mark">BB</span> BBI Ventures</Link>
          <div className="navlinks">
            <Link href="/">About</Link>
            <Link href="/products">Products</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login" className="login-btn">Login</Link>
          </div>
        </nav>
      </header>

      <main>
        <div className="content">
          <span className="eyebrow">Get In Touch</span>
          <h1>Questions? We&apos;d love to hear from you.</h1>
          <p>Whether you&apos;re a teacher, a principal, or a district administrator curious about our tools, reach out and we&apos;ll get back to you soon.</p>
          <p style={{ marginTop: 24 }}>
            <a href="mailto:info@bbi-ventures.com" style={{ color: 'var(--maroon)', fontWeight: 600, fontSize: '18px', textDecoration: 'none' }}>
              info@bbi-ventures.com
            </a>
          </p>
          <p style={{ marginTop: 18, fontSize: '13.5px' }}>We typically respond within 1–2 business days.</p>
        </div>
      </main>

      <footer>
        <p>info@bbi-ventures.com &nbsp;·&nbsp; © 2026 BBI Ventures</p>
      </footer>
    </div>
  )
}
