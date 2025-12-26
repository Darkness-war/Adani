import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./ErrorBoundary";

import Home from "./pages/Home";
import Recharge from "./pages/Recharge";
import Refer from "./pages/Refer";
import Mine from "./pages/Mine";
import Login from "./pages/Login";

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recharge"
          element={
            <ProtectedRoute>
              <Recharge />
            </ProtectedRoute>
          }
        />

        <Route
          path="/refer"
          element={
            <ProtectedRoute>
              <Refer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mine"
          element={
            <ProtectedRoute>
              <Mine />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
