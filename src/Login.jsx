import { useState } from "react";

export default function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const USERNAME = "adaymathers";
  const PASSWORD = "Aday!997";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === USERNAME && pass === PASSWORD) {
      onLogin(user);
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "300px", margin: "auto", marginTop: "50px" }}>
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Usuario"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        required
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        required
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />
      <button type="submit" style={{ width: "100%", padding: "8px" }}>Entrar</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
