import { PrismaClient, UserRole, TierLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise Database Seed...');

  // 1. CLEANUP (Delete in specific order to respect Foreign Keys)
  // We handle the "Relation Constraint" errors by deleting children first
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatInventory.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.airport.deleteMany();
  await prisma.airline.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tier.deleteMany();

  // 2. CONFIGURATION: TIERS
  console.log('   ↳ Creating Tiers...');
  const standardTier = await prisma.tier.create({
    data: {
      name: TierLevel.STANDARD,
      baseMarkupPercentage: 0.0,
      pricePerYear: 0.0,
      benefits: { priorityBoarding: false, extraBaggage: false },
    },
  });

  const premiumTier = await prisma.tier.create({
    data: {
      name: TierLevel.PREMIUM,
      baseMarkupPercentage: 5.0, 
      pricePerYear: 4999.00,
      benefits: { priorityBoarding: true, extraBaggage: true, loungeAccess: true },
      loungeAccessLimit: 12
    },
  });

  // 3. INFRASTRUCTURE: AIRPORTS
  console.log('   ↳ Creating Airports...');
  const bom = await prisma.airport.create({
    data: { iataCode: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' }
  });
  const del = await prisma.airport.create({
    data: { iataCode: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' }
  });
  const dxb = await prisma.airport.create({
    data: { iataCode: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' }
  });

  // 4. INFRASTRUCTURE: AIRLINES
  console.log('   ↳ Creating Airlines...');
  const indigo = await prisma.airline.create({
    data: { iataCode: '6E', name: 'IndiGo' }
  });
  const emirates = await prisma.airline.create({
    data: { iataCode: 'EK', name: 'Emirates' }
  });

  // 5. OPERATIONS: FLIGHTS & INVENTORY
  console.log('   ↳ Scheduling Flights...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Flight 1: BOM -> DEL
  const flight1 = await prisma.flight.create({
    data: {
      flightNumber: '6E-505',
      gdsFlightId: 'GDS-1001',
      airlineId: indigo.id,
      originAirportId: bom.id,
      destinationAirportId: del.id,
      departureTime: tomorrow,
      arrivalTime: new Date(new Date(tomorrow).setHours(tomorrow.getHours() + 2)),
      basePrice: 4500.00,
      totalSeats: 180,
    }
  });

  // Inventory: Instead of 180 rows, we create 2 rows (High Performance)
  await prisma.seatInventory.create({
    data: { flightId: flight1.id, cabinClass: 'ECONOMY', totalSeats: 150, version: 0 }
  });
  await prisma.seatInventory.create({
    data: { flightId: flight1.id, cabinClass: 'BUSINESS', totalSeats: 30, version: 0 }
  });

  // Flight 2: BOM -> DXB
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const flight2 = await prisma.flight.create({
    data: {
      flightNumber: 'EK-500',
      gdsFlightId: 'GDS-2002',
      airlineId: emirates.id,
      originAirportId: bom.id,
      destinationAirportId: dxb.id,
      departureTime: dayAfter,
      arrivalTime: new Date(new Date(dayAfter).setHours(dayAfter.getHours() + 4)),
      basePrice: 15000.00,
      totalSeats: 300,
    }
  });

  await prisma.seatInventory.createMany({
    data: [
      { flightId: flight2.id, cabinClass: 'ECONOMY', totalSeats: 250, version: 0 },
      { flightId: flight2.id, cabinClass: 'BUSINESS', totalSeats: 40, version: 0 },
      { flightId: flight2.id, cabinClass: 'FIRST', totalSeats: 10, version: 0 }
    ]
  });

  // 6. SECURITY: USERS
  console.log('   ↳ Creating Admin User...');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);

  await prisma.user.create({
    data: {
      email: 'admin@airline.com',
      passwordHash: hash,
      fullName: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      tierId: premiumTier.id,
      emailVerified: true
    }
  });

  console.log('🚀 SYSTEM SEED COMPLETED SUCCESSFULLY.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });