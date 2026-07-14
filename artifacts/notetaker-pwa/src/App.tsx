import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/login";
import Home from "@/pages/home";

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("raos_token"));

  const handleLogin = (t: string) => setToken(t);
  const handleSignOut = () => {
    localStorage.removeItem("raos_token");
    setToken(null);
  };

  return (
    <>
      {token ? (
        <Home token={token} onSignOut={handleSignOut} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toaster />
    </>
  );
}

export default App;
