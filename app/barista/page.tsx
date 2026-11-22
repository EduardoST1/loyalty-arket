"use client";

import { availableStamps, STAMP_GOAL, STAMP_REWARD_SLUG } from "@/lib/stamps";
import Image from "next/image";
import { useState, FormEvent, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  qrCode: string;
  pin: string;
  puntos: number;
  visitas: number;
  sellosCanjeados: number;
  nivel: string;
  logros?: Array<{
    id: number;
    nombre: string;
    icono: string;
    color: string;
  }>;
}

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  puntosBase: number;
  esTemporada: boolean;
}

interface TipoCanje {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  costoPuntos: number;
}

interface VisitaResult {
  visitas: number;
  puntosGanados: number;
  totalPuntos: number;
  logrosDesbloqueados?: Array<{
    logro: {
      id: number;
      nombre: string;
      descripcion: string;
      icono: string;
      color: string;
      puntosRecompensa: number;
    };
    esNuevo: boolean;
  }>;
  walletSync?: {
    google: { ok: boolean; error?: string } | null;
  };
}

export default function BaristaPanel() {
  const [searchType, setSearchType] = useState<"telefono" | "pin" | "qr">("pin");
  const [searchValue, setSearchValue] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<number[]>([]);
  const [canjes, setCanjes] = useState<TipoCanje[]>([]);
  const [canjeSeleccionado, setCanjeSeleccionado] = useState<number | null>(null);
  const [modo, setModo] = useState<"visita" | "canje">("visita");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Auto-focus al input al cargar
    inputRef.current?.focus();
    // Cargar categorías y canjes
    loadCategorias();
    loadCanjes();
  }, []);

  const loadCategorias = async () => {
    try {
      const response = await fetch("/api/categorias");
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (err) {
      console.error("Error al cargar categorías:", err);
    }
  };

  const loadCanjes = async () => {
    try {
      const response = await fetch("/api/canjes");
      if (response.ok) {
        const data = await response.json();
        setCanjes(data);
      }
    } catch (err) {
      console.error("Error al cargar canjes:", err);
    }
  };

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanner = () => {
    setScannerActive(true);
    setError(null);

    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success
          scanner.clear();
          setScannerActive(false);
          setSearchValue(decodedText);
          setSearchType("qr");
          // Auto-buscar
          buscarPorQR(decodedText);
        },
        (error) => {
          // Error - no hacemos nada, es normal que haya errores mientras escanea
        }
      );

      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerActive(false);
    inputRef.current?.focus();
  };

  const buscarPorQR = async (qrCode: string) => {
    setLoading(true);
    setError(null);
    setCliente(null);

    try {
      const params = new URLSearchParams({
        type: "qr",
        value: qrCode,
      });

      const response = await fetch(`/api/barista/buscar?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Cliente no encontrado");
      }

      const data = await response.json();
      setCliente(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCliente(null);
    setSuccessMessage(null);

    try {
      const params = new URLSearchParams({
        type: searchType,
        value: searchValue,
      });

      const response = await fetch(`/api/barista/buscar?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Cliente no encontrado");
      }

      const data = await response.json();
      
      // Cargar logros del cliente
      const logrosResponse = await fetch(`/api/clientes/${data.id}/logros`);
      if (logrosResponse.ok) {
        const logrosData = await logrosResponse.json();
        data.logros = logrosData.logros.slice(0, 5); // Solo mostrar los últimos 5
      }
      
      setCliente(data);
      setSearchValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRegistrarVisita = async () => {
    if (!cliente) return;
    
    if (categoriasSeleccionadas.length === 0) {
      setError("Debes seleccionar al menos una categoría");
      return;
    }
    
    setRegistrando(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/barista/registrar-visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clienteId: cliente.id,
          categorias: categoriasSeleccionadas,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al registrar visita");
      }

      const result: VisitaResult = await response.json();
      
      // Actualizar cliente con nuevos valores
      setCliente({
        ...cliente,
        visitas: result.visitas,
        puntos: result.totalPuntos,
      });

      // Mensaje de éxito con logros
      let mensaje = `Sello registrado. Saldo de sellos: ${result.visitas - cliente.sellosCanjeados}.`;
      
      // Agregar logros desbloqueados al mensaje
      if (result.logrosDesbloqueados && result.logrosDesbloqueados.length > 0) {
        const logros = result.logrosDesbloqueados
          .map(l => `\n${l.logro.icono} ${l.logro.nombre} +${l.logro.puntosRecompensa}pts`)
          .join("");
        mensaje += `\n\n🏆 ¡LOGROS DESBLOQUEADOS!${logros}`;
      }

      const walletErr = result.walletSync?.google;
      if (walletErr && !walletErr.ok) {
        mensaje += `\n\n⚠️ Wallet no actualizado: ${walletErr.error ?? "error desconocido"}`;
      }
      
      setSuccessMessage(mensaje);

      // Limpiar después de 5 segundos (más tiempo si hay logros)
      const delay = result.logrosDesbloqueados && result.logrosDesbloqueados.length > 0 ? 5000 : 3000;
      setTimeout(() => {
        setCliente(null);
        setSuccessMessage(null);
        setCategoriasSeleccionadas([]);
        inputRef.current?.focus();
      }, delay);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRegistrando(false);
    }
  };

  const handleCanjearRecompensa = async () => {
    if (!cliente || !canjeSeleccionado) return;
    
    setRegistrando(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/barista/canjear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clienteId: cliente.id,
          tipoCanjeId: canjeSeleccionado,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al canjear recompensa");
      }

      const result = await response.json();
      
      // Actualizar cliente con nuevos valores
      setCliente({
        ...cliente,
        puntos: result.cliente.puntosAcumulados,
        sellosCanjeados: result.cliente.sellosCanjeados,
      });

      // Mensaje de éxito
      setSuccessMessage(`${result.canje.tipoCanje} canjeado.`);

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setCliente(null);
        setSuccessMessage(null);
        setCanjeSeleccionado(null);
        inputRef.current?.focus();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRegistrando(false);
    }
  };

  const handleNuevaBusqueda = () => {
    setCliente(null);
    setError(null);
    setSuccessMessage(null);
    setSearchValue("");
    setCategoriasSeleccionadas([]);
    setCanjeSeleccionado(null);
    setModo("visita");
    inputRef.current?.focus();
  };

  const toggleCategoria = (categoriaId: number) => {
    setCategoriasSeleccionadas(prev => 
      prev.includes(categoriaId)
        ? prev.filter(id => id !== categoriaId)
        : [...prev, categoriaId]
    );
  };

  return (
    <div className="min-h-screen bg-dulza-cream-light p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative w-40 h-20 mx-auto mb-4">
            <Image
              src={process.env.NEXT_PUBLIC_LOGO_PATH || "/logo.png"}
              alt="Logo"
              fill
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-dulza-chocolate mb-2">
            Panel de Barista
          </h1>
          <p className="text-dulza-chocolate-dark/80 text-lg">
            Registra visitas y gana sonrisas ☕
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-10 border-4 border-dulza-jade/20">
          {!cliente ? (
            <>
              {/* Selector de tipo de búsqueda */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => {
                    setSearchType("pin");
                    setSearchValue("");
                    stopScanner();
                    inputRef.current?.focus();
                  }}
                  className={`py-4 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    searchType === "pin" && !scannerActive
                      ? "bg-gradient-to-r from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105"
                      : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light"
                  }`}
                >
                  🔢 PIN
                </button>
                <button
                  onClick={() => {
                    setSearchType("telefono");
                    setSearchValue("");
                    stopScanner();
                    inputRef.current?.focus();
                  }}
                  className={`py-4 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    searchType === "telefono" && !scannerActive
                      ? "bg-gradient-to-r from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105"
                      : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light"
                  }`}
                >
                  📱 Teléfono
                </button>
                <button
                  onClick={() => {
                    setSearchType("qr");
                    setSearchValue("");
                    inputRef.current?.focus();
                    stopScanner();
                  }}
                  className={`py-4 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    searchType === "qr" && !scannerActive
                      ? "bg-gradient-to-r from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105"
                      : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light"
                  }`}
                >
                  🔍 QR
                </button>
              </div>

              {/* Botón de Scanner (solo visible cuando searchType es qr) */}
              {searchType === "qr" && !scannerActive && (
                <button
                  onClick={startScanner}
                  className="w-full mb-4 bg-gradient-to-r from-dulza-jade-light to-dulza-jade text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  📷 Escanear con Cámara
                </button>
              )}

              {/* Scanner Container */}
              {scannerActive && (
                <div className="mb-6">
                  <div id="qr-reader" className="rounded-2xl overflow-hidden border-4 border-dulza-jade shadow-xl"></div>
                  <button
                    onClick={stopScanner}
                    className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300"
                  >
                    ❌ Cancelar Escaneo
                  </button>
                </div>
              )}

              {/* Formulario de búsqueda manual */}
              {!scannerActive && (
                <form onSubmit={handleSearch} className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={
                    searchType === "telefono"
                      ? "Ingresa 10 dígitos: 4421234567"
                      : searchType === "pin"
                      ? "Ingresa 4 dígitos: 1234"
                      : "Escanea o pega el código QR"
                  }
                  className="w-full px-6 py-5 rounded-2xl border-4 border-dulza-jade/20 focus:border-dulza-jade focus:ring-4 focus:ring-dulza-jade/20 outline-none transition-all text-2xl text-center font-mono text-dulza-chocolate-dark shadow-inner"
                  disabled={loading}
                  maxLength={searchType === "telefono" ? 10 : searchType === "pin" ? 4 : 100}
                />
                <button
                  type="submit"
                  disabled={loading || !searchValue}
                  className="w-full mt-4 bg-gradient-to-r from-dulza-jade to-dulza-jade-light hover:from-dulza-jade-light hover:to-dulza-jade text-white font-bold py-5 px-8 rounded-2xl text-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Buscando...
                    </span>
                  ) : (
                    "🔍 Buscar Cliente"
                  )}
                </button>
              </form>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-red-800 text-center animate-[shake_0.5s_ease-in-out]">
                  <span className="text-2xl mr-2">⚠️</span>
                  <span className="text-lg font-medium">{error}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Cliente encontrado */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-dulza-jade to-dulza-jade-light rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-white font-bold shadow-lg">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-3xl font-bold text-dulza-chocolate mb-2">
                  {cliente.nombre}
                </h2>
                <p className="text-dulza-chocolate-dark/70 text-lg">
                  📱 {cliente.telefono}
                </p>
              </div>

              {/* Toggle Modo: Visita / Canje */}
              {!successMessage && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => {
                      setModo("visita");
                      setCategoriasSeleccionadas([]);
                      setCanjeSeleccionado(null);
                      setError(null);
                    }}
                    className={`py-4 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                      modo === "visita"
                        ? "bg-gradient-to-r from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105"
                        : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light"
                    }`}
                  >
                    ✅ Registrar Visita
                  </button>
                  <button
                    onClick={() => {
                      setModo("canje");
                      setCategoriasSeleccionadas([]);
                      setCanjeSeleccionado(null);
                      setError(null);
                    }}
                    className={`py-4 px-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                      modo === "canje"
                        ? "bg-gradient-to-r from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105"
                        : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light"
                    }`}
                  >
                    🎁 Canjear Recompensa
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-dulza-jade/10 to-dulza-jade-light/10 rounded-2xl p-4 text-center border-2 border-dulza-jade/20">
                  <p className="text-sm text-dulza-chocolate-dark/70 mb-1">Visitas</p>
                  <p className="text-4xl font-bold text-dulza-jade">{cliente.visitas}</p>
                </div>
                <div className="bg-gradient-to-br from-dulza-coffee/10 to-dulza-cookie/10 rounded-2xl p-4 text-center border-2 border-dulza-cookie/30">
                  <p className="text-sm text-dulza-chocolate-dark/70 mb-1">Puntos</p>
                  <p className="text-4xl font-bold text-dulza-coffee">{cliente.puntos}</p>
                </div>
                <div className="bg-gradient-to-br from-dulza-cookie/20 to-dulza-coffee/20 rounded-2xl p-4 text-center border-2 border-dulza-chocolate/20">
                  <p className="text-sm text-dulza-chocolate-dark/70 mb-1">Nivel</p>
                  <p className="text-2xl font-bold text-dulza-chocolate">{cliente.nivel}</p>
                </div>
              </div>

              {/* Logros del Cliente */}
              {cliente.logros && cliente.logros.length > 0 && !successMessage && (
                <div className="mb-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-300/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-dulza-chocolate flex items-center gap-2">
                      🏆 Logros Recientes
                    </h4>
                    <span className="bg-yellow-400 text-dulza-chocolate text-xs px-2 py-1 rounded-full font-bold">
                      {cliente.logros.length}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {cliente.logros.map((logro) => (
                      <div
                        key={logro.id}
                        className="flex-shrink-0 bg-white rounded-xl p-3 text-center min-w-[80px] border-2 hover:scale-105 transition-transform duration-200"
                        style={{ borderColor: logro.color }}
                      >
                        <div className="text-3xl mb-1">{logro.icono}</div>
                        <div className="text-xs font-semibold text-dulza-chocolate truncate">
                          {logro.nombre}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-5 bg-green-50 border-2 border-green-200 rounded-2xl text-green-800 text-center animate-[bounce_0.5s_ease-in-out]">
                  <span className="text-xl font-bold whitespace-pre-line">{successMessage}</span>
                </div>
              )}

              {/* Selección de Categorías o Canjes */}
              {!successMessage && (
                <>
                  {modo === "visita" ? (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-dulza-chocolate mb-4 text-center">
                        ¿Qué consumió?
                      </h3>
                      
                      {/* Categorías Regulares */}
                      {categorias.filter(c => !c.esTemporada).length > 0 && (
                        <div className="mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {categorias.filter(c => !c.esTemporada).map((categoria) => (
                              <button
                                key={categoria.id}
                                onClick={() => toggleCategoria(categoria.id)}
                                disabled={registrando}
                                className={`p-4 rounded-2xl font-semibold text-center transition-all duration-300 ${
                                  categoriasSeleccionadas.includes(categoria.id)
                                    ? "bg-gradient-to-br from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105 border-2 border-dulza-jade-dark"
                                    : "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light border-2 border-dulza-cream"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div className="text-3xl mb-2">{categoria.icono}</div>
                                <div className="text-sm font-semibold">{categoria.nombre}</div>
                                <div className="text-xs mt-1 opacity-80">
                                  +{categoria.puntosBase} pts
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Categorías de Temporada */}
                      {categorias.filter(c => c.esTemporada).length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <span className="text-2xl">❄️</span>
                            <h4 className="text-md font-bold text-dulza-jade">
                              MENÚ DE TEMPORADA
                            </h4>
                            <span className="text-2xl">❄️</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {categorias.filter(c => c.esTemporada).map((categoria) => (
                              <button
                                key={categoria.id}
                                onClick={() => toggleCategoria(categoria.id)}
                                disabled={registrando}
                                className={`relative p-4 rounded-2xl font-semibold text-center transition-all duration-300 ${
                                  categoriasSeleccionadas.includes(categoria.id)
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105 border-2 border-blue-700"
                                    : "bg-gradient-to-br from-blue-50 to-blue-100 text-dulza-chocolate hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-md">
                                  ❄️ TEMP
                                </div>
                                <div className="text-3xl mb-2">{categoria.icono}</div>
                                <div className="text-sm font-semibold">{categoria.nombre}</div>
                                <div className={`text-xs mt-1 font-bold ${
                                  categoriasSeleccionadas.includes(categoria.id)
                                    ? "text-blue-100"
                                    : "text-blue-700"
                                }`}>
                                  +{categoria.puntosBase} pts
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {categoriasSeleccionadas.length > 0 && (
                        <div className="mt-4 text-center text-sm text-dulza-chocolate-dark/70">
                          {categoriasSeleccionadas.length} {categoriasSeleccionadas.length === 1 ? 'categoría seleccionada' : 'categorías seleccionadas'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-dulza-chocolate mb-4 text-center">
                        🎁 Selecciona la recompensa
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {canjes.map((canje) => {
                          const esCanjeSellos = canje.slug === STAMP_REWARD_SLUG;
                          const saldo = esCanjeSellos ? availableStamps(cliente) : cliente.puntos;
                          const costo = esCanjeSellos ? STAMP_GOAL : canje.costoPuntos;
                          const tienesPuntos = saldo >= costo;
                          return (
                            <button
                              key={canje.id}
                              onClick={() => setCanjeSeleccionado(canje.id)}
                              disabled={registrando || !tienesPuntos}
                              className={`p-4 rounded-2xl font-semibold text-center transition-all duration-300 ${
                                canjeSeleccionado === canje.id
                                  ? "bg-gradient-to-br from-dulza-jade to-dulza-jade-light text-white shadow-lg scale-105 border-2 border-dulza-jade-dark"
                                  : tienesPuntos
                                  ? "bg-dulza-cream text-dulza-chocolate hover:bg-dulza-cream-light border-2 border-dulza-cream"
                                  : "bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed"
                              } disabled:opacity-50`}
                            >
                              <div className="text-3xl mb-2">{canje.icono}</div>
                              <div className="text-sm font-semibold">{canje.nombre}</div>
                              <div className={`text-xs mt-1 font-bold ${
                                tienesPuntos ? "text-dulza-jade" : "text-red-500"
                              }`}>
                                {costo} {esCanjeSellos ? "sellos" : "pts"}
                              </div>
                              {!tienesPuntos && (
                                <div className="text-xs text-red-500 mt-1">
                                  Faltan {costo - saldo}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {canjeSeleccionado && (
                        <div className="mt-4 text-center text-sm text-dulza-chocolate-dark/70">
                          Recompensa seleccionada
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Botones de acción */}
              {!successMessage && (
                <div className="space-y-3">
                  {modo === "visita" ? (
                    <button
                      onClick={handleRegistrarVisita}
                      disabled={registrando || categoriasSeleccionadas.length === 0}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-6 px-8 rounded-2xl text-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registrando ? (
                        <span className="flex items-center justify-center gap-3">
                          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Registrando...
                        </span>
                      ) : (
                        "✅ Registrar Visita"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleCanjearRecompensa}
                      disabled={registrando || !canjeSeleccionado}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-6 px-8 rounded-2xl text-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registrando ? (
                        <span className="flex items-center justify-center gap-3">
                          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Canjeando...
                        </span>
                      ) : (
                        "🎁 Canjear Recompensa"
                      )}
                    </button>
                  )}

                  <button
                    onClick={handleNuevaBusqueda}
                    className="w-full bg-dulza-cream hover:bg-dulza-cream-light text-dulza-chocolate font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-300"
                  >
                    ← Nueva Búsqueda
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tip */}
        <div className="text-center mt-6 text-dulza-chocolate-dark/70 text-sm">
          💡 Tip: Presiona Enter después de ingresar el teléfono o QR
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}
