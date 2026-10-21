import { useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router";
import { Footer, Header } from "./components/Chrome";
import { StoreProvider } from "./lib/store";
import { NotFound } from "./pages/Content";
import { About, HowItWorks, Privacy, Terms } from "./pages/Info";
import { Home } from "./pages/Home";
import { MyPeople } from "./pages/MyPeople";
import { Trending } from "./pages/Trending";

function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="mx-auto grid max-w-[1280px] gap-5 px-4 pb-10 pt-5 sm:px-5">
      <Header />
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="app" element={<MyPeople />} />
          <Route path="trending" element={<Trending />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
