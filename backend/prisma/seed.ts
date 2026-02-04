import { PrismaClient, TierLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seed...');

  // 1. Seed Tiers (Using the official Enums)
  const tiers = [
    {
      name: TierLevel.STANDARD, // <--- Fixed: Using Enum, not string
      baseMarkupPercentage: 0.00,
      pricePerYear: 0.00,
      benefits: { prioritySupport: false, loungeAccess: false },
    },
    {
      name: TierLevel.PLUS,
      baseMarkupPercentage: 5.00,
      pricePerYear: 4999.00,
      benefits: { prioritySupport: 'Limited', loungeAccess: true },
    },
    {
      name: TierLevel.PREMIUM,
      baseMarkupPercentage: 10.00,
      pricePerYear: 9999.00,
      benefits: { prioritySupport: '24/7 Dedicated', loungeAccess: 'Unlimited' },
    },
  ];

  for (const tier of tiers) {
    await prisma.tier.upsert({
      where: { name: tier.name },
      update: {},
      create: tier,
    });
    console.log(`✅ Tier seeded: ${tier.name}`);
  }

  // 2. Seed Airports
  const airports = [
    { iataCode: 'BOM', name: 'Mumbai International', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
    { iataCode: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' },
  ];

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      update: {},
      create: airport,
    });
  }

  // 3. Seed Mock Flight
  const airline = await prisma.airline.upsert({
    where: { iataCode: 'AI' },
    update: {},
    create: { iataCode: 'AI', name: 'Air India' },
  });

  const bom = await prisma.airport.findUnique({ where: { iataCode: 'BOM' } });
  const del = await prisma.airport.findUnique({ where: { iataCode: 'DEL' } });

  if (bom && del) {
    await prisma.flight.upsert({
      where: { gdsFlightId: 'MOCK-101' },
      update: {},
      create: {
        gdsFlightId: 'MOCK-101',
        flightNumber: 'AI-202',
        airlineId: airline.id,
        originAirportId: bom.id,
        destinationAirportId: del.id,
        departureTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        arrivalTime: new Date(new Date().getTime() + 26 * 60 * 60 * 1000),   // Tomorrow + 2h
        basePrice: 5000.00,
        totalSeats: 120,
        seatInventory: {
          create: [
            { cabinClass: 'ECONOMY', totalSeats: 100, bookedSeats: 0, version: 0 },
            { cabinClass: 'BUSINESS', totalSeats: 20, bookedSeats: 0, version: 0 },
          ],
        },
      },
    });
    console.log(`✅ Mock Flight seeded`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });