// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import RulesPage from './pages/RulesPage.jsx'
import SocialPage from './pages/SocialPage.jsx'
import HackMePage from './pages/HackMePage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import CheckPage from './pages/CheckPage.jsx'

function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/faq" element={<FaqPage />} /> 
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/hackme" element={<HackMePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/check" element={<CheckPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App