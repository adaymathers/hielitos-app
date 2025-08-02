
import { useState, useEffect } from "react";
import { exportarHistorialVentasPDF } from "./exportarHistorialVentasPDF";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";

const bordeColor = (abierta) => abierta ? "2px solid #27ae60" : "2px solid #e74c3c";


const OrdenesProduccionGeneral = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [ventasPorOrden, setVentasPorOrden] = useState({});
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      // Traer todas las órdenes de producción
      const qOrdenes = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
      const snapshotOrdenes = await getDocs(qOrdenes);
      const ordenesList = snapshotOrdenes.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Traer todas las ventas
      const qVentas = query(collection(db, "ventas"));
      const snapshotVentas = await getDocs(qVentas);
      const ventasList = snapshotVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Traer todas las recetas (para buscar imagen si la orden no la tiene)
      const snapshotRecetas = await getDocs(collection(db, "recetas"));
      const recetasList = snapshotRecetas.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Enriquecer cada orden con la imagen base64 de la receta si no la tiene
      const ordenesConImagen = ordenesList.map(orden => {
        if (!orden.imageBase64 && orden.recetaId) {
          const receta = recetasList.find(r => r.id === orden.recetaId);
          if (receta && receta.imageBase64) {
            return { ...orden, imageBase64: receta.imageBase64 };
          }
        }
        return orden;
      });

      // Agrupar ventas por ordenId
      const ventasPorOrdenObj = {};
      ventasList.forEach(v => {
        if (!ventasPorOrdenObj[v.ordenId]) ventasPorOrdenObj[v.ordenId] = [];
        ventasPorOrdenObj[v.ordenId].push(v);
      });

      setOrdenes(ordenesConImagen);
      setVentasPorOrden(ventasPorOrdenObj);
      setRecetas(recetasList);
      setLoading(false);
    };
    cargarDatos();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (ordenes.length === 0) return <p>No hay órdenes de producción registradas.</p>;

  return (
    <div>
      <h2>Órdenes de Producción y Ventas</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {ordenes.map(orden => {
          const ventas = ventasPorOrden[orden.id] || [];
          const totalVendidos = ventas.reduce((acc, v) => acc + (v.cantidadVendida || 0), 0);
          const totalEstropeados = ventas.reduce((acc, v) => acc + (v.cantidadEstropeada || 0), 0);
          const totalIngresos = ventas.reduce((acc, v) => acc + ((v.cantidadVendida || 0) * (v.precioVenta || 0)), 0);
          const costoProduccion = orden.costoTotal || 0;
          const hielitosPorLote = typeof orden.hielitosPorLote === 'number' ? orden.hielitosPorLote : Number(orden.hielitosPorLote) || 15;
          const totalProducidos = Number(orden.lotes) * hielitosPorLote;
          const abierta = (totalVendidos + totalEstropeados) < totalProducidos;
          // Buscar miniatura de receta
          let miniatura = null;
          if (orden.imageBase64 && orden.imageBase64.startsWith("data:image")) {
            miniatura = orden.imageBase64;
          } else if (orden.receta && orden.receta.imageBase64 && orden.receta.imageBase64.startsWith("data:image")) {
            miniatura = orden.resceta.imageBase64;
          } else if (orden.recetaId && recetas.length > 0) {
            const receta = recetas.find(r => r.id === orden.recetaId);
            if (receta && receta.imageBase64 && receta.imageBase64.startsWith("data:image")) {
              miniatura = receta.imageBase64;
            }
          }
          return (
            <div key={orden.id} style={{ border: bordeColor(abierta), borderRadius: 10, padding: 20, minWidth: 320, background: "#fafbfc", boxShadow: "0 2px 8px #0001", display: "flex", gap: 16 }}>
              {miniatura && (
                <img src={miniatura} alt="Foto receta" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #aaa", marginRight: 16 }} />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{orden.recetaNombre || "Sin nombre"}</h3>
                <div style={{ fontSize: 14, color: "#555" }}>
                  <strong>Fecha:</strong> {orden.fecha && orden.fecha.toDate ? orden.fecha.toDate().toLocaleString() : "-"} <br />
                  <strong>Lotes:</strong> {orden.lotes} <br />
                  <strong>Hielitos por lote:</strong> {hielitosPorLote} <br />
                  <strong>Producidos:</strong> {totalProducidos} <br />
                  <strong>Costo producción:</strong> ${costoProduccion.toFixed(2)} <br />
                  <strong>Estado:</strong> {abierta ? <span style={{ color: "#27ae60" }}>Abierta</span> : <span style={{ color: "#e74c3c" }}>Cerrada</span>}
                </div>
                <div style={{ marginTop: 10 }}>
                  <strong>Ventas de esta orden:</strong>
                  {ventas.length === 0 ? (
                    <p style={{ margin: 0 }}>No hay ventas registradas.</p>
                  ) : (
                    <>
                      <button
                        onClick={() => exportarHistorialVentasPDF({
                          orden,
                          historial: ventas,
                          totales: {
                            totalVendidos,
                            totalEstropeados,
                            totalIngresos,
                            costoProduccion,
                            rentabilidad: totalIngresos - costoProduccion
                          }
                        })}
                        style={{ marginBottom: "1rem", background: "#3498db", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 16px", cursor: "pointer" }}
                      >
                        Exportar historial a PDF
                      </button>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {ventas.map(v => (
                          <li key={v.id} style={{ fontSize: 13, marginBottom: 4 }}>
                            <strong>Fecha:</strong> {v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString() : "-"} | <strong>Vendidos:</strong> {v.cantidadVendida} | <strong>Estropeados:</strong> {v.cantidadEstropeada} | <strong>Precio venta:</strong> ${v.precioVenta} <br />
                            <strong>Comentarios:</strong> {v.comentarios}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 10, fontSize: 14 }}>
                  <strong>Total vendidos:</strong> {totalVendidos} <br />
                  <strong>Total estropeados:</strong> {totalEstropeados} <br />
                  <strong>Total ingresos:</strong> ${totalIngresos.toFixed(2)} <br />
                  <strong>Rentabilidad:</strong> {(totalIngresos - costoProduccion).toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdenesProduccionGeneral;
