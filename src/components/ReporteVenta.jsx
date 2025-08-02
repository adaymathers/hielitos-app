

import { useState, useEffect } from "react";
import { exportarHistorialVentasPDF } from "./exportarHistorialVentasPDF";
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";



// Componente para mostrar historial general de ventas (con eliminar)
const VentasGenerales = ({ trigger, onVentaEliminada }) => {
  const [ventas, setVentas] = useState([]);
  useEffect(() => {
    const cargarVentas = async () => {
      const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      setVentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarVentas();
  }, [trigger]);

  // Eliminar venta general
  const eliminarVentaGeneral = async (ventaId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este reporte de venta?")) return;
    try {
      await deleteDoc(doc(db, "ventas", ventaId));
      if (typeof trigger.set === 'function') trigger.set(t => t + 1);
      if (typeof onVentaEliminada === 'function') onVentaEliminada();
      alert("Venta eliminada correctamente");
    } catch (error) {
      alert("Error al eliminar la venta: " + (error && error.message ? error.message : JSON.stringify(error)));
      console.error("Error al eliminar la venta:", error);
    }
  };

  if (ventas.length === 0) return <p>No hay ventas registradas.</p>;

  return (
    <ul>
      {ventas.map(venta => (
        <li key={venta.id} style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "6px", padding: "0.5rem 1rem", position: "relative" }}>
          <strong>Fecha:</strong> {venta.fecha && venta.fecha.toDate ? venta.fecha.toDate().toLocaleString() : "-"} | <strong>Orden:</strong> {venta.ordenId} | <strong>Vendidos:</strong> {venta.cantidadVendida} | <strong>Estropeados:</strong> {venta.cantidadEstropeada} | <strong>Precio venta:</strong> ${venta.precioVenta} <br />
          <strong>Comentarios:</strong> {venta.comentarios}
          <button onClick={() => eliminarVentaGeneral(venta.id)} style={{ position: "absolute", top: 8, right: 8, background: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Eliminar</button>
        </li>
      ))}
    </ul>
  );
};

// Handler para eliminar venta de historial de orden
const handleEliminarVenta = async (ventaId, ordenSeleccionada, setHistorial) => {
  if (!window.confirm("¿Seguro que deseas eliminar este reporte de venta?")) return;
  try {
    await deleteDoc(doc(db, "ventas", ventaId));
    // Refrescar historial de la orden
    const q = query(collection(db, "ventas"), where("ordenId", "==", ordenSeleccionada.id), orderBy("fecha", "desc"));
    const snapshot = await getDocs(q);
    setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Refrescar órdenes disponibles
    const qOrdenes = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
    const snapshotOrdenes = await getDocs(qOrdenes);
    const ordenesList = snapshotOrdenes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const qVentas = query(collection(db, "ventas"));
    const snapshotVentas = await getDocs(qVentas);
    const ventasList = snapshotVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const usadosPorOrden = {};
    ventasList.forEach(v => {
      const vendidos = Number(v.cantidadVendida) || 0;
      const estropeados = Number(v.cantidadEstropeada) || 0;
      usadosPorOrden[v.ordenId] = (usadosPorOrden[v.ordenId] || 0) + vendidos + estropeados;
    });
    const ordenesDisponiblesActualizadas = ordenesList.filter(orden => {
      const hielitosPorLote = Number(orden.hielitosPorLote) || 15;
      const totalProducidos = Number(orden.lotes) * hielitosPorLote;
      const totalUsados = usadosPorOrden[orden.id] || 0;
      return totalUsados < totalProducidos;
    });
    setOrdenes(ordenesList);
    setOrdenesDisponibles(ordenesDisponiblesActualizadas);

    alert("Venta eliminada correctamente");
  } catch (error) {
    alert("Error al eliminar la venta: " + (error && error.message ? error.message : JSON.stringify(error)));
    console.error("Error al eliminar la venta:", error);
  }
};



const ReporteVenta = () => {
  const [ventasTrigger, setVentasTrigger] = useState(0);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [cantidadVendida, setCantidadVendida] = useState(0);
  const [cantidadEstropeada, setCantidadEstropeada] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [comentarios, setComentarios] = useState("");
  const [historial, setHistorial] = useState([]);

  // Refrescar órdenes disponibles desde hijo
  const refrescarOrdenesDisponibles = async () => {
    const qOrdenes = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
    const snapshotOrdenes = await getDocs(qOrdenes);
    const ordenesList = snapshotOrdenes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const qVentas = query(collection(db, "ventas"));
    const snapshotVentas = await getDocs(qVentas);
    const ventasList = snapshotVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const usadosPorOrden = {};
    ventasList.forEach(v => {
      const vendidos = Number(v.cantidadVendida) || 0;
      const estropeados = Number(v.cantidadEstropeada) || 0;
      usadosPorOrden[v.ordenId] = (usadosPorOrden[v.ordenId] || 0) + vendidos + estropeados;
    });
    const ordenesDisponiblesActualizadas = ordenesList.filter(orden => {
      const totalProducidos = Number(orden.lotes) * 15;
      const totalUsados = usadosPorOrden[orden.id] || 0;
      return totalUsados < totalProducidos;
    });
    setOrdenes(ordenesList);
    setOrdenesDisponibles(ordenesDisponiblesActualizadas);
  };

  // Cargar órdenes de producción y filtrar las disponibles
  useEffect(() => {
    const cargarOrdenesYVentas = async () => {
      const qOrdenes = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
      const snapshotOrdenes = await getDocs(qOrdenes);
      const ordenesList = snapshotOrdenes.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Traer todas las ventas
      const qVentas = query(collection(db, "ventas"));
      const snapshotVentas = await getDocs(qVentas);
      const ventasList = snapshotVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));


      // Calcular cuántos hielitos se han vendido o estropeado por orden
      const usadosPorOrden = {};
      ventasList.forEach(v => {
        const vendidos = Number(v.cantidadVendida) || 0;
        const estropeados = Number(v.cantidadEstropeada) || 0;
        usadosPorOrden[v.ordenId] = (usadosPorOrden[v.ordenId] || 0) + vendidos + estropeados;
      });

      // Filtrar órdenes disponibles (no completadas)
      const ordenesDisponibles = ordenesList.filter(orden => {
        const hielitosPorLote = Number(orden.hielitosPorLote) || 15;
        const totalProducidos = Number(orden.lotes) * hielitosPorLote;
        const totalUsados = usadosPorOrden[orden.id] || 0;
        return totalUsados < totalProducidos;
      });

      setOrdenes(ordenesList);
      setOrdenesDisponibles(ordenesDisponibles);
    };
    cargarOrdenesYVentas();
  }, [historial]);

  // Cargar historial de ventas de la orden seleccionada
  useEffect(() => {
    if (!ordenSeleccionada) return setHistorial([]);
    const cargarVentas = async () => {
      const q = query(collection(db, "ventas"), where("ordenId", "==", ordenSeleccionada.id), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarVentas();
  }, [ordenSeleccionada]);

  const handleGuardarVenta = async () => {
    if (!ordenSeleccionada) return alert("Selecciona una orden de producción");
    if (cantidadVendida <= 0 && cantidadEstropeada <= 0) return alert("Ingresa cantidad vendida o estropeada");
    try {
      await addDoc(collection(db, "ventas"), {
        ordenId: ordenSeleccionada.id,
        cantidadVendida: Number(cantidadVendida),
        cantidadEstropeada: Number(cantidadEstropeada),
        precioVenta: Number(precioVenta),
        comentarios,
        fecha: Timestamp.now(),
      });
      // Refrescar historial de la orden seleccionada
      const q = query(collection(db, "ventas"), where("ordenId", "==", ordenSeleccionada.id), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      const historialActualizado = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorial(historialActualizado);

      // Refrescar órdenes disponibles
      const qOrdenes = query(collection(db, "ordenesProduccion"), orderBy("fecha", "desc"));
      const snapshotOrdenes = await getDocs(qOrdenes);
      const ordenesList = snapshotOrdenes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const qVentas = query(collection(db, "ventas"));
      const snapshotVentas = await getDocs(qVentas);
      const ventasList = snapshotVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usadosPorOrden = {};
      ventasList.forEach(v => {
        const vendidos = Number(v.cantidadVendida) || 0;
        const estropeados = Number(v.cantidadEstropeada) || 0;
        usadosPorOrden[v.ordenId] = (usadosPorOrden[v.ordenId] || 0) + vendidos + estropeados;
      });
      const ordenesDisponiblesActualizadas = ordenesList.filter(orden => {
        const hielitosPorLote = Number(orden.hielitosPorLote) || 15;
        const totalProducidos = Number(orden.lotes) * hielitosPorLote;
        const totalUsados = usadosPorOrden[orden.id] || 0;
        return totalUsados < totalProducidos;
      });
      setOrdenes(ordenesList);
      setOrdenesDisponibles(ordenesDisponiblesActualizadas);

      // Exportar PDF automáticamente al registrar venta
      exportarHistorialVentasPDF({
        orden: ordenSeleccionada,
        historial: historialActualizado,
        totales: {
          totalVendidos: historialActualizado.reduce((acc, v) => acc + v.cantidadVendida, 0),
          totalEstropeados: historialActualizado.reduce((acc, v) => acc + v.cantidadEstropeada, 0),
          totalIngresos: historialActualizado.reduce((acc, v) => acc + (v.cantidadVendida * v.precioVenta), 0),
          costoProduccion: ordenSeleccionada?.costoTotal || 0,
          rentabilidad: historialActualizado.reduce((acc, v) => acc + (v.cantidadVendida * v.precioVenta), 0) - (ordenSeleccionada?.costoTotal || 0)
        }
      });

      setCantidadVendida(0);
      setCantidadEstropeada(0);
      setPrecioVenta(0);
      setComentarios("");
      setOrdenSeleccionada(null); // Reiniciar selección
      setVentasTrigger(t => t + 1); // Refrescar historial general
      alert("Venta registrada correctamente y PDF generado");
    } catch (error) {
      alert("Error al guardar la venta: " + (error && error.message ? error.message : JSON.stringify(error)));
      console.error("Error al guardar la venta:", error);
    }
  };


  // Calcular rentabilidad
  const totalIngresos = historial.reduce((acc, v) => acc + (v.cantidadVendida * v.precioVenta), 0);
  const totalVendidos = historial.reduce((acc, v) => acc + v.cantidadVendida, 0);
  const totalEstropeados = historial.reduce((acc, v) => acc + v.cantidadEstropeada, 0);
  const costoProduccion = ordenSeleccionada?.costoTotal || 0;
  const rentabilidad = totalIngresos - costoProduccion;

  return (
    <div>
      <h2>Reporte de Ventas</h2>
      <label>
        Selecciona orden de producción:
        <select
          value={ordenSeleccionada?.id || ""}
          onChange={e => {
            const orden = ordenesDisponibles.find(o => o.id === e.target.value);
            setOrdenSeleccionada(orden);
          }}
        >
          <option value="">-- Selecciona --</option>
          {ordenesDisponibles.map(orden => (
            <option key={orden.id} value={orden.id}>
              {orden.recetaNombre} | Lotes: {orden.lotes} | Fecha: {orden.fecha && orden.fecha.toDate ? orden.fecha.toDate().toLocaleString() : "-"}
            </option>
          ))}
        </select>
      </label>

      {ordenSeleccionada && (
        <>
          <div style={{ margin: "1rem 0" }}>
            <label>
              Cantidad vendida:
              <input type="number" min="0" value={cantidadVendida} onChange={e => setCantidadVendida(e.target.value)} />
            </label>
            <label style={{ marginLeft: "1rem" }}>
              Cantidad estropeada:
              <input type="number" min="0" value={cantidadEstropeada} onChange={e => setCantidadEstropeada(e.target.value)} />
            </label>
            <label style={{ marginLeft: "1rem" }}>
              Precio de venta por hielito ($):
              <input type="number" min="0" step="0.01" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} />
            </label>
          </div>
          <div>
            <label>
              Comentarios:
              <input type="text" value={comentarios} onChange={e => setComentarios(e.target.value)} style={{ width: "300px" }} />
            </label>
          </div>
          <button onClick={handleGuardarVenta} style={{ marginTop: "1rem" }}>Registrar Venta</button>

          <h3 style={{ marginTop: "2rem" }}>Historial de Ventas de esta Orden</h3>
          {historial.length === 0 ? (
            <p>No hay ventas registradas para esta orden.</p>
          ) : (
            <>
              <button
                onClick={() => exportarHistorialVentasPDF({
                  orden: ordenSeleccionada,
                  historial,
                  totales: {
                    totalVendidos,
                    totalEstropeados,
                    totalIngresos,
                    costoProduccion,
                    rentabilidad
                  }
                })}
                style={{ marginBottom: "1rem", background: "#3498db", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 16px", cursor: "pointer" }}
              >
                Exportar historial a PDF
              </button>
              <ul>
                {historial.map(venta => (
                  <li key={venta.id} style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "6px", padding: "0.5rem 1rem", position: "relative" }}>
                    <strong>Fecha:</strong> {venta.fecha && venta.fecha.toDate ? venta.fecha.toDate().toLocaleString() : "-"} | <strong>Vendidos:</strong> {venta.cantidadVendida} | <strong>Estropeados:</strong> {venta.cantidadEstropeada} | <strong>Precio venta:</strong> ${venta.precioVenta} <br />
                    <strong>Comentarios:</strong> {venta.comentarios}
                    <button onClick={() => handleEliminarVenta(venta.id, ordenSeleccionada, setHistorial)} style={{ position: "absolute", top: 8, right: 8, background: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Eliminar</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: "2rem", background: "#f8f8f8", padding: "1rem", borderRadius: "8px" }}>
            <strong>Total vendidos:</strong> {totalVendidos} <br />
            <strong>Total estropeados:</strong> {totalEstropeados} <br />
            <strong>Total ingresos:</strong> ${totalIngresos.toFixed(2)} <br />
            <strong>Costo de producción:</strong> ${costoProduccion.toFixed(2)} <br />
            <strong>Rentabilidad:</strong> ${rentabilidad.toFixed(2)}
          </div>
        </>
      )}

      <h3 style={{ marginTop: "2rem" }}>Historial General de Ventas</h3>
      <VentasGenerales trigger={{ value: ventasTrigger, set: setVentasTrigger }} onVentaEliminada={refrescarOrdenesDisponibles} />
    </div>
  );
}

export default ReporteVenta;
