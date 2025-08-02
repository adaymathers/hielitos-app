import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

const BalanceGeneral = () => {
  const [ventas, setVentas] = useState([]);
  const [gastosProduccion, setGastosProduccion] = useState([]);
  const [gastosExtra, setGastosExtra] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      // Ventas
      const ventasSnap = await getDocs(collection(db, "ventas"));
      const ventasList = ventasSnap.docs.map(doc => doc.data());
      setVentas(ventasList);
      // Gastos de producción
      const prodSnap = await getDocs(collection(db, "ordenesProduccion"));
      const prodList = prodSnap.docs.map(doc => doc.data());
      setGastosProduccion(prodList);
      // Gastos extra
      let gastosExtraList = [];
      try {
        const extraSnap = await getDocs(collection(db, "gastosExtra"));
        gastosExtraList = extraSnap.docs.map(doc => doc.data());
      } catch (e) {
        // Si no existe la colección, no pasa nada
      }
      setGastosExtra(gastosExtraList);
      // Calcular balance
      const totalVentas = ventasList.reduce((acc, v) => acc + (v.cantidadVendida * v.precioVenta), 0);
      const totalGastosProduccion = prodList.reduce((acc, p) => acc + (p.costoTotal || 0), 0);
      const totalGastosExtra = gastosExtraList.reduce((acc, g) => acc + (g.monto || 0), 0);
      const totalRetiros = gastosExtraList.filter(g => g.tipo === "retiro").reduce((acc, g) => acc + (g.monto || 0), 0);
      const totalInversiones = gastosExtraList.filter(g => g.tipo === "inversion").reduce((acc, g) => acc + (g.monto || 0), 0);
      const balanceFinal = totalVentas - totalGastosProduccion - totalGastosExtra - totalRetiros + totalInversiones;
      setBalance(balanceFinal);
      setLoading(false);
    };
    cargarDatos();
  }, []);

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: 48, minWidth: 180, paddingRight: 24 }}>
            {loading ? (
                <span style={{ fontSize: "1.2rem", color: "#888" }}>...</span>
            ) : (
                <span style={{ fontSize: "2rem", fontWeight: 700, color: balance >= 0 ? "#27ae60" : "#e74c3c", letterSpacing: 1 }}>
                    ${balance.toFixed(2)}
                </span>
            )}
        </div>
    );
};

export default BalanceGeneral;
