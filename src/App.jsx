/* eslint-disable react-refresh/only-export-components */

import { Route, Routes,Navigate } from "react-router-dom";
import "./index.css";
import Mainpg from "./Mainpg";
import Auth from "./Auth";
import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL=import.meta.env.VITE_API_URL;
  useEffect(() => {
    axios
      .get(`${API_URL}/me`, {
        withCredentials:true
      })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [API_URL]);
if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/transactions" /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/transactions"
          element={user ? <Mainpg /> : <Navigate to="/login" />}
        />

        <Route
          path="/login"
          element={user ? <Navigate to="/transactions" /> : <Auth />}
        />
      </Routes>
    </AuthContext.Provider>
  );
}
export default App;
