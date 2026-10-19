import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { AuthPage } from "./pages/AuthPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { AssistantPage } from "./pages/AssistantPage";
import { OrganizerPage } from "./pages/OrganizerPage";
import { OrganizerAddEventPage } from "./pages/OrganizerAddEventPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/organizer" element={<OrganizerPage />} />
        <Route path="/organizer/add" element={<OrganizerAddEventPage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Routes>
    </Layout>
  );
}
