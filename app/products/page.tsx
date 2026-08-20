import Link from 'next/link'
import '../marketing.css'

export default function ProductsPage() {
  return (
    <div className="marketing-site">
      <div className="bg-graphic pos-bottom-left">
        <svg viewBox="0 0 820 820" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="700" r="260" fill="#16233f" opacity="0.05"/>
          <circle cx="80" cy="520" r="170" fill="#7a1f2b" opacity="0.06"/>
          <path d="M 400 780 C 200 760, 40 600, 60 400" stroke="#16233f" strokeWidth="1.5" fill="none" opacity="0.12"/>
          <circle cx="320" cy="340" r="4" fill="#7a1f2b" opacity="0.35"/>
          <circle cx="170" cy="670" r="3" fill="#16233f" opacity="0.3"/>
          <circle cx="120" cy="320" r="3" fill="#7a1f2b" opacity="0.25"/>
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
          <span className="eyebrow">Our Products</span>
          <h1>Tools that help teachers see real student growth.</h1>
          <p>Built on a classroom-tested approach refined over two decades. Our tools are simple and classroom-ready, built to help teachers save time and focus on what matters most. For K-12 classrooms, tools that improve student achievement — and reflect the hard work behind it.</p>
        </div>
      </main>

      <footer>
        <p>info@bbi-ventures.com &nbsp;·&nbsp; © 2026 BBI Ventures</p>
      </footer>
    </div>
  )
}
