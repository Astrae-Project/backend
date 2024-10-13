import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
    // Crear 100 usuarios
    const users = [];
    for (let i = 0; i < 100; i++) {
        users.push({
            email: faker.internet.email(),
            password: faker.internet.password(),
            rol: faker.helpers.arrayElement(['inversor', 'startup']), // Rol aleatorio
            fecha_creacion: faker.date.past(),
            verificado: faker.datatype.boolean(),
        });
    }
    
    const createdUsers = await prisma.usuario.createMany({
        data: users,
        skipDuplicates: true, // Si ya existe un usuario con el mismo email, lo ignora
    });

    // Obtener todos los IDs de usuarios creados
    const allUsers = await prisma.usuario.findMany({
        select: { id: true },
    });

    // Crear 50 startups y 50 inversores
    const startups = [];
    const inversores = [];
    
    for (let i = 0; i < 50; i++) {
        // Crear Startups
        const userId = faker.helpers.arrayElement(allUsers).id; // Asignar un usuario aleatorio
        startups.push({
            id_usuario: userId,
            nombre: faker.company.name(),
            username: faker.internet.userName(),
            sector: faker.commerce.department(),
            estado_financiacion: faker.helpers.arrayElement(['financiada', 'en búsqueda', 'no financiada']),
            plantilla: faker.number.int({ min: 1, max: 100 }), // Tamaño de plantilla
            porcentaje_disponible: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
            valoracion: faker.number.float({ min: 10000, max: 1000000, precision: 0.01 }),
        });

        // Crear Inversores
        const investorUserId = faker.helpers.arrayElement(allUsers).id; // Asignar un usuario aleatorio
        inversores.push({
            id_usuario: investorUserId,
            nombre: faker.name.fullName(),
            username: faker.internet.userName(),
            perfil_inversion: faker.helpers.arrayElement(['alto riesgo', 'medio riesgo', 'bajo riesgo']),
        });
    }

    // Crear startups e inversores en la base de datos
    await prisma.startup.createMany({ data: startups });
    await prisma.inversor.createMany({ data: inversores });

    // Crear algunas inversiones
    for (let i = 0; i < 200; i++) {
        await prisma.inversion.create({
            data: {
                id_inversor: faker.number.int({ min: 1, max: 50 }), // Inversor aleatorio
                id_startup: faker.number.int({ min: 1, max: 50 }), // Startup aleatoria
                monto_invertido: faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
                porcentaje_adquirido: faker.number.float({ min: 1, max: 20, precision: 0.01 }),
            },
        });
    }

    console.log('Datos de prueba creados con éxito');
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
