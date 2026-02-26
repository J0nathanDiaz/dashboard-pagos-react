import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Calculator, Wallet, Users, ChevronRight, ChevronLeft, Download, Cloud, CloudOff, Loader2, Archive, History, ArrowLeft, Calendar, Building2, MinusCircle, ReceiptText, Package, PlusCircle, X, Edit3 } from 'lucide-react';

// --- 1. CONFIGURACIÓN REAL DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ⚠️ ¡ATENCIÓN! REEMPLAZA ESTO CON LOS DATOS DE TU CONSOLA DE FIREBASE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyAceKMiceZ344maEPT_OLJZRMxRwj04t8U",
  authDomain: "dashboard-pagos-5a420.firebaseapp.com",
  projectId: "dashboard-pagos-5a420",
  storageBucket: "dashboard-pagos-5a420.firebasestorage.app",
  messagingSenderId: "1014468891267",
  appId: "1:1014468891267:web:14b0607328a8c5409b01b6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Un ID fijo para tu aplicación
const appId = "dashboard-pagos-oficial";

// Ayudante para mantener la fecha siempre en formato YYYY-MM-DD
const formatInputDate = (fechaRaw) => {
  if (!fechaRaw) return new Date().toISOString().split('T')[0];
  if (fechaRaw.includes('T')) return fechaRaw.split('T')[0];
  return fechaRaw;
};

const generarId = () => Math.random().toString(36).substr(2, 9);
const generarFilaVacia = () => ({ 
  id: generarId(), 
  fecha: formatInputDate(new Date().toISOString()), 
  cliente: '', 
  pago1USD: '', 
  pago2USD: '', 
  reinversionUSD: '', 
  tasa1: '', 
  tasa2: '', 
  entregado: 'No' 
});

const estadoInicial = {
  Ambar: [generarFilaVacia()],
  Ana: [generarFilaVacia()],
  Gabi: [generarFilaVacia()]
};

export default function App() {
  const [datos, setDatos] = useState(estadoInicial);
  const [cierres, setCierres] = useState([]); 
  const [pestanaActiva, setPestanaActiva] = useState('Ambar');
  const [vista, setVista] = useState('dashboard'); 
  const [cierreSeleccionado, setCierreSeleccionado] = useState(null); 
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [nombreCierre, setNombreCierre] = useState('');

  // NUEVOS ESTADOS PARA DEDUCCIONES
  const [deducciones, setDeducciones] = useState([]);
  const [mostrarModalDeduccion, setMostrarModalDeduccion] = useState(false);
  const [bancoDeduccion, setBancoDeduccion] = useState('');
  const [formDeduccion, setFormDeduccion] = useState({ descripcion: '', monto: '' });
  const [subVistaHistorial, setSubVistaHistorial] = useState('cierres');

  // NUEVOS ESTADOS PARA INVENTARIO
  const [inventario, setInventario] = useState([]);
  const [mostrarModalInventario, setMostrarModalInventario] = useState(false);
  const [formInventario, setFormInventario] = useState({ nombre: '', cantidad: '', unidad: 'Unidades' });

  // ESTADO PARA EL CALENDARIO Y FILTROS DE TIEMPO
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [filtroTiempo, setFiltroTiempo] = useState('todos');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroDashboard, setFiltroDashboard] = useState('todos'); 
  const [diaSeleccionadoDetalle, setDiaSeleccionadoDetalle] = useState(null); 

  // NUEVO: ESTADO PARA EL MODAL DE PAGO/TASA INTERACTIVO
  const [modalPago, setModalPago] = useState({ isOpen: false, persona: '', idFila: '', tipoPago: 1, monto: '', tasa: '' });

  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [estadoGuardado, setEstadoGuardado] = useState('sincronizado');

  // --- 2. AUTENTICACIÓN WEB (ANÓNIMA) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error conectando a Firebase:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 3. SINCRONIZACIÓN DE DATOS ---
  useEffect(() => {
    if (!user) return;
    
    const docRef = doc(db, 'empresa', 'pagos', 'dashboardData', 'estadoActual');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDatos(data.datos || estadoInicial);
        setCierres(data.cierres || []);
        setDeducciones(data.deducciones || []);
        setInventario(data.inventario || []);
      }
      setCargando(false);
    }, (error) => {
      console.error("Error leyendo datos:", error);
      setEstadoGuardado('error');
      setCargando(false);
    });

    return () => unsubscribe();
  }, [user]);

  const guardarDatosEnNube = async (nuevosDatos = datos, nuevosCierres = cierres, nuevasDeducciones = deducciones, nuevoInventario = inventario) => {
    setDatos(nuevosDatos);
    setCierres(nuevosCierres);
    setDeducciones(nuevasDeducciones);
    setInventario(nuevoInventario);
    
    if (user) {
      setEstadoGuardado('guardando');
      const docRef = doc(db, 'empresa', 'pagos', 'dashboardData', 'estadoActual');
      try {
        await setDoc(docRef, { datos: nuevosDatos, cierres: nuevosCierres, deducciones: nuevasDeducciones, inventario: nuevoInventario });
        setEstadoGuardado('sincronizado');
      } catch (error) {
        console.error("Error guardando:", error);
        setEstadoGuardado('error');
      }
    }
  };

  // --- 4. FUNCIONES DE EDICIÓN ---
  const actualizarRegistro = (persona, id, campo, valor) => {
    const nuevosDatos = {
      ...datos,
      [persona]: datos[persona].map(registro => 
        registro.id === id ? { ...registro, [campo]: valor } : registro
      )
    };
    guardarDatosEnNube(nuevosDatos);
  };

  const agregarFila = (persona) => {
    const nuevosDatos = {
      ...datos,
      [persona]: [...datos[persona], generarFilaVacia()]
    };
    guardarDatosEnNube(nuevosDatos);
    setFiltroDashboard('todos'); 
  };

  const eliminarFila = (persona, id) => {
    const nuevosDatos = {
      ...datos,
      [persona]: datos[persona].filter(registro => registro.id !== id)
    };
    guardarDatosEnNube(nuevosDatos);
  };

  // Lógica del Modal de Pago
  const abrirModalPago = (persona, idFila, tipoPago, montoActual, tasaActual) => {
    setModalPago({
      isOpen: true,
      persona,
      idFila,
      tipoPago,
      monto: montoActual !== undefined && montoActual !== '' ? montoActual : '',
      tasa: tasaActual !== undefined && tasaActual !== '' ? tasaActual : ''
    });
  };

  const guardarModalPago = () => {
    const { persona, idFila, tipoPago, monto, tasa } = modalPago;
    const campoMonto = tipoPago === 1 ? 'pago1USD' : 'pago2USD';
    const campoTasa = tipoPago === 1 ? 'tasa1' : 'tasa2';

    const nuevosDatos = {
      ...datos,
      [persona]: datos[persona].map(registro => 
        registro.id === idFila ? { ...registro, [campoMonto]: monto, [campoTasa]: tasa } : registro
      )
    };
    
    guardarDatosEnNube(nuevosDatos);
    setModalPago({ ...modalPago, isOpen: false });
  };

  // --- 5. LÓGICA DE CIERRES ---
  const procesarCierre = () => {
    if (!nombreCierre.trim()) return alert("Por favor ingresa un nombre para el cierre (Ej: Semana 1)");

    let totalVendido = 0;
    let totalCobrado = 0;

    Object.keys(datos).forEach(persona => {
      datos[persona].forEach(fila => {
        const calc = calcularValores(fila);
        totalVendido += calc.totalPagadoUSD;
        totalCobrado += calc.totalBs;
      });
    });

    const nuevoCierre = {
      id: generarId(),
      fecha: new Date().toISOString(),
      nombre: nombreCierre,
      resumen: { totalVendido, totalCobrado },
      datosGuardados: JSON.parse(JSON.stringify(datos)),
      deduccionesGuardadas: JSON.parse(JSON.stringify(deducciones)) 
    };

    const nuevosCierres = [nuevoCierre, ...cierres]; 
    const nuevosDatos = estadoInicial; 
    const nuevasDeducciones = []; 

    guardarDatosEnNube(nuevosDatos, nuevosCierres, nuevasDeducciones);
    setNombreCierre('');
    setMostrarModalCierre(false);
    setVista('historial'); 
  };

  // --- LÓGICA DE DEDUCCIONES E INVENTARIO ---
  const abrirModalDeduccion = (banco) => {
    setBancoDeduccion(banco);
    setFormDeduccion({ descripcion: '', monto: '' });
    setMostrarModalDeduccion(true);
  };

  const procesarDeduccion = () => {
    if (!formDeduccion.descripcion.trim() || !formDeduccion.monto) return;
    const nuevaDeduccion = { id: generarId(), fecha: new Date().toISOString(), banco: bancoDeduccion, descripcion: formDeduccion.descripcion, monto: parseFloat(formDeduccion.monto) };
    const nuevasDeducciones = [nuevaDeduccion, ...deducciones];
    guardarDatosEnNube(datos, cierres, nuevasDeducciones);
    setMostrarModalDeduccion(false);
  };

  const eliminarDeduccion = (id) => {
    const nuevas = deducciones.filter(d => d.id !== id);
    guardarDatosEnNube(datos, cierres, nuevas, inventario);
  };

  const abrirModalInventario = () => {
    setFormInventario({ nombre: '', cantidad: '', unidad: 'Unidades' });
    setMostrarModalInventario(true);
  };

  const procesarMaterial = () => {
    if (!formInventario.nombre.trim() || !formInventario.cantidad) return;
    const nuevoMaterial = { id: generarId(), fecha: new Date().toISOString(), nombre: formInventario.nombre, cantidad: parseFloat(formInventario.cantidad), unidad: formInventario.unidad };
    const nuevoInventario = [nuevoMaterial, ...inventario];
    guardarDatosEnNube(datos, cierres, deducciones, nuevoInventario);
    setMostrarModalInventario(false);
  };

  const eliminarMaterial = (id) => {
    const nuevo = inventario.filter(m => m.id !== id);
    guardarDatosEnNube(datos, cierres, deducciones, nuevo);
  };

  const ajustarCantidadMaterial = (id, ajuste) => {
    const nuevo = inventario.map(m => {
      if (m.id === id) return { ...m, cantidad: Math.max(0, m.cantidad + ajuste) };
      return m;
    });
    guardarDatosEnNube(datos, cierres, deducciones, nuevo);
  };

  // --- 6. EXPORTACIÓN A EXCEL NATIVO (.XLS) ---
  const exportarExcel = (datosAExportar, nombreArchivo = "reporte_pagos.xls") => {
    let tablaHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { font-family: Arial, sans-serif; border-collapse: collapse; }
          th { background-color: #4f46e5; color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc; }
          td { padding: 8px; border: 1px solid #ccc; text-align: left; }
          .num { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Pago 1 (USD)</th>
              <th>Pago 2 (USD)</th>
              <th>Reinversión (USD)</th>
              <th>Valor Bruto/Saldo (USD)</th>
              <th>Sueldo 20% (USD)</th>
              <th>Ahorro 10% (USD)</th>
              <th>Dueñas 70% (USD)</th>
              <th>C/Dueña (USD)</th>
              <th>Tasa 1</th>
              <th>Tasa 2</th>
              <th>Pago 1 (Bs)</th>
              <th>Pago 2 (Bs)</th>
              <th>Total Recibido (Bs)</th>
              <th>Estatus Pago</th>
              <th>Entregado</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(datosAExportar).forEach(persona => {
      datosAExportar[persona].forEach(fila => {
        if (!fila.cliente && !fila.pago1USD && !fila.totalUSD) return;

        const calc = calcularValores(fila);
        const faltaT1 = calc.p1 > 0 && calc.t1 === 0;
        const faltaT2 = calc.p2 > 0 && calc.t2 === 0;
        const estaPagadoCompleto = !faltaT1 && !faltaT2 && calc.totalPagadoUSD > 0;
        const estatus = estaPagadoCompleto ? "Completado" : "Pendiente";
        
        // Formateo de fecha para Excel
        const fechaFormateada = formatInputDate(fila.fecha).split('-').reverse().join('/');
        
        tablaHTML += `
          <tr>
            <td>${fechaFormateada}</td>
            <td class="bold">${persona}</td>
            <td>${fila.cliente || "Sin nombre"}</td>
            <td class="num">${calc.p1 || 0}</td>
            <td class="num">${calc.p2 || 0}</td>
            <td class="num">${calc.reinv || 0}</td>
            <td class="num bold" style="background-color: #f3f4f6;">${calc.saldoBaseUSD.toFixed(2)}</td>
            <td class="num text-blue">${calc.sueldo.toFixed(2)}</td>
            <td class="num text-blue">${calc.ahorro.toFixed(2)}</td>
            <td class="num text-purple">${calc.duenasTotal.toFixed(2)}</td>
            <td class="num text-purple bold">${calc.porDuena.toFixed(2)}</td>
            <td class="num">${calc.t1 || 0}</td>
            <td class="num">${calc.t2 || 0}</td>
            <td class="num">${calc.pago1Bs.toFixed(2)}</td>
            <td class="num">${calc.pago2Bs.toFixed(2)}</td>
            <td class="num bold" style="background-color: #ecfdf5;">${calc.totalBs.toFixed(2)}</td>
            <td style="color: ${estaPagadoCompleto ? 'green' : 'orange'}; font-weight: bold;">${estatus}</td>
            <td style="color: ${fila.entregado === 'Sí' ? 'green' : 'red'}; font-weight: bold;">${fila.entregado || 'No'}</td>
          </tr>
        `;
      });
    });

    tablaHTML += `</tbody></table></body></html>`;

    const blob = new Blob([tablaHTML], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo.endsWith('.xls') ? nombreArchivo : nombreArchivo + '.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- 7. CÁLCULOS MATEMÁTICOS ---
  const calcularValores = (registro) => {
    const p1 = parseFloat(registro.pago1USD !== undefined ? registro.pago1USD : registro.totalUSD) || 0;
    const p2 = parseFloat(registro.pago2USD) || 0;
    const reinv = parseFloat(registro.reinversionUSD !== undefined ? registro.reinversionUSD : registro.adelantoUSD) || 0;
    
    const t1 = parseFloat(registro.tasa1) || 0;
    const t2 = parseFloat(registro.tasa2) || 0;

    const totalPagadoUSD = p1 + p2;
    const saldoBaseUSD = Math.max(0, totalPagadoUSD - reinv);

    const sueldo = saldoBaseUSD * 0.20;
    const ahorro = saldoBaseUSD * 0.10;
    const duenasTotal = saldoBaseUSD * 0.70;
    const porDuena = duenasTotal / 2;

    const pago1Bs = p1 * t1;
    const pago2Bs = p2 * t2;
    const totalBs = pago1Bs + pago2Bs;

    const blendedRate = totalPagadoUSD > 0 ? (totalBs / totalPagadoUSD) : 0;

    const reinvBs = reinv * blendedRate;
    const saldoBaseBs = saldoBaseUSD * blendedRate;
    const sueldoBs = sueldo * blendedRate;
    const ahorroBs = ahorro * blendedRate;
    const duenasTotalBs = duenasTotal * blendedRate;
    const porDuenaBs = porDuena * blendedRate;

    return { 
      p1, p2, reinv, totalPagadoUSD, saldoBaseUSD, 
      sueldo, ahorro, duenasTotal, porDuena, 
      pago1Bs, pago2Bs, totalBs, reinvBs, saldoBaseBs,
      t1, t2, 
      sueldoBs, ahorroBs, duenasTotalBs, porDuenaBs 
    };
  };

  // --- LOGICA PARA FILTRAR EL HISTORIAL ---
  const filtrarPorTiempo = (fechaIso) => {
    if (filtroTiempo === 'todos') return true;
    const fecha = new Date(fechaIso);
    const hoy = new Date();

    if (filtroTiempo === 'hoy') {
      return fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    }
    if (filtroTiempo === 'semana') {
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      inicioSemana.setHours(0,0,0,0);
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      finSemana.setHours(23,59,59,999);
      return fecha >= inicioSemana && fecha <= finSemana;
    }
    if (filtroTiempo === 'mes') {
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    }
    if (filtroTiempo === 'ano') {
      return fecha.getFullYear().toString() === filtroAno;
    }
    return true;
  };

  const cierresFiltrados = cierres.filter(c => filtrarPorTiempo(c.fecha));
  const deduccionesFiltradas = deducciones.filter(d => filtrarPorTiempo(d.fecha));

  const formatoUSD = (valor) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);
  const formatoBs = (valor) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor) + ' Bs.';

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-indigo-600">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-medium text-gray-600">Conectando con la base de datos...</p>
      </div>
    );
  }

  // --- LOGICA PARA FILTRAR EL DASHBOARD ---
  const filtrarFilaDashboard = (fila) => {
    if (filtroDashboard === 'todos') return true;
    
    const filaFechaStr = formatInputDate(fila.fecha);
    const [año, mes, dia] = filaFechaStr.split('-').map(Number);
    const f = new Date(año, mes - 1, dia); // Evita problemas de zona horaria
    const ref = fechaCalendario;
    const hoy = new Date();

    if (filtroDashboard === 'hoy') {
      return f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    }
    if (filtroDashboard === 'dia') {
      return f.getDate() === ref.getDate() && f.getMonth() === ref.getMonth() && f.getFullYear() === ref.getFullYear();
    }
    if (filtroDashboard === 'semana') {
      const inicio = new Date(ref);
      inicio.setDate(ref.getDate() - ref.getDay());
      inicio.setHours(0,0,0,0);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23,59,59,999);
      return f >= inicio && f <= fin;
    }
    if (filtroDashboard === 'mes') {
      return f.getMonth() === ref.getMonth() && f.getFullYear() === ref.getFullYear();
    }
    if (filtroDashboard === 'ano') {
      return f.getFullYear() === ref.getFullYear();
    }
    return true;
  };

  // --- 8. RENDERIZADO DEL DASHBOARD ---
  const renderTablas = (datosAUsar, esSoloLectura = false) => {
    const registrosActualesBase = datosAUsar[pestanaActiva] || [];
    const todasLasFilasGlobalesBase = Object.values(datosAUsar).flat();
    
    let registrosActuales = registrosActualesBase;
    let todasLasFilasGlobales = todasLasFilasGlobalesBase;
    let deduccionesActuales = deducciones;

    if (!esSoloLectura && filtroDashboard !== 'todos') {
      registrosActuales = registrosActualesBase.filter(filtrarFilaDashboard);
      todasLasFilasGlobales = todasLasFilasGlobalesBase.filter(filtrarFilaDashboard);
      deduccionesActuales = deducciones.filter(filtrarFilaDashboard);
    }

    // Resumen individual (por pestaña activa)
    const resumen = registrosActuales.reduce((acc, curr) => {
      const calc = calcularValores(curr);
      acc.totalIngresosUSD += calc.totalPagadoUSD;
      acc.totalIngresosBs += calc.totalBs; 
      
      acc.totalReinvUSD += calc.reinv;
      acc.totalReinvBs += calc.reinvBs; 

      acc.pagoSemanalUSD += calc.sueldo;
      acc.pagoSemanalBs += calc.sueldoBs;
      return acc;
    }, { totalIngresosUSD: 0, totalIngresosBs: 0, totalReinvUSD: 0, totalReinvBs: 0, pagoSemanalUSD: 0, pagoSemanalBs: 0 });

    // Resumen GLOBAL
    const resumenGlobal = todasLasFilasGlobales.reduce((acc, curr) => {
      const calc = calcularValores(curr);
      acc.banescoSueldoBs += calc.sueldoBs;
      acc.banescoDuenasBs += calc.duenasTotalBs;
      acc.banescoBs += (calc.sueldoBs + calc.duenasTotalBs);
      acc.tesoroBs += calc.reinvBs;
      acc.provincialBs += calc.ahorroBs;
      return acc;
    }, { banescoBs: 0, banescoSueldoBs: 0, banescoDuenasBs: 0, tesoroBs: 0, provincialBs: 0 });

    if (!esSoloLectura) {
      deduccionesActuales.forEach(d => {
        if (d.banco === 'Banesco') resumenGlobal.banescoBs -= d.monto;
        if (d.banco === 'Banco del Tesoro') resumenGlobal.tesoroBs -= d.monto;
        if (d.banco === 'Provincial') resumenGlobal.provincialBs -= d.monto;
      });
    }

    // Función para ver cuántos pedidos hubo en un día específico para dibujar en el calendario
    const getOrdenesDia = (day) => {
      const cellDateStr = `${fechaCalendario.getFullYear()}-${String(fechaCalendario.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return todasLasFilasGlobalesBase.filter(f => formatInputDate(f.fecha) === cellDateStr && f.cliente && f.cliente.trim() !== '');
    };

    return (
      <>
        {/* Tarjetas de Resumen Principales (INDIVIDUALES POR PESTAÑA) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Ingresos - {pestanaActiva}</p>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-800">{formatoUSD(resumen.totalIngresosUSD)}</span>
                <span className="text-sm font-medium text-gray-500">({formatoBs(resumen.totalIngresosBs)})</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Archive className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Reinversión - {pestanaActiva}</p>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-800">{formatoUSD(resumen.totalReinvUSD)}</span>
                <span className="text-sm font-medium text-gray-500">({formatoBs(resumen.totalReinvBs)})</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Wallet className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pago Semanal - {pestanaActiva}</p>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-800">{formatoUSD(resumen.pagoSemanalUSD)}</span>
                <span className="text-sm font-medium text-gray-500">({formatoBs(resumen.pagoSemanalBs)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Bancos (GLOBALES - SUMAN TODO) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500"></div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div className="w-full">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">Banesco <span className="bg-gray-100 text-gray-400 px-1 rounded normal-case text-[9px]">Global</span></p>
                {!esSoloLectura && <button onClick={() => abrirModalDeduccion('Banesco')} className="text-[10px] font-bold flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"><MinusCircle className="w-3 h-3"/> Deducir</button>}
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Sueldo:</span>
                <span className="text-sm font-bold text-gray-800">{formatoBs(resumenGlobal.banescoSueldoBs)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Dueñas:</span>
                <span className="text-sm font-bold text-gray-800">{formatoBs(resumenGlobal.banescoDuenasBs)}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-teal-600">Total Disponible:</span>
                <span className="text-sm font-bold text-teal-700">{formatoBs(resumenGlobal.banescoBs)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500"></div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div className="w-full">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">Banco del Tesoro <span className="bg-gray-100 text-gray-400 px-1 rounded normal-case text-[9px]">Global</span></p>
                {!esSoloLectura && <button onClick={() => abrirModalDeduccion('Banco del Tesoro')} className="text-[10px] font-bold flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"><MinusCircle className="w-3 h-3"/> Deducir</button>}
              </div>
              <p className="text-xs text-gray-500 mb-1">Reinversiones Acumuladas</p>
              <p className="text-lg font-bold text-gray-800">{formatoBs(resumenGlobal.tesoroBs)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div className="w-full">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">Provincial <span className="bg-gray-100 text-gray-400 px-1 rounded normal-case text-[9px]">Global</span></p>
                {!esSoloLectura && <button onClick={() => abrirModalDeduccion('Provincial')} className="text-[10px] font-bold flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"><MinusCircle className="w-3 h-3"/> Deducir</button>}
              </div>
              <p className="text-xs text-gray-500 mb-1">Ahorros</p>
              <p className="text-lg font-bold text-gray-800">{formatoBs(resumenGlobal.provincialBs)}</p>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 overflow-x-auto pb-px">
          {['Ambar', 'Ana', 'Gabi'].map((persona) => (
            <button
              key={persona}
              onClick={() => setPestanaActiva(persona)}
              className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                pestanaActiva === persona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-b-0 border-gray-200'
              }`}
            >
              Tabla de {persona}
            </button>
          ))}
        </div>

        {/* Tablas */}
        <div className="space-y-8">
          {/* TABLA DÓLARES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            {esSoloLectura && <div className="absolute inset-0 bg-gray-50/10 pointer-events-none z-10"></div>}
            
            <div className={`p-4 flex justify-between items-center ${esSoloLectura ? 'bg-slate-600' : 'bg-slate-800'}`}>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 whitespace-nowrap">
                <DollarSign className="w-5 h-5 text-green-400" />
                1. Base de Datos (Dólares y Tasas) {esSoloLectura && " - MODO LECTURA"}
              </h2>
              {!esSoloLectura && (
                <button onClick={() => agregarFila(pestanaActiva)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Nueva Fila
                </button>
              )}
            </div>
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3 min-w-[130px]">Fecha</th>
                    <th className="px-4 py-3 min-w-[200px]">Cliente</th>
                    <th className="px-4 py-3 min-w-[120px]">Pago 1 (Modal)</th>
                    <th className="px-4 py-3 min-w-[120px]">Pago 2 (Modal)</th>
                    <th className="px-4 py-3 bg-red-50 text-red-800 min-w-[100px]">Reinversión ($)</th>
                    <th className="px-4 py-3 bg-indigo-50 text-indigo-800">Valor Bruto / Saldo ($)</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Sueldo 20%</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Ahorro 10%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">Dueñas 70%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">C/Dueña (35%)</th>
                    <th className="px-4 py-3 text-center min-w-[120px]">Entregado</th>
                    {!esSoloLectura && <th className="px-4 py-3 text-center">Borrar</th>}
                  </tr>
                </thead>
                <tbody>
                  {registrosActuales.map((fila) => {
                    const { p1, p2, t1, t2, saldoBaseUSD, sueldo, ahorro, duenasTotal, porDuena } = calcularValores(fila);
                    return (
                      <tr key={fila.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2">
                          <input 
                            type="date" 
                            disabled={esSoloLectura} 
                            className={`w-full min-w-[130px] p-2 border border-gray-300 rounded outline-none text-xs font-medium ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-indigo-500'}`} 
                            value={formatInputDate(fila.fecha)} 
                            onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'fecha', e.target.value)} 
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" disabled={esSoloLectura} className={`w-full min-w-[200px] p-2 border border-gray-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-indigo-500'}`} placeholder="Nombre del cliente..." value={fila.cliente} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'cliente', e.target.value)} />
                        </td>
                        
                        {/* INTERFAZ DEL MODAL PAGO 1 */}
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => !esSoloLectura && abrirModalPago(pestanaActiva, fila.id, 1, fila.pago1USD !== undefined ? fila.pago1USD : fila.totalUSD, fila.tasa1)}
                            disabled={esSoloLectura}
                            className={`w-full p-2 border rounded outline-none text-left flex flex-col justify-center transition-colors min-h-[42px] ${esSoloLectura ? 'bg-transparent border-transparent' : 'border-gray-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500'}`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`font-bold ${p1 > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                {p1 > 0 ? formatoUSD(p1) : '+ Añadir'}
                              </span>
                              {!esSoloLectura && <Edit3 className="w-3 h-3 text-gray-400" />}
                            </div>
                            {p1 > 0 && <span className="text-[10px] text-gray-500 mt-0.5 font-medium">Tasa: {t1 > 0 ? t1 : <span className="text-orange-500">Pendiente</span>}</span>}
                          </button>
                        </td>

                        {/* INTERFAZ DEL MODAL PAGO 2 */}
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => !esSoloLectura && abrirModalPago(pestanaActiva, fila.id, 2, fila.pago2USD, fila.tasa2)}
                            disabled={esSoloLectura}
                            className={`w-full p-2 border rounded outline-none text-left flex flex-col justify-center transition-colors min-h-[42px] ${esSoloLectura ? 'bg-transparent border-transparent' : 'border-gray-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500'}`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`font-bold ${p2 > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                {p2 > 0 ? formatoUSD(p2) : '+ Añadir'}
                              </span>
                              {!esSoloLectura && <Edit3 className="w-3 h-3 text-gray-400" />}
                            </div>
                            {p2 > 0 && <span className="text-[10px] text-gray-500 mt-0.5 font-medium">Tasa: {t2 > 0 ? t2 : <span className="text-orange-500">Pendiente</span>}</span>}
                          </button>
                        </td>

                        <td className="px-4 py-2">
                          <input type="number" min="0" step="any" disabled={esSoloLectura} className={`w-full min-w-[100px] p-2 border border-red-300 rounded outline-none bg-red-50 font-semibold text-red-700 ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-red-500'}`} placeholder="0" value={fila.reinversionUSD !== undefined ? fila.reinversionUSD : (fila.adelantoUSD || '')} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'reinversionUSD', e.target.value)} />
                        </td>
                        <td className="px-4 py-2 bg-indigo-50 font-bold text-indigo-700 text-lg">{formatoUSD(saldoBaseUSD)}</td>
                        <td className="px-4 py-2 bg-blue-50/50 text-blue-700 font-medium">{formatoUSD(sueldo)}</td>
                        <td className="px-4 py-2 bg-blue-50/50 text-blue-700 font-medium">{formatoUSD(ahorro)}</td>
                        <td className="px-4 py-2 bg-purple-50/50 text-purple-700 font-medium">{formatoUSD(duenasTotal)}</td>
                        <td className="px-4 py-2 bg-purple-50/50 text-purple-700 font-bold">{formatoUSD(porDuena)}</td>
                        
                        <td className="px-4 py-2 text-center">
                          <select 
                            disabled={esSoloLectura}
                            className={`w-full min-w-[90px] p-2 border rounded outline-none font-medium text-sm transition-colors ${fila.entregado === 'Sí' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} ${esSoloLectura ? 'appearance-none' : 'focus:ring-2 focus:ring-indigo-500'}`}
                            value={fila.entregado || 'No'}
                            onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'entregado', e.target.value)}
                          >
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </select>
                        </td>
                        {!esSoloLectura && (
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => eliminarFila(pestanaActiva, fila.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-5 h-5 mx-auto" /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!esSoloLectura && registrosActuales.length === 0 && (
                    <tr><td colSpan="12" className="text-center py-8 text-gray-500">No hay registros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA BOLÍVARES (Siempre solo lectura) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div className="absolute inset-0 bg-gray-50/20 pointer-events-none z-10"></div>
            <div className={`p-4 flex justify-between items-center ${esSoloLectura ? 'bg-emerald-800' : 'bg-emerald-700'}`}>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 whitespace-nowrap">
                <ChevronRight className="w-5 h-5 text-emerald-300" />
                2. Cálculos en Bolívares (Automático)
              </h2>
            </div>
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Pago 1 (Bs)</th>
                    <th className="px-4 py-3">Pago 2 (Bs)</th>
                    <th className="px-4 py-3 font-bold text-gray-800">Total Recibido (Bs)</th>
                    <th className="px-4 py-3 bg-red-50 text-red-800">Reinversión (Bs)</th>
                    <th className="px-4 py-3 bg-emerald-50 text-emerald-800">Valor Bruto (Bs)</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Sueldo 20%</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Ahorro 10%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">Dueñas 70%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">C/Dueña (35%)</th>
                    <th className="px-4 py-3">Estatus Pago</th>
                    <th className="px-4 py-3 text-center">Entregado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosActuales.map((fila) => {
                    const { p1, p2, pago1Bs, pago2Bs, totalBs, reinvBs, saldoBaseBs, t1, t2, sueldoBs, ahorroBs, duenasTotalBs, porDuenaBs, totalPagadoUSD } = calcularValores(fila);
                    
                    const faltaT1 = p1 > 0 && t1 === 0;
                    const faltaT2 = p2 > 0 && t2 === 0;
                    const estaPagadoCompleto = !faltaT1 && !faltaT2 && totalPagadoUSD > 0;
                    
                    return (
                      <tr key={`bs-${fila.id}`} className="border-b bg-white hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-4 text-gray-500 font-medium">
                          {formatInputDate(fila.fecha).split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-700">
                          {fila.cliente || <span className="text-gray-400 italic">Sin nombre</span>}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {pago1Bs > 0 ? formatoBs(pago1Bs) : (p1 > 0 && t1 === 0 ? <span className="text-orange-400 text-xs italic">Falta Tasa 1</span> : '-')}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {pago2Bs > 0 ? formatoBs(pago2Bs) : (p2 > 0 && t2 === 0 ? <span className="text-orange-400 text-xs italic">Falta Tasa 2</span> : '-')}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-800">{formatoBs(totalBs)}</td>
                        <td className="px-4 py-4 bg-red-50 text-red-700 font-medium">{reinvBs > 0 ? formatoBs(reinvBs) : '-'}</td>
                        <td className="px-4 py-4 bg-emerald-50 text-emerald-700 font-medium">{saldoBaseBs > 0 ? formatoBs(saldoBaseBs) : '-'}</td>
                        <td className="px-4 py-4 bg-blue-50/50 text-blue-700 font-medium">{sueldoBs > 0 ? formatoBs(sueldoBs) : '-'}</td>
                        <td className="px-4 py-4 bg-blue-50/50 text-blue-700 font-medium">{ahorroBs > 0 ? formatoBs(ahorroBs) : '-'}</td>
                        <td className="px-4 py-4 bg-purple-50/50 text-purple-700 font-medium">{duenasTotalBs > 0 ? formatoBs(duenasTotalBs) : '-'}</td>
                        <td className="px-4 py-4 bg-purple-50/50 text-purple-700 font-bold">{porDuenaBs > 0 ? formatoBs(porDuenaBs) : '-'}</td>
                        <td className="px-4 py-4">
                          {totalPagadoUSD === 0 ? <span className="text-gray-400 text-xs italic">-</span> : (estaPagadoCompleto ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Completado</span> : <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">Pendiente</span>)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {fila.entregado === 'Sí' 
                            ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Sí</span> 
                            : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">No</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CALENDARIO Y FILTROS DEL DASHBOARD */}
          {!esSoloLectura && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 w-full relative overflow-hidden mt-4">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
              
              <div className="flex flex-wrap items-center gap-2 mb-4 pl-3 border-b border-gray-100 pb-4">
                <span className="text-sm font-medium text-gray-500 mr-2 flex items-center gap-1"><Calendar className="w-4 h-4"/> Filtrar Panel:</span>
                <button onClick={() => setFiltroDashboard('todos')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${filtroDashboard === 'todos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
                <button onClick={() => { setFiltroDashboard('hoy'); setFechaCalendario(new Date()); }} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${filtroDashboard === 'hoy' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoy</button>
                <button onClick={() => setFiltroDashboard('semana')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${filtroDashboard === 'semana' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semana</button>
                <button onClick={() => setFiltroDashboard('mes')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${filtroDashboard === 'mes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mes</button>
                <button onClick={() => setFiltroDashboard('ano')} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${filtroDashboard === 'ano' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Año</button>
              </div>

              <div className="flex items-center justify-between mb-6 pl-3">
                <div className="flex items-center gap-1 flex-wrap">
                  <Calendar className="w-6 h-6 text-indigo-500 mr-1" />
                  <select
                    value={fechaCalendario.getMonth()}
                    onChange={(e) => setFechaCalendario(new Date(fechaCalendario.getFullYear(), parseInt(e.target.value), 1))}
                    className="text-xl font-bold text-slate-800 bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors capitalize appearance-none px-1"
                    title="Seleccionar Mes"
                  >
                    {['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].map((mes, index) => (
                      <option key={mes} value={index} className="text-base text-slate-800 capitalize">{mes}</option>
                    ))}
                  </select>
                  <select
                    value={fechaCalendario.getFullYear()}
                    onChange={(e) => setFechaCalendario(new Date(parseInt(e.target.value), fechaCalendario.getMonth(), 1))}
                    className="text-xl font-bold text-slate-800 bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-none px-1"
                    title="Seleccionar Año"
                  >
                    {Array.from({ length: 46 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <option key={year} value={year} className="text-base text-slate-800">{year}</option>
                    ))}
                  </select>
                  {filtroDashboard !== 'todos' && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full normal-case ml-2">Filtro Activo</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"><ChevronLeft className="w-6 h-6"/></button>
                  <button onClick={() => setFechaCalendario(new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"><ChevronRight className="w-6 h-6"/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-2 pl-3">
                {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                  <div key={d} className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-wider">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d.substring(0, 2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center pl-3">
                {/* Celdas vacías al inicio del mes */}
                {Array.from({ length: new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-24"></div>
                ))}
                
                {/* Días del mes con diseño responsivo e interactivo */}
                {Array.from({ length: new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === fechaCalendario.getMonth() && new Date().getFullYear() === fechaCalendario.getFullYear();
                  const isSelected = filtroDashboard === 'dia' && fechaCalendario.getDate() === day;
                  
                  // Buscar pedidos de ese día para dibujar en el calendario
                  const ordenesDelDia = getOrdenesDia(day);

                  return (
                    <button 
                      key={day} 
                      type="button"
                      onClick={() => {
                        const selectedDate = new Date(fechaCalendario.getFullYear(), fechaCalendario.getMonth(), day);
                        setFechaCalendario(selectedDate);
                        setFiltroDashboard('dia');
                        setDiaSeleccionadoDetalle(selectedDate); // Abre el modal con los detalles
                      }}
                      className={`relative py-1 sm:py-2 px-1 rounded-lg text-sm sm:text-base flex flex-col items-center justify-start h-16 sm:h-24 transition-colors border outline-none 
                        ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md' : 
                          isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 
                          'border-transparent text-gray-700 hover:bg-gray-100 hover:border-gray-200'}`}
                    >
                      <span className="z-10">{day}</span>
                      
                      {/* Detalles del Pedido dentro del calendario */}
                      {ordenesDelDia.length > 0 && (
                        <div className="mt-1 flex flex-col items-center w-full overflow-hidden">
                          <span className={`text-[9px] sm:text-xs px-1.5 py-0.5 rounded shadow-sm w-full truncate font-bold ${isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-500 text-white'}`}>
                            {ordenesDelDia.length} Pedido{ordenesDelDia.length !== 1 ? 's' : ''}
                          </span>
                          <span className={`hidden sm:block text-[9px] truncate w-full mt-0.5 font-medium px-1 ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {ordenesDelDia.map(o => o.cliente).join(', ')}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="bg-slate-800 text-white shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-lg hidden sm:block">Control de Pagos</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setVista('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${vista === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                Panel de Trabajo
              </button>
              <button 
                onClick={() => setVista('inventario')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${vista === 'inventario' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <Package className="w-4 h-4" /> Inventario
              </button>
              <button 
                onClick={() => setVista('historial')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${vista === 'historial' || vista === 'detalleCierre' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <History className="w-4 h-4" /> Historial
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full p-4 sm:p-6 md:p-8">
        
        {/* --- VISTA: DASHBOARD PRINCIPAL --- */}
        {vista === 'dashboard' && (
          <>
            <header className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Semana Actual</h1>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  {estadoGuardado === 'sincronizado' && <span className="flex items-center gap-1 text-green-600"><Cloud className="w-3 h-3" /> Nube Sincronizada</span>}
                  {estadoGuardado === 'guardando' && <span className="flex items-center gap-1 text-orange-600"><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</span>}
                  {estadoGuardado === 'error' && <span className="flex items-center gap-1 text-red-600"><CloudOff className="w-3 h-3" /> Error de Conexión</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => exportarExcel(datos, "Reporte_Actual.xls")} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" /> Exportar
                </button>
                <button onClick={() => setMostrarModalCierre(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                  <Archive className="w-4 h-4" /> Realizar Cierre
                </button>
              </div>
            </header>
            {renderTablas(datos, false)}
          </>
        )}

        {/* --- VISTA: HISTORIAL DE CIERRES --- */}
        {vista === 'historial' && (
          <div>
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-8 h-8 text-indigo-600" />
                Historial
              </h1>
              <p className="text-slate-500 mt-1">Revisa la información guardada y deducciones.</p>

              <div className="flex gap-4 mt-6 border-b border-gray-200">
                <button 
                  onClick={() => setSubVistaHistorial('cierres')}
                  className={`pb-3 px-2 text-sm font-semibold transition-colors ${subVistaHistorial === 'cierres' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Historial de Cierres
                </button>
                <button 
                  onClick={() => setSubVistaHistorial('deducciones')}
                  className={`pb-3 px-2 text-sm font-semibold transition-colors ${subVistaHistorial === 'deducciones' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Historial de Deducciones
                </button>
              </div>
            </header>

            {/* --- FILTROS DE TIEMPO --- */}
            <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-500 mr-2 flex items-center gap-1"><Calendar className="w-4 h-4"/> Filtrar:</span>
              <button onClick={() => setFiltroTiempo('todos')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtroTiempo === 'todos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
              <button onClick={() => setFiltroTiempo('hoy')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtroTiempo === 'hoy' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoy</button>
              <button onClick={() => setFiltroTiempo('semana')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtroTiempo === 'semana' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Esta Semana</button>
              <button onClick={() => setFiltroTiempo('mes')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtroTiempo === 'mes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Este Mes</button>
              
              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                <button onClick={() => setFiltroTiempo('ano')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtroTiempo === 'ano' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Por Año:</button>
                <select 
                  className="text-xs font-bold border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 py-1.5 px-3 bg-gray-50 cursor-pointer"
                  value={filtroAno}
                  onChange={(e) => { setFiltroAno(e.target.value); setFiltroTiempo('ano'); }}
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
            </div>

            {subVistaHistorial === 'cierres' && (
              <>
                {cierresFiltrados.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                    <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No hay cierres para este periodo</h3>
                    <p>Prueba cambiando el filtro de fecha o ve al Panel de Trabajo para guardar uno nuevo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cierresFiltrados.map(cierre => (
                      <div key={cierre.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="bg-indigo-50 border-b border-indigo-100 p-4">
                          <h3 className="text-lg font-bold text-indigo-900 flex items-center justify-between">
                            {cierre.nombre}
                            <Calendar className="w-5 h-5 text-indigo-400" />
                          </h3>
                          <p className="text-xs text-indigo-600 mt-1">
                            Cerrado el: {new Date(cierre.fecha).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Ventas (USD):</span>
                            <span className="font-bold text-gray-800">{formatoUSD(cierre.resumen.totalVendido)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Recibido (Bs):</span>
                            <span className="font-bold text-emerald-600">{formatoBs(cierre.resumen.totalCobrado)}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                          <button 
                            onClick={() => {
                              setCierreSeleccionado(cierre);
                              setVista('detalleCierre');
                            }}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                          >
                            Ver Detalle Completo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {subVistaHistorial === 'deducciones' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ReceiptText className="w-5 h-5 text-red-400" />
                    Registro de Deducciones
                  </h2>
                </div>
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Banco</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3 text-right">Monto (Bs)</th>
                        <th className="px-4 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deduccionesFiltradas.map(d => (
                        <tr key={d.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{new Date(d.fecha).toLocaleDateString('es-VE')}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{d.banco}</td>
                          <td className="px-4 py-3 text-gray-700">{d.descripcion}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-bold">- {formatoBs(d.monto)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => eliminarDeduccion(d.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 mx-auto"/></button>
                          </td>
                        </tr>
                      ))}
                      {deduccionesFiltradas.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay deducciones registradas para este periodo.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VISTA: DETALLE DE UN CIERRE ESPECÍFICO --- */}
        {vista === 'detalleCierre' && cierreSeleccionado && (
          <div>
            <header className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div>
                <button onClick={() => setVista('historial')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 mb-2">
                  <ArrowLeft className="w-4 h-4" /> Volver al Historial
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Cierre: {cierreSeleccionado.nombre}</h1>
                <p className="text-slate-500 text-sm">Solo lectura. Fecha del cierre: {new Date(cierreSeleccionado.fecha).toLocaleString('es-VE')}</p>
              </div>
              <button 
                onClick={() => exportarExcel(cierreSeleccionado.datosGuardados, `Cierre_${cierreSeleccionado.nombre.replace(/\s+/g, '_')}.xls`)} 
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" /> Exportar este Cierre
              </button>
            </header>
            
            {/* Renderiza las tablas pasando los datos guardados de este cierre y activando el "modo lectura" */}
            {renderTablas(cierreSeleccionado.datosGuardados, true)}
          </div>
        )}

        {/* --- VISTA: INVENTARIO --- */}
        {vista === 'inventario' && (
          <div>
            <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-8 h-8 text-indigo-600" />
                  Inventario de Materiales
                </h1>
                <p className="text-slate-500 mt-1">Gestiona el stock de materiales disponibles.</p>
              </div>
              <button 
                onClick={abrirModalInventario}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Añadir Material
              </button>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                    <tr>
                      <th className="px-6 py-4">Material</th>
                      <th className="px-6 py-4">Unidad de Medida</th>
                      <th className="px-6 py-4 text-center">Cantidad en Stock</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map(material => (
                      <tr key={material.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{material.nombre}</td>
                        <td className="px-6 py-4 text-gray-600">{material.unidad}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-lg p-1 w-fit mx-auto border border-gray-200">
                            <button onClick={() => ajustarCantidadMaterial(material.id, -1)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><MinusCircle className="w-5 h-5" /></button>
                            <span className="font-bold text-lg w-12 text-center text-indigo-700">{material.cantidad}</span>
                            <button onClick={() => ajustarCantidadMaterial(material.id, 1)} className="text-gray-500 hover:text-green-600 hover:bg-green-50 p-1.5 rounded-md transition-colors"><PlusCircle className="w-5 h-5" /></button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => eliminarMaterial(material.id)} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors" title="Eliminar Material">
                            <Trash2 className="w-5 h-5 mx-auto"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inventario.length === 0 && (
                      <tr><td colSpan="4" className="text-center py-12 text-gray-500">No hay materiales en el inventario. Haz clic en "Añadir Material" para empezar.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL PARA CONFIGURAR PAGO Y TASA (NUEVO) --- */}
      {modalPago.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <DollarSign className="w-6 h-6" />
                <h2 className="text-xl font-bold">Configurar Pago {modalPago.tipoPago}</h2>
              </div>
              <button onClick={() => setModalPago({...modalPago, isOpen: false})} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6 text-sm">
              Asigna el monto recibido y la tasa de cambio específica para este pago.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto en Dólares ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="any"
                  autoFocus
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg font-medium"
                  placeholder="0.00"
                  value={modalPago.monto}
                  onChange={(e) => setModalPago({...modalPago, monto: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Cambio (Bs)</label>
                <input 
                  type="number" 
                  min="0"
                  step="any"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg font-medium"
                  placeholder="0.00"
                  value={modalPago.tasa}
                  onChange={(e) => setModalPago({...modalPago, tasa: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button 
                onClick={() => setModalPago({...modalPago, isOpen: false})}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarModalPago}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Guardar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PARA CONFIRMAR EL CIERRE --- */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Archive className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Realizar Cierre</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Estás a punto de guardar la información actual y <strong>limpiar las tablas</strong> para empezar un nuevo periodo.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cierre / Periodo</label>
              <input 
                type="text" 
                autoFocus
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                placeholder="Ej: Semana del 12 al 18 de Agosto"
                value={nombreCierre}
                onChange={(e) => setNombreCierre(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMostrarModalCierre(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={procesarCierre}
                className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Confirmar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PARA AÑADIR DEDUCCIÓN --- */}
      {mostrarModalDeduccion && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <MinusCircle className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Añadir Deducción</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Registra un gasto o deducción de la cuenta de <strong>{bancoDeduccion}</strong>.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la Deducción</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Ej: Pago de comisiones, Mantenimiento..."
                  value={formDeduccion.descripcion}
                  onChange={(e) => setFormDeduccion({...formDeduccion, descripcion: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Bs)</label>
                <input 
                  type="number" 
                  min="0"
                  step="any"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="0.00"
                  value={formDeduccion.monto}
                  onChange={(e) => setFormDeduccion({...formDeduccion, monto: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMostrarModalDeduccion(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={procesarDeduccion}
                disabled={!formDeduccion.descripcion || !formDeduccion.monto}
                className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Guardar Deducción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PARA AÑADIR INVENTARIO --- */}
      {mostrarModalInventario && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-indigo-600 mb-4">
              <Package className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Añadir Material</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Ingresa los detalles del nuevo material para tu inventario.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Material</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ej: Tela de Algodón, Hilos, Agujas..."
                  value={formInventario.nombre}
                  onChange={(e) => setFormInventario({...formInventario, nombre: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Inicial</label>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                    value={formInventario.cantidad}
                    onChange={(e) => setFormInventario({...formInventario, cantidad: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    value={formInventario.unidad}
                    onChange={(e) => setFormInventario({...formInventario, unidad: e.target.value})}
                  >
                    <option value="Unidades">Unidades</option>
                    <option value="Metros">Metros</option>
                    <option value="Centímetros">Centímetros</option>
                    <option value="Litros">Litros</option>
                    <option value="Kilos">Kilos</option>
                    <option value="Gramos">Gramos</option>
                    <option value="Rollos">Rollos</option>
                    <option value="Cajas">Cajas</option>
                    <option value="Pares">Pares</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMostrarModalInventario(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={procesarMaterial}
                disabled={!formInventario.nombre || !formInventario.cantidad}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Guardar Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETALLES DEL DÍA (NUEVO) --- */}
      {diaSeleccionadoDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 text-indigo-600">
                <Calendar className="w-8 h-8" />
                <h2 className="text-xl sm:text-2xl font-bold capitalize">
                  {diaSeleccionadoDetalle.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <button onClick={() => setDiaSeleccionadoDetalle(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2">
              {(() => {
                const dateStr = `${diaSeleccionadoDetalle.getFullYear()}-${String(diaSeleccionadoDetalle.getMonth() + 1).padStart(2, '0')}-${String(diaSeleccionadoDetalle.getDate()).padStart(2, '0')}`;
                const ordenesModal = [];
                
                Object.keys(datos).forEach(persona => {
                  datos[persona].forEach(fila => {
                    if (formatInputDate(fila.fecha) === dateStr && fila.cliente && fila.cliente.trim() !== '') {
                      const calc = calcularValores(fila);
                      ordenesModal.push({ persona, fila, calc });
                    }
                  });
                });

                if (ordenesModal.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-lg font-medium">No hay pedidos registrados en esta fecha.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {ordenesModal.map((orden, index) => {
                      const faltaT1 = orden.calc.p1 > 0 && orden.calc.t1 === 0;
                      const faltaT2 = orden.calc.p2 > 0 && orden.calc.t2 === 0;
                      const estaPagadoCompleto = !faltaT1 && !faltaT2 && orden.calc.totalPagadoUSD > 0;

                      return (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:shadow-sm transition-shadow">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{orden.persona}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${orden.fila.entregado === 'Sí' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {orden.fila.entregado === 'Sí' ? 'Entregado' : 'No Entregado'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{orden.fila.cliente}</h3>
                            <div className="text-sm text-gray-500 mt-1 flex gap-3">
                              <span>Pago 1: <strong className="text-gray-700">{formatoUSD(orden.calc.p1)}</strong></span>
                              <span>Pago 2: <strong className="text-gray-700">{formatoUSD(orden.calc.p2)}</strong></span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-0.5">Total Dólares</p>
                              <p className="font-bold text-lg text-gray-800">{formatoUSD(orden.calc.totalPagadoUSD)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-0.5">Total Bolívares</p>
                              <p className="font-bold text-lg text-emerald-600">{formatoBs(orden.calc.totalBs)}</p>
                            </div>
                            <div className="ml-2">
                              {orden.calc.totalPagadoUSD === 0 ? '-' : (estaPagadoCompleto ? 
                                <span className="bg-green-500 text-white p-2 rounded-lg flex items-center justify-center shadow-sm" title="Pagado Completo"><Wallet className="w-5 h-5"/></span> : 
                                <span className="bg-orange-500 text-white p-2 rounded-lg flex items-center justify-center shadow-sm" title="Pago Pendiente"><Loader2 className="w-5 h-5"/></span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}