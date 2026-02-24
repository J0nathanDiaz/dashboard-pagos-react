import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Calculator, Wallet, Users, ChevronRight, Download, Cloud, CloudOff, Loader2, Archive, History, ArrowLeft, Calendar, Building2 } from 'lucide-react';

// --- 1. CONFIGURACIÓN REAL DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ⚠️ PUNTO 4: REEMPLAZA ESTO CON LOS DATOS DE TU CONSOLA DE FIREBASE ⚠️
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

const generarId = () => Math.random().toString(36).substr(2, 9);
const generarFilaVacia = () => ({ id: generarId(), cliente: '', totalUSD: '', adelantoUSD: '', tasa1: '', tasa2: '' });

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
    
    // Ruta en tu base de datos de Firebase
    const docRef = doc(db, 'usuarios', user.uid, 'dashboardData', 'estadoActual');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDatos(data.datos || estadoInicial);
        setCierres(data.cierres || []);
      }
      setCargando(false);
    }, (error) => {
      console.error("Error leyendo datos:", error);
      setEstadoGuardado('error');
      setCargando(false);
    });

    return () => unsubscribe();
  }, [user]);

  const guardarDatosEnNube = async (nuevosDatos, nuevosCierres = cierres) => {
    setDatos(nuevosDatos);
    setCierres(nuevosCierres);
    
    if (user) {
      setEstadoGuardado('guardando');
      const docRef = doc(db, 'usuarios', user.uid, 'dashboardData', 'estadoActual');
      try {
        await setDoc(docRef, { datos: nuevosDatos, cierres: nuevosCierres });
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
  };

  const eliminarFila = (persona, id) => {
    const nuevosDatos = {
      ...datos,
      [persona]: datos[persona].filter(registro => registro.id !== id)
    };
    guardarDatosEnNube(nuevosDatos);
  };

  // --- 5. LÓGICA DE CIERRES ---
  const procesarCierre = () => {
    if (!nombreCierre.trim()) return alert("Por favor ingresa un nombre para el cierre (Ej: Semana 1)");

    let totalVendido = 0;
    let totalCobrado = 0;

    Object.keys(datos).forEach(persona => {
      datos[persona].forEach(fila => {
        const calc = calcularValores(fila);
        totalVendido += (parseFloat(fila.totalUSD) || 0);
        totalCobrado += calc.totalBs;
      });
    });

    const nuevoCierre = {
      id: generarId(),
      fecha: new Date().toISOString(),
      nombre: nombreCierre,
      resumen: { totalVendido, totalCobrado },
      datosGuardados: JSON.parse(JSON.stringify(datos)) 
    };

    const nuevosCierres = [nuevoCierre, ...cierres]; 
    const nuevosDatos = estadoInicial; 

    guardarDatosEnNube(nuevosDatos, nuevosCierres);
    setNombreCierre('');
    setMostrarModalCierre(false);
    setVista('historial'); 
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
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Precio Total (USD)</th>
              <th>Reinversión (USD)</th>
              <th>Valor Bruto/Saldo (USD)</th>
              <th>Sueldo 20% (USD)</th>
              <th>Ahorro 10% (USD)</th>
              <th>Dueñas 70% (USD)</th>
              <th>C/Dueña (USD)</th>
              <th>Tasa 1</th>
              <th>Tasa 2</th>
              <th>Pago Reinversión (Bs)</th>
              <th>Pago Restante (Bs)</th>
              <th>Total Recibido (Bs)</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(datosAExportar).forEach(persona => {
      datosAExportar[persona].forEach(fila => {
        if (!fila.cliente && !fila.totalUSD && !fila.adelantoUSD) return;

        const calc = calcularValores(fila);
        const estaPagadoCompleto = calc.saldoUSD === 0 || (calc.saldoUSD > 0 && calc.t2 > 0);
        const estatus = estaPagadoCompleto ? "Completado" : "Pendiente";
        
        tablaHTML += `
          <tr>
            <td class="bold">${persona}</td>
            <td>${fila.cliente || "Sin nombre"}</td>
            <td class="num">${fila.totalUSD || 0}</td>
            <td class="num">${fila.adelantoUSD || 0}</td>
            <td class="num bold" style="background-color: #f3f4f6;">${calc.saldoUSD.toFixed(2)}</td>
            <td class="num text-blue">${calc.sueldo.toFixed(2)}</td>
            <td class="num text-blue">${calc.ahorro.toFixed(2)}</td>
            <td class="num text-purple">${calc.duenasTotal.toFixed(2)}</td>
            <td class="num text-purple bold">${calc.porDuena.toFixed(2)}</td>
            <td class="num">${fila.tasa1 || 0}</td>
            <td class="num">${fila.tasa2 || 0}</td>
            <td class="num">${calc.adelantoBs.toFixed(2)}</td>
            <td class="num">${calc.restanteBs.toFixed(2)}</td>
            <td class="num bold" style="background-color: #ecfdf5;">${calc.totalBs.toFixed(2)}</td>
            <td style="color: ${estaPagadoCompleto ? 'green' : 'orange'}; font-weight: bold;">${estatus}</td>
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
    const total = parseFloat(registro.totalUSD) || 0;
    const adelanto = parseFloat(registro.adelantoUSD) || 0;
    const t1 = parseFloat(registro.tasa1) || 0;
    const t2 = parseFloat(registro.tasa2) || 0;

    const saldoUSD = Math.max(0, total - adelanto);
    const sueldo = saldoUSD * 0.20;
    const ahorro = saldoUSD * 0.10;
    const duenasTotal = saldoUSD * 0.70;
    const porDuena = duenasTotal / 2;

    const adelantoBs = adelanto * t1;
    const restanteBs = t2 > 0 ? saldoUSD * t2 : 0; 
    const totalBs = adelantoBs + restanteBs;

    const sueldoBs = t2 > 0 ? sueldo * t2 : 0;
    const ahorroBs = t2 > 0 ? ahorro * t2 : 0;
    const duenasTotalBs = t2 > 0 ? duenasTotal * t2 : 0;
    const porDuenaBs = t2 > 0 ? porDuena * t2 : 0;

    return { saldoUSD, sueldo, ahorro, duenasTotal, porDuena, adelantoBs, restanteBs, totalBs, t2, sueldoBs, ahorroBs, duenasTotalBs, porDuenaBs };
  };

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

  // --- 8. RENDERIZADO DEL DASHBOARD ---
  const renderTablas = (datosAUsar, esSoloLectura = false) => {
    const registrosActuales = datosAUsar[pestanaActiva] || [];

    const resumen = registrosActuales.reduce((acc, curr) => {
      const calc = calcularValores(curr);
      acc.totalVendidoUSD += (parseFloat(curr.totalUSD) || 0);
      acc.totalCobradoBs += calc.totalBs;
      acc.porCobrarUSD += calc.saldoUSD;
      
      acc.banescoBs += (calc.sueldoBs + calc.duenasTotalBs);
      acc.banescoSueldoBs += calc.sueldoBs;
      acc.banescoDuenasBs += calc.duenasTotalBs;
      acc.tesoroBs += calc.adelantoBs;
      acc.provincialBs += calc.ahorroBs;
      
      return acc;
    }, { totalVendidoUSD: 0, totalCobradoBs: 0, porCobrarUSD: 0, banescoBs: 0, banescoSueldoBs: 0, banescoDuenasBs: 0, tesoroBs: 0, provincialBs: 0 });

    return (
      <>
        {/* Tarjetas de Resumen Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vendido (USD) - {pestanaActiva}</p>
              <p className="text-2xl font-bold text-gray-800">{formatoUSD(resumen.totalVendidoUSD)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Por Cobrar (USD) - {pestanaActiva}</p>
              <p className="text-2xl font-bold text-gray-800">{formatoUSD(resumen.porCobrarUSD)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Wallet className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Recibido (Bs) - {pestanaActiva}</p>
              <p className="text-2xl font-bold text-gray-800">{formatoBs(resumen.totalCobradoBs)}</p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Bancos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500"></div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div className="w-full">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Banesco</p>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Sueldo:</span>
                <span className="text-sm font-bold text-gray-800">{formatoBs(resumen.banescoSueldoBs)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Dueñas:</span>
                <span className="text-sm font-bold text-gray-800">{formatoBs(resumen.banescoDuenasBs)}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-teal-600">Total:</span>
                <span className="text-sm font-bold text-teal-700">{formatoBs(resumen.banescoBs)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500"></div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Banco del Tesoro</p>
              <p className="text-xs text-gray-500 mb-1">Reinversiones</p>
              <p className="text-lg font-bold text-gray-800">{formatoBs(resumen.tesoroBs)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-transform hover:-translate-y-1 relative overflow-hidden h-full">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Building2 className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Provincial</p>
              <p className="text-xs text-gray-500 mb-1">Ahorros</p>
              <p className="text-lg font-bold text-gray-800">{formatoBs(resumen.provincialBs)}</p>
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
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                1. Base de Datos (Dólares y Tasas) {esSoloLectura && " - MODO LECTURA"}
              </h2>
              {!esSoloLectura && (
                <button onClick={() => agregarFila(pestanaActiva)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                  <Plus className="w-4 h-4" /> Nueva Fila
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Precio Total ($)</th>
                    <th className="px-4 py-3">Reinversión ($)</th>
                    <th className="px-4 py-3 bg-indigo-50 text-indigo-800">Valor Bruto / Saldo ($)</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Sueldo 20%</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Ahorro 10%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">Dueñas 70%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">C/Dueña (35%)</th>
                    <th className="px-4 py-3">Tasa 1 (Reinv.)</th>
                    <th className="px-4 py-3">Tasa 2 (Restante)</th>
                    {!esSoloLectura && <th className="px-4 py-3 text-center">Borrar</th>}
                  </tr>
                </thead>
                <tbody>
                  {registrosActuales.map((fila) => {
                    const { saldoUSD, sueldo, ahorro, duenasTotal, porDuena } = calcularValores(fila);
                    return (
                      <tr key={fila.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2">
                          <input type="text" disabled={esSoloLectura} className={`w-full p-2 border border-gray-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-indigo-500'}`} placeholder="Nombre..." value={fila.cliente} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'cliente', e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="any" disabled={esSoloLectura} className={`w-20 p-2 border border-gray-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-indigo-500'}`} placeholder="0" value={fila.totalUSD} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'totalUSD', e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="any" disabled={esSoloLectura} className={`w-20 p-2 border border-gray-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent' : 'focus:ring-2 focus:ring-indigo-500'}`} placeholder="0" value={fila.adelantoUSD} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'adelantoUSD', e.target.value)} />
                        </td>
                        <td className="px-4 py-2 bg-indigo-50 font-bold text-indigo-700">{formatoUSD(saldoUSD)}</td>
                        <td className="px-4 py-2 bg-blue-50/50 text-blue-700 font-medium">{formatoUSD(sueldo)}</td>
                        <td className="px-4 py-2 bg-blue-50/50 text-blue-700 font-medium">{formatoUSD(ahorro)}</td>
                        <td className="px-4 py-2 bg-purple-50/50 text-purple-700 font-medium">{formatoUSD(duenasTotal)}</td>
                        <td className="px-4 py-2 bg-purple-50/50 text-purple-700 font-bold">{formatoUSD(porDuena)}</td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="any" disabled={esSoloLectura} className={`w-20 p-2 border border-orange-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent text-gray-800 font-medium' : 'bg-orange-50 focus:ring-2 focus:ring-orange-500'}`} placeholder="Bs." value={fila.tasa1} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'tasa1', e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="any" disabled={esSoloLectura} className={`w-20 p-2 border border-orange-300 rounded outline-none ${esSoloLectura ? 'bg-transparent border-transparent text-gray-800 font-medium' : 'bg-orange-50 focus:ring-2 focus:ring-orange-500'}`} placeholder="Bs." value={fila.tasa2} onChange={(e) => actualizarRegistro(pestanaActiva, fila.id, 'tasa2', e.target.value)} />
                        </td>
                        {!esSoloLectura && (
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => eliminarFila(pestanaActiva, fila.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-5 h-5" /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!esSoloLectura && registrosActuales.length === 0 && (
                    <tr><td colSpan="11" className="text-center py-8 text-gray-500">No hay registros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA BOLÍVARES (Siempre solo lectura) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div className="absolute inset-0 bg-gray-50/20 pointer-events-none z-10"></div>
            <div className={`p-4 flex justify-between items-center ${esSoloLectura ? 'bg-emerald-800' : 'bg-emerald-700'}`}>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-emerald-300" />
                2. Cálculos en Bolívares (Automático)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 font-bold text-gray-800">Precio Total (Bs)</th>
                    <th className="px-4 py-3">Reinversión (Bs)</th>
                    <th className="px-4 py-3 bg-emerald-50 text-emerald-800">Valor Bruto / Saldo (Bs)</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Sueldo 20%</th>
                    <th className="px-4 py-3 bg-blue-50 text-blue-800">Ahorro 10%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">Dueñas 70%</th>
                    <th className="px-4 py-3 bg-purple-50 text-purple-800">C/Dueña (35%)</th>
                    <th className="px-4 py-3">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosActuales.map((fila) => {
                    const { adelantoBs, restanteBs, totalBs, t2, saldoUSD, sueldoBs, ahorroBs, duenasTotalBs, porDuenaBs } = calcularValores(fila);
                    const estaPagadoCompleto = saldoUSD === 0 || (saldoUSD > 0 && t2 > 0);
                    
                    return (
                      <tr key={`bs-${fila.id}`} className="border-b bg-white hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-4 font-medium text-gray-700">{fila.cliente || <span className="text-gray-400 italic">Sin nombre</span>}</td>
                        <td className="px-4 py-4 font-bold text-gray-800">{formatoBs(totalBs)}</td>
                        <td className="px-4 py-4 text-gray-600">{adelantoBs > 0 ? formatoBs(adelantoBs) : '-'}</td>
                        <td className="px-4 py-4 bg-emerald-50 text-emerald-700 font-medium">{restanteBs > 0 ? formatoBs(restanteBs) : (t2 === 0 && saldoUSD > 0 ? <span className="text-orange-400 text-xs italic">Esperando Tasa...</span> : '-')}</td>
                        <td className="px-4 py-4 bg-blue-50/50 text-blue-700 font-medium">{sueldoBs > 0 ? formatoBs(sueldoBs) : '-'}</td>
                        <td className="px-4 py-4 bg-blue-50/50 text-blue-700 font-medium">{ahorroBs > 0 ? formatoBs(ahorroBs) : '-'}</td>
                        <td className="px-4 py-4 bg-purple-50/50 text-purple-700 font-medium">{duenasTotalBs > 0 ? formatoBs(duenasTotalBs) : '-'}</td>
                        <td className="px-4 py-4 bg-purple-50/50 text-purple-700 font-bold">{porDuenaBs > 0 ? formatoBs(porDuenaBs) : '-'}</td>
                        <td className="px-4 py-4">
                          {estaPagadoCompleto ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Completado</span> : <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">Pendiente</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                onClick={() => setVista('historial')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${vista === 'historial' || vista === 'detalleCierre' ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <History className="w-4 h-4" /> Historial de Cierres
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        
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
                Historial de Cierres
              </h1>
              <p className="text-slate-500 mt-1">Revisa la información guardada de semanas anteriores.</p>
            </header>

            {cierres.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay cierres guardados</h3>
                <p>Ve al Panel de Trabajo y haz clic en "Realizar Cierre" para guardar tu primera semana.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cierres.map(cierre => (
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
      </div>

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
    </div>
  );
}