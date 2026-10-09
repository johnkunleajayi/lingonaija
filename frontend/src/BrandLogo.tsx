import './brand-logo.css';

/** Display the approved artwork at its original proportions, without the small tagline. */
export function BrandLogo() {
  return <span className="product-logo"><img className="logo-light" src="/brand/lingonaija-logo.png" alt="LingoNaija" width="2172" height="724" /><img className="logo-dark" src="/brand/lingonaija-logo-dark.png" alt="LingoNaija" width="2172" height="724" /></span>;
}
