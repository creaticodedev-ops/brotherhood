import { useI18n } from '../i18n/I18nProvider'
import { useReveal } from './hooks'
import { Footer } from './layout/Footer'
import { Navbar } from './layout/Navbar'
import { OverlayProvider } from './overlays/OverlayProvider'
import { Approach } from './sections/Approach'
import { CapitalSection } from './sections/CapitalSection'
import { FinalCTA } from './sections/FinalCTA'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Intro } from './sections/Intro'
import { LiveNews } from './sections/LiveNews'
import { MarketSection } from './sections/MarketSection'
import { OffersPreview } from './sections/OffersPreview'
import { Reviews } from './sections/Reviews'
import { Services } from './sections/Services'
import { WhyUSBonds } from './sections/WhyUSBonds'
import './landing.css'
import './news.css'
import './reviews.css'

export const LandingPage = () => {
  const { locale } = useI18n()
  useReveal(locale)

  return (
    <OverlayProvider>
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Intro />
        <Services />
        <WhyUSBonds />
        <MarketSection />
        <CapitalSection />
        <OffersPreview />
        <Reviews />
        <HowItWorks />
        <LiveNews />
        <Approach />
        <FinalCTA />
      </main>
      <Footer />
    </OverlayProvider>
  )
}

export default LandingPage
