import Link from 'next/link'
import '../marketing.css'

export default function HomePage() {
  return (
    <div className="marketing-site">
      <div className="bg-graphic">
        <svg viewBox="0 0 820 820" xmlns="http://www.w3.org/2000/svg">
          <circle cx="620" cy="120" r="260" fill="#16233f" opacity="0.05"/>
          <circle cx="740" cy="300" r="170" fill="#7a1f2b" opacity="0.06"/>
          <path d="M 420 40 C 620 60, 780 220, 760 420 C 745 580, 600 660, 470 610" stroke="#16233f" strokeWidth="1.5" fill="none" opacity="0.12"/>
          <circle cx="500" cy="480" r="4" fill="#7a1f2b" opacity="0.35"/>
          <circle cx="650" cy="150" r="3" fill="#16233f" opacity="0.3"/>
          <circle cx="700" cy="500" r="3" fill="#7a1f2b" opacity="0.25"/>
        </svg>
      </div>

      <header>
        <nav>
          <Link href="/" className="logo"><span className="mark">BB</span> BBI Ventures</Link>
          <div className="navlinks">
            <Link href="/">About</Link>
            <Link href="/products">Products</Link>
            <a href="#contact">Contact</a>
            <Link href="/login" className="login-btn">Login</Link>
          </div>
        </nav>
      </header>

      <main>
        <div className="hero">
          <h1>We build tools that help schools do their best work, one small habit at a time.</h1>
        </div>
      </main>

      <footer id="contact">
        <p>hello@bbi-ventures.com &nbsp;·&nbsp; © 2026 BBI Ventures</p>
      </footer>
    </div>
  )
}
