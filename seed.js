import prisma from './lib/prismaClient.mjs';

async function seedDatabase() {
  try {
    // Creación de usuarios
    const inversorUsuario = await prisma.usuario.create({
      data: {
        email: 'inversor@test.com',
        password: 'password123',  // Debería estar encriptada en producción
        rol: 'inversor',
      },
    });

    const startupUsuario = await prisma.usuario.create({
      data: {
        email: 'startup@test.com',
        password: 'password123',
        rol: 'startup',
      },
    });

    // Creación de inversor
    const inversor = await prisma.inversor.create({
      data: {
        id_usuario: inversorUsuario.id,
        nombre: 'Inversor de Prueba',
        perfil_inversion: 'Perfil conservador',
      },
    });

    // Creación de startup
    const startup = await prisma.startup.create({
      data: {
        id_usuario: startupUsuario.id,
        nombre: 'Startup de Prueba',
        sector: 'Tecnología',
        fase_desarrollo: 'Inicial',
        estado_financiacion: 'Buscando inversión',
        plantilla: 10,
        porcentaje_disponible: 50,  // Startup tiene 50% disponible para vender
      },
    });

    // Creación de oferta
    const oferta = await prisma.oferta.create({
      data: {
        id_inversor: inversor.id,
        id_startup: startup.id,
        monto_ofrecido: 50000,  // 50 mil
        porcentaje_ofrecido: 10,  // 10% de la startup
        estado: 'pendiente',
      },
    });

    console.log('Datos de prueba creados correctamente');
  } catch (error) {
    console.error('Error al crear datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
