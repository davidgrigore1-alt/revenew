import type { SalonSandboxProfile } from "@/lib/appointment-sandbox";

export const atelierBellezzaSandbox: SalonSandboxProfile = {
  salonId: "salon-atelier-bellezza-demo",
  salonName: "Atelier Bellezza Demo",
  timezone: "Europe/Bucharest",
  businessHours: {
    monday: [{ start: "09:00", end: "18:00" }],
    tuesday: [{ start: "09:00", end: "18:00" }],
    wednesday: [{ start: "09:00", end: "18:00" }],
    thursday: [{ start: "09:00", end: "18:00" }],
    friday: [{ start: "09:00", end: "18:00" }],
    saturday: [{ start: "09:00", end: "14:00" }]
  },
  services: [
    {
      id: "service-tuns-dama",
      name: "Tuns damă",
      durationMinutes: 60,
      bufferMinutes: 10,
      allowedStaffIds: ["staff-ana-ionescu", "staff-maria-popa", "staff-elena-marin"],
      price: { amount: 150, currency: "RON" },
      active: true
    },
    {
      id: "service-tuns-barbati",
      name: "Tuns bărbați",
      durationMinutes: 30,
      bufferMinutes: 5,
      allowedStaffIds: ["staff-ana-ionescu", "staff-elena-marin"],
      price: { amount: 90, currency: "RON" },
      active: true
    },
    {
      id: "service-manichiura",
      name: "Manichiură",
      durationMinutes: 75,
      bufferMinutes: 10,
      allowedStaffIds: ["staff-maria-popa", "staff-elena-marin"],
      price: { amount: 130, currency: "RON" },
      active: true
    },
    {
      id: "service-vopsit-par",
      name: "Vopsit păr",
      durationMinutes: 150,
      bufferMinutes: 15,
      allowedStaffIds: ["staff-ana-ionescu", "staff-elena-marin"],
      active: true
    }
  ],
  staff: [
    {
      id: "staff-ana-ionescu",
      name: "Ana Ionescu",
      active: true,
      workingHours: {
        monday: [{ start: "09:00", end: "17:00" }],
        tuesday: [{ start: "09:00", end: "17:00" }],
        wednesday: [{ start: "09:00", end: "17:00" }],
        thursday: [{ start: "09:00", end: "17:00" }],
        friday: [{ start: "09:00", end: "17:00" }]
      },
      servicesAllowed: ["service-tuns-dama", "service-tuns-barbati", "service-vopsit-par"],
      unavailableIntervals: [{
        start: "2026-08-03T08:00:00.000Z",
        end: "2026-08-03T09:30:00.000Z",
        reason: "Interval intern indisponibil"
      }]
    },
    {
      id: "staff-maria-popa",
      name: "Maria Popa",
      active: true,
      workingHours: {
        monday: [{ start: "10:00", end: "18:00" }],
        tuesday: [{ start: "10:00", end: "18:00" }],
        wednesday: [{ start: "10:00", end: "18:00" }],
        thursday: [{ start: "10:00", end: "18:00" }],
        friday: [{ start: "10:00", end: "18:00" }],
        saturday: [{ start: "09:00", end: "14:00" }]
      },
      servicesAllowed: ["service-tuns-dama", "service-manichiura"],
      unavailableIntervals: []
    },
    {
      id: "staff-elena-marin",
      name: "Elena Marin",
      active: true,
      workingHours: {
        monday: [{ start: "09:00", end: "18:00" }],
        tuesday: [{ start: "09:00", end: "18:00" }],
        wednesday: [{ start: "09:00", end: "18:00" }],
        thursday: [{ start: "09:00", end: "18:00" }],
        friday: [{ start: "09:00", end: "18:00" }],
        saturday: [{ start: "09:00", end: "14:00" }]
      },
      servicesAllowed: ["service-tuns-dama", "service-tuns-barbati", "service-manichiura", "service-vopsit-par"],
      unavailableIntervals: []
    }
  ],
  existingAppointments: [{
    id: "appointment-atelier-1",
    staffId: "staff-ana-ionescu",
    serviceId: "service-tuns-dama",
    start: "2026-08-03T06:00:00.000Z",
    end: "2026-08-03T07:00:00.000Z",
    bufferMinutes: 10,
    status: "approved"
  }],
  unavailableIntervals: [{
    start: "2026-08-03T10:00:00.000Z",
    end: "2026-08-03T11:00:00.000Z",
    reason: "Pauză operațională"
  }],
  bookingRules: {
    slotIntervalMinutes: 15,
    maxSuggestions: 3,
    searchDays: 2
  }
};
