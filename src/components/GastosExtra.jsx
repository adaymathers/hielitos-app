import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const tipos = [
  { value: "retiro", label: "Retiro" },
  { value: "inversion", label: "Inversión" },
  { value: "gasto", label: "Gasto" },
];

const GastosExtra = () => {
  const [monto, setMonto] = useState(0);
  const [tipo, setTipo] = useState("gasto");
  const [comentario, setComentario] = useState("");
  const [usuario, setUsuario] = useState("");
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarGastos = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "gastosExtra"));
    const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGastos(lista);
    setLoading(false);
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!usuario.trim()) return alert("Ingresa el usuario");
    if (!monto || isNaN(monto)) return alert("Monto inválido");
    try {
      await addDoc(collection(db, "gastosExtra"), {
        monto: Number(monto),
        tipo,
        comentario,
        usuario: usuario.trim(),
        fecha: Timestamp.now(),
      });
      setMonto(0);
      setTipo("gasto");
      setComentario("");
      setUsuario("");
      await cargarGastos();
      alert("Gasto registrado");
    } catch (err) {
      alert("Error al guardar gasto extra");
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este gasto extra?")) return;
    try {
      await deleteDoc(doc(db, "gastosExtra", id));
      await cargarGastos();
    } catch (err) {
      alert("Error al eliminar gasto extra");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto" }}>
      <h2>Registro de Gastos Extra</h2>
      <form onSubmit={handleAgregar} style={{ marginBottom: "2rem" }}>
        <input
          type="number"
          placeholder="Monto"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          required
          style={{ width: "30%", marginRight: "1rem" }}
        />
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: "30%", marginRight: "1rem" }}>
          {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Usuario"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          required
          style={{ width: "30%", marginRight: "1rem" }}
        />
        <input
          type="text"
          placeholder="Comentario (opcional)"
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          style={{ width: "100%", marginTop: "0.5rem" }}
        />
        <button type="submit" style={{ marginTop: "0.5rem" }}>Agregar</button>
      </form>
      <h3>Historial de Gastos Extra</h3>
      {loading ? <p>Cargando...</p> : (
        gastos.length === 0 ? <p>No hay gastos registrados.</p> : (
          <ul>
            {gastos.sort((a,b) => b.fecha?.seconds - a.fecha?.seconds).map(g => (
              <li key={g.id} style={{ border: "1px solid #ccc", borderRadius: 6, padding: "0.5rem", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>${g.monto.toFixed(2)}</strong> | <span>{tipos.find(t => t.value === g.tipo)?.label || g.tipo}</span> | <span>{g.usuario}</span> | <span>{g.comentario}</span> | <span>{g.fecha && g.fecha.toDate ? g.fecha.toDate().toLocaleString() : "-"}</span>
                </div>
                <button onClick={() => handleEliminar(g.id)} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Eliminar</button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

export default GastosExtra;
