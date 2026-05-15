import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BuilderPage } from './pages/BuilderPage'
import { ExplorePage } from './pages/ExplorePage'
import { PackageDetailPage } from './pages/PackageDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/explore" replace />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="builder/:id" element={<BuilderPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="package/:id" element={<PackageDetailPage />} />
      </Route>
    </Routes>
  )
}

export default App
