import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import AgregarReceta from "./components/AgregarReceta";
import ListaDeRecetas from "./components/ListaDeRecetas";
import ReporteProduccion from "./components/ReporteProduccion";
import ReporteVenta from "./components/ReporteVenta";
import OrdenesProduccionGeneral from "./components/OrdenesProduccionGeneral";
import BalanceGeneral from "./components/BalanceGeneral";
import GastosExtra from "./components/GastosExtra";
import GraficasBI from "./components/GraficasBI";

const App = () => {
  const [tabActiva, setTabActiva] = useState("lista");
  const [recetas, setRecetas] = useState([]);

  // Función para recargar recetas desde Firebase
  const obtenerRecetas = async () => {
    const recetasSnapshot = await getDocs(collection(db, "recetas"));
    const recetasList = recetasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRecetas(recetasList);
  };

  useEffect(() => {
    obtenerRecetas();
  }, []);

  return (
        <div className="App">
            {/* Encabezado con balance general siempre visible, balance a la derecha */}
            <div style={{ width: "100%", background: "#fffbe7", borderBottom: "2px solid #f39c12", position: "sticky", top: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "space-between", height: 48 }}>
                <nav style={{ ...estilos.nav, margin: 0, height: 48, flex: 1 }}>
        <button
          onClick={() => setTabActiva("venta")}
          style={tabActiva === "venta" ? estilos.botonActivo : estilos.boton}
        >
          Reporte Ventas
        </button>
        <button
          onClick={() => setTabActiva("reporte")}
          style={tabActiva === "reporte" ? estilos.botonActivo : estilos.boton}
        >
          Reporte Producción
        </button>
        <button
          onClick={() => setTabActiva("ordenesGeneral")}
          style={tabActiva === "ordenesGeneral" ? estilos.botonActivo : estilos.boton}
        >
          Órdenes y Ventas (General)
        </button>
        <button
          onClick={() => setTabActiva("lista")}
          style={tabActiva === "lista" ? estilos.botonActivo : estilos.boton}
        >
          Lista de Recetas
        </button>
        <button
          onClick={() => setTabActiva("agregar")}
          style={tabActiva === "agregar" ? estilos.botonActivo : estilos.boton}
        >
          Agregar Receta
        </button>
        {/* Se elimina la pestaña de Balance General, ya que ahora es encabezado permanente */}
        <button
          onClick={() => setTabActiva("gastosExtra")}
          style={tabActiva === "gastosExtra" ? estilos.botonActivo : estilos.boton}
        >
          Gastos Extra
        </button>
        <button
          onClick={() => setTabActiva("graficasBI")}
          style={tabActiva === "graficasBI" ? estilos.botonActivo : estilos.boton}
        >
          Gráficas BI
        </button>
                </nav>
                <BalanceGeneral />
            </div>
            <div style={estilos.contenido}>
              {tabActiva === "agregar" && (
                <AgregarReceta setRecetas={setRecetas} recargarRecetas={obtenerRecetas} />
              )}
              {tabActiva === "lista" && <ListaDeRecetas />}
              {tabActiva === "reporte" && <ReporteProduccion recetas={recetas} />}
              {tabActiva === "venta" && <ReporteVenta />}
              {tabActiva === "ordenesGeneral" && <OrdenesProduccionGeneral />}
              {/* Ya no se muestra BalanceGeneral como sección, está en el encabezado */}
              {tabActiva === "gastosExtra" && <GastosExtra />}
              {tabActiva === "graficasBI" && <GraficasBI />}
            </div>
        </div>
  );
};

const estilos = {
  nav: {
    display: "flex",
    gap: "4px",
    margin: 0,
    border: "none",
    padding: 0,
    alignItems: "center",
    height: 48,
    background: "none",
  },
  boton: {
    padding: "6px 10px",
    border: "none",
    backgroundColor: "#2980b9",
    color: "#fff",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "background 0.2s",
    height: 36,
    minWidth: 80,
  },
  botonActivo: {
    padding: "6px 10px",
    border: "none",
    backgroundColor: "#f39c12",
    color: "#fff",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.95rem",
    boxShadow: "0 2px 8px #f8c47155",
    transition: "background 0.2s",
    height: 36,
    minWidth: 80,
  },
  contenido: {
    padding: "10px",
  },
};

export default App;
