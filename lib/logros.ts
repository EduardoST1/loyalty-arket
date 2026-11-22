import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface LogroDesbloqueado {
  logro: {
    id: number;
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    puntosRecompensa: number;
  };
  esNuevo: boolean;
}

export async function verificarLogros(clienteId: number): Promise<LogroDesbloqueado[]> {
  try {
    // Obtener datos del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        logrosDesbloqueados: {
          select: { logroId: true },
        },
        referidosHechos: {
          select: { id: true },
        },
      },
    });

    if (!cliente) {
      return [];
    }

    // IDs de logros ya desbloqueados
    const logrosYaDesbloqueados = cliente.logrosDesbloqueados.map(cl => cl.logroId);

    // Obtener todos los logros activos del tenant
    const logrosDisponibles = await prisma.logro.findMany({
      where: {
        tenantId: cliente.tenantId,
        activo: true,
        id: {
          notIn: logrosYaDesbloqueados,
        },
      },
    });

    const logrosDesbloqueados: LogroDesbloqueado[] = [];

    // Verificar cada logro
    for (const logro of logrosDisponibles) {
      let cumple = false;

      switch (logro.tipo) {
        case "VISITAS":
          cumple = cliente.visitas >= logro.meta;
          break;

        case "PUNTOS":
          cumple = cliente.puntos >= logro.meta;
          break;

        case "SOCIAL":
          cumple = cliente.referidosHechos.length >= logro.meta;
          break;

        case "CATEGORIA":
          // Por ahora no implementado (requiere contar visitas por categoría)
          cumple = false;
          break;
      }

      if (cumple) {
        // Desbloquear el logro
        const clienteLogro = await prisma.clienteLogro.create({
          data: {
            clienteId: cliente.id,
            logroId: logro.id,
            progresoActual: logro.meta,
            progresoRequerido: logro.meta,
            desbloqueado: true,
            fechaDesbloqueado: new Date(),
          },
        });

        // Agregar puntos de recompensa
        const saldoPrevio = cliente.puntos;
        const saldoNuevo = cliente.puntos + logro.puntosRecompensa;
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            puntos: {
              increment: logro.puntosRecompensa,
            },
          },
        });
        cliente.puntos = saldoNuevo;

        // Crear registro en historial de puntos
        await prisma.puntoHistorial.create({
          data: {
            clienteId: cliente.id,
            tipo: "GANADO",
            cantidad: logro.puntosRecompensa,
            saldoPrevio,
            saldoNuevo,
            origenTipo: "LOGRO",
            origenId: clienteLogro.id,
            descripcion: `Logro desbloqueado: ${logro.nombre}`,
          },
        });

        logrosDesbloqueados.push({
          logro: {
            id: logro.id,
            nombre: logro.nombre,
            descripcion: logro.descripcion,
            icono: logro.icono,
            color: logro.color,
            puntosRecompensa: logro.puntosRecompensa,
          },
          esNuevo: true,
        });
      }
    }

    return logrosDesbloqueados;
  } catch (error) {
    console.error("Error al verificar logros:", error);
    return [];
  }
}
