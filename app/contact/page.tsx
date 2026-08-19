import Link from 'next/link'
import '../marketing.css'

export default function ContactPage() {
  return (
    <div className="marketing-site">
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
