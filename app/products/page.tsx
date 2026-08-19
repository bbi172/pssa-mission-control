import Link from 'next/link'
import '../marketing.css'

export default function ProductsPage() {
  return (
    <div className="marketing-site">
      <header>
        <nav>
          <Link href="/" className="logo"><span className="mark">BB</span> BBI Ventures</Link>
          <div className="navlinks">
            <Link href="/">About</Link>
            <Link href="/products">Products</Link>
            <Link href="/#contact">Contact</Link>
            <Link href="/login" className="login-btn">Login</Link>
          </div>
        </nav>
      </header>

      <main>
        <div className="content">
          <span className="eyebrow">Our Products</span>
          <h1>Tools that help teachers see, and share, real student growth.</h1>
          <p>We&apos;re building simple, classroom-ready tools that help teachers turn everyday learning checks into consistent practice — giving students an encouraging, easy-to-understand picture of their own progress over time.</p>
        </div>
      </main>

      <footer>
        <p>hello@bbi-ventures.com &nbsp;·&nbsp; © 2026 BBI Ventures</p>
      </footer>
    </div>
  )
}
