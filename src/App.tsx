import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Portfolio from './pages/Portfolio'
import ClientDetail from './pages/ClientDetail'
import Experiments from './pages/Experiments'
import About from './pages/About'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Portfolio />} />
          <Route path="client/:clientId" element={<ClientDetail />} />
          <Route path="experiments" element={<Experiments />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
