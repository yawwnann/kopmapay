import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import * as fc from 'fast-check';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;

  // Mock implementations
  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    saving: {
      upsert: jest.fn(),
    },
  };

  const mockEmailService = {
    sendAdminPaymentNotification: jest.fn(),
    sendPaymentNotification: jest.fn(),
  };

  const mockNotificationsGateway = {
    broadcastNewPayment: jest.fn(),
    broadcastPaymentUpdate: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Property 4: Payment method persistence round-trip', () => {
    /**
     * **Validates: Requirements 3.1, 3.4**
     *
     * Property: For any valid payment submission with a payment method,
     * creating the payment and then retrieving it should return the same
     * payment method value.
     */
    it('should persist and retrieve the same payment method value', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid payment method values
          fc.constantFrom('Cash', 'QRIS', 'BankTransfer'),
          // Generate valid payment data
          fc.double({ min: 0.01, max: 1000000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.uuid(),
          async (paymentMethod, nominal, description, userId) => {
            const proofImage = 'https://example.com/proof.jpg';
            const createdId = '00000000-0000-1000-8000-000000000001';

            // Mock the payment creation response
            const createdPayment = {
              id: createdId,
              userId,
              nominal,
              proofImage,
              description,
              paymentMethod,
              status: 'PENDING',
              verifiedBy: null,
              verifiedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: userId,
                name: 'Test User',
                email: 'test@example.com',
              },
            };

            // Setup: Create payment DTO
            const createPaymentDto: CreatePaymentDto = {
              nominal,
              description,
              paymentMethod,
            };

            // Mock prisma calls
            mockPrismaService.payment.create.mockReturnValue(createdPayment);
            mockPrismaService.user.findMany.mockResolvedValue([]);
            mockPrismaService.payment.findUnique.mockReturnValue({
              ...createdPayment,
              user: {
                id: userId,
                name: 'Test User',
                email: 'test@example.com',
                angkatan: '2020',
              },
            });

            // Act: Create the payment
            const createdResult = await service.create(
              userId,
              createPaymentDto,
              proofImage,
            );

            // Act: Retrieve the payment using the actual created ID
            const retrievedResult = await service.findOne(createdResult.id, userId, 'ANGGOTA');

            // Assert: Payment method should be preserved in the round-trip
            expect(createdResult.paymentMethod).toBe(paymentMethod);
            expect(retrievedResult.paymentMethod).toBe(paymentMethod);
            expect(retrievedResult.paymentMethod).toBe(
              createdResult.paymentMethod,
            );

            // Verify that the payment method was passed to Prisma correctly
            expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  paymentMethod,
                }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
