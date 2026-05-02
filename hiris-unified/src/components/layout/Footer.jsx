import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="container landing-footer-inner">
        <Link to="/" className="landing-brand" aria-label="HIRIS home">
          <span className="landing-brand-mark">H</span>
          <span>HIRIS</span>
        </Link>
        <div className="landing-footer-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </footer>
  )
}
